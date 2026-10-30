import { APP_NAME, FORMAT, SCHEMA_VERSION, isUnknownElement, type Element, type Project, type ProjectFile, type Vec2 } from "../domain/types";
import { validateProject } from "../domain/validate";

const MAX_CHARS = 20_000_000;
const MAX_ERRORS = 40;

export type LoadResult = { ok: true; file: ProjectFile } | { ok: false; errors: string[] };

export function serializeProjectFile(file: ProjectFile): string {
  return `${JSON.stringify(fileToJson(file), null, 2)}\n`;
}

export function wrapProject(project: Project, preserved?: Record<string, unknown>): ProjectFile {
  const file: ProjectFile = {
    format: FORMAT,
    schemaVersion: SCHEMA_VERSION,
    app: APP_NAME,
    project,
  };
  if (preserved && Object.keys(preserved).length) file.preserved = preserved;
  return file;
}

export function projectFingerprint(project: Project, preserved?: Record<string, unknown>): string {
  return serializeProjectFile(wrapProject(project, preserved));
}

export function parseProjectFile(text: string): LoadResult {
  const errors: string[] = [];
  const fail = (): LoadResult => ({ ok: false, errors: errors.slice(0, MAX_ERRORS) });
  const add = (message: string) => {
    if (errors.length < MAX_ERRORS) errors.push(message);
  };

  if (text.length > MAX_CHARS) {
    return { ok: false, errors: ["This file is larger than Lintel can open (20 MB). It was not modified."] };
  }

  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch {
    return { ok: false, errors: ["This file is not valid JSON. It was not modified."] };
  }
  if (!isRecord(parsed)) return { ok: false, errors: ["The project file must be a JSON object. It was not modified."] };

  if (parsed.format !== FORMAT) {
    return {
      ok: false,
      errors: [`Expected format "${FORMAT}". This file was not modified.`],
    };
  }
  if (typeof parsed.schemaVersion !== "number" || !Number.isInteger(parsed.schemaVersion)) {
    return { ok: false, errors: ["schemaVersion is missing. This file was not modified."] };
  }
  if (parsed.schemaVersion !== SCHEMA_VERSION) {
    return {
      ok: false,
      errors: [
        `This file uses schema version ${parsed.schemaVersion}. Lintel opens version ${SCHEMA_VERSION} only. The file was not modified.`,
      ],
    };
  }
  if (!isRecord(parsed.project)) {
    return { ok: false, errors: ["The file has no project object. It was not modified."] };
  }

  const preserved = collectUnknown(parsed, ["format", "schemaVersion", "app", "project"]);
  const app = typeof parsed.app === "string" && parsed.app.trim() ? parsed.app : APP_NAME;

  const project = parseProject(parsed.project, add);
  if (!project || errors.length) return fail();
  const validation = validateProject(project);
  for (const message of validation) add(message);
  if (errors.length) return fail();

  const file: ProjectFile = {
    format: FORMAT,
    schemaVersion: SCHEMA_VERSION,
    app,
    project,
  };
  if (Object.keys(preserved).length) file.preserved = preserved;
  return { ok: true, file };
}

function parseProject(raw: Record<string, unknown>, add: (message: string) => void): Project | null {
  const id = reqString(raw, "id", "project", add, 80);
  const name = reqString(raw, "name", "project", add, 120);
  const displayUnit = raw.displayUnit;
  if (displayUnit !== "mm" && displayUnit !== "m") add("project.displayUnit must be mm or m.");
  const createdAt = reqString(raw, "createdAt", "project", add, 80);
  const updatedAt = reqString(raw, "updatedAt", "project", add, 80);
  if (!Array.isArray(raw.elements)) {
    add("project.elements must be an array.");
    return null;
  }
  const elements: Element[] = [];
  raw.elements.forEach((value, index) => {
    const element = parseElement(value, index, add);
    if (element) elements.push(element);
  });
  if (!id || !name || (displayUnit !== "mm" && displayUnit !== "m") || !createdAt || !updatedAt) return null;
  const extra = collectUnknown(raw, ["id", "name", "displayUnit", "elements", "createdAt", "updatedAt", "extra"]);
  if (raw.extra !== undefined) {
    if (!isRecord(raw.extra)) add("project.extra must be an object.");
    else Object.assign(extra, raw.extra);
  }
  const project: Project = { id, name, displayUnit, elements, createdAt, updatedAt };
  if (Object.keys(extra).length) project.extra = extra;
  return project;
}

