import { polygonArea, wallLength } from "./geometry";
import {
  isUnknownElement,
  type Bounds,
  type Door,
  type Element,
  type Project,
  type Room,
  type Slab,
  type Story,
  type Wall,
  type Window,
} from "./types";

export function elementById(project: Project, id: string): Element | undefined {
  return project.elements.find((element) => element.id === id);
}

export function stories(project: Project): Story[] {
  return project.elements.filter((element): element is Story => element.type === "story" && !isUnknownElement(element));
}

export function walls(project: Project): Wall[] {
  return project.elements.filter((element): element is Wall => element.type === "wall");
}

export function hostedOpenings(project: Project, wallId: string): (Door | Window)[] {
  return project.elements.filter(
    (element): element is Door | Window =>
      (element.type === "door" || element.type === "window") && element.wallId === wallId,
  );
}

export function storyOf(project: Project, element: Element): Story | undefined {
  if (isUnknownElement(element)) return undefined;
  if (element.type === "wall" || element.type === "slab" || element.type === "room") {
    return stories(project).find((story) => story.id === element.storyId);
  }
  if (element.type === "door" || element.type === "window") {
    const wall = elementById(project, element.wallId);
    if (wall && wall.type === "wall") return stories(project).find((story) => story.id === wall.storyId);
  }
  return undefined;
}

export function elementsOnStory(project: Project, storyId: string): Element[] {
  return project.elements.filter((element) => {
    if (isUnknownElement(element)) return false;
    if (element.type === "wall" || element.type === "slab" || element.type === "room") return element.storyId === storyId;
    if (element.type === "door" || element.type === "window") {
      const wall = elementById(project, element.wallId);
      return wall?.type === "wall" && wall.storyId === storyId;
    }
    return false;
  });
}

export function collectRemoval(project: Project, ids: string[]): string[] {
  const remove = new Set<string>();
  const pending = [...ids];
  while (pending.length) {
    const id = pending.pop();
    if (!id || remove.has(id)) continue;
    const element = elementById(project, id);
    if (!element) continue;
    remove.add(id);
    if (element.type === "story") {
      for (const child of project.elements) {
        if (isUnknownElement(child)) continue;
        if ((child.type === "wall" || child.type === "slab" || child.type === "room") && child.storyId === id) {
          pending.push(child.id);
        }
      }
    }
    if (element.type === "wall") {
      for (const opening of hostedOpenings(project, id)) pending.push(opening.id);
    }
  }
  return project.elements.map((element) => element.id).filter((id) => remove.has(id));
}

export function projectBounds(project: Project): Bounds | null {
  let bounds: Bounds | null = null;
  const include = (x: number, y: number, z: number) => {
    if (!bounds) {
      bounds = { minX: x, minY: y, maxX: x, maxY: y, minZ: z, maxZ: z };
      return;
    }
    bounds.minX = Math.min(bounds.minX, x);
    bounds.minY = Math.min(bounds.minY, y);
    bounds.maxX = Math.max(bounds.maxX, x);
    bounds.maxY = Math.max(bounds.maxY, y);
    bounds.minZ = Math.min(bounds.minZ, z);
    bounds.maxZ = Math.max(bounds.maxZ, z);
  };

  for (const story of stories(project)) {
    include(0, 0, story.elevation);
    include(0, 0, story.elevation + story.height);
  }

  for (const element of project.elements) {
    if (isUnknownElement(element)) continue;
    if (element.type === "wall") {
      const story = stories(project).find((item) => item.id === element.storyId);
      const z0 = (story?.elevation ?? 0) + element.baseOffset;
      include(element.start.x, element.start.y, z0);
      include(element.end.x, element.end.y, z0 + element.height);
    } else if (element.type === "slab" || element.type === "room") {
      const story = stories(project).find((item) => item.id === element.storyId);
      const z = story?.elevation ?? 0;
      for (const point of element.outline) include(point.x, point.y, z);
    } else if (element.type === "gridline") {
      if (element.axis === "x") include(element.position, 0, 0);
      else include(0, element.position, 0);
    }
  }

  if (!bounds) return null;
  const resolved: Bounds = bounds;
  if (resolved.minX === resolved.maxX && resolved.minY === resolved.maxY) {
    return {
      ...resolved,
      minX: resolved.minX - 5000,
      maxX: resolved.maxX + 5000,
      minY: resolved.minY - 5000,
      maxY: resolved.maxY + 5000,
    };
  }
  return resolved;
}

