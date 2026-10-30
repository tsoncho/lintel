import { JOIN_TOLERANCE_MM } from "./joins";
import {
  distance,
  intersectLines,
  pointInPolygon,
  polygonArea,
  polygonSelfIntersects,
  projectToSegment,
  signedArea,
  wallFrame,
} from "./geometry";
import { LIMITS } from "./validate";
import type { Project, Vec2, Wall } from "./types";

export interface DetectedSpace {
  storyId: string;
  outline: Vec2[];
  areaMm2: number;
  perimeterMm: number;
  wallIds: string[];
}

export interface OpenEnd {
  storyId: string;
  wallId: string;
  point: Vec2;
}

export interface SpaceReport {
  spaces: DetectedSpace[];
  openEnds: OpenEnd[];
  notes: string[];
}

interface DirEdge {
  from: number;
  to: number;
  wallId: string;
  angle: number;
  thickness: number;
}

/**
 * Finds closed wall loops on a story and insets them to the inner face.
 * Open ends are reported. Nothing is written to the project.
 */
export function detectSpaces(project: Project, storyId?: string): SpaceReport {
  const walls = project.elements.filter((element): element is Wall => element.type === "wall" && (!storyId || element.storyId === storyId));
  const byStory = new Map<string, Wall[]>();
  for (const wall of walls) {
    const list = byStory.get(wall.storyId) ?? [];
    list.push(wall);
    byStory.set(wall.storyId, list);
  }
  const spaces: DetectedSpace[] = [];
  const openEnds: OpenEnd[] = [];
  const notes: string[] = [];
  for (const [story, storyWalls] of byStory) {
    const report = detectStory(story, storyWalls);
    spaces.push(...report.spaces);
    openEnds.push(...report.openEnds);
    notes.push(...report.notes);
  }
  if (!spaces.length && !openEnds.length) notes.push("No wall loops were found on this story.");
  if (openEnds.length) notes.push(`${openEnds.length} wall end${openEnds.length === 1 ? "" : "s"} do not meet another wall, so those boundaries stay open.`);
  return { spaces, openEnds, notes };
}

function detectStory(storyId: string, walls: Wall[]): SpaceReport {
  const nodes: Vec2[] = [];
  const addNode = (point: Vec2) => {
    const found = nodes.findIndex((node) => distance(node, point) <= JOIN_TOLERANCE_MM);
    if (found >= 0) return found;
    nodes.push(point);
    return nodes.length - 1;
  };
  for (const wall of walls) {
    addNode(wall.start);
    addNode(wall.end);
  }
  for (let i = 0; i < walls.length; i += 1) {
    for (let j = i + 1; j < walls.length; j += 1) {
      const hit = intersectLines(walls[i].start, walls[i].end, walls[j].start, walls[j].end);
      if (!hit) continue;
      const onA = projectToSegment(hit, walls[i].start, walls[i].end);
      const onB = projectToSegment(hit, walls[j].start, walls[j].end);
      if (onA.distance <= JOIN_TOLERANCE_MM && onB.distance <= JOIN_TOLERANCE_MM && onA.t > 0.02 && onA.t < 0.98 && onB.t > 0.02 && onB.t < 0.98) {
        addNode(hit);
      }
    }
    for (const other of walls) {
      if (other.id === walls[i].id) continue;
      for (const point of [walls[i].start, walls[i].end]) {
        const projected = projectToSegment(point, other.start, other.end);
        if (projected.distance <= JOIN_TOLERANCE_MM && projected.t > 0.02 && projected.t < 0.98) addNode(projected.point);
      }
    }
  }

  const undirected: { a: number; b: number; wallId: string; thickness: number }[] = [];
  for (const wall of walls) {
    const frame = wallFrame(wall);
    if (!frame) continue;
    const onWall = nodes
      .map((point, index) => ({ index, along: projectToSegment(point, wall.start, wall.end).along, distance: projectToSegment(point, wall.start, wall.end).distance }))
      .filter((item) => item.distance <= JOIN_TOLERANCE_MM && item.along >= -JOIN_TOLERANCE_MM && item.along <= frame.length + JOIN_TOLERANCE_MM)
      .sort((a, b) => a.along - b.along);
    for (let i = 1; i < onWall.length; i += 1) {
      if (onWall[i].along - onWall[i - 1].along < 10) continue;
      undirected.push({ a: onWall[i - 1].index, b: onWall[i].index, wallId: wall.id, thickness: wall.thickness });
    }
  }

  const outgoing = new Map<number, DirEdge[]>();
  const directed: DirEdge[] = [];
  for (const edge of undirected) {
    for (const [from, to] of [[edge.a, edge.b], [edge.b, edge.a]] as const) {
      const angle = Math.atan2(nodes[to].y - nodes[from].y, nodes[to].x - nodes[from].x);
      const dir: DirEdge = { from, to, wallId: edge.wallId, angle, thickness: edge.thickness };
      directed.push(dir);
      const list = outgoing.get(from) ?? [];
      list.push(dir);
      outgoing.set(from, list);
    }
  }

  const degree = new Map<number, number>();
  for (const edge of undirected) {
    degree.set(edge.a, (degree.get(edge.a) ?? 0) + 1);
    degree.set(edge.b, (degree.get(edge.b) ?? 0) + 1);
  }
  const openEnds: OpenEnd[] = [];
  for (const [index, count] of degree) {
    if (count !== 1) continue;
    const edge = undirected.find((item) => item.a === index || item.b === index);
    if (!edge) continue;
    openEnds.push({ storyId, wallId: edge.wallId, point: nodes[index] });
  }

  const used = new Set<string>();
  const spaces: DetectedSpace[] = [];
  const notes: string[] = [];
  const key = (edge: DirEdge) => `${edge.from}>${edge.to}:${edge.wallId}`;
  for (const start of directed) {
    if (used.has(key(start))) continue;
    const cycle: DirEdge[] = [];
    let current: DirEdge | null = start;
    let guard = 0;
    while (current && guard < 200) {
      if (cycle.length && key(current) === key(start)) break;
      if (used.has(key(current))) break;
      used.add(key(current));
      cycle.push(current);
      current = rightTurn(current, outgoing.get(current.to) ?? []);
      guard += 1;
    }
    if (cycle.length < 3 || !current || key(current) !== key(start)) continue;
    const polygon = cycle.map((edge) => nodes[edge.from]);
    const area = signedArea(polygon);
    if (area < LIMITS.minPolygonArea) continue;
    const wallIds = [...new Set(cycle.map((edge) => edge.wallId))];
    const outline = insetCycle(polygon, cycle.map((edge) => edge.thickness / 2));
    if (!outline) {
      notes.push("A closed wall loop was too narrow or irregular to turn into a room outline.");
      continue;
    }
    spaces.push({
      storyId,
      outline,
      areaMm2: polygonArea(outline),
      perimeterMm: perimeter(outline),
      wallIds,
    });
  }
  return { spaces: dedupe(spaces), openEnds, notes };
}