function parseElement(value: unknown, index: number, add: (message: string) => void): Element | null {
  const path = `elements[${index}]`;
  if (!isRecord(value)) {
    add(`${path} must be an object.`);
    return null;
  }
  const id = reqString(value, "id", path, add, 80);
  const type = reqString(value, "type", path, add, 80);
  if (!id || !type) return null;
  switch (type) {
    case "story":
      return parseStory(value, id, path, add);
    case "gridline":
      return parseGrid(value, id, path, add);
    case "wall":
      return parseWall(value, id, path, add);
    case "slab":
      return parseSlab(value, id, path, add);
    case "door":
      return parseDoor(value, id, path, add);
    case "window":
      return parseWindow(value, id, path, add);
    case "room":
      return parseRoom(value, id, path, add);
    default:
      return { preserved: true, id, type: "preserved", foreignType: type, raw: value };
  }
}

function parseStory(raw: Record<string, unknown>, id: string, path: string, add: (message: string) => void): Element | null {
  const name = reqString(raw, "name", path, add, 120);
  const elevation = reqNumber(raw, "elevation", path, add);
  const height = reqNumber(raw, "height", path, add);
  if (name === null || elevation === null || height === null) return null;
  return withExtra({ id, type: "story", name, elevation, height }, raw, ["id", "type", "name", "elevation", "height"]);
}

function parseGrid(raw: Record<string, unknown>, id: string, path: string, add: (message: string) => void): Element | null {
  const name = reqString(raw, "name", path, add, 16);
  const position = reqNumber(raw, "position", path, add);
  if (raw.axis !== "x" && raw.axis !== "y") add(`${path}.axis must be x or y.`);
  if (name === null || position === null || (raw.axis !== "x" && raw.axis !== "y")) return null;
  return withExtra({ id, type: "gridline", name, axis: raw.axis, position }, raw, ["id", "type", "name", "axis", "position"]);
}

function parseWall(raw: Record<string, unknown>, id: string, path: string, add: (message: string) => void): Element | null {
  const storyId = reqString(raw, "storyId", path, add, 80);
  const start = reqVec(raw, "start", path, add);
  const end = reqVec(raw, "end", path, add);
  const thickness = reqNumber(raw, "thickness", path, add);
  const height = reqNumber(raw, "height", path, add);
  const baseOffset = reqNumber(raw, "baseOffset", path, add);
  const material = reqString(raw, "material", path, add, 80);
  if (!storyId || !start || !end || thickness === null || height === null || baseOffset === null || material === null) return null;
  return withExtra(
    { id, type: "wall", storyId, start, end, thickness, height, baseOffset, material },
    raw,
    ["id", "type", "storyId", "start", "end", "thickness", "height", "baseOffset", "material"],
  );
}

function parseSlab(raw: Record<string, unknown>, id: string, path: string, add: (message: string) => void): Element | null {
  const storyId = reqString(raw, "storyId", path, add, 80);
  const outline = reqOutline(raw, path, add);
  const thickness = reqNumber(raw, "thickness", path, add);
  const elevationOffset = reqNumber(raw, "elevationOffset", path, add);
  const material = reqString(raw, "material", path, add, 80);
  if (!storyId || !outline || thickness === null || elevationOffset === null || material === null) return null;
  return withExtra(
    { id, type: "slab", storyId, outline, thickness, elevationOffset, material },
    raw,
    ["id", "type", "storyId", "outline", "thickness", "elevationOffset", "material"],
  );
}

function parseRoom(raw: Record<string, unknown>, id: string, path: string, add: (message: string) => void): Element | null {
  const storyId = reqString(raw, "storyId", path, add, 80);
  const name = reqString(raw, "name", path, add, 120);
  const number = reqString(raw, "number", path, add, 24);
  const outline = reqOutline(raw, path, add);
  if (!storyId || name === null || number === null || !outline) return null;
  return withExtra({ id, type: "room", storyId, name, number, outline }, raw, ["id", "type", "storyId", "name", "number", "outline"]);
}

function parseDoor(raw: Record<string, unknown>, id: string, path: string, add: (message: string) => void): Element | null {
  const opening = parseOpeningFields(raw, path, add);
  if (!opening) return null;
  if (raw.hinge !== "start" && raw.hinge !== "end") add(`${path}.hinge must be start or end.`);
  if (raw.swing !== "left" && raw.swing !== "right") add(`${path}.swing must be left or right.`);
  if ((raw.hinge !== "start" && raw.hinge !== "end") || (raw.swing !== "left" && raw.swing !== "right")) return null;
  return withExtra(
    { id, type: "door", ...opening, hinge: raw.hinge, swing: raw.swing },
    raw,
    ["id", "type", "wallId", "offset", "width", "height", "sill", "hinge", "swing"],
  );
}

