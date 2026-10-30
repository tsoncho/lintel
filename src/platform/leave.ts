import { editor } from "../state/editor";

export type LeaveChoice = "save" | "discard" | "cancel";

type Prompt = (resolve: (choice: LeaveChoice) => void) => void;
let prompt: Prompt | null = null;

export function registerLeavePrompt(next: Prompt): () => void {
  prompt = next;
  return () => {
    if (prompt === next) prompt = null;
  };
}

export function chooseLeave(): Promise<LeaveChoice> {
  if (!editor.getState().dirty) return Promise.resolve("discard");
  if (!prompt) {
    return Promise.resolve(window.confirm("Discard unsaved changes?") ? "discard" : "cancel");
  }
  return new Promise((resolve) => prompt?.(resolve));
}
