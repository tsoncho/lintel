import { DEFAULTS } from "./defaults";
import { openingFits, roundMm, roundPoint, samePoint, wallLength } from "./geometry";
import { createId } from "./ids";
import { collectRemoval, elementById, stories } from "./queries";
import { err, ok, type Result } from "./result";
import type { DisplayUnit, Door, Element, Project, Vec2, Window } from "./types";
import { isUnknownElement } from "./types";
import { validateProject } from "./validate";

export interface Created {
  project: Project;
  id: string;
  note?: string;
}

export interface PropertyPatch {
  name?: string;
  number?: string;
  material?: string;
  thickness?: number;
  height?: number;
  baseOffset?: number;
  elevationOffset?: number;
  sill?: number;
  width?: number;
  offset?: number;
  elevation?: number;
  position?: number;
  storyId?: string;
  hinge?: "start" | "end";
  swing?: "left" | "right";
  start?: Vec2;
  end?: Vec2;
}

const PATCH_KEYS: Record<string, (keyof PropertyPatch)[]> = {
  story: ["name", "elevation", "height"],
  gridline: ["name", "position"],
  wall: ["thickness", "height", "baseOffset", "material", "storyId", "start", "end"],
  slab: ["thickness", "elevationOffset", "material", "storyId"],
  room: ["name", "number", "storyId"],
  door: ["offset", "width", "height", "sill", "hinge", "swing"],
  window: ["offset", "width", "height", "sill"],
};

function cloneProject(project: Project): Project {
  return structuredClone(project);
}

function commit(project: Project): Result<Project> {
  const errors = validateProject(project);
  if (errors.length) return err(errors[0]);
  return ok(project);
}

function mutate(project: Project, id: string): { draft: Project; element: Element } | { error: string } {
  const draft = cloneProject(project);
  const element = draft.elements.find((item) => item.id === id);
  if (!element) return { error: `No element with id ${id}.` };
  return { draft, element };
}

export function updateProjectMeta(
  project: Project,
  patch: { name?: string; displayUnit?: DisplayUnit },
): Result<Project> {
  const draft = cloneProject(project);
  if (patch.name !== undefined) draft.name = patch.name.trim();
  if (patch.displayUnit !== undefined) draft.displayUnit = patch.displayUnit;
  return commit(draft);
}

export function applyPropertyPatch(project: Project, elementId: string, patch: PropertyPatch): Result<Project> {
  const keys = Object.keys(patch).filter((key) => patch[key as keyof PropertyPatch] !== undefined);
  if (!keys.length) return err("No properties were provided.");
  const located = mutate(project, elementId);
  if ("error" in located) return err(located.error);
  const { draft, element } = located;
  if (isUnknownElement(element)) {
    return err(`${elementId} is preserved data and cannot be edited in this version.`);
  }
  const allowed = PATCH_KEYS[element.type];
  for (const key of keys) {
    if (!allowed.includes(key as keyof PropertyPatch)) {
      return err(`${element.type} does not have property ${key}.`);
    }
  }
  const applied = applyPatch(element, patch);
  if (typeof applied === "string") return err(applied);
  return commit(draft);
}

function applyPatch(element: Exclude<Element, { preserved: true }>, patch: PropertyPatch): true | string {
  switch (element.type) {
    case "story":
      if (patch.name !== undefined) element.name = patch.name.trim();
      if (patch.elevation !== undefined) element.elevation = roundMm(patch.elevation);
      if (patch.height !== undefined) element.height = roundMm(patch.height);
      return true;
    case "gridline":
      if (patch.name !== undefined) element.name = patch.name.trim();
      if (patch.position !== undefined) element.position = roundMm(patch.position);
      return true;
    case "wall":
      if (patch.thickness !== undefined) element.thickness = roundMm(patch.thickness);
      if (patch.height !== undefined) element.height = roundMm(patch.height);
      if (patch.baseOffset !== undefined) element.baseOffset = roundMm(patch.baseOffset);
      if (patch.material !== undefined) element.material = patch.material.trim();
      if (patch.storyId !== undefined) element.storyId = patch.storyId;
      if (patch.start) element.start = roundPoint(patch.start);
      if (patch.end) element.end = roundPoint(patch.end);
      return true;
    case "slab":
      if (patch.thickness !== undefined) element.thickness = roundMm(patch.thickness);
      if (patch.elevationOffset !== undefined) element.elevationOffset = roundMm(patch.elevationOffset);
      if (patch.material !== undefined) element.material = patch.material.trim();
      if (patch.storyId !== undefined) element.storyId = patch.storyId;
      return true;
    case "room":
      if (patch.name !== undefined) element.name = patch.name.trim();
      if (patch.number !== undefined) element.number = patch.number.trim();
      if (patch.storyId !== undefined) element.storyId = patch.storyId;
      return true;
    case "door":
      assignOpening(element, patch);
      if (patch.hinge !== undefined) element.hinge = patch.hinge;
      if (patch.swing !== undefined) element.swing = patch.swing;
      return true;
    case "window":
      assignOpening(element, patch);
      return true;
    default:
      return "This element cannot be edited.";
  }
}

