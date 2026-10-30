import { distance, openingInterval, pointInPolygon, polygonArea, projectToSegment, wallFrame } from "../domain/geometry";
import { elementById, hostedOpenings } from "../domain/queries";
import type { Project, Room, Slab, Vec2, Wall } from "../domain/types";
import { isUnknownElement } from "../domain/types";
import { worldToScreen, type Viewport } from "./viewport";

export type PlanHit =
  | { kind: "handle"; id: string; handle: "start" | "end" | number }
  | { kind: "element"; id: string };

export function hitTestPlan(
  project: Project,
  storyId: string,
  world: Vec2,
  view: Viewport,
  selection: string[],
): PlanHit | null {
  if (selection.length === 1) {
    const handle = hitHandle(project, selection[0], world, view);
    if (handle) return handle;
  }

  let bestWall: { id: string; distance: number } | null = null;
  for (const element of project.elements) {
    if (element.type !== "wall" || element.storyId !== storyId) continue;
    const projected = projectToSegment(world, element.start, element.end);
    const slop = Math.max(element.thickness / 2, 8 / view.zoom);
    if (projected.distance > slop) continue;
    for (const opening of hostedOpenings(project, element.id)) {
      const interval = openingInterval(opening.offset, opening.width);
      if (projected.along >= interval.start - 1 && projected.along <= interval.end + 1) {
        return { kind: "element", id: opening.id };
      }
    }
    if (!bestWall || projected.distance < bestWall.distance) {
      bestWall = { id: element.id, distance: projected.distance };
    }
  }
  if (bestWall) return { kind: "element", id: bestWall.id };

  const rooms = project.elements.filter(
    (element): element is Room => element.type === "room" && element.storyId === storyId && pointInPolygon(world, element.outline),
  );
  const room = smallest(rooms);
  if (room) return { kind: "element", id: room.id };
  const slabs = project.elements.filter(
    (element): element is Slab => element.type === "slab" && element.storyId === storyId && pointInPolygon(world, element.outline),
  );
  const slab = smallest(slabs);
  if (slab) return { kind: "element", id: slab.id };

  const gridTolerance = 8 / view.zoom;
  for (const element of project.elements) {
    if (element.type !== "section") continue;
    const projected = projectToSegment(world, element.start, element.end);
    if (projected.distance <= gridTolerance) return { kind: "element", id: element.id };
  }
  for (const element of project.elements) {
    if (element.type !== "gridline") continue;
    const delta = element.axis === "x" ? Math.abs(world.x - element.position) : Math.abs(world.y - element.position);
    if (delta <= gridTolerance) return { kind: "element", id: element.id };
  }
  return null;
}

export function nearestWall(
  project: Project,
  storyId: string,
  world: Vec2,
  zoom: number,
): { wall: Wall; along: number } | null {
  let best: { wall: Wall; along: number; distance: number } | null = null;
  for (const element of project.elements) {
    if (element.type !== "wall" || element.storyId !== storyId) continue;
    if (!wallFrame(element)) continue;
    const projected = projectToSegment(world, element.start, element.end);
    const slop = Math.max(element.thickness / 2 + 40, 18 / zoom);
    if (projected.distance > slop) continue;
    if (!best || projected.distance < best.distance) {
      best = { wall: element, along: projected.along, distance: projected.distance };
    }
  }
  return best ? { wall: best.wall, along: best.along } : null;
}

function hitHandle(project: Project, id: string, world: Vec2, view: Viewport): PlanHit | null {
  const element = elementById(project, id);
  if (!element || isUnknownElement(element)) return null;
  const tolerance = 11 / view.zoom;
  if (element.type === "wall") {
    if (distance(world, element.start) <= tolerance) return { kind: "handle", id, handle: "start" };
    if (distance(world, element.end) <= tolerance) return { kind: "handle", id, handle: "end" };
  }
  if (element.type === "slab" || element.type === "room") {
    for (let index = 0; index < element.outline.length; index += 1) {
      if (distance(world, element.outline[index]) <= tolerance) return { kind: "handle", id, handle: index };
    }
  }
  if (element.type === "section") {
    if (distance(world, element.start) <= tolerance) return { kind: "handle", id, handle: "start" };
    if (distance(world, element.end) <= tolerance) return { kind: "handle", id, handle: "end" };
  }
  return null;
}

function smallest(elements: { id: string; outline: Vec2[] }[]): { id: string; outline: Vec2[] } | null {
  let best: { id: string; outline: Vec2[] } | null = null;
  let area = Infinity;
  for (const element of elements) {
    const next = polygonArea(element.outline);
    if (next < area) {
      area = next;
      best = element;
    }
  }
  return best;
}

export function screenDistance(view: Viewport, a: Vec2, b: Vec2): number {
  const sa = worldToScreen(view, a);
  const sb = worldToScreen(view, b);
  return Math.hypot(sa.x - sb.x, sa.y - sb.y);
}
