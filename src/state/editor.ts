import { useSyncExternalStore } from "react";
import { DEFAULTS } from "../domain/defaults";
import { deleteElements, updateProjectMeta, type PropertyPatch } from "../domain/edits";
import { applyPropertyPatch } from "../domain/edits";
import { pushHistory, redoHistory, undoAssistantHistory, undoHistory, type HistoryEntry } from "../domain/history";
import { createId } from "../domain/ids";
import { stories } from "../domain/queries";
import { syncDerivedRooms } from "../domain/spaces";
import { ok, type Result } from "../domain/result";
import { createEmptyProject, createSampleProject } from "../domain/sample";
import type { DisplayUnit, Project, ProjectFile } from "../domain/types";
import { SCHEMA_VERSION } from "../domain/types";
import { parseProjectFile, projectFingerprint, serializeProjectFile, wrapProject } from "../persistence/file";

export type ToolId = "select" | "wall" | "slab" | "door" | "window" | "room" | "section";
export type StatusTone = "neutral" | "ok" | "error";

export interface EditorState {
  screen: "start" | "workspace";
  project: Project | null;
  preserved: Record<string, unknown> | null;
  filePath: string | null;
  savedFingerprint: string;
  dirty: boolean;
  past: HistoryEntry[];
  future: HistoryEntry[];
  selection: string[];
  activeStoryId: string | null;
  tool: ToolId;
  view: "plan" | "model" | "section";
  activeSectionId: string | null;
  snapGrid: boolean;
  snapPoints: boolean;
  gridSize: number;
  ghostStories: boolean;
  status: string;
  statusTone: StatusTone;
  showGuide: boolean;
  fitToken: number;
  version: number;
  loadErrors: string[] | null;
  sessionId: number;
}

function initialState(): EditorState {
  return {
    screen: "start",
    project: null,
    preserved: null,
    filePath: null,
    savedFingerprint: "",
    dirty: false,
    past: [],
    future: [],
    selection: [],
    activeStoryId: null,
    tool: "select",
    view: "plan",
    activeSectionId: null,
    snapGrid: true,
    snapPoints: true,
    gridSize: DEFAULTS.gridSize,
    ghostStories: false,
    status: "Open a project or start from the sample.",
    statusTone: "neutral",
    showGuide: false,
    fitToken: 1,
    version: 0,
    loadErrors: null,
    sessionId: 0,
  };
}

let state = initialState();
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function patch(next: Partial<EditorState>) {
  state = { ...state, ...next };
  emit();
}

function adopt(file: ProjectFile, path: string | null, guide: boolean, status: string) {
  const fingerprint = projectFingerprint(file.project, file.preserved);
  state = {
    ...state,
    screen: "workspace",
    project: file.project,
    preserved: file.preserved ?? null,
    filePath: path,
    savedFingerprint: fingerprint,
    dirty: false,
    past: [],
    future: [],
    selection: [],
    activeStoryId: stories(file.project)[0]?.id ?? null,
    tool: "select",
    view: "plan",
    activeSectionId: null,
    showGuide: guide,
    fitToken: state.fitToken + 1,
    version: state.version + 1,
    loadErrors: null,
    sessionId: state.sessionId + 1,
    status,
    statusTone: "ok",
  };
  emit();
}

function existingSelection(project: Project, ids: string[]): string[] {
  const live = new Set(project.elements.map((element) => element.id));
  return ids.filter((id) => live.has(id));
}

