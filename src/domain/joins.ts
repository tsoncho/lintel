import {
  distance,
  ensureCcw,
  intersectLines,
  pointAlongWall,
  pointInPolygon,
  polygonArea,
  projectToSegment,
  wallCorners,
  wallFrame,
  wallLength,
} from "./geometry";
import type { Vec2, Wall } from "./types";

/**
 * Endpoints join when they lie within this distance of another wall centerline.
 * A gap larger than this stays open. 50 mm is enough for a deliberate corner and
 * rejects the near-miss cases covered by the geometry tests.
 */
export const JOIN_TOLERANCE_MM = 50;

export interface WallSolid {
  id: string;
  /** Plan polygon, left side then right side. Centerline data is unchanged. */
  footprint: Vec2[];
  /** 3D body along the centerline. Trimmed into a host wall, otherwise the full length. */
  bodyStart: number;
  bodyEnd: number;
}

export interface JoinFill {
  id: string;
  storyId: string;
  wallIds: [string, string];
  outline: Vec2[];
}

export function wallSolids(walls: Wall[]): WallSolid[] {
  return walls.flatMap((wall) => {
    const frame = wallFrame(wall);
    const footprint = footprintOf(wall, walls);
    if (!frame || !footprint) return [];
    const startAlong = Math.max(alongOf(wall, footprint[0]), alongOf(wall, footprint[3]));
    const endAlong = Math.min(alongOf(wall, footprint[1]), alongOf(wall, footprint[2]));
    let bodyStart = 0;
    let bodyEnd = frame.length;
    if (startAlong > 1) bodyStart = Math.max(0, startAlong - 2);
    if (endAlong < frame.length - 1) bodyEnd = Math.min(frame.length, endAlong + 2);
    if (bodyEnd - bodyStart < 10) {
      bodyStart = 0;
      bodyEnd = frame.length;
    }
    return [{ id: wall.id, footprint, bodyStart, bodyEnd }];
  });
}

export function joinFills(walls: Wall[]): JoinFill[] {
  const fills: JoinFill[] = [];
  const seen = new Set<string>();
  for (const wall of walls) {
    for (const end of ["start", "end"] as const) {
      const origin = end === "start" ? wall.start : wall.end;
      for (const other of partnersAt(wall, origin, walls)) {
        if (isTee(other, origin) || isTee(wall, end === "start" ? other.start : other.end)) continue;
        const key = [wall.id, other.id].sort().join("|") + `|${Math.round(origin.x)}|${Math.round(origin.y)}`;
        if (seen.has(key)) continue;
        const a = extensionPoly(wall, end, walls);
        const otherEnd = distance(other.start, origin) <= distance(other.end, origin) ? "start" : "end";
        const b = extensionPoly(other, otherEnd, walls);
        if (!a || !b) continue;
        const overlap = intersectConvex(ensureCcw(a), ensureCcw(b));
        if (polygonArea(overlap) < 400) continue;
        seen.add(key);
        fills.push({
          id: `join_${key}`,
          storyId: wall.storyId,
          wallIds: [wall.id, other.id],
          outline: overlap,
        });
      }
    }
  }
  return fills;
}

/** Portions of a footprint edge that are not buried inside another wall. */
export function exteriorEdges(footprints: Vec2[][]): [Vec2, Vec2][] {
  const edges: [Vec2, Vec2][] = [];
  footprints.forEach((polygon, index) => {
    for (let i = 0; i < polygon.length; i += 1) {
      const a = polygon[i];
      const b = polygon[(i + 1) % polygon.length];
      edges.push(...outsidePortions(a, b, footprints, index));
    }
  });
  return edges;
}

function footprintOf(wall: Wall, walls: Wall[]): Vec2[] | null {
  const frame = wallFrame(wall);
  if (!frame) return null;
  const half = wall.thickness / 2;
  return [
    capPoint(wall, "start", half, walls),
    capPoint(wall, "end", half, walls),
    capPoint(wall, "end", -half, walls),
    capPoint(wall, "start", -half, walls),
  ];
}