function rightTurn(arrival: DirEdge, options: DirEdge[]): DirEdge | null {
  const back = normalize(arrival.angle + Math.PI);
  let best: DirEdge | null = null;
  let bestDelta = Infinity;
  for (const candidate of options) {
    const delta = normalize(back - candidate.angle);
    if (delta < 1e-4) continue;
    if (delta < bestDelta) {
      bestDelta = delta;
      best = candidate;
    }
  }
  return best;
}

function insetCycle(points: Vec2[], offsets: number[]): Vec2[] | null {
  const count = points.length;
  const lines: { a: Vec2; b: Vec2 }[] = [];
  for (let i = 0; i < count; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % count];
    const length = distance(a, b);
    if (length < 1) return null;
    const lx = -(b.y - a.y) / length;
    const ly = (b.x - a.x) / length;
    const offset = offsets[i];
    lines.push({
      a: { x: a.x + lx * offset, y: a.y + ly * offset },
      b: { x: b.x + lx * offset, y: b.y + ly * offset },
    });
  }
  const outline: Vec2[] = [];
  for (let i = 0; i < count; i += 1) {
    const previous = lines[(i + count - 1) % count];
    const current = lines[i];
    const hit = intersectLines(previous.a, previous.b, current.a, current.b);
    if (!hit) return null;
    outline.push({ x: Math.round(hit.x * 10) / 10, y: Math.round(hit.y * 10) / 10 });
  }
  if (polygonSelfIntersects(outline) || polygonArea(outline) < LIMITS.minPolygonArea) return null;
  if (!pointInPolygon(centroid(outline), points) && !pointInPolygon(centroid(points), outline)) return null;
  return outline;
}

function dedupe(spaces: DetectedSpace[]): DetectedSpace[] {
  const seen = new Set<string>();
  const unique: DetectedSpace[] = [];
  for (const space of spaces) {
    const key = space.wallIds.slice().sort().join("|") + `|${Math.round(space.areaMm2)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(space);
  }
  return unique;
}

function perimeter(points: Vec2[]): number {
  let total = 0;
  for (let i = 0; i < points.length; i += 1) total += distance(points[i], points[(i + 1) % points.length]);
  return Math.round(total * 10) / 10;
}

function centroid(points: Vec2[]): Vec2 {
  const sum = points.reduce((acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }), { x: 0, y: 0 });
  return { x: sum.x / points.length, y: sum.y / points.length };
}

function normalize(angle: number): number {
  const tau = Math.PI * 2;
  const value = angle % tau;
  return value < 0 ? value + tau : value;
}

export function sameWallSet(a: string[] | undefined, b: string[]): boolean {
  if (!a || a.length !== b.length) return false;
  const left = [...a].sort();
  const right = [...b].sort();
  return left.every((id, index) => id === right[index]);
}

export function syncDerivedRooms(project: Project): Project {
  const next: Project = {
    ...project,
    elements: project.elements.map((element) => ({ ...element })),
  };
  const reports = new Map<string, SpaceReport>();
  next.elements = next.elements.map((element) => {
    if (element.type !== "room" || element.source !== "derived" || !element.boundaryWallIds?.length) return element;
    const report = reports.get(element.storyId) ?? detectSpaces(project, element.storyId);
    reports.set(element.storyId, report);
    const match = report.spaces.find((space) => sameWallSet(element.boundaryWallIds, space.wallIds));
    if (!match) return { ...element, sync: "detached" as const };
    return {
      ...element,
      outline: match.outline,
      areaMm2: Math.round(match.areaMm2),
      perimeterMm: match.perimeterMm,
      sync: "current" as const,
    };
  });
  return next;
}
