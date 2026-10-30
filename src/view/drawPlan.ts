import { doorSwing, polygonCentroid, wallCorners, wallFrame, wallLength } from "../domain/geometry";
import { exteriorEdges, wallSolids } from "../domain/joins";
import { hostedOpenings, stories } from "../domain/queries";
import type { Door, Element, Project, Section, Vec2, Wall, Window } from "../domain/types";
import { formatArea, formatLength } from "../domain/units";
import { polygonArea } from "../domain/geometry";
import { visibleWorld, worldToScreen, type Viewport } from "./viewport";

const INK = "#2c2824";
const PAPER = "#f7f4ee";
const SELECT = "#9a4318";
const PREVIEW = "#c45c26";

export interface DraftGraphic {
  tool: "wall" | "slab" | "room" | "section";
  points: Vec2[];
  cursor: Vec2 | null;
}

export interface OpeningGraphic {
  wallId: string;
  kind: "door" | "window";
  offset: number;
  width: number;
}

export interface PlanScene {
  project: Project;
  activeStoryId: string;
  selection: string[];
  ghostStories: boolean;
  gridSize: number;
  snapGrid: boolean;
  draft: DraftGraphic | null;
  opening: OpeningGraphic | null;
  snap: { point: Vec2; kind: string } | null;
  displayUnit: Project["displayUnit"];
}

export function drawPlan(ctx: CanvasRenderingContext2D, view: Viewport, scene: PlanScene) {
  ctx.clearRect(0, 0, view.width, view.height);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, view.width, view.height);
  drawSheetGrid(ctx, view, scene);
  drawGridlines(ctx, view, scene.project);
  if (scene.ghostStories) drawGhostWalls(ctx, view, scene);
  drawStory(ctx, view, scene, scene.activeStoryId, false);
  drawSections(ctx, view, scene.project);
  if (scene.draft) drawDraft(ctx, view, scene);
  if (scene.opening) drawOpeningPreview(ctx, view, scene);
  drawSelection(ctx, view, scene);
  if (scene.snap) drawSnap(ctx, view, scene.snap.point);
  drawNorth(ctx);
}

