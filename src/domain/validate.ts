import { openingFits, openingsOverlap, polygonArea, polygonSelfIntersects, wallLength } from "./geometry";
import { isUnknownElement, type Door, type Element, type Project, type Window } from "./types";

export const LIMITS = {
  maxAbsCoord: 100_000_000,
  name: 120,
  material: 80,
  roomNumber: 24,
  gridName: 16,
  minWallLength: 50,
  wallThickness: [20, 2000] as const,
  wallHeight: [100, 100_000] as const,
  baseOffset: [-5_000, 100_000] as const,
  openingWidth: [200, 20_000] as const,
  openingHeight: [200, 20_000] as const,
  sill: [0, 20_000] as const,
  slabThickness: [20, 5_000] as const,
  elevationOffset: [-20_000, 20_000] as const,
  storyHeight: [100, 100_000] as const,
  storyElevation: [-100_000_000, 100_000_000] as const,
  minPolygonArea: 10_000,
  minEdge: 10,
  maxElements: 5_000,
} as const;

function inRange(value: number, range: readonly [number, number]): boolean {
  return value >= range[0] && value <= range[1];
}

function finiteCoord(value: number): boolean {
  return Number.isFinite(value) && Math.abs(value) <= LIMITS.maxAbsCoord;
}

export function validateProject(project: Project): string[] {
  const errors: string[] = [];
  if (!project.id) errors.push("Project is missing an id.");
  if (!project.name.trim()) errors.push("Project name is empty.");
  if (project.name.length > LIMITS.name) errors.push("Project name is too long.");
  if (project.displayUnit !== "mm" && project.displayUnit !== "m") {
    errors.push("Display unit must be mm or m.");
  }
  if (project.elements.length > LIMITS.maxElements) {
    errors.push(`A project can hold at most ${LIMITS.maxElements} elements.`);
  }

  const ids = new Set<string>();
  for (const element of project.elements) {
    if (!element.id) {
      errors.push("An element is missing an id.");
      continue;
    }
    if (ids.has(element.id)) errors.push(`Duplicate element id ${element.id}.`);
    ids.add(element.id);
    if (isUnknownElement(element)) continue;
    validateKnown(element, errors);
  }

  const stories = new Map(
    project.elements.filter((element) => element.type === "story" && !isUnknownElement(element)).map((element) => [element.id, element]),
  );
  if (stories.size === 0) errors.push("A project needs at least one story.");

  const walls = new Map(
    project.elements.filter((element) => element.type === "wall").map((element) => [element.id, element]),
  );

  for (const element of project.elements) {
    if (isUnknownElement(element)) continue;
    if (element.type === "wall" || element.type === "slab" || element.type === "room") {
      if (!stories.has(element.storyId)) {
        errors.push(`${element.type} ${element.id} refers to missing story ${element.storyId}.`);
      }
    }
    if (element.type === "door" || element.type === "window") {
      const wall = walls.get(element.wallId);
      if (!wall || wall.type !== "wall") {
        errors.push(`${element.type} ${element.id} refers to missing wall ${element.wallId}.`);
        continue;
      }
      const length = wallLength(wall);
      if (!openingFits(length, element.offset, element.width)) {
        errors.push(`${element.type} ${element.id} does not fit on wall ${wall.id}.`);
      }
      if (element.sill + element.height > wall.height + 0.5) {
        errors.push(`${element.type} ${element.id} is taller than wall ${wall.id}.`);
      }
    }
  }

  for (const wall of walls.values()) {
    if (wall.type !== "wall") continue;
    const hosted = project.elements.filter(
      (element): element is Door | Window =>
        (element.type === "door" || element.type === "window") && element.wallId === wall.id,
    );
    if (openingsOverlap(hosted)) {
      errors.push(`Openings overlap on wall ${wall.id}.`);
    }
  }

  return errors;
}

