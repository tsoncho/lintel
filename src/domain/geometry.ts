import type { Vec2, Wall } from "./types";

/** Comparisons tighter than this are treated as equal, in millimeters. */
export const TOLERANCE_MM = 0.5;

export function roundMm(value: number): number {
  return Math.round(value * 10) / 10;
}

export function roundPoint(point: Vec2): Vec2 {
  return { x: roundMm(point.x), y: roundMm(point.y) };
}

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scale(a: Vec2, factor: number): Vec2 {
  return { x: a.x * factor, y: a.y * factor };
}

export function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function almostEqual(a: number, b: number, tolerance = TOLERANCE_MM): boolean {
  return Math.abs(a - b) <= tolerance;
}

export function samePoint(a: Vec2, b: Vec2, tolerance = TOLERANCE_MM): boolean {
  return distance(a, b) <= tolerance;
}

export interface WallFrame {
  length: number;
  ux: number;
  uy: number;
  /** Left normal when walking from start to end. */
  nx: number;
  ny: number;
}

export function wallFrame(wall: Pick<Wall, "start" | "end">): WallFrame | null {
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const length = Math.hypot(dx, dy);
  if (length < TOLERANCE_MM) return null;
  const ux = dx / length;
  const uy = dy / length;
  return { length, ux, uy, nx: -uy, ny: ux };
}

export function wallLength(wall: Pick<Wall, "start" | "end">): number {
  return Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y);
}

export function pointAlongWall(wall: Pick<Wall, "start" | "end">, along: number, lateral = 0): Vec2 {
  const frame = wallFrame(wall);
  if (!frame) return { ...wall.start };
  return {
    x: wall.start.x + frame.ux * along + frame.nx * lateral,
    y: wall.start.y + frame.uy * along + frame.ny * lateral,
  };
}

export interface SegmentHit {
  point: Vec2;
  /** 0 at the start, 1 at the end. */
  t: number;
  distance: number;
  along: number;
}

export function projectToSegment(point: Vec2, start: Vec2, end: Vec2): SegmentHit {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len2 = dx * dx + dy * dy;
  const length = Math.sqrt(len2);
  if (length < 1e-9) {
    return { point: start, t: 0, distance: distance(point, start), along: 0 };
  }
  const raw = ((point.x - start.x) * dx + (point.y - start.y) * dy) / len2;
  const t = Math.min(1, Math.max(0, raw));
  const projected = { x: start.x + dx * t, y: start.y + dy * t };
  return { point: projected, t, distance: distance(point, projected), along: t * length };
}

export function constrainOrthogonal(origin: Vec2, point: Vec2): Vec2 {
  if (Math.abs(point.x - origin.x) >= Math.abs(point.y - origin.y)) {
    return { x: point.x, y: origin.y };
  }
  return { x: origin.x, y: point.y };
}

export function signedArea(points: Vec2[]): number {
  let area = 0;
  for (let i = 0; i < points.length; i += 1) {
    const next = points[(i + 1) % points.length];
    area += points[i].x * next.y - next.x * points[i].y;
  }
  return area / 2;
}

export function polygonArea(points: Vec2[]): number {
  return Math.abs(signedArea(points));
}

export function ensureCcw(points: Vec2[]): Vec2[] {
  return signedArea(points) < 0 ? [...points].reverse() : points.slice();
}

export function polygonCentroid(points: Vec2[]): Vec2 {
  const area = signedArea(points);
  if (Math.abs(area) < 1) {
    const avg = points.reduce((sum, point) => add(sum, point), { x: 0, y: 0 });
    return { x: avg.x / points.length, y: avg.y / points.length };
  }
  let x = 0;
  let y = 0;
  for (let i = 0; i < points.length; i += 1) {
    const next = points[(i + 1) % points.length];
    const cross = points[i].x * next.y - next.x * points[i].y;
    x += (points[i].x + next.x) * cross;
    y += (points[i].y + next.y) * cross;
  }
  return { x: x / (6 * area), y: y / (6 * area) };
}

export function pointInPolygon(point: Vec2, polygon: Vec2[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const a = polygon[i];
    const b = polygon[j];
    const crosses = a.y > point.y !== b.y > point.y;
    if (!crosses) continue;
    const x = ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x;
    if (point.x < x) inside = !inside;
  }
  return inside;
}

function cross(a: Vec2, b: Vec2, c: Vec2): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

