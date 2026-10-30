import { distance, intersectLines, pointInPolygon, projectToSegment, wallFrame } from "./geometry";
import { hostedOpenings, stories } from "./queries";
import type { Project, Section, Vec2 } from "./types";

export interface SectionMark {
  kind: "wall" | "beyond" | "slab" | "opening" | "room" | "story";
  id: string;
  /** Station along the section line, mm. */
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  label?: string;
}

export interface SectionDrawing {
  length: number;
  items: SectionMark[];
  notes: string[];
}

const PARALLEL = Math.sin((18 * Math.PI) / 180);

/** Cut and elevation graphics for one section. Geometry that is not modeled is named in `notes`. */
export function buildSection(project: Project, section: Section): SectionDrawing {
  const frame = direction(section.start, section.end);
  const notes = ["Roofs, stairs, and other unmodeled elements are not shown."];
  if (!frame) return { length: 0, items: [], notes: ["The section line is too short."] };
  const items: SectionMark[] = [];
  const storyById = new Map(stories(project).map((story) => [story.id, story]));

  for (const story of storyById.values()) {
    items.push({
      kind: "story",
      id: story.id,
      x0: 0,
      x1: frame.length,
      z0: story.elevation,
      z1: story.elevation,
      label: story.name,
    });
  }

  for (const element of project.elements) {
    if (element.type === "wall") {
      const story = storyById.get(element.storyId);
      const wallDirection = wallFrame(element);
      if (!story || !wallDirection) continue;
      const base = story.elevation + element.baseOffset;
      const crossing = segmentIntersection(section.start, section.end, element.start, element.end);
      const sine = Math.abs(frame.ux * wallDirection.uy - frame.uy * wallDirection.ux);
      if (crossing && sine >= PARALLEL) {
        const station = crossing.t * frame.length;
        const width = element.thickness / sine;
        const along = projectToSegment(crossing.point, element.start, element.end).along;
        items.push({
          kind: "wall",
          id: element.id,
          x0: station - width / 2,
          x1: station + width / 2,
          z0: base,
          z1: base + element.height,
        });
        for (const opening of hostedOpenings(project, element.id)) {
          const start = opening.offset - opening.width / 2;
          const end = opening.offset + opening.width / 2;
          if (along < start - 1 || along > end + 1) continue;
          items.push({
            kind: "opening",
            id: opening.id,
            x0: station - width / 2,
            x1: station + width / 2,
            z0: base + opening.sill,
            z1: base + opening.sill + opening.height,
          });
        }
        continue;
      }
      const mid = { x: (element.start.x + element.end.x) / 2, y: (element.start.y + element.end.y) / 2 };
      const side = facingDistance(section, frame, mid);
      if (side < 0 || side > section.depth) continue;
      const a = stationOf(section, frame, element.start);
      const b = stationOf(section, frame, element.end);
      const x0 = Math.max(0, Math.min(a, b));
      const x1 = Math.min(frame.length, Math.max(a, b));
      if (x1 - x0 < 20) continue;
      items.push({ kind: "beyond", id: element.id, x0, x1, z0: base, z1: base + element.height });
      const wallLength = distance(element.start, element.end);
      for (const opening of hostedOpenings(project, element.id)) {
        const near = pointAlong(element.start, element.end, wallLength, opening.offset - opening.width / 2);
        const far = pointAlong(element.start, element.end, wallLength, opening.offset + opening.width / 2);
        const left = stationOf(section, frame, near);
        const right = stationOf(section, frame, far);
        const openingX0 = Math.max(0, Math.min(left, right));
        const openingX1 = Math.min(frame.length, Math.max(left, right));
        if (openingX1 - openingX0 < 20) continue;
        items.push({
          kind: "opening",
          id: opening.id,
          x0: openingX0,
          x1: openingX1,
          z0: base + opening.sill,
          z1: base + opening.sill + opening.height,
        });
      }
    }
    if (element.type === "slab" || element.type === "room") {
      const story = storyById.get(element.storyId);
      if (!story) continue;
      for (const [x0, x1] of polygonSpans(section.start, section.end, element.outline, frame.length)) {
        if (element.type === "slab") {
          const top = story.elevation + element.elevationOffset;
          items.push({ kind: "slab", id: element.id, x0, x1, z0: top - element.thickness, z1: top });
        } else {
          items.push({
            kind: "room",
            id: element.id,
            x0,
            x1,
            z0: story.elevation,
            z1: story.elevation,
            label: `${element.number} ${element.name}`,
          });
        }
      }
    }
  }

  if (project.elements.some((element) => element.type === "preserved")) {
    notes.unshift("This project has preserved elements. They do not appear in the section.");
  }
  return { length: frame.length, items, notes };
}

function direction(start: Vec2, end: Vec2): { length: number; ux: number; uy: number; nx: number; ny: number } | null {
  const length = distance(start, end);
  if (length < 200) return null;
  const ux = (end.x - start.x) / length;
  const uy = (end.y - start.y) / length;
  return { length, ux, uy, nx: -uy, ny: ux };
}

function facingDistance(section: Section, frame: { nx: number; ny: number }, point: Vec2): number {
  const signed = (point.x - section.start.x) * frame.nx + (point.y - section.start.y) * frame.ny;
  return section.facing === "left" ? signed : -signed;
}

function stationOf(section: Section, frame: { ux: number; uy: number }, point: Vec2): number {
  return (point.x - section.start.x) * frame.ux + (point.y - section.start.y) * frame.uy;
}

function pointAlong(start: Vec2, end: Vec2, length: number, distanceAlong: number): Vec2 {
  if (length < 1) return start;
  const t = distanceAlong / length;
  return { x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t };
}

function segmentIntersection(a1: Vec2, a2: Vec2, b1: Vec2, b2: Vec2): { point: Vec2; t: number } | null {
  const hit = intersectLines(a1, a2, b1, b2);
  if (!hit) return null;
  const ab = distance(a1, a2);
  const cd = distance(b1, b2);
  if (ab < 1 || cd < 1) return null;
  const t = ((hit.x - a1.x) * (a2.x - a1.x) + (hit.y - a1.y) * (a2.y - a1.y)) / (ab * ab);
  const u = ((hit.x - b1.x) * (b2.x - b1.x) + (hit.y - b1.y) * (b2.y - b1.y)) / (cd * cd);
  if (t < -0.001 || t > 1.001 || u < -0.001 || u > 1.001) return null;
  return { point: hit, t: Math.min(1, Math.max(0, t)) };
}

function polygonSpans(start: Vec2, end: Vec2, polygon: Vec2[], length: number): [number, number][] {
  const params = new Set<number>();
  for (let i = 0; i < polygon.length; i += 1) {
    const hit = segmentIntersection(start, end, polygon[i], polygon[(i + 1) % polygon.length]);
    if (hit) params.add(Math.round(hit.t * 1000) / 1000);
  }
  const marks = [0, ...[...params].sort((a, b) => a - b), 1];
  const spans: [number, number][] = [];
  for (let i = 0; i < marks.length - 1; i += 1) {
    const mid = (marks[i] + marks[i + 1]) / 2;
    const point = { x: start.x + (end.x - start.x) * mid, y: start.y + (end.y - start.y) * mid };
    if (!pointInPolygon(point, polygon)) continue;
    const x0 = marks[i] * length;
    const x1 = marks[i + 1] * length;
    if (x1 - x0 > 20) spans.push([x0, x1]);
  }
  return spans;
}