function drawStory(ctx: CanvasRenderingContext2D, view: Viewport, scene: PlanScene, storyId: string, ghost: boolean) {
  ctx.save();
  if (ghost) ctx.globalAlpha = 0.22;
  for (const element of scene.project.elements) {
    if (element.type === "slab" && element.storyId === storyId) drawSlab(ctx, view, element.outline, scene.selection.includes(element.id));
  }
  for (const element of scene.project.elements) {
    if (element.type === "room" && element.storyId === storyId) {
      drawRoom(ctx, view, element.outline, element.name, element.number, scene.selection.includes(element.id), element.sync === "detached");
    }
  }
  const walls = scene.project.elements.filter((element): element is Wall => element.type === "wall" && element.storyId === storyId);
  const solids = wallSolids(walls);
  for (const solid of solids) {
    const wall = walls.find((item) => item.id === solid.id);
    if (wall) drawWall(ctx, view, scene.project, wall, solid.footprint, scene.selection.includes(wall.id));
  }
  if (!ghost) {
    ctx.strokeStyle = "#241f1b";
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    for (const [startPoint, endPoint] of exteriorEdges(solids.map((item) => item.footprint))) {
      const start = worldToScreen(view, startPoint);
      const end = worldToScreen(view, endPoint);
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawGhostWalls(ctx: CanvasRenderingContext2D, view: Viewport, scene: PlanScene) {
  for (const story of stories(scene.project)) {
    if (story.id === scene.activeStoryId) continue;
    drawStory(ctx, view, scene, story.id, true);
  }
}

function drawSlab(ctx: CanvasRenderingContext2D, view: Viewport, outline: Vec2[], selected: boolean) {
  trace(ctx, view, outline, true);
  ctx.fillStyle = "rgba(196, 176, 146, 0.55)";
  ctx.fill();
  ctx.lineWidth = selected ? 2 : 1;
  ctx.strokeStyle = selected ? SELECT : "#8d7f6c";
  ctx.stroke();
}

function drawRoom(
  ctx: CanvasRenderingContext2D,
  view: Viewport,
  outline: Vec2[],
  name: string,
  number: string,
  selected: boolean,
  detached: boolean,
) {
  trace(ctx, view, outline, true);
  ctx.fillStyle = "rgba(70, 122, 86, 0.16)";
  ctx.fill();
  ctx.setLineDash([4, 3]);
  ctx.lineWidth = selected ? 2 : 1;
  ctx.strokeStyle = selected ? SELECT : "#2f6a46";
  ctx.stroke();
  ctx.setLineDash([]);
  const center = worldToScreen(view, polygonCentroid(outline));
  ctx.fillStyle = INK;
  ctx.font = "600 13px Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${number}  ${name}`, center.x, center.y - 8);
  ctx.font = "12px Segoe UI, sans-serif";
  ctx.fillStyle = "#3d4f43";
  ctx.fillText(detached ? "Boundary lost" : formatArea(polygonArea(outline)), center.x, center.y + 10);
}

function drawWall(ctx: CanvasRenderingContext2D, view: Viewport, project: Project, wall: Wall, footprint: Vec2[], selected: boolean) {
  trace(ctx, view, footprint, true);
  ctx.fillStyle = selected ? "#4a4036" : "#3a352f";
  ctx.fill();
  const openings = hostedOpenings(project, wall.id);
  for (const opening of openings) {
    const quad = openingQuad(wall, opening.offset, opening.width, 3);
    if (!quad) continue;
    trace(ctx, view, quad, true);
    ctx.fillStyle = opening.type === "window" ? "#d7ebef" : PAPER;
    ctx.fill();
    if (opening.type === "window") drawWindowMarks(ctx, view, wall, opening);
    if (opening.type === "door") drawDoor(ctx, view, wall, opening);
  }
  if (selected) {
    trace(ctx, view, footprint, true);
    ctx.lineWidth = 2;
    ctx.strokeStyle = SELECT;
    ctx.stroke();
    const mid = worldToScreen(view, {
      x: (wall.start.x + wall.end.x) / 2,
      y: (wall.start.y + wall.end.y) / 2,
    });
    label(ctx, formatLength(wallLength(wall), project.displayUnit), mid.x, mid.y - 14, SELECT);
  }
}

function drawDoor(ctx: CanvasRenderingContext2D, view: Viewport, wall: Wall, door: Door) {
  const swing = doorSwing(wall, door);
  if (!swing) return;
  ctx.beginPath();
  const hinge = worldToScreen(view, swing.hinge);
  const open = worldToScreen(view, swing.arc[swing.arc.length - 1]);
  ctx.moveTo(hinge.x, hinge.y);
  ctx.lineTo(open.x, open.y);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.25;
  ctx.stroke();
  ctx.beginPath();
  swing.arc.forEach((point, index) => {
    const screen = worldToScreen(view, point);
    if (index === 0) ctx.moveTo(screen.x, screen.y);
    else ctx.lineTo(screen.x, screen.y);
  });
  ctx.setLineDash([3, 2]);
  ctx.strokeStyle = "#5c564c";
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawWindowMarks(ctx: CanvasRenderingContext2D, view: Viewport, wall: Wall, window: Window) {
  const frame = wallFrame(wall);
  if (!frame) return;
  ctx.strokeStyle = "#3d6d78";
  ctx.lineWidth = 1;
  for (const side of [-wall.thickness * 0.22, wall.thickness * 0.22]) {
    const a = worldToScreen(view, {
      x: wall.start.x + frame.ux * (window.offset - window.width / 2) + frame.nx * side,
      y: wall.start.y + frame.uy * (window.offset - window.width / 2) + frame.ny * side,
    });
    const b = worldToScreen(view, {
      x: wall.start.x + frame.ux * (window.offset + window.width / 2) + frame.nx * side,
      y: wall.start.y + frame.uy * (window.offset + window.width / 2) + frame.ny * side,
    });
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
}

function drawOpeningPreview(ctx: CanvasRenderingContext2D, view: Viewport, scene: PlanScene) {
  const opening = scene.opening;
  if (!opening) return;
  const wall = scene.project.elements.find((element) => element.id === opening.wallId);
  if (!wall || wall.type !== "wall") return;
  const quad = openingQuad(wall, opening.offset, opening.width, 3);
  if (!quad) return;
  trace(ctx, view, quad, true);
  ctx.fillStyle = opening.kind === "window" ? "rgba(215, 235, 239, 0.85)" : "rgba(196, 92, 38, 0.25)";
  ctx.fill();
  ctx.strokeStyle = PREVIEW;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawDraft(ctx: CanvasRenderingContext2D, view: Viewport, scene: PlanScene) {
  const draft = scene.draft;
  if (!draft) return;
  const points = draft.cursor ? [...draft.points, draft.cursor] : draft.points;
  if (draft.tool === "wall" && draft.points[0] && draft.cursor) {
    const fake: Wall = {
      id: "draft",
      type: "wall",
      storyId: scene.activeStoryId,
      start: draft.points[0],
      end: draft.cursor,
      thickness: 200,
      height: 3000,
      baseOffset: 0,
      material: "Generic",
    };
    const corners = wallCorners(fake);
    if (corners) {
      trace(ctx, view, corners, true);
      ctx.fillStyle = "rgba(196, 92, 38, 0.28)";
      ctx.fill();
    }
    const mid = worldToScreen(view, {
      x: (fake.start.x + fake.end.x) / 2,
      y: (fake.start.y + fake.end.y) / 2,
    });
    label(ctx, formatLength(wallLength(fake), scene.displayUnit), mid.x, mid.y - 16, PREVIEW);
  }
  ctx.beginPath();
  points.forEach((point, index) => {
    const screen = worldToScreen(view, point);
    if (index === 0) ctx.moveTo(screen.x, screen.y);
    else ctx.lineTo(screen.x, screen.y);
  });
  ctx.strokeStyle = PREVIEW;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]);
  ctx.stroke();
  ctx.setLineDash([]);
  for (const point of draft.points) {
    const screen = worldToScreen(view, point);
    ctx.fillStyle = PREVIEW;
    ctx.fillRect(screen.x - 3, screen.y - 3, 6, 6);
  }
}

function drawSelection(ctx: CanvasRenderingContext2D, view: Viewport, scene: PlanScene) {
  if (scene.selection.length !== 1) return;
  const element = scene.project.elements.find((item) => item.id === scene.selection[0]);
  if (!element) return;
  const handles = handlePoints(element);
  for (const point of handles) {
    const screen = worldToScreen(view, point);
    ctx.fillStyle = "#fffaf6";
    ctx.strokeStyle = SELECT;
    ctx.lineWidth = 1.5;
    ctx.fillRect(screen.x - 4, screen.y - 4, 8, 8);
    ctx.strokeRect(screen.x - 4, screen.y - 4, 8, 8);
  }
}

function handlePoints(element: Element): Vec2[] {
  if (element.type === "wall") return [element.start, element.end];
  if (element.type === "slab" || element.type === "room") return element.outline;
  return [];
}

function drawGridlines(ctx: CanvasRenderingContext2D, view: Viewport, project: Project) {
  const world = visibleWorld(view);
  ctx.save();
  ctx.strokeStyle = "#b3a898";
  ctx.fillStyle = INK;
  ctx.lineWidth = 1;
  ctx.font = "12px Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const element of project.elements) {
    if (element.type !== "gridline") continue;
    ctx.beginPath();
    if (element.axis === "x") {
      const a = worldToScreen(view, { x: element.position, y: world.minY });
      const b = worldToScreen(view, { x: element.position, y: world.maxY });
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
    } else {
      const a = worldToScreen(view, { x: world.minX, y: element.position });
      const b = worldToScreen(view, { x: world.maxX, y: element.position });
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
    }
    ctx.stroke();
  }
  ctx.restore();
  drawBubbles(ctx, view, project, world);
}

function drawBubbles(
  ctx: CanvasRenderingContext2D,
  view: Viewport,
  project: Project,
  world: { minX: number; minY: number; maxX: number; maxY: number },
) {
  ctx.save();
  ctx.font = "12px Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 1;
  for (const element of project.elements) {
    if (element.type !== "gridline") continue;
    const bubble = element.axis === "x"
      ? worldToScreen(view, { x: element.position, y: world.minY })
      : worldToScreen(view, { x: world.minX, y: element.position });
    const x = element.axis === "x" ? bubble.x : 28;
    const y = element.axis === "x" ? view.height - 28 : bubble.y;
    if (x < 16 || y < 16 || x > view.width - 16 || y > view.height - 16) continue;
    ctx.beginPath();
    ctx.fillStyle = PAPER;
    ctx.strokeStyle = INK;
    ctx.arc(x, y, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.fillText(element.name, x, y);
  }
  ctx.restore();
}

function drawSheetGrid(ctx: CanvasRenderingContext2D, view: Viewport, scene: PlanScene) {
  const world = visibleWorld(view);
  strokeGrid(ctx, view, world, 5000, "#e3d9cb", 1);
  if (1000 * view.zoom >= 8) strokeGrid(ctx, view, world, 1000, "#eee6da", 1);
  if (scene.snapGrid && scene.gridSize * view.zoom >= 8 && scene.gridSize < 1000) {
    strokeGrid(ctx, view, world, scene.gridSize, "rgba(196, 92, 38, 0.15)", 1);
  }
}

function strokeGrid(
  ctx: CanvasRenderingContext2D,
  view: Viewport,
  world: { minX: number; minY: number; maxX: number; maxY: number },
  step: number,
  color: string,
  width: number,
) {
  if (step <= 0) return;
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  const startX = Math.floor(world.minX / step) * step;
  const startY = Math.floor(world.minY / step) * step;
  for (let x = startX; x <= world.maxX; x += step) {
    const a = worldToScreen(view, { x, y: world.minY });
    const b = worldToScreen(view, { x, y: world.maxY });
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
  }
  for (let y = startY; y <= world.maxY; y += step) {
    const a = worldToScreen(view, { x: world.minX, y });
    const b = worldToScreen(view, { x: world.maxX, y });
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
  }
  ctx.stroke();
}

function drawSnap(ctx: CanvasRenderingContext2D, view: Viewport, point: Vec2) {
  const screen = worldToScreen(view, point);
  ctx.strokeStyle = PREVIEW;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(screen.x - 5, screen.y - 5, 10, 10);
}

function drawSections(ctx: CanvasRenderingContext2D, view: Viewport, project: Project) {
  for (const element of project.elements) {
    if (element.type !== "section") continue;
    drawSectionLine(ctx, view, element);
  }
}

function drawSectionLine(ctx: CanvasRenderingContext2D, view: Viewport, section: Section) {
  const frame = wallFrame(section);
  if (!frame) return;
  const normal = section.facing === "left" ? 1 : -1;
  const band = [
    section.start,
    section.end,
    pointOffset(section.end, frame, section.depth * normal),
    pointOffset(section.start, frame, section.depth * normal),
  ];
  trace(ctx, view, band, true);
  ctx.fillStyle = "rgba(154, 67, 24, 0.08)";
  ctx.fill();
  const a = worldToScreen(view, section.start);
  const b = worldToScreen(view, section.end);
  ctx.strokeStyle = SELECT;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  const mid = worldToScreen(view, { x: (section.start.x + section.end.x) / 2, y: (section.start.y + section.end.y) / 2 });
  const tip = worldToScreen(view, pointOffset({ x: (section.start.x + section.end.x) / 2, y: (section.start.y + section.end.y) / 2 }, frame, 400 * normal));
  ctx.beginPath();
  ctx.moveTo(mid.x, mid.y);
  ctx.lineTo(tip.x, tip.y);
  ctx.stroke();
  label(ctx, section.name, mid.x, mid.y - 16, SELECT);
}

function pointOffset(point: Vec2, frame: { nx: number; ny: number }, distance: number): Vec2 {
  return { x: point.x + frame.nx * distance, y: point.y + frame.ny * distance };
}

function drawNorth(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.translate(36, 42);
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(0, 16);
  ctx.lineTo(0, -2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(5, 0);
  ctx.lineTo(-5, 0);
  ctx.closePath();
  ctx.fill();
  ctx.font = "600 11px Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("N", 0, 30);
  ctx.restore();
}

function openingQuad(wall: Wall, offset: number, width: number, bleed: number): Vec2[] | null {
  const frame = wallFrame(wall);
  if (!frame) return null;
  const half = wall.thickness / 2 + bleed;
  const a = offset - width / 2;
  const b = offset + width / 2;
  const point = (along: number, lateral: number): Vec2 => ({
    x: wall.start.x + frame.ux * along + frame.nx * lateral,
    y: wall.start.y + frame.uy * along + frame.ny * lateral,
  });
  return [point(a, half), point(b, half), point(b, -half), point(a, -half)];
}

function trace(ctx: CanvasRenderingContext2D, view: Viewport, points: Vec2[], close: boolean) {
  if (!points.length) return;
  ctx.beginPath();
  const first = worldToScreen(view, points[0]);
  ctx.moveTo(first.x, first.y);
  for (let index = 1; index < points.length; index += 1) {
    const screen = worldToScreen(view, points[index]);
    ctx.lineTo(screen.x, screen.y);
  }
  if (close) ctx.closePath();
}

function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string) {
  ctx.font = "12px Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const width = ctx.measureText(text).width + 8;
  ctx.fillStyle = "rgba(247, 244, 238, 0.92)";
  ctx.fillRect(x - width / 2, y - 8, width, 16);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}
