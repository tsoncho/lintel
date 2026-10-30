import { useSyncExternalStore } from "react";
import { editor, toolHint, useEditor } from "../state/editor";
import { pointer } from "../state/pointer";
import { formatPoint, scaleDenominator } from "../domain/units";

export function StatusBar() {
  const state = useEditor();
  const readout = useSyncExternalStore(pointer.subscribe, pointer.get, pointer.get);
  const coords = readout.world && state.project
    ? formatPoint(readout.world.x, readout.world.y, state.project.displayUnit)
    : "E —   N —";
  return (
    <footer className="status-bar" aria-live="polite">
      <span className={`status-text${state.statusTone === "error" ? " error" : state.statusTone === "ok" ? " ok" : ""}`}>{state.status || toolHint(state.tool)}</span>
      <span className="coords">{state.view === "plan" ? coords : "Drag to orbit · right-drag to pan"}</span>
      <span className="status-tools">
        <button type="button" className={state.snapGrid ? "chip on" : "chip"} aria-pressed={state.snapGrid} onClick={() => editor.toggleSnapGrid()}>Grid snap</button>
        <button type="button" className={state.snapPoints ? "chip on" : "chip"} aria-pressed={state.snapPoints} onClick={() => editor.toggleSnapPoints()}>Points</button>
        <span>1:{scaleDenominator(readout.zoom) || "—"}</span>
      </span>
    </footer>
  );
}