/** Proper intersection, ignoring shared endpoints and collinear touches. */
export function segmentsIntersect(a1: Vec2, a2: Vec2, b1: Vec2, b2: Vec2): boolean {
  const o1 = cross(a1, a2, b1);
  const o2 = cross(a1, a2, b2);
  const o3 = cross(b1, b2, a1);
  const o4 = cross(b1, b2, a2);
  return o1 * o2 < 0 && o3 * o4 < 0;
}

export function polygonSelfIntersects(points: Vec2[]): boolean {
  const count = points.length;
  if (count < 4) return false;
  for (let i = 0; i < count; i += 1) {
    const a1 = points[i];
    const a2 = points[(i + 1) % count];
    for (let j = i + 1; j < count; j += 1) {
      if (Math.abs(i - j) <= 1) continue;
      if (i === 0 && j === count - 1) continue;
      const b1 = points[j];
      const b2 = points[(j + 1) % count];
      if (segmentsIntersect(a1, a2, b1, b2)) return true;
    }
  }
  return false;
}

export interface OpeningInterval {
  start: number;
  end: number;
  center: number;
}

export function openingInterval(offset: number, width: number): OpeningInterval {
  return { start: offset - width / 2, end: offset + width / 2, center: offset };
}

export function openingFits(wallLength: number, offset: number, width: number): boolean {
  const interval = openingInterval(offset, width);
  return interval.start >= -TOLERANCE_MM && interval.end <= wallLength + TOLERANCE_MM && width > 0;
}

export function openingsOverlap(openings: { offset: number; width: number }[]): boolean {
  const intervals = openings
    .map((opening) => openingInterval(opening.offset, opening.width))
    .sort((a, b) => a.start - b.start);
  for (let i = 1; i < intervals.length; i += 1) {
    if (intervals[i].start < intervals[i - 1].end - TOLERANCE_MM) return true;
  }
  return false;
}

export function wallCorners(wall: Pick<Wall, "start" | "end" | "thickness">): Vec2[] | null {
  const frame = wallFrame(wall);
  if (!frame) return null;
  const half = wall.thickness / 2;
  const leftStart = { x: wall.start.x + frame.nx * half, y: wall.start.y + frame.ny * half };
  const leftEnd = { x: wall.end.x + frame.nx * half, y: wall.end.y + frame.ny * half };
  const rightEnd = { x: wall.end.x - frame.nx * half, y: wall.end.y - frame.ny * half };
  const rightStart = { x: wall.start.x - frame.nx * half, y: wall.start.y - frame.ny * half };
  return [leftStart, leftEnd, rightEnd, rightStart];
}

export interface DoorSwing {
  hinge: Vec2;
  arc: Vec2[];
}

export function doorSwing(wall: Pick<Wall, "start" | "end">, door: {
  offset: number;
  width: number;
  hinge: "start" | "end";
  swing: "left" | "right";
}): DoorSwing | null {
  const frame = wallFrame(wall);
  if (!frame) return null;
  const half = door.width / 2;
  const hingeAlong = door.hinge === "start" ? door.offset - half : door.offset + half;
  const closedDir = door.hinge === "start" ? 1 : -1;
  const normalSign = door.swing === "left" ? 1 : -1;
  const hinge = {
    x: wall.start.x + frame.ux * hingeAlong,
    y: wall.start.y + frame.uy * hingeAlong,
  };
  const arc: Vec2[] = [];
  const steps = 16;
  for (let i = 0; i <= steps; i += 1) {
    const angle = (i / steps) * (Math.PI / 2);
    const dx = closedDir * frame.ux * Math.cos(angle) + normalSign * frame.nx * Math.sin(angle);
    const dy = closedDir * frame.uy * Math.cos(angle) + normalSign * frame.ny * Math.sin(angle);
    arc.push({ x: hinge.x + dx * door.width, y: hinge.y + dy * door.width });
  }
  return { hinge, arc };
}

export function expandBounds(
  bounds: { minX: number; minY: number; maxX: number; maxY: number } | null,
  point: Vec2,
): { minX: number; minY: number; maxX: number; maxY: number } {
  if (!bounds) {
    return { minX: point.x, minY: point.y, maxX: point.x, maxY: point.y };
  }
  return {
    minX: Math.min(bounds.minX, point.x),
    minY: Math.min(bounds.minY, point.y),
    maxX: Math.max(bounds.maxX, point.x),
    maxY: Math.max(bounds.maxY, point.y),
  };
}
