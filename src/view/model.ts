import { ensureCcw, openingFits, openingInterval, pointAlongWall, wallFrame } from "../domain/geometry";
import { joinFills, wallSolids } from "../domain/joins";
import { hostedOpenings, projectBounds, stories } from "../domain/queries";
import type { Bounds, Project, Vec2, Wall } from "../domain/types";

export interface HoleRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface WallPart {
  kind: "wall";
  id: string;
  length: number;
  height: number;
  thickness: number;
  holes: HoleRect[];
  /** Column-major matrix into three.js, Y up. */
  matrix: number[];
}

export interface FlatPart {
  kind: "slab" | "room" | "join";
  id: string;
  outline: Vec2[];
  bottomZ: number;
  height: number;
  matrix: number[];
}

export interface BoxPart {
  kind: "door" | "window";
  id: string;
  width: number;
  height: number;
  depth: number;
  matrix: number[];
}

export interface GridPart {
  kind: "grid";
  id: string;
  name: string;
  /** Architectural millimeters. */
  ax: number;
  ay: number;
  az: number;
  bx: number;
  by: number;
  bz: number;
}

export type ModelPart = WallPart | FlatPart | BoxPart | GridPart;

export function buildModel(project: Project): { parts: ModelPart[]; bounds: Bounds | null } {
  const storyById = new Map(stories(project).map((story) => [story.id, story]));
  const parts: ModelPart[] = [];
  const bounds = projectBounds(project);
  const allWalls = project.elements.filter((element): element is Wall => element.type === "wall");
  const solids = new Map(wallSolids(allWalls).map((item) => [item.id, item]));

  for (const element of project.elements) {
    if (element.type === "wall") {
      const frame = wallFrame(element);
      const story = storyById.get(element.storyId);
      const solid = solids.get(element.id);
      if (!frame || !story || !solid) continue;
      const baseZ = story.elevation + element.baseOffset;
      const holes: HoleRect[] = [];
      for (const opening of hostedOpenings(project, element.id)) {
        if (!openingFits(frame.length, opening.offset, opening.width)) continue;
        if (opening.sill + opening.height > element.height + 0.5) continue;
        const interval = openingInterval(opening.offset, opening.width);
        const hole = insetHole(
          interval.start - solid.bodyStart,
          opening.sill,
          opening.width,
          opening.height,
          solid.bodyEnd - solid.bodyStart,
          element.height,
        );
        if (hole) holes.push(hole);
        parts.push(openingBox(element, opening, frame, baseZ));
      }
      const origin = pointAlongWall(element, solid.bodyStart);
      const px = origin.x - frame.nx * element.thickness / 2;
      const py = origin.y - frame.ny * element.thickness / 2;
      parts.push({
        kind: "wall",
        id: element.id,
        length: solid.bodyEnd - solid.bodyStart,
        height: element.height,
        thickness: element.thickness,
        holes,
        matrix: mat4(
          [frame.ux, 0, -frame.uy, 0],
          [0, 1, 0, 0],
          [frame.nx, 0, -frame.ny, 0],
          [px, baseZ, -py, 1],
        ),
      });
    }
    if (element.type === "slab" || element.type === "room") {
      const story = storyById.get(element.storyId);
      if (!story) continue;
      const bottomZ = element.type === "slab"
        ? story.elevation + element.elevationOffset - element.thickness
        : story.elevation + 30;
      const height = element.type === "slab" ? element.thickness : 50;
      parts.push({
        kind: element.type,
        id: element.id,
        outline: ensureCcw(element.outline),
        bottomZ,
        height,
        matrix: mat4([1, 0, 0, 0], [0, 0, -1, 0], [0, 1, 0, 0], [0, bottomZ, 0, 1]),
      });
    }
  }

  for (const fill of joinFills(allWalls)) {
    const hosts = fill.wallIds
      .map((id) => allWalls.find((wall) => wall.id === id))
      .filter((wall): wall is Wall => Boolean(wall));
    if (hosts.length < 2) continue;
    const story = storyById.get(fill.storyId);
    if (!story) continue;
    const bottoms = hosts.map((wall) => story.elevation + wall.baseOffset);
    const tops = hosts.map((wall) => story.elevation + wall.baseOffset + wall.height);
    const bottomZ = Math.max(...bottoms);
    const topZ = Math.min(...tops);
    if (topZ - bottomZ < 50) continue;
    parts.push({
      kind: "join",
      id: fill.id,
      outline: ensureCcw(fill.outline),
      bottomZ,
      height: topZ - bottomZ,
      matrix: mat4([1, 0, 0, 0], [0, 0, -1, 0], [0, 1, 0, 0], [0, bottomZ, 0, 1]),
    });
  }

  if (bounds) {
    const margin = 1500;
    const top = bounds.maxZ + 400;
    for (const element of project.elements) {
      if (element.type !== "gridline") continue;
      if (element.axis === "x") {
        parts.push(grid(element.id, element.name, element.position, bounds.minY - margin, 0, element.position, bounds.maxY + margin, 0));
        parts.push(grid(`${element.id}:up`, element.name, element.position, bounds.minY - margin, 0, element.position, bounds.minY - margin, top));
      } else {
        parts.push(grid(element.id, element.name, bounds.minX - margin, element.position, 0, bounds.maxX + margin, element.position, 0));
        parts.push(grid(`${element.id}:up`, element.name, bounds.minX - margin, element.position, 0, bounds.minX - margin, element.position, top));
      }
    }
  }

  return { parts, bounds };
}

function openingBox(
  wall: { start: Vec2; end: Vec2 },
  opening: { id: string; type: "door" | "window"; offset: number; width: number; height: number; sill: number },
  frame: { ux: number; uy: number; nx: number; ny: number },
  baseZ: number,
): BoxPart {
  const cx = wall.start.x + frame.ux * opening.offset;
  const cy = wall.start.y + frame.uy * opening.offset;
  const cz = baseZ + opening.sill + opening.height / 2;
  const leaf = opening.type === "door" ? 46 : 28;
  return {
    kind: opening.type,
    id: opening.id,
    width: opening.width * 0.94,
    height: opening.height * 0.96,
    depth: leaf,
    matrix: mat4(
      [frame.ux, 0, -frame.uy, 0],
      [0, 1, 0, 0],
      [frame.nx, 0, -frame.ny, 0],
      [cx, cz, -cy, 1],
    ),
  };
}

function insetHole(x: number, y: number, w: number, h: number, length: number, height: number): HoleRect | null {
  const margin = 2;
  let left = x;
  let bottom = y;
  let width = w;
  let holeHeight = h;
  if (left < margin) {
    width -= margin - left;
    left = margin;
  }
  if (bottom < margin) {
    holeHeight -= margin - bottom;
    bottom = margin;
  }
  if (left + width > length - margin) width = length - margin - left;
  if (bottom + holeHeight > height - margin) holeHeight = height - margin - bottom;
  if (width < 20 || holeHeight < 20) return null;
  return { x: left, y: bottom, w: width, h: holeHeight };
}

function grid(id: string, name: string, x1: number, y1: number, z1: number, x2: number, y2: number, z2: number): GridPart {
  return { kind: "grid", id, name, ax: x1, ay: y1, az: z1, bx: x2, by: y2, bz: z2 };
}

function mat4(c0: number[], c1: number[], c2: number[], c3: number[]): number[] {
  return [
    c0[0], c0[1], c0[2], c0[3],
    c1[0], c1[1], c1[2], c1[3],
    c2[0], c2[1], c2[2], c2[3],
    c3[0], c3[1], c3[2], c3[3],
  ];
}