function assignOpening(element: Door | Window, patch: PropertyPatch): void {
  if (patch.offset !== undefined) element.offset = roundMm(patch.offset);
  if (patch.width !== undefined) element.width = roundMm(patch.width);
  if (patch.height !== undefined) element.height = roundMm(patch.height);
  if (patch.sill !== undefined) element.sill = roundMm(patch.sill);
}

export function deleteElements(project: Project, ids: string[]): Result<{ project: Project; removedIds: string[] }> {
  if (!ids.length) return err("Nothing was selected to delete.");
  for (const id of ids) {
    if (!elementById(project, id)) return err(`No element with id ${id}.`);
  }
  const removedIds = collectRemoval(project, ids);
  const remainingStories = stories(project).filter((story) => !removedIds.includes(story.id));
  if (!remainingStories.length) return err("A project needs at least one story.");
  const draft = cloneProject(project);
  const removed = new Set(removedIds);
  draft.elements = draft.elements.filter((element) => !removed.has(element.id));
  const committed = commit(draft);
  if (!committed.ok) return committed;
  return ok({ project: committed.value, removedIds });
}

export function addStory(
  project: Project,
  input: { name: string; elevation: number; height: number; id?: string },
): Result<Created> {
  const draft = cloneProject(project);
  const id = input.id ?? createId("story");
  draft.elements.push({
    id,
    type: "story",
    name: input.name.trim(),
    elevation: roundMm(input.elevation),
    height: roundMm(input.height),
  });
  const committed = commit(draft);
  if (!committed.ok) return committed;
  return ok({ project: committed.value, id });
}

export function addGridline(
  project: Project,
  input: { name: string; axis: "x" | "y"; position: number; id?: string },
): Result<Created> {
  const draft = cloneProject(project);
  const id = input.id ?? createId("grid");
  draft.elements.push({
    id,
    type: "gridline",
    name: input.name.trim(),
    axis: input.axis,
    position: roundMm(input.position),
  });
  const committed = commit(draft);
  if (!committed.ok) return committed;
  return ok({ project: committed.value, id });
}

export function addWall(
  project: Project,
  input: {
    storyId: string;
    start: Vec2;
    end: Vec2;
    thickness?: number;
    height?: number;
    baseOffset?: number;
    material?: string;
    id?: string;
  },
): Result<Created> {
  const story = stories(project).find((item) => item.id === input.storyId);
  if (!story) return err(`No story with id ${input.storyId}.`);
  const draft = cloneProject(project);
  const id = input.id ?? createId("wall");
  draft.elements.push({
    id,
    type: "wall",
    storyId: input.storyId,
    start: roundPoint(input.start),
    end: roundPoint(input.end),
    thickness: roundMm(input.thickness ?? DEFAULTS.wallThickness),
    height: roundMm(input.height ?? story.height),
    baseOffset: roundMm(input.baseOffset ?? 0),
    material: (input.material ?? "Generic").trim(),
  });
  const committed = commit(draft);
  if (!committed.ok) return committed;
  return ok({ project: committed.value, id });
}

export function addSlab(
  project: Project,
  input: {
    storyId: string;
    outline: Vec2[];
    thickness?: number;
    elevationOffset?: number;
    material?: string;
    id?: string;
  },
): Result<Created> {
  return addOutline(project, input);
}

