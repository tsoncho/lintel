import { useEffect, useState } from "react";
import { addGridline, addStory, suggestGridName, suggestNextStory } from "../domain/edits";
import { collectRemoval, elementsOnStory } from "../domain/queries";
import { ok } from "../domain/result";
import { browserStorage, writeRecovery } from "../persistence/library";
import { registerLeavePrompt } from "../platform/leave";
import { createNamed, goHome, openProject, saveProject } from "../platform/session";
import { editor, useEditor, type ToolId } from "../state/editor";
import { drawing } from "../view/drawing";
import { PlanCanvas } from "../view/PlanCanvas";
import { View3D } from "../view/View3D";
import { SectionCanvas } from "../view/SectionCanvas";
import { Assistant, SettingsDialog } from "./Assistant";
import { MenuBar } from "./MenuBar";
import { Modal } from "./Modal";
import { Navigator } from "./Navigator";
import { Properties } from "./Properties";
import { SHORTCUTS, isTypingTarget } from "./shortcuts";
import { StatusBar } from "./StatusBar";
import { Toolbar } from "./Toolbar";
import { APP_VERSION } from "../version";

interface Panels {
  nav: number;
  prop: number;
  assistant: number;
}

export function Workspace({ onLearn }: { onLearn: () => void }) {
  const state = useEditor();
  const [panels, setPanels] = useState<Panels>(() => readPanels());
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("Untitled");
  const [storyOpen, setStoryOpen] = useState(false);
  const [gridOpen, setGridOpen] = useState(false);
  const [shortcuts, setShortcuts] = useState(false);
  const [about, setAbout] = useState(false);
  const [settings, setSettings] = useState(false);
  const [leave, setLeave] = useState<((choice: "save" | "discard" | "cancel") => void) | null>(null);

  useEffect(() => registerLeavePrompt((resolve) => setLeave(() => resolve)), []);

  useEffect(() => {
    localStorage.setItem("lintel.panels", JSON.stringify(panels));
  }, [panels]);

  useEffect(() => {
    if (!state.dirty || !state.project) return;
    const handle = window.setTimeout(() => {
      const store = browserStorage();
      const text = editor.documentText();
      if (!store || !text || !editor.getState().project) return;
      try {
        writeRecovery(store, {
          savedAt: new Date().toISOString(),
          path: editor.getState().filePath,
          name: editor.getState().project?.name ?? "Untitled",
          contents: text,
        });
      } catch {
        editor.setStatus("Could not store a recovery copy in this browser.", "error");
      }
    }, 800);
    return () => window.clearTimeout(handle);
  }, [state.version, state.dirty, state.project]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target) || document.querySelector("[role=dialog]")) return;
      const key = event.key.toLowerCase();
      if (event.ctrlKey && key === "s") {
        event.preventDefault();
        void saveProject(event.shiftKey);
        return;
      }
      if (event.ctrlKey && key === "o") {
        event.preventDefault();
        void openProject();
        return;
      }
      if (event.ctrlKey && key === "z" && !event.shiftKey) {
        event.preventDefault();
        editor.undo();
        return;
      }
      if ((event.ctrlKey && key === "y") || (event.ctrlKey && event.shiftKey && key === "z")) {
        event.preventDefault();
        editor.redo();
        return;
      }
      if (event.key === "Escape") {
        if (drawing.cancel()) return;
        editor.clearSelection();
        return;
      }
      if (event.key === "Enter" && drawing.closeShape()) {
        event.preventDefault();
        return;
      }
      if (event.key === "Backspace" && drawing.undoPoint()) {
        event.preventDefault();
        return;
      }
      if (event.key === "Delete") {
        event.preventDefault();
        deleteSelection();
        return;
      }
      if (event.key === "F3") {
        editor.toggleSnapGrid();
        return;
      }
      if (event.key === "F4") {
        editor.toggleSnapPoints();
        return;
      }
      if (key === "?" || (event.shiftKey && key === "/")) {
        setShortcuts(true);
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const tools: Record<string, ToolId> = { v: "select", w: "wall", s: "slab", d: "door", n: "window", r: "room", c: "section" };
      if (tools[key]) editor.setTool(tools[key]);
      if (key === "1") editor.setView("plan");
      if (key === "2") editor.setView("model");
      if (key === "3") editor.setView("section");
      if (key === "f") editor.requestFit();
      if (event.key === "ArrowLeft") drawing.panBy(40, 0);
      if (event.key === "ArrowRight") drawing.panBy(-40, 0);
      if (event.key === "ArrowUp") drawing.panBy(0, 40);
      if (event.key === "ArrowDown") drawing.panBy(0, -40);
      if (event.key === "+" || event.key === "=") drawing.zoomBy(1.1);
      if (event.key === "-" || event.key === "_") drawing.zoomBy(0.9);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const project = state.project;
  const wallCount = project && state.activeStoryId
    ? elementsOnStory(project, state.activeStoryId).filter((element) => element.type === "wall").length
    : 0;
  const suggested = project ? suggestNextStory(project) : null;

  return (
    <div className="shell">
      <MenuBar
        projectName={project?.name ?? "Lintel"}
        dirty={state.dirty}
        onHome={() => void goHome()}
        onNew={() => setNaming(true)}
        onOpen={() => void openProject()}
        onSave={() => void saveProject(false)}
        onSaveAs={() => void saveProject(true)}
        onUndo={() => editor.undo()}
        onRedo={() => editor.redo()}
        onDelete={deleteSelection}
        onPlan={() => editor.setView("plan")}
        onModel={() => editor.setView("model")}
        onFit={() => editor.requestFit()}
        onGhost={() => editor.toggleGhost()}
        onAddStory={() => setStoryOpen(true)}
        onAddGrid={() => setGridOpen(true)}
        onShortcuts={() => setShortcuts(true)}
        onSettings={() => setSettings(true)}
        onAbout={() => setAbout(true)}
        onLearn={onLearn}
      />
      <Toolbar assistantOpen={panels.assistant > 0} onToggleAssistant={() => setPanels((current) => ({ ...current, assistant: current.assistant > 0 ? 0 : 220 }))} />
      <div
        className="workspace"
        style={{ ["--nav" as string]: `${panels.nav}px`, ["--prop" as string]: `${panels.prop}px` }}
      >
        <Navigator />
        <Gutter label="Resize project panel" onDrag={(dx) => setPanels((current) => ({ ...current, nav: clamp(current.nav + dx, 200, 420) }))} />
        <div className="center">
          <div className="view-stack">
            <div className={state.view === "plan" ? "view active" : "view inactive"}><PlanCanvas /></div>
            <div className={state.view === "model" ? "view active" : "view inactive"}><View3D /></div>
            <div className={state.view === "section" ? "view active" : "view inactive"}><SectionCanvas /></div>
            {state.view === "plan" && wallCount === 0 && (
              <div className="empty-plan">
                <strong>This story has no walls yet.</strong>
                <p>Choose Wall, then click two points. Switch to 3D whenever you want to look around.</p>
              </div>
            )}
            {state.showGuide && (
              <div className="guide">
                <p>Courtyard Studio is a two-storey sample. Edits on the plan update the 3D model. Save a copy before you experiment. Stairs, sheets, and IFC are not in this version.</p>
                <button type="button" className="btn tiny" onClick={() => editor.dismissGuide()}>Dismiss</button>
              </div>
            )}
          </div>
          {panels.assistant > 0 && (
            <>
              <Gutter label="Resize assistant" horizontal onDrag={(dy) => setPanels((current) => ({ ...current, assistant: clamp(current.assistant - dy, 140, 420) }))} />
              <div style={{ height: panels.assistant }}><Assistant key={state.sessionId} onOpenSettings={() => setSettings(true)} /></div>
            </>
          )}
        </div>
        <Gutter label="Resize properties" onDrag={(dx) => setPanels((current) => ({ ...current, prop: clamp(current.prop - dx, 240, 460) }))} />
        <Properties />
      </div>
      <StatusBar />
      {naming && (
        <Modal title="New project" onClose={() => setNaming(false)}>
          <form onSubmit={(event) => { event.preventDefault(); setNaming(false); void createNamed(name.trim() || "Untitled"); }}>
            <label className="field"><span>Name</span><input value={name} onChange={(event) => setName(event.target.value)} /></label>
            <div className="row end"><button type="button" className="btn" onClick={() => setNaming(false)}>Cancel</button><button className="btn primary" type="submit">Create</button></div>
          </form>
        </Modal>
      )}
      {storyOpen && suggested && project && (
        <StoryDialog
          initial={suggested}
          onClose={() => setStoryOpen(false)}
          onCreate={(value) => {
            const result = addStory(project, value);
            if (!result.ok) editor.setStatus(result.error, "error");
            else {
              editor.apply("Add story", "user", ok(result.value.project), [result.value.id]);
              editor.setStory(result.value.id);
            }
            setStoryOpen(false);
          }}
        />
      )}
      {gridOpen && project && (
        <GridDialog
          initialName={suggestGridName(project, "x")}
          onClose={() => setGridOpen(false)}
          onCreate={(value) => {
            const result = addGridline(project, value);
            if (!result.ok) editor.setStatus(result.error, "error");
            else editor.apply("Add gridline", "user", ok(result.value.project), [result.value.id]);
            setGridOpen(false);
          }}
        />
      )}
      {shortcuts && (
        <Modal title="Shortcuts" onClose={() => setShortcuts(false)}>
          <table className="shortcut-table">
            <tbody>
              {SHORTCUTS.map((item) => (
                <tr key={item.keys}><th>{item.keys}</th><td>{item.action}</td></tr>
              ))}
            </tbody>
          </table>
        </Modal>
      )}
      {about && (
        <Modal title="About Lintel" onClose={() => setAbout(false)}>
          <p>Lintel {APP_VERSION} is an original architectural modeling studio. Plans and the 3D view read the same project.</p>
          <p>Coordinates are millimeters. X is east, Y is north, and story elevation goes up. North stays at the top of the plan.</p>
          <p>This version models stories, gridlines, straight walls, slabs, doors, windows, and explicit rooms. It does not claim to be a full documentation or analysis suite.</p>
        </Modal>
      )}
      {settings && <SettingsDialog onClose={() => setSettings(false)} />}
      {leave && (
        <Modal title="Unsaved changes" onClose={() => { leave("cancel"); setLeave(null); }}>
          <p>This project has unsaved changes.</p>
          <div className="row end">
            <button type="button" className="btn" onClick={() => { leave("cancel"); setLeave(null); }}>Cancel</button>
            <button type="button" className="btn" onClick={() => { leave("discard"); setLeave(null); }}>Discard</button>
            <button type="button" className="btn primary" onClick={() => { leave("save"); setLeave(null); }}>Save and continue</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function deleteSelection() {
  const current = editor.getState();
  if (!current.project || !current.selection.length) return;
  const removed = collectRemoval(current.project, current.selection);
  const includesStory = current.selection.some((id) => current.project?.elements.find((element) => element.id === id)?.type === "story");
  if (includesStory) {
    const agreed = window.confirm(`Delete ${removed.length} elements, including a story? You can undo this.`);
    if (!agreed) return;
  }
  editor.deleteIds(current.selection);
}

function StoryDialog({
  initial,
  onClose,
  onCreate,
}: {
  initial: { name: string; elevation: number; height: number };
  onClose: () => void;
  onCreate: (value: { name: string; elevation: number; height: number }) => void;
}) {
  const [name, setName] = useState(initial.name);
  const [elevation, setElevation] = useState(String(initial.elevation));
  const [height, setHeight] = useState(String(initial.height));
  return (
    <Modal title="Add story" onClose={onClose}>
      <form onSubmit={(event) => {
        event.preventDefault();
        onCreate({ name, elevation: Number(elevation), height: Number(height) });
      }}>
        <label className="field"><span>Name</span><input value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label className="field"><span>Elevation (mm)</span><input value={elevation} onChange={(event) => setElevation(event.target.value)} /></label>
        <label className="field"><span>Floor-to-floor (mm)</span><input value={height} onChange={(event) => setHeight(event.target.value)} /></label>
        <div className="row end"><button type="button" className="btn" onClick={onClose}>Cancel</button><button className="btn primary" type="submit">Add story</button></div>
      </form>
    </Modal>
  );
}

function GridDialog({
  initialName,
  onClose,
  onCreate,
}: {
  initialName: string;
  onClose: () => void;
  onCreate: (value: { name: string; axis: "x" | "y"; position: number }) => void;
}) {
  const [name, setName] = useState(initialName);
  const [axis, setAxis] = useState<"x" | "y">("x");
  const [position, setPosition] = useState("0");
  return (
    <Modal title="Add gridline" onClose={onClose}>
      <form onSubmit={(event) => {
        event.preventDefault();
        onCreate({ name, axis, position: Number(position) });
      }}>
        <label className="field"><span>Name</span><input value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label className="field">
          <span>Direction</span>
          <select value={axis} onChange={(event) => setAxis(event.target.value as "x" | "y")}>
            <option value="x">Constant X (parallel to north)</option>
            <option value="y">Constant Y (parallel to east)</option>
          </select>
        </label>
        <label className="field"><span>Position (mm)</span><input value={position} onChange={(event) => setPosition(event.target.value)} /></label>
        <div className="row end"><button type="button" className="btn" onClick={onClose}>Cancel</button><button className="btn primary" type="submit">Add grid</button></div>
      </form>
    </Modal>
  );
}

function Gutter({ label, onDrag, horizontal = false }: { label: string; onDrag: (delta: number) => void; horizontal?: boolean }) {
  return (
    <div
      className={horizontal ? "gutter horizontal" : "gutter"}
      role="separator"
      aria-orientation={horizontal ? "horizontal" : "vertical"}
      aria-label={label}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        let last = horizontal ? event.clientY : event.clientX;
        const move = (next: PointerEvent) => {
          const point = horizontal ? next.clientY : next.clientX;
          onDrag(point - last);
          last = point;
        };
        const up = () => {
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", up);
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
      }}
    />
  );
}

function readPanels(): Panels {
  try {
    const parsed = JSON.parse(localStorage.getItem("lintel.panels") || "") as Partial<Panels>;
    return {
      nav: clamp(Number(parsed.nav) || 252, 200, 420),
      prop: clamp(Number(parsed.prop) || 300, 240, 460),
      assistant: clamp(parsed.assistant === 0 ? 0 : Number(parsed.assistant) || 220, 0, 420),
    };
  } catch {
    return { nav: 252, prop: 300, assistant: 220 };
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