function parseWindow(raw: Record<string, unknown>, id: string, path: string, add: (message: string) => void): Element | null {
  const opening = parseOpeningFields(raw, path, add);
  if (!opening) return null;
  return withExtra({ id, type: "window", ...opening }, raw, ["id", "type", "wallId", "offset", "width", "height", "sill"]);
}

function parseOpeningFields(
  raw: Record<string, unknown>,
  path: string,
  add: (message: string) => void,
): { wallId: string; offset: number; width: number; height: number; sill: number } | null {
  const wallId = reqString(raw, "wallId", path, add, 80);
  const offset = reqNumber(raw, "offset", path, add);
  const width = reqNumber(raw, "width", path, add);
  const height = reqNumber(raw, "height", path, add);
  const sill = reqNumber(raw, "sill", path, add);
  if (!wallId || offset === null || width === null || height === null || sill === null) return null;
  return { wallId, offset, width, height, sill };
}

function withExtra<T extends Element>(element: T, raw: Record<string, unknown>, known: string[]): T {
  const extra = collectUnknown(raw, [...known, "extra"]);
  if (isRecord(raw.extra)) Object.assign(extra, raw.extra);
  if (!Object.keys(extra).length || isUnknownElement(element)) return element;
  return { ...element, extra };
}

function fileToJson(file: ProjectFile): Record<string, unknown> {
  const json: Record<string, unknown> = {
    format: file.format,
    schemaVersion: file.schemaVersion,
    app: file.app,
    project: projectToJson(file.project),
  };
  if (file.preserved) {
    for (const [key, value] of Object.entries(file.preserved)) {
      if (!(key in json)) json[key] = value;
    }
  }
  return json;
}

function projectToJson(project: Project): Record<string, unknown> {
  const json: Record<string, unknown> = {
    id: project.id,
    name: project.name,
    displayUnit: project.displayUnit,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    elements: project.elements.map(elementToJson),
  };
  return mergeExtra(json, project.extra);
}

function elementToJson(element: Element): unknown {
  if (isUnknownElement(element)) return element.raw;
  const { extra, ...rest } = element;
  return mergeExtra(rest as unknown as Record<string, unknown>, extra);
}

function mergeExtra(base: Record<string, unknown>, extra?: Record<string, unknown>): Record<string, unknown> {
  if (!extra) return base;
  const json = { ...base };
  for (const [key, value] of Object.entries(extra)) {
    if (key === "extra" || key in json) continue;
    json[key] = value;
  }
  return json;
}

function collectUnknown(raw: Record<string, unknown>, known: string[]): Record<string, unknown> {
  const extra: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!known.includes(key)) extra[key] = value;
  }
  return extra;
}

function reqString(raw: Record<string, unknown>, key: string, path: string, add: (message: string) => void, max: number): string | null {
  const value = raw[key];
  if (typeof value !== "string") {
    add(`${path}.${key} must be a string.`);
    return null;
  }
  if (value.length > max) add(`${path}.${key} is longer than ${max} characters.`);
  return value;
}

function reqNumber(raw: Record<string, unknown>, key: string, path: string, add: (message: string) => void): number | null {
  const value = raw[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    add(`${path}.${key} must be a finite number.`);
    return null;
  }
  return value;
}

function reqVec(raw: Record<string, unknown>, key: string, path: string, add: (message: string) => void): Vec2 | null {
  const value = raw[key];
  if (!isRecord(value)) {
    add(`${path}.${key} must be a point with x and y.`);
    return null;
  }
  const x = reqNumber(value, "x", `${path}.${key}`, add);
  const y = reqNumber(value, "y", `${path}.${key}`, add);
  if (x === null || y === null) return null;
  return { x, y };
}

function reqOutline(raw: Record<string, unknown>, path: string, add: (message: string) => void): Vec2[] | null {
  if (!Array.isArray(raw.outline)) {
    add(`${path}.outline must be an array of points.`);
    return null;
  }
  const points: Vec2[] = [];
  let ok = true;
  raw.outline.forEach((value, index) => {
    if (!isRecord(value)) {
      add(`${path}.outline[${index}] must be a point.`);
      ok = false;
      return;
    }
    const x = reqNumber(value, "x", `${path}.outline[${index}]`, add);
    const y = reqNumber(value, "y", `${path}.outline[${index}]`, add);
    if (x === null || y === null) ok = false;
    else points.push({ x, y });
  });
  return ok ? points : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