export function addRoom(
  project: Project,
  input: { storyId: string; outline: Vec2[]; name?: string; number?: string; id?: string },
): Result<Created> {
  const story = stories(project).find((item) => item.id === input.storyId);
  if (!story) return err(`No story with id ${input.storyId}.`);
  const outline = cleanRing(input.outline);
  if (typeof outline === "string") return err(outline);
  const draft = cloneProject(project);
  const id = input.id ?? createId("room");
  const count = draft.elements.filter((element) => element.type === "room").length + 1;
  draft.elements.push({
    id,
    type: "room",
    storyId: input.storyId,
    name: (input.name ?? "Room").trim(),
    number: (input.number ?? String(count).padStart(2, "0")).trim(),
    outline,
  });
  const committed = commit(draft);
  if (!committed.ok) return committed;
  return ok({ project: committed.value, id });
}

function addOutline(
  project: Project,
  input: {
    storyId: string;
    outline: Vec2[];
    thickness?: number;
    elevationOffset?: number;
    material?: string;
    id?: string;
  },
): Result<Created> {
  if (!stories(project).some((story) => story.id === input.storyId)) {
    return err(`No story with id ${input.storyId}.`);
  }
  const outline = cleanRing(input.outline);
  if (typeof outline === "string") return err(outline);
  const draft = cloneProject(project);
  const id = input.id ?? createId("slab");
  draft.elements.push({
    id,
    type: "slab",
    storyId: input.storyId,
    outline,
    thickness: roundMm(input.thickness ?? DEFAULTS.slabThickness),
    elevationOffset: roundMm(input.elevationOffset ?? 0),
    material: (input.material ?? "Concrete").trim(),
  });
  const committed = commit(draft);
  if (!committed.ok) return committed;
  return ok({ project: committed.value, id });
}

export function addOpening(
  project: Project,
  input: {
    kind: "door" | "window";
    wallId: string;
    along: number;
    id?: string;
  },
): Result<Created> {
  const wall = elementById(project, input.wallId);
  if (!wall || wall.type !== "wall") return err("Openings have to sit on a wall.");
  const length = wallLength(wall);
  const width = input.kind === "door" ? DEFAULTS.doorWidth : DEFAULTS.windowWidth;
  let height: number = input.kind === "door" ? DEFAULTS.doorHeight : DEFAULTS.windowHeight;
  let sill: number = input.kind === "door" ? DEFAULTS.doorSill : DEFAULTS.windowSill;
  let note: string | undefined;
  if (sill + height > wall.height) {
    height = roundMm(wall.height - sill);
    note = `${input.kind === "door" ? "Door" : "Window"} height was shortened to fit the wall.`;
  }
  if (input.kind === "door" && height < DEFAULTS.minDoorHeight) {
    return err("This wall is too short for a door.");
  }
  if (height < DEFAULTS.minOpeningHeight) {
    sill = 0;
    height = roundMm(Math.min(input.kind === "door" ? DEFAULTS.doorHeight : DEFAULTS.windowHeight, wall.height));
    note = `${input.kind === "door" ? "Door" : "Window"} was fitted to the wall height.`;
  }
  if (height < DEFAULTS.minOpeningHeight) return err("This wall is too short for an opening.");
  const half = width / 2;
  let offset = roundMm(input.along);
  if (offset - half < 0) offset = roundMm(half);
  if (offset + half > length) offset = roundMm(length - half);
  if (!openingFits(length, offset, width)) return err("The opening does not fit on this wall.");

  const draft = cloneProject(project);
  const id = input.id ?? createId(input.kind);
  if (input.kind === "door") {
    const door: Door = {
      id,
      type: "door",
      wallId: wall.id,
      offset,
      width,
      height,
      sill,
      hinge: "start",
      swing: "left",
    };
    draft.elements.push(door);
  } else {
    const window: Window = {
      id,
      type: "window",
      wallId: wall.id,
      offset,
      width,
      height,
      sill,
    };
    draft.elements.push(window);
  }
  const committed = commit(draft);
  if (!committed.ok) return committed;
  return ok({ project: committed.value, id, note });
}

