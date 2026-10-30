export const SHORTCUTS: { keys: string; action: string }[] = [
  { keys: "V", action: "Select" },
  { keys: "W", action: "Wall" },
  { keys: "S", action: "Slab" },
  { keys: "D", action: "Door" },
  { keys: "N", action: "Window" },
  { keys: "R", action: "Room" },
  { keys: "C", action: "Section line" },
  { keys: "1 / 2 / 3", action: "Plan / 3D / section" },
  { keys: "Enter", action: "Close a slab or room outline" },
  { keys: "Backspace", action: "Remove the last outline point" },
  { keys: "Escape", action: "Cancel the draft, then clear the selection" },
  { keys: "Delete", action: "Delete the selection" },
  { keys: "Ctrl+Z", action: "Undo" },
  { keys: "Ctrl+Y", action: "Redo" },
  { keys: "Ctrl+S", action: "Save" },
  { keys: "Ctrl+Shift+S", action: "Save as" },
  { keys: "Ctrl+O", action: "Open" },
  { keys: "F", action: "Zoom to fit" },
  { keys: "Arrow keys", action: "Pan the plan" },
  { keys: "+ / −", action: "Zoom the plan" },
  { keys: "Shift", action: "Constrain to horizontal or vertical" },
  { keys: "F3", action: "Toggle grid snap" },
  { keys: "F4", action: "Toggle point snap" },
  { keys: "?", action: "Shortcut reference" },
];

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable;
}
