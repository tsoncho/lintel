/** Lintel project schema. Geometry is stored in millimeters. */

export const FORMAT = "lintel-project" as const;
export const SCHEMA_VERSION = 2;
/** Version 1 projects load and are saved as version 2. Newer versions are refused. */
export const MIN_SCHEMA_VERSION = 1;
export const APP_NAME = "Lintel";

export type DisplayUnit = "mm" | "m";

/** Plan coordinates: X east, Y north, millimeters. */
export interface Vec2 {
  x: number;
  y: number;
}

export interface Story {
  id: string;
  type: "story";
  name: string;
  /** Finished floor elevation, mm. */
  elevation: number;
  /** Floor-to-floor height, mm. */
  height: number;
  extra?: Record<string, unknown>;
}

export interface Gridline {
  id: string;
  type: "gridline";
  name: string;
  /** `x` is a constant-X line (parallel to north). `y` is a constant-Y line. */
  axis: "x" | "y";
  position: number;
  extra?: Record<string, unknown>;
}

export interface Wall {
  id: string;
  type: "wall";
  storyId: string;
  start: Vec2;
  end: Vec2;
  thickness: number;
  height: number;
  /** Height of the wall base above the story elevation, mm. */
  baseOffset: number;
  material: string;
  extra?: Record<string, unknown>;
}

export interface Slab {
  id: string;
  type: "slab";
  storyId: string;
  outline: Vec2[];
  thickness: number;
  /** Top of the slab relative to the story elevation, mm. Thickness extends downward. */
  elevationOffset: number;
  material: string;
  extra?: Record<string, unknown>;
}

export interface Door {
  id: string;
  type: "door";
  wallId: string;
  /** Distance from the wall start to the opening center, mm. */
  offset: number;
  width: number;
  height: number;
  sill: number;
  hinge: "start" | "end";
  /** Left is the left-hand side when looking from start to end. */
  swing: "left" | "right";
  extra?: Record<string, unknown>;
}

export interface Window {
  id: string;
  type: "window";
  wallId: string;
  offset: number;
  width: number;
  height: number;
  sill: number;
  extra?: Record<string, unknown>;
}

export interface Room {
  id: string;
  type: "room";
  storyId: string;
  name: string;
  number: string;
  outline: Vec2[];
  /**
   * `manual` outlines stay where they were drawn.
   * `derived` outlines follow a closed wall loop and are refreshed after wall edits.
   * Missing means manual, so version 1 rooms stay put.
   */
  source?: "manual" | "derived";
  /** Wall ids of the loop this derived room follows. */
  boundaryWallIds?: string[];
  areaMm2?: number;
  perimeterMm?: number;
  /** `detached` keeps the last outline when the wall loop no longer closes. */
  sync?: "current" | "detached";
  extra?: Record<string, unknown>;
}

export interface Section {
  id: string;
  type: "section";
  name: string;
  start: Vec2;
  end: Vec2;
  /** How far beyond the cut line to include, on the facing side, mm. */
  depth: number;
  /** Left or right of the directed line from start to end. */
  facing: "left" | "right";
  extra?: Record<string, unknown>;
}

/** An element this version does not edit. Kept so save cannot drop it. */
export interface UnknownElement {
  preserved: true;
  id: string;
  /** Internal discriminant. The original type string lives in `foreignType` and `raw`. */
  type: "preserved";
  foreignType: string;
  raw: Record<string, unknown>;
}

export type Element = Story | Gridline | Wall | Slab | Door | Window | Room | Section | UnknownElement;

export interface Project {
  id: string;
  name: string;
  /** Display preference only. Stored geometry is always millimeters. */
  displayUnit: DisplayUnit;
  elements: Element[];
  createdAt: string;
  updatedAt: string;
  extra?: Record<string, unknown>;
}

export interface ProjectFile {
  format: typeof FORMAT;
  schemaVersion: number;
  /** Writer name. Lintel writes its own name and preserves any other string already in the file. */
  app: string;
  project: Project;
  /** Unknown top-level fields, written back on save. */
  preserved?: Record<string, unknown>;
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export const KNOWN_ELEMENT_TYPES = [
  "story",
  "gridline",
  "wall",
  "slab",
  "door",
  "window",
  "room",
  "section",
] as const;

export type KnownElementType = (typeof KNOWN_ELEMENT_TYPES)[number];

export function isUnknownElement(element: Element): element is UnknownElement {
  return "preserved" in element && element.preserved === true;
}