export function translateElements(project: Project, ids: string[], delta: Vec2): Result<Project> {
  if (!ids.length) return err("Nothing was selected to move.");
  if (samePoint(delta, { x: 0, y: 0 })) return ok(project);
  const draft = cloneProject(project);
  const moving = new Set(ids);
  let moved = 0;
  for (const element of draft.elements) {
    if (!moving.has(element.id) || isUnknownElement(element)) continue;
    if (element.type === "wall") {
      element.start = roundPoint({ x: element.start.x + delta.x, y: element.start.y + delta.y });
      element.end = roundPoint({ x: element.end.x + delta.x, y: element.end.y + delta.y });
      moved += 1;
    } else if (element.type === "slab" || element.type === "room") {
      element.outline = element.outline.map((point) => roundPoint({ x: point.x + delta.x, y: point.y + delta.y }));
      moved += 1;
    } else if (element.type === "gridline") {
      element.position = roundMm(element.position + (element.axis === "x" ? delta.x : delta.y));
      moved += 1;
    } else if (element.type === "door" || element.type === "window") {
      if (moving.has(element.wallId)) continue;
      const wall = draft.elements.find((item) => item.id === element.wallId);
      if (!wall || wall.type !== "wall") return err("The opening has no wall.");
      const length = wallLength(wall);
      const dx = wall.end.x - wall.start.x;
      const dy = wall.end.y - wall.start.y;
      const along = (delta.x * dx + delta.y * dy) / length;
      element.offset = roundMm(element.offset + along);
      moved += 1;
    }
  }
  if (!moved) return err("The selection cannot be moved.");
  return commit(draft);
}

export function setWallEndpoint(
  project: Project,
  wallId: string,
  which: "start" | "end",
  point: Vec2,
): Result<Project> {
  const located = mutate(project, wallId);
  if ("error" in located) return err(located.error);
  if (located.element.type !== "wall") return err("Only wall endpoints can be dragged this way.");
  located.element[which] = roundPoint(point);
  return commit(located.draft);
}

export function setOutlinePoint(project: Project, elementId: string, index: number, point: Vec2): Result<Project> {
  const located = mutate(project, elementId);
  if ("error" in located) return err(located.error);
  const element = located.element;
  if (element.type !== "slab" && element.type !== "room") return err("Only slab and room corners can be dragged this way.");
  if (index < 0 || index >= element.outline.length) return err("That corner does not exist.");
  element.outline[index] = roundPoint(point);
  return commit(located.draft);
}

export function suggestNextStory(project: Project): { name: string; elevation: number; height: number } {
  const list = stories(project);
  if (!list.length) return { name: "Ground Floor", elevation: 0, height: DEFAULTS.storyHeight };
  let top = -Infinity;
  let height: number = DEFAULTS.storyHeight;
  for (const story of list) {
    const candidate = story.elevation + story.height;
    if (candidate >= top) {
      top = candidate;
      height = story.height;
    }
  }
  return { name: `Level ${list.length + 1}`, elevation: roundMm(top), height };
}

export function suggestGridName(project: Project, axis: "x" | "y"): string {
  const used = new Set(
    project.elements.filter((element) => element.type === "gridline").map((element) => element.name),
  );
  if (axis === "y") {
    for (let number = 1; number < 200; number += 1) {
      const name = String(number);
      if (!used.has(name)) return name;
    }
  }
  for (let index = 0; index < 26; index += 1) {
    const name = String.fromCharCode(65 + index);
    if (!used.has(name)) return name;
  }
  return `G${used.size + 1}`;
}

function cleanRing(points: Vec2[]): Vec2[] | string {
  const cleaned: Vec2[] = [];
  for (const point of points) {
    const rounded = roundPoint(point);
    const previous = cleaned[cleaned.length - 1];
    if (!previous || !samePoint(previous, rounded)) cleaned.push(rounded);
  }
  if (cleaned.length >= 2 && samePoint(cleaned[0], cleaned[cleaned.length - 1])) cleaned.pop();
  if (cleaned.length < 3) return "A closed outline needs at least 3 points.";
  return cleaned;
}
