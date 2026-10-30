import {
  addStory,
  addWall,
  applyPropertyPatch,
  deleteElements,
  type PropertyPatch,
} from "../domain/edits";
import { formatLength } from "../domain/units";
import { wallLength } from "../domain/geometry";
import { collectRemoval, describeElement, elementById, listElements, stories, summarizeProject } from "../domain/queries";
import { err, ok, type Result } from "../domain/result";
import { isUnknownElement, KNOWN_ELEMENT_TYPES, type Project, type Vec2 } from "../domain/types";
import type { ToolSchema } from "./provider";

export type ModelEdit =
  | { op: "set_properties"; elementId: string; changes: PropertyPatch }
  | { op: "delete_element"; elementId: string }
  | {
      op: "create_wall";
      storyId: string;
      start: Vec2;
      end: Vec2;
      thickness?: number;
      height?: number;
      material?: string;
    }
  | { op: "create_story"; name: string; elevation: number; height: number };

export interface EditProposal {
  summary: string;
  edit: ModelEdit;
  detail: string;
  affectedIds: string[];
}

export type AssistantProposal =
  | ({ kind: "edit" } & EditProposal)
  | { kind: "undo_assistant"; summary: string; detail: string };

const CHANGE_KEYS = [
  "name",
  "number",
  "material",
  "thickness",
  "height",
  "baseOffset",
  "elevationOffset",
  "sill",
  "width",
  "offset",
  "elevation",
  "position",
  "storyId",
  "hinge",
  "swing",
  "facing",
  "depth",
  "start",
  "end",
] as const;

export const TOOL_SCHEMAS: ToolSchema[] = [
  {
    name: "get_project_summary",
    description: "Observed counts, stories, bounds, and calculated room areas for the open project. Facts only.",
    parameters: { type: "object", additionalProperties: false, properties: {} },
  },
  {
    name: "list_elements",
    description: "List element ids. Optionally filter by type and story id.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        type: { type: "string", enum: [...KNOWN_ELEMENT_TYPES] },
        storyId: { type: "string" },
      },
    },
  },
  {
    name: "get_element",
    description: "Observed properties for one element id, or for the current selection when id is omitted.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: { id: { type: "string" } },
    },
  },
  {
    name: "propose_model_edit",
    description:
      "Propose one validated edit. This does not change the project. The user must confirm. Lengths and coordinates are millimeters.",
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["summary", "edit"],
      properties: {
        summary: { type: "string" },
        edit: { type: "object" },
      },
    },
  },
  {
    name: "undo_last_assistant_edit",
    description: "Ask the user to undo the most recent assistant edit, only if no later edit sits on top of it.",
    parameters: { type: "object", additionalProperties: false, properties: {} },
  },
];

export type ParsedToolCall =
  | { name: "get_project_summary" }
  | { name: "list_elements"; type?: string; storyId?: string }
  | { name: "get_element"; id?: string }
  | { name: "propose_model_edit"; proposal: EditProposal }
  | { name: "undo_last_assistant_edit" };

export function parseToolCall(name: string, args: unknown, project: Project): Result<ParsedToolCall> {
  if (!isRecord(args)) return err("Tool arguments must be an object.");
  if (args.__parseError) return err(String(args.__parseError));
  switch (name) {
    case "get_project_summary": {
      const extra = keys(args, []);
      if (extra) return err(extra);
      return ok({ name });
    }
    case "list_elements": {
      const extra = keys(args, ["type", "storyId"]);
      if (extra) return err(extra);
      if (args.type !== undefined && (typeof args.type !== "string" || !KNOWN_ELEMENT_TYPES.includes(args.type as (typeof KNOWN_ELEMENT_TYPES)[number]))) {
        return err(`type must be one of ${KNOWN_ELEMENT_TYPES.join(", ")}.`);
      }
      if (args.storyId !== undefined && typeof args.storyId !== "string") return err("storyId must be a string.");
      return ok({
        name,
        type: typeof args.type === "string" ? args.type : undefined,
        storyId: typeof args.storyId === "string" ? args.storyId : undefined,
      });
    }
    case "get_element": {
      const extra = keys(args, ["id"]);
      if (extra) return err(extra);
      if (args.id !== undefined && typeof args.id !== "string") return err("id must be a string.");
      return ok({ name, id: typeof args.id === "string" ? args.id : undefined });
    }
    case "undo_last_assistant_edit": {
      const extra = keys(args, []);
      if (extra) return err(extra);
      return ok({ name });
    }
    case "propose_model_edit":
      return parseProposal(args, project);
    default:
      return err(`Unknown tool ${name}.`);
  }
}