export function storyBounds(project: Project, storyId: string): Bounds | null {
  const subset: Project = {
    ...project,
    elements: project.elements.filter((element) => {
      if (element.type === "story") return element.id === storyId;
      if (element.type === "gridline") return true;
      return elementsOnStory(project, storyId).some((item) => item.id === element.id);
    }),
  };
  return projectBounds(subset);
}

export interface ProjectSummary {
  name: string;
  internalUnit: "mm";
  displayUnit: Project["displayUnit"];
  stories: { id: string; name: string; elevationMm: number; heightMm: number }[];
  counts: Record<string, number>;
  boundsMm: { minX: number; minY: number; maxX: number; maxY: number } | null;
  selection: string[];
  calculatedRoomAreaM2: { id: string; name: string; areaM2: number }[];
  notes: string[];
}

export function summarizeProject(project: Project, selection: string[]): ProjectSummary {
  const counts: Record<string, number> = {};
  for (const element of project.elements) {
    const key = isUnknownElement(element) ? "preserved" : element.type;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  const bounds = projectBounds(project);
  const rooms = project.elements.filter((element): element is Room => element.type === "room");
  return {
    name: project.name,
    internalUnit: "mm",
    displayUnit: project.displayUnit,
    stories: stories(project).map((story) => ({
      id: story.id,
      name: story.name,
      elevationMm: story.elevation,
      heightMm: story.height,
    })),
    counts,
    boundsMm: bounds
      ? { minX: bounds.minX, minY: bounds.minY, maxX: bounds.maxX, maxY: bounds.maxY }
      : null,
    selection,
    calculatedRoomAreaM2: rooms.map((room) => ({
      id: room.id,
      name: room.name,
      areaM2: Math.round((polygonArea(room.outline) / 1_000_000) * 100) / 100,
    })),
    notes: [
      "Coordinates and stored lengths are millimeters. X is east and Y is north.",
      "Room areas are calculated from the stored room outline, not detected from walls.",
      "Wall areas below are not included here; ask for a specific wall to see gross and net side area.",
      "This summary is observed from the open project. It is not a cost estimate or a code check.",
    ],
  };
}

export interface ElementFacts {
  id: string;
  type: string;
  observed: true;
  storyId?: string;
  storyName?: string;
  properties: Record<string, string | number | boolean>;
  derived?: Record<string, number | string>;
  hostedIds?: string[];
  note: string;
}

export function describeElement(project: Project, id: string): ElementFacts | null {
  const element = elementById(project, id);
  if (!element) return null;
  if (isUnknownElement(element)) {
    return {
      id: element.id,
      type: element.foreignType,
      observed: true,
      properties: {},
      note: "This element is preserved from data Lintel does not edit. It is saved unchanged and is not included in plan or 3D geometry.",
    };
  }
  const story = storyOf(project, element);
  const base = {
    id: element.id,
    type: element.type,
    observed: true as const,
    storyId: story?.id,
    storyName: story?.name,
  };
  switch (element.type) {
    case "story":
      return {
        ...base,
        properties: { name: element.name, elevationMm: element.elevation, heightMm: element.height },
        note: "Elevation is the finished floor. Height is floor-to-floor.",
      };
    case "gridline":
      return {
        ...base,
        properties: { name: element.name, axis: element.axis, positionMm: element.position },
        note: element.axis === "x" ? "This grid is a constant-X line, parallel to north." : "This grid is a constant-Y line, parallel to east.",
      };
    case "wall":
      return describeWall(project, element, base);
    case "slab":
      return describeSlab(element, base);
    case "room":
      return {
        ...base,
        properties: {
          name: element.name,
          number: element.number,
          source: element.source ?? "manual",
          sync: element.sync ?? "current",
        },
        derived: { areaM2: Math.round((polygonArea(element.outline) / 1_000_000) * 100) / 100 },
        note: element.source === "derived"
          ? element.sync === "detached"
            ? "This derived room no longer matches a closed wall loop. The last outline is kept."
            : "Area is calculated from the inner face of the wall loop. It updates when those walls change."
          : "Area is calculated from the drawn outline. This room does not follow the walls.",
      };
    case "section":
      return {
        ...base,
        properties: { name: element.name, depthMm: element.depth, facing: element.facing },
        note: "The section is cut from the shared model. Preserved elements are not shown.",
      };
    case "door":
    case "window":
      return {
        ...base,
        properties: {
          wallId: element.wallId,
          offsetMm: element.offset,
          widthMm: element.width,
          heightMm: element.height,
          sillMm: element.sill,
          ...(element.type === "door" ? { hinge: element.hinge, swing: element.swing } : {}),
        },
        note: "Offset is the distance from the wall start to the center of the opening.",
      };
    default:
      return null;
  }
}

function describeWall(
  project: Project,
  wall: Wall,
  base: { id: string; type: string; observed: true; storyId?: string; storyName?: string },
): ElementFacts {
  const length = wallLength(wall);
  const openings = hostedOpenings(project, wall.id);
  const openingArea = openings.reduce((sum, opening) => sum + opening.width * opening.height, 0);
  const gross = length * wall.height;
  return {
    ...base,
    properties: {
      material: wall.material,
      thicknessMm: wall.thickness,
      heightMm: wall.height,
      baseOffsetMm: wall.baseOffset,
      startX: wall.start.x,
      startY: wall.start.y,
      endX: wall.end.x,
      endY: wall.end.y,
    },
    derived: {
      lengthMm: Math.round(length * 10) / 10,
      grossSideAreaM2: Math.round((gross / 1_000_000) * 100) / 100,
      netSideAreaM2: Math.round(((gross - openingArea) / 1_000_000) * 100) / 100,
    },
    hostedIds: openings.map((opening) => opening.id),
    note: "Gross side area is length times height. Net side area subtracts opening rectangles. Neither is a cost quantity.",
  };
}

function describeSlab(
  slab: Slab,
  base: { id: string; type: string; observed: true; storyId?: string; storyName?: string },
): ElementFacts {
  const area = polygonArea(slab.outline);
  return {
    ...base,
    properties: {
      material: slab.material,
      thicknessMm: slab.thickness,
      elevationOffsetMm: slab.elevationOffset,
    },
    derived: {
      areaM2: Math.round((area / 1_000_000) * 100) / 100,
      volumeM3: Math.round(((area * slab.thickness) / 1_000_000_000) * 1000) / 1000,
    },
    note: "Slab area is calculated from the outline. Volume is that area times thickness. The top is the story elevation plus the elevation offset.",
  };
}

export interface ListedElement {
  id: string;
  type: string;
  name?: string;
  storyId?: string;
  preserved?: boolean;
}

export function listElements(project: Project, filter: { type?: string; storyId?: string }): ListedElement[] {
  return project.elements
    .filter((element) => {
      if (filter.type && element.type !== filter.type) return false;
      if (!filter.storyId) return true;
      if (isUnknownElement(element) || element.type === "gridline" || element.type === "story") {
        return element.type === "story" && element.id === filter.storyId;
      }
      const story = storyOf(project, element);
      return story?.id === filter.storyId;
    })
    .map((element) => ({
      id: element.id,
      type: isUnknownElement(element) ? element.foreignType : element.type,
      name: "name" in element ? element.name : undefined,
      storyId: "storyId" in element ? element.storyId : storyOf(project, element)?.id,
      preserved: isUnknownElement(element) ? true : undefined,
    }));
}
