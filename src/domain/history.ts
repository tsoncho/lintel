import type { Project } from "./types";

export interface HistoryEntry {
  id: string;
  label: string;
  source: "user" | "assistant";
  before: Project;
  after: Project;
}

export interface HistoryState {
  project: Project;
  past: HistoryEntry[];
  future: HistoryEntry[];
}

const HISTORY_LIMIT = 100;

export function pushHistory(
  state: HistoryState,
  entry: { id: string; label: string; source: "user" | "assistant"; after: Project },
): HistoryState {
  const recorded: HistoryEntry = {
    id: entry.id,
    label: entry.label,
    source: entry.source,
    before: state.project,
    after: entry.after,
  };
  return {
    project: entry.after,
    past: [...state.past, recorded].slice(-HISTORY_LIMIT),
    future: [],
  };
}

export function undoHistory(state: HistoryState): HistoryState | { error: string } {
  const entry = state.past[state.past.length - 1];
  if (!entry) return { error: "Nothing to undo." };
  return {
    project: entry.before,
    past: state.past.slice(0, -1),
    future: [...state.future, entry],
  };
}

export function redoHistory(state: HistoryState): HistoryState | { error: string } {
  const entry = state.future[state.future.length - 1];
  if (!entry) return { error: "Nothing to redo." };
  return {
    project: entry.after,
    past: [...state.past, entry],
    future: state.future.slice(0, -1),
  };
}

export function undoAssistantHistory(state: HistoryState): HistoryState | { error: string } {
  const entry = state.past[state.past.length - 1];
  if (!entry || entry.source !== "assistant") {
    return {
      error: entry
        ? "A later edit sits above the assistant change. Use Undo to step back one edit at a time."
        : "There is no assistant edit to undo.",
    };
  }
  const undone = undoHistory(state);
  return undone;
}