export function runReadTool(project: Project, selection: string[], call: ParsedToolCall): Result<unknown> {
  switch (call.name) {
    case "get_project_summary":
      return ok(summarizeProject(project, selection));
    case "list_elements": {
      if (call.storyId && !stories(project).some((story) => story.id === call.storyId)) {
        return err(`No story with id ${call.storyId}.`);
      }
      const listed = listElements(project, { type: call.type, storyId: call.storyId });
      const truncated = listed.length > 200;
      return ok({
        count: listed.length,
        elements: listed.slice(0, 200),
        truncated,
        note: "This list is observed from the open project.",
      });
    }
    case "get_element": {
      const ids = call.id ? [call.id] : selection;
      if (!ids.length) return err("Nothing is selected. Pass an element id.");
      const facts = ids.slice(0, 20).map((id) => describeElement(project, id));
      if (facts.some((fact) => fact === null)) return err("One of the requested elements does not exist.");
      return ok({ observed: true, elements: facts });
    }
    default:
      return err("That tool does not read the project.");
  }
}

export function applyModelEdit(project: Project, edit: ModelEdit): Result<Project> {
  switch (edit.op) {
    case "set_properties":
      return applyPropertyPatch(project, edit.elementId, edit.changes);
    case "delete_element": {
      const deleted = deleteElements(project, [edit.elementId]);
      if (!deleted.ok) return deleted;
      return ok(deleted.value.project);
    }
    case "create_wall": {
      const created = addWall(project, edit);
      if (!created.ok) return created;
      return ok(created.value.project);
    }
    case "create_story": {
      const created = addStory(project, edit);
      if (!created.ok) return created;
      return ok(created.value.project);
    }
    default:
      return err("Unsupported edit.");
  }
}

/** Applies an edit only after the user has confirmed it. */
export function commitProposal(project: Project, proposal: EditProposal, confirmed: boolean): Result<Project> {
  if (!confirmed) return err("This edit needs confirmation before it can change the model.");
  return applyModelEdit(project, proposal.edit);
}

function parseProposal(args: Record<string, unknown>, project: Project): Result<ParsedToolCall> {
  const extra = keys(args, ["summary", "edit"]);
  if (extra) return err(extra);
  if (typeof args.summary !== "string" || !args.summary.trim() || args.summary.length > 400) {
    return err("summary must be a short string.");
  }
  const edit = parseEdit(args.edit);
  if (typeof edit === "string") return err(edit);
  const trial = applyModelEdit(project, edit);
  if (!trial.ok) return err(trial.error);
  return ok({
    name: "propose_model_edit",
    proposal: {
      summary: args.summary.trim(),
      edit,
      detail: describeEdit(project, edit),
      affectedIds: affectedIds(project, edit),
    },
  });
}

function parseEdit(value: unknown): ModelEdit | string {
  if (!isRecord(value) || typeof value.op !== "string") return "edit.op is required.";
  switch (value.op) {
    case "set_properties": {
      const extra = keys(value, ["op", "elementId", "changes"]);
      if (extra) return extra;
      if (typeof value.elementId !== "string" || !value.elementId) return "elementId is required.";
      const changes = parseChanges(value.changes);
      if (typeof changes === "string") return changes;
      return { op: "set_properties", elementId: value.elementId, changes };
    }
    case "delete_element": {
      const extra = keys(value, ["op", "elementId"]);
      if (extra) return extra;
      if (typeof value.elementId !== "string" || !value.elementId) return "elementId is required.";
      return { op: "delete_element", elementId: value.elementId };
    }
    case "create_wall": {
      const extra = keys(value, ["op", "storyId", "start", "end", "thickness", "height", "material"]);
      if (extra) return extra;
      if (typeof value.storyId !== "string") return "storyId is required.";
      const start = parseVec(value.start);
      const end = parseVec(value.end);
      if (typeof start === "string") return `start ${start}`;
      if (typeof end === "string") return `end ${end}`;
      const thickness = optionalNumber(value.thickness, "thickness");
      const height = optionalNumber(value.height, "height");
      if (typeof thickness === "string") return thickness;
      if (typeof height === "string") return height;
      if (value.material !== undefined && typeof value.material !== "string") return "material must be a string.";
      return {
        op: "create_wall",
        storyId: value.storyId,
        start,
        end,
        thickness,
        height,
        material: typeof value.material === "string" ? value.material : undefined,
      };
    }
    case "create_story": {
      const extra = keys(value, ["op", "name", "elevation", "height"]);
      if (extra) return extra;
      if (typeof value.name !== "string") return "name is required.";
      const elevation = optionalNumber(value.elevation, "elevation");
      const height = optionalNumber(value.height, "height");
      if (elevation === undefined || height === undefined) return "elevation and height are required numbers, in millimeters.";
      if (typeof elevation === "string") return elevation;
      if (typeof height === "string") return height;
      return { op: "create_story", name: value.name, elevation, height };
    }
    default:
      return `Unsupported operation ${value.op}. Supported operations are set_properties, delete_element, create_wall, and create_story.`;
  }
}