export const editor = {
  getState: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  setStatus(status: string, statusTone: StatusTone = "neutral") {
    patch({ status, statusTone });
  },
  clearLoadErrors() {
    patch({ loadErrors: null });
  },
  dismissGuide() {
    patch({ showGuide: false });
  },
  requestFit() {
    patch({ fitToken: state.fitToken + 1 });
  },
  setTool(tool: ToolId) {
    patch({ tool, status: toolHint(tool), statusTone: "neutral" });
  },
  setView(view: "plan" | "model" | "section") {
    patch({ view });
  },
  setActiveSection(activeSectionId: string) {
    patch({ activeSectionId, view: "section" });
  },
  setStory(activeStoryId: string) {
    patch({ activeStoryId });
  },
  select(selection: string[]) {
    patch({ selection });
  },
  toggleSelect(id: string) {
    const selection = state.selection.includes(id)
      ? state.selection.filter((item) => item !== id)
      : [...state.selection, id];
    patch({ selection });
  },
  clearSelection() {
    patch({ selection: [] });
  },
  toggleSnapGrid() {
    patch({ snapGrid: !state.snapGrid });
  },
  toggleSnapPoints() {
    patch({ snapPoints: !state.snapPoints });
  },
  toggleGhost() {
    patch({ ghostStories: !state.ghostStories });
  },
  newProject(name: string) {
    const project = createEmptyProject(name);
    adopt(wrapProject(project), null, false, `${project.name} is ready. Choose Wall and click twice on the sheet.`);
  },
  openSample() {
    const project = createSampleProject();
    adopt(wrapProject(project), null, true, "Courtyard Studio is open on the ground floor.");
  },
  openText(text: string, path: string | null): boolean {
    const loaded = parseProjectFile(text);
    if (!loaded.ok) {
      patch({ loadErrors: loaded.errors, status: loaded.errors[0] ?? "The file could not be opened.", statusTone: "error" });
      return false;
    }
    const migrated = loaded.migratedFrom
      ? ` Opened from schema version ${loaded.migratedFrom}. Saving stores version ${SCHEMA_VERSION}; the file on disk is unchanged until you save.`
      : "";
    adopt(loaded.file, path, false, `Opened ${loaded.file.project.name}.${migrated}`);
    return true;
  },
  closeToStart() {
    state = { ...initialState(), fitToken: state.fitToken, version: state.version, sessionId: state.sessionId };
    emit();
  },
  markUnsaved() {
    patch({
      dirty: true,
      savedFingerprint: "",
      status: "Restored unsaved work. Save it before you close.",
      statusTone: "ok",
    });
  },
  markSaved(path: string | null) {
    if (!state.project) return;
    patch({
      filePath: path,
      savedFingerprint: projectFingerprint(state.project, state.preserved ?? undefined),
      dirty: false,
      status: path && !path.startsWith("browser:") ? `Saved ${path}` : "Saved in this browser.",
      statusTone: "ok",
    });
  },
  documentText(): string | null {
    if (!state.project) return null;
    return serializeProjectFile(wrapProject(state.project, state.preserved ?? undefined));
  },
  apply(label: string, source: "user" | "assistant", result: Result<Project>, selection?: string[]): boolean {
    if (!state.project) return false;
    if (!result.ok) {
      patch({ status: result.error, statusTone: "error" });
      return false;
    }
    const stamped: Project = { ...syncDerivedRooms(result.value), updatedAt: new Date().toISOString() };
    const next = pushHistory(
      { project: state.project, past: state.past, future: state.future },
      { id: createId("hist"), label, source, after: stamped },
    );
    const activeStillThere = stories(next.project).some((story) => story.id === state.activeStoryId);
    state = {
      ...state,
      project: next.project,
      past: next.past,
      future: next.future,
      dirty: projectFingerprint(next.project, state.preserved ?? undefined) !== state.savedFingerprint,
      selection: selection ?? existingSelection(next.project, state.selection),
      activeStoryId: activeStillThere ? state.activeStoryId : stories(next.project)[0]?.id ?? null,
      status: label,
      statusTone: "ok",
      version: state.version + 1,
    };
    emit();
    return true;
  },
  patchElement(id: string, changes: PropertyPatch, label: string) {
    if (!state.project) return false;
    return editor.apply(label, "user", applyPropertyPatch(state.project, id, changes), [id]);
  },
  patchProject(changes: { name?: string; displayUnit?: DisplayUnit }) {
    if (!state.project) return false;
    const label = changes.displayUnit ? `Display unit set to ${changes.displayUnit}` : "Rename project";
    return editor.apply(label, "user", updateProjectMeta(state.project, changes));
  },
  deleteIds(ids: string[], source: "user" | "assistant" = "user") {
    if (!state.project) return false;
    const result = deleteElements(state.project, ids);
    if (!result.ok) {
      patch({ status: result.error, statusTone: "error" });
      return false;
    }
    return editor.apply(`Deleted ${result.value.removedIds.length} element${result.value.removedIds.length === 1 ? "" : "s"}`, source, ok(result.value.project), []);
  },
  undo() {
    if (!state.project) return;
    const next = undoHistory({ project: state.project, past: state.past, future: state.future });
    if ("error" in next) {
      patch({ status: next.error, statusTone: "error" });
      return;
    }
    replaceHistory(next, "Undone");
  },
  redo() {
    if (!state.project) return;
    const next = redoHistory({ project: state.project, past: state.past, future: state.future });
    if ("error" in next) {
      patch({ status: next.error, statusTone: "error" });
      return;
    }
    replaceHistory(next, "Redone");
  },
  undoAssistant(): boolean {
    if (!state.project) return false;
    const next = undoAssistantHistory({ project: state.project, past: state.past, future: state.future });
    if ("error" in next) {
      patch({ status: next.error, statusTone: "error" });
      return false;
    }
    replaceHistory(next, "Undid the assistant edit");
    return true;
  },
};

function replaceHistory(next: { project: Project; past: HistoryEntry[]; future: HistoryEntry[] }, status: string) {
  const activeStillThere = stories(next.project).some((story) => story.id === state.activeStoryId);
  state = {
    ...state,
    project: next.project,
    past: next.past,
    future: next.future,
    dirty: projectFingerprint(next.project, state.preserved ?? undefined) !== state.savedFingerprint,
    selection: existingSelection(next.project, state.selection),
    activeStoryId: activeStillThere ? state.activeStoryId : stories(next.project)[0]?.id ?? null,
    status,
    statusTone: "ok",
    version: state.version + 1,
  };
  emit();
}

export function useEditor(): EditorState {
  return useSyncExternalStore(editor.subscribe, editor.getState, editor.getState);
}

export function toolHint(tool: ToolId): string {
  switch (tool) {
    case "select":
      return "Click to select. Drag a body to move it, or drag a handle to reshape it.";
    case "wall":
      return "Click to start a wall, click again to place it. Escape ends the chain.";
    case "slab":
      return "Click corners, then Enter or click the first point to close the slab.";
    case "room":
      return "Click the room outline, then Enter or click the first point to close it.";
    case "section":
      return "Click the start of a section line, then the end. The flag shows which way the view looks.";
    case "door":
      return "Click a wall to place a 900 × 2100 mm door.";
    case "window":
      return "Click a wall to place a 1200 × 1200 mm window.";
    default:
      return "Ready";
  }
}