function capPoint(wall: Wall, end: "start" | "end", lateral: number, walls: Wall[]): Vec2 {
  const frame = wallFrame(wall);
  if (!frame) return end === "start" ? wall.start : wall.end;
  const along0 = end === "start" ? 0 : frame.length;
  const fallback = pointAlongWall(wall, along0, lateral);
  const origin = end === "start" ? wall.start : wall.end;
  const partners = partnersAt(wall, origin, walls);
  if (!partners.length) return fallback;

  let best = fallback;
  let bestScore = Infinity;
  const probe = pointAlongWall(wall, along0 + (end === "start" ? -2000 : 2000), lateral);
  for (const other of partners) {
    const tee = isTee(other, origin);
    const limit = Math.max(wall.thickness, other.thickness);
    for (const otherLateral of [other.thickness / 2, -other.thickness / 2]) {
      const hit = intersectLines(
        fallback,
        probe,
        pointAlongWall(other, 0, otherLateral),
        pointAlongWall(other, wallLength(other), otherLateral),
      );
      if (!hit) continue;
      const along = alongOf(wall, hit);
      const extension = end === "start" ? -along : along - frame.length;
      if (extension > limit || extension < -limit) continue;
      let score = Infinity;
      if (tee) {
        if (extension > JOIN_TOLERANCE_MM) continue;
        score = Math.abs(extension);
      } else if (extension >= -JOIN_TOLERANCE_MM) {
        score = extension;
      }
      if (score < bestScore) {
        bestScore = score;
        best = hit;
      }
    }
  }
  return best;
}

function partnersAt(wall: Wall, origin: Vec2, walls: Wall[]): Wall[] {
  return walls.filter((other) => {
    if (other.id === wall.id || other.storyId !== wall.storyId) return false;
    if (distance(other.start, origin) <= JOIN_TOLERANCE_MM || distance(other.end, origin) <= JOIN_TOLERANCE_MM) return true;
    const projected = projectToSegment(origin, other.start, other.end);
    return projected.distance <= JOIN_TOLERANCE_MM && projected.t > 0.02 && projected.t < 0.98;
  });
}

function isTee(host: Wall, point: Vec2): boolean {
  if (distance(host.start, point) <= JOIN_TOLERANCE_MM || distance(host.end, point) <= JOIN_TOLERANCE_MM) return false;
  const projected = projectToSegment(point, host.start, host.end);
  return projected.distance <= JOIN_TOLERANCE_MM && projected.t > 0.02 && projected.t < 0.98;
}

function alongOf(wall: Wall, point: Vec2): number {
  const frame = wallFrame(wall);
  if (!frame) return 0;
  return (point.x - wall.start.x) * frame.ux + (point.y - wall.start.y) * frame.uy;
}

function extensionPoly(wall: Wall, end: "start" | "end", walls: Wall[]): Vec2[] | null {
  const simple = wallCorners(wall);
  const footprint = footprintOf(wall, walls);
  if (!simple || !footprint) return null;
  const poly = end === "start"
    ? [simple[0], footprint[0], footprint[3], simple[3]]
    : [simple[1], footprint[1], footprint[2], simple[2]];
  if (polygonArea(poly) < 400) return null;
  return poly;
}

function outsidePortions(a: Vec2, b: Vec2, footprints: Vec2[][], self: number): [Vec2, Vec2][] {
  const samples = 16;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy);
  if (length < 1) return [];
  const ox = dy / length;
  const oy = -dx / length;
  const flags: boolean[] = [];
  for (let i = 0; i <= samples; i += 1) {
    const t = i / samples;
    const point = { x: a.x + dx * t + ox * 4, y: a.y + dy * t + oy * 4 };
    flags.push(!footprints.some((polygon, index) => index !== self && pointInPolygon(point, polygon)));
  }
  const spans: [Vec2, Vec2][] = [];
  let run: number | null = null;
  for (let i = 0; i <= samples; i += 1) {
    if (flags[i] && run === null) run = i;
    if ((!flags[i] || i === samples) && run !== null) {
      const endIndex = flags[i] && i === samples ? i : i - 1;
      if (endIndex > run) {
        spans.push([
          { x: a.x + dx * (run / samples), y: a.y + dy * (run / samples) },
          { x: a.x + dx * (endIndex / samples), y: a.y + dy * (endIndex / samples) },
        ]);
      }
      run = null;
    }
  }
  return spans;
}

function intersectConvex(subject: Vec2[], clip: Vec2[]): Vec2[] {
  let output = subject.slice();
  for (let i = 0; i < clip.length; i += 1) {
    const edgeA = clip[i];
    const edgeB = clip[(i + 1) % clip.length];
    const input = output;
    output = [];
    if (!input.length) break;
    for (let j = 0; j < input.length; j += 1) {
      const start = input[j];
      const end = input[(j + 1) % input.length];
      const startIn = insideEdge(edgeA, edgeB, start);
      const endIn = insideEdge(edgeA, edgeB, end);
      if (startIn && endIn) output.push(end);
      else if (startIn && !endIn) {
        const hit = intersectLines(start, end, edgeA, edgeB);
        if (hit) output.push(hit);
      } else if (!startIn && endIn) {
        const hit = intersectLines(start, end, edgeA, edgeB);
        if (hit) output.push(hit);
        output.push(end);
      }
    }
  }
  return output;
}

function insideEdge(a: Vec2, b: Vec2, point: Vec2): boolean {
  return (b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x) >= -1;
}