function parseChanges(value: unknown): PropertyPatch | string {
  if (!isRecord(value)) return "changes must be an object.";
  const patch: PropertyPatch = {};
  for (const [key, raw] of Object.entries(value)) {
    if (!CHANGE_KEYS.includes(key as (typeof CHANGE_KEYS)[number])) return `Unknown property ${key}.`;
    if (key === "start" || key === "end") {
      const point = parseVec(raw);
      if (typeof point === "string") return `${key} ${point}`;
      patch[key] = point;
      continue;
    }
    if (key === "hinge") {
      if (raw !== "start" && raw !== "end") return "hinge must be start or end.";
      patch.hinge = raw;
      continue;
    }
    if (key === "swing") {
      if (raw !== "left" && raw !== "right") return "swing must be left or right.";
      patch.swing = raw;
      continue;
    }
    if (key === "facing") {
      if (raw !== "left" && raw !== "right") return "facing must be left or right.";
      patch.facing = raw;
      continue;
    }
    if (key === "name" || key === "number" || key === "material" || key === "storyId") {
      if (typeof raw !== "string") return `${key} must be a string.`;
      if (key === "name") patch.name = raw;
      if (key === "number") patch.number = raw;
      if (key === "material") patch.material = raw;
      if (key === "storyId") patch.storyId = raw;
      continue;
    }
    if (typeof raw !== "number" || !Number.isFinite(raw)) return `${key} must be a finite number in millimeters.`;
    if (key === "thickness") patch.thickness = raw;
    if (key === "height") patch.height = raw;
    if (key === "baseOffset") patch.baseOffset = raw;
    if (key === "elevationOffset") patch.elevationOffset = raw;
    if (key === "sill") patch.sill = raw;
    if (key === "width") patch.width = raw;
    if (key === "offset") patch.offset = raw;
    if (key === "elevation") patch.elevation = raw;
    if (key === "position") patch.position = raw;
    if (key === "depth") patch.depth = raw;
  }
  if (!Object.keys(patch).length) return "changes is empty.";
  return patch;
}

function parseVec(value: unknown): Vec2 | string {
  if (!isRecord(value)) return "must be {x, y} in millimeters.";
  const extra = keys(value, ["x", "y"]);
  if (extra) return extra;
  if (typeof value.x !== "number" || typeof value.y !== "number" || !Number.isFinite(value.x) || !Number.isFinite(value.y)) {
    return "x and y must be finite numbers in millimeters.";
  }
  return { x: value.x, y: value.y };
}

function optionalNumber(value: unknown, label: string): number | undefined | string {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value)) return `${label} must be a finite number in millimeters.`;
  return value;
}

export function describeEdit(project: Project, edit: ModelEdit): string {
  switch (edit.op) {
    case "set_properties": {
      const element = elementById(project, edit.elementId);
      const label = element ? `${element.type} ${elementLabel(element)}` : edit.elementId;
      const changes = Object.entries(edit.changes)
        .map(([key, value]) => `${key}: ${formatChange(value)}`)
        .join(", ");
      return `Change ${label}. ${changes}. Values are millimeters unless the field is a name.`;
    }
    case "delete_element": {
      const removed = collectRemoval(project, [edit.elementId]);
      return `Delete ${removed.length} element${removed.length === 1 ? "" : "s"}: ${removed.join(", ")}.`;
    }
    case "create_wall": {
      const length = wallLength({ start: edit.start, end: edit.end });
      return `Create a wall on story ${edit.storyId} from (${edit.start.x}, ${edit.start.y}) to (${edit.end.x}, ${edit.end.y}). Length ${formatLength(length, "mm")}.`;
    }
    case "create_story":
      return `Add story ${edit.name} at elevation ${formatLength(edit.elevation, "mm")} with floor-to-floor height ${formatLength(edit.height, "mm")}.`;
    default:
      return "Unsupported edit.";
  }
}

function affectedIds(project: Project, edit: ModelEdit): string[] {
  switch (edit.op) {
    case "set_properties":
      return [edit.elementId];
    case "delete_element":
      return collectRemoval(project, [edit.elementId]);
    case "create_wall":
    case "create_story":
      return [];
    default:
      return [];
  }
}

function elementLabel(element: NonNullable<ReturnType<typeof elementById>>): string {
  if (isUnknownElement(element)) return element.id;
  if ("name" in element && element.name) return `${element.name} (${element.id})`;
  return element.id;
}

function formatChange(value: unknown): string {
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "x" in value && "y" in value) {
    const point = value as Vec2;
    return `(${point.x}, ${point.y})`;
  }
  return String(value);
}

function keys(value: Record<string, unknown>, allowed: string[]): string | null {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) return `Unknown field ${key}.`;
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