function validateKnown(element: Exclude<Element, { preserved: true }>, errors: string[]): void {
  switch (element.type) {
    case "story":
      if (!element.name.trim() || element.name.length > LIMITS.name) errors.push(`Story ${element.id} needs a name.`);
      if (!inRange(element.elevation, LIMITS.storyElevation)) errors.push(`Story ${element.id} elevation is out of range.`);
      if (!inRange(element.height, LIMITS.storyHeight)) errors.push(`Story ${element.id} height is out of range.`);
      break;
    case "gridline":
      if (!element.name.trim() || element.name.length > LIMITS.gridName) errors.push(`Grid ${element.id} needs a short name.`);
      if (element.axis !== "x" && element.axis !== "y") errors.push(`Grid ${element.id} axis must be x or y.`);
      if (!finiteCoord(element.position)) errors.push(`Grid ${element.id} position is out of range.`);
      break;
    case "wall": {
      if (!finiteCoord(element.start.x) || !finiteCoord(element.start.y) || !finiteCoord(element.end.x) || !finiteCoord(element.end.y)) {
        errors.push(`Wall ${element.id} has a coordinate out of range.`);
      }
      if (wallLength(element) < LIMITS.minWallLength) errors.push(`Wall ${element.id} is shorter than ${LIMITS.minWallLength} mm.`);
      if (!inRange(element.thickness, LIMITS.wallThickness)) errors.push(`Wall ${element.id} thickness is out of range.`);
      if (!inRange(element.height, LIMITS.wallHeight)) errors.push(`Wall ${element.id} height is out of range.`);
      if (!inRange(element.baseOffset, LIMITS.baseOffset)) errors.push(`Wall ${element.id} base offset is out of range.`);
      if (!element.material.trim() || element.material.length > LIMITS.material) errors.push(`Wall ${element.id} needs a material name.`);
      break;
    }
    case "slab":
    case "room":
      validateOutline(element.type, element.id, element.outline, errors);
      if (element.type === "slab") {
        if (!inRange(element.thickness, LIMITS.slabThickness)) errors.push(`Slab ${element.id} thickness is out of range.`);
        if (!inRange(element.elevationOffset, LIMITS.elevationOffset)) errors.push(`Slab ${element.id} elevation is out of range.`);
        if (!element.material.trim() || element.material.length > LIMITS.material) errors.push(`Slab ${element.id} needs a material name.`);
      } else {
        if (!element.name.trim() || element.name.length > LIMITS.name) errors.push(`Room ${element.id} needs a name.`);
        if (!element.number.trim() || element.number.length > LIMITS.roomNumber) errors.push(`Room ${element.id} needs a number.`);
        if (element.source && element.source !== "manual" && element.source !== "derived") errors.push(`Room ${element.id} source is invalid.`);
        if (element.source === "derived" && !element.boundaryWallIds?.length) errors.push(`Derived room ${element.id} needs the wall ids of its boundary.`);
        if (element.sync && element.sync !== "current" && element.sync !== "detached") errors.push(`Room ${element.id} sync state is invalid.`);
      }
      break;
    case "section":
      if (!element.name.trim() || element.name.length > LIMITS.name) errors.push(`Section ${element.id} needs a name.`);
      if (!finiteCoord(element.start.x) || !finiteCoord(element.start.y) || !finiteCoord(element.end.x) || !finiteCoord(element.end.y)) {
        errors.push(`Section ${element.id} has a coordinate out of range.`);
      }
      if (wallLength(element) < 200) errors.push(`Section ${element.id} is shorter than 200 mm.`);
      if (!inRange(element.depth, [100, 100_000])) errors.push(`Section ${element.id} depth is out of range.`);
      if (element.facing !== "left" && element.facing !== "right") errors.push(`Section ${element.id} facing must be left or right.`);
      break;
    case "door":
    case "window":
      if (!inRange(element.width, LIMITS.openingWidth)) errors.push(`${element.type} ${element.id} width is out of range.`);
      if (!inRange(element.height, LIMITS.openingHeight)) errors.push(`${element.type} ${element.id} height is out of range.`);
      if (!inRange(element.sill, LIMITS.sill)) errors.push(`${element.type} ${element.id} sill is out of range.`);
      if (!Number.isFinite(element.offset)) errors.push(`${element.type} ${element.id} offset is invalid.`);
      if (element.type === "door" && element.hinge !== "start" && element.hinge !== "end") {
        errors.push(`Door ${element.id} hinge must be start or end.`);
      }
      if (element.type === "door" && element.swing !== "left" && element.swing !== "right") {
        errors.push(`Door ${element.id} swing must be left or right.`);
      }
      break;
    default:
      break;
  }
}

function validateOutline(kind: string, id: string, outline: { x: number; y: number }[], errors: string[]): void {
  if (outline.length < 3) {
    errors.push(`${kind} ${id} needs at least 3 points.`);
    return;
  }
  for (const point of outline) {
    if (!finiteCoord(point.x) || !finiteCoord(point.y)) {
      errors.push(`${kind} ${id} has a coordinate out of range.`);
      return;
    }
  }
  for (let i = 0; i < outline.length; i += 1) {
    const next = outline[(i + 1) % outline.length];
    const edge = Math.hypot(next.x - outline[i].x, next.y - outline[i].y);
    if (edge < LIMITS.minEdge) {
      errors.push(`${kind} ${id} has an edge shorter than ${LIMITS.minEdge} mm.`);
      return;
    }
  }
  if (polygonSelfIntersects(outline)) errors.push(`${kind} ${id} outline crosses itself.`);
  if (polygonArea(outline) < LIMITS.minPolygonArea) errors.push(`${kind} ${id} area is too small.`);
}
