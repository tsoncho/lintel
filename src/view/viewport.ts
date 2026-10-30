import { constrainOrthogonal, distance, roundPoint, wallLength } from "../domain/geometry";
import type { Gridline, Project, Vec2 } from "../domain/types";
import { isUnknownElement } from "../domain/types";

export interface Viewport {
  width: number;
  height: number;
  /** World millimeters at the center of the view. */
  camX: number;
  camY: number;
  /** CSS pixels per millimeter. */
  zoom: number;
}

export interface SnapSettings {
  grid: boolean;
  points: boolean;
  gridSize: number;
}

export interface SnapHit {
  point: Vec2;
  kind: "endpoint" | "midpoint" | "grid" | "free";
}

export function worldToScreen(view: Viewport, point: Vec2): { x: number; y: number } {
  return {
    x: view.width / 2 + (point.x - view.camX) * view.zoom,
    y: view.height / 2 - (point.y - view.camY) * view.zoom,
  };
}

export function screenToWorld(view: Viewport, screen: { x: number; y: number }): Vec2 {
  return {
    x: view.camX + (screen.x - view.width / 2) / view.zoom,
    y: view.camY - (screen.y - view.height / 2) / view.zoom,
  };
}

export function visibleWorld(view: Viewport): { minX: number; minY: number; maxX: number; maxY: number } {
  const a = screenToWorld(view, { x: 0, y: 0 });
  const b = screenToWorld(view, { x: view.width, y: view.height });
  return {
    minX: Math.min(a.x, b.x),
    maxX: Math.max(a.x, b.x),
    minY: Math.min(a.y, b.y),
    maxY: Math.max(a.y, b.y),
  };
}

export function fitViewport(
  view: Viewport,
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
): Viewport {
  const width = Math.max(bounds.maxX - bounds.minX, 2000);
  const height = Math.max(bounds.maxY - bounds.minY, 2000);
  const zoom = Math.min((view.width * 0.82) / width, (view.height * 0.82) / height);
  return {
    ...view,
    zoom: clamp(Number.isFinite(zoom) ? zoom : 0.04, 0.002, 1.2),
    camX: (bounds.minX + bounds.maxX) / 2,
    camY: (bounds.minY + bounds.maxY) / 2,
  };
}

export function zoomAt(view: Viewport, screen: { x: number; y: number }, factor: number): Viewport {
  const before = screenToWorld(view, screen);
  const zoom = clamp(view.zoom * factor, 0.002, 1.2);
  const next = { ...view, zoom };
  const after = screenToWorld(next, screen);
  return { ...next, camX: view.camX + before.x - after.x, camY: view.camY + before.y - after.y };
}

export function panBy(view: Viewport, dx: number, dy: number): Viewport {
  return {
    ...view,
    camX: view.camX - dx / view.zoom,
    camY: view.camY + dy / view.zoom,
  };
}

export function snapWorld(
  raw: Vec2,
  project: Project,
  storyId: string,
  zoom: number,
  settings: SnapSettings,
  anchor: Vec2 | null,
  shift: boolean,
): SnapHit {
  const guided = shift && anchor ? constrainOrthogonal(anchor, raw) : raw;
  if (settings.points) {
    const tolerance = 14 / Math.max(zoom, 0.0001);
    let best: { point: Vec2; distance: number; kind: "endpoint" | "midpoint" } | null = null;
    for (const candidate of snapCandidates(project, storyId)) {
      const gap = distance(candidate.point, guided);
      if (gap <= tolerance && (!best || gap < best.distance)) {
        best = { point: candidate.point, distance: gap, kind: candidate.kind };
      }
    }
    if (best) return { point: best.point, kind: best.kind };
  }
  if (settings.grid && settings.gridSize > 0) {
    const size = settings.gridSize;
    return {
      point: { x: Math.round(guided.x / size) * size, y: Math.round(guided.y / size) * size },
      kind: "grid",
    };
  }
  return { point: roundPoint(guided), kind: "free" };
}

function snapCandidates(project: Project, storyId: string): { point: Vec2; kind: "endpoint" | "midpoint" }[] {
  const points: { point: Vec2; kind: "endpoint" | "midpoint" }[] = [];
  for (const element of project.elements) {
    if (isUnknownElement(element)) continue;
    if (element.type === "wall" && element.storyId === storyId) {
      points.push({ point: element.start, kind: "endpoint" }, { point: element.end, kind: "endpoint" });
      points.push({
        point: {
          x: (element.start.x + element.end.x) / 2,
          y: (element.start.y + element.end.y) / 2,
        },
        kind: "midpoint",
      });
    }
    if ((element.type === "slab" || element.type === "room") && element.storyId === storyId) {
      for (const point of element.outline) points.push({ point, kind: "endpoint" });
    }
  }
  const vertical = project.elements.filter((element): element is Gridline => element.type === "gridline" && element.axis === "x");
  const horizontal = project.elements.filter((element): element is Gridline => element.type === "gridline" && element.axis === "y");
  for (const column of vertical) {
    for (const row of horizontal) {
      points.push({ point: { x: column.position, y: row.position }, kind: "endpoint" });
    }
  }
  return points;
}

export function wallMidpoint(start: Vec2, end: Vec2): Vec2 {
  return { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
}

export function measure(start: Vec2, end: Vec2): number {
  return wallLength({ start, end });
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
