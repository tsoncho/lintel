import { stories } from "../domain/queries";
import { toolHint, useEditor, editor, type ToolId } from "../state/editor";

const TOOLS: { id: ToolId; label: string; key: string }[] = [
  { id: "select", label: "Select", key: "V" },
  { id: "wall", label: "Wall", key: "W" },
  { id: "slab", label: "Slab", key: "S" },
  { id: "door", label: "Door", key: "D" },
  { id: "window", label: "Window", key: "N" },
  { id: "room", label: "Room", key: "R" },
];

export function Toolbar({ assistantOpen, onToggleAssistant }: { assistantOpen: boolean; onToggleAssistant: () => void }) {
  const state = useEditor();
  const levels = state.project ? stories(state.project) : [];
  return (
    <div className="toolbar" role="toolbar" aria-label="Drawing tools">
      {TOOLS.map((tool) => (
        <button
          key={tool.id}
          type="button"
          className={state.tool === tool.id ? "tool active" : "tool"}
          aria-pressed={state.tool === tool.id}
          title={`${tool.label} (${tool.key}). ${toolHint(tool.id)}`}
          onClick={() => editor.setTool(tool.id)}
        >
          <ToolIcon id={tool.id} />
          {tool.label}
        </button>
      ))}
      <span className="toolbar-gap" />
      <label className="story-pick">
        <span>Story</span>
        <select
          value={state.activeStoryId ?? ""}
          onChange={(event) => editor.setStory(event.target.value)}
          aria-label="Active story"
        >
          {levels.map((story) => (
            <option key={story.id} value={story.id}>{story.name}</option>
          ))}
        </select>
      </label>
      <div className="view-toggle" role="group" aria-label="View">
        <button type="button" className={state.view === "plan" ? "active" : ""} aria-pressed={state.view === "plan"} onClick={() => editor.setView("plan")}>Plan</button>
        <button type="button" className={state.view === "model" ? "active" : ""} aria-pressed={state.view === "model"} onClick={() => editor.setView("model")}>3D</button>
      </div>
      <button type="button" className={assistantOpen ? "tool active" : "tool"} aria-pressed={assistantOpen} onClick={onToggleAssistant}>
        Assistant
      </button>
    </div>
  );
}

function ToolIcon({ id }: { id: ToolId }) {
  const common = { width: 16, height: 16, viewBox: "0 0 16 16", "aria-hidden": true as const };
  if (id === "select") {
    return <svg {...common}><path d="M3 2 L12 8 L7.5 8.5 L6 13 Z" fill="currentColor" /></svg>;
  }
  if (id === "wall") return <svg {...common}><path d="M2 12 L14 4" stroke="currentColor" strokeWidth="2.4" /></svg>;
  if (id === "slab") return <svg {...common}><rect x="2.5" y="3" width="11" height="10" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>;
  if (id === "door") return <svg {...common}><path d="M4 13 V3 H10" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="M4 13 A6 6 0 0 0 10 7" fill="none" stroke="currentColor" /></svg>;
  if (id === "window") return <svg {...common}><rect x="3" y="3" width="10" height="10" fill="none" stroke="currentColor" /><path d="M8 3 V13 M3 8 H13" stroke="currentColor" /></svg>;
  return <svg {...common}><path d="M2 12 H14 V8 H8 V4 H2 Z" fill="none" stroke="currentColor" /></svg>;
}
