import { useEffect, useState } from "react";
import { wallLength, polygonArea } from "../domain/geometry";
import { elementById, hostedOpenings, stories } from "../domain/queries";
import { editor, useEditor } from "../state/editor";
import { isUnknownElement, type DisplayUnit, type Element } from "../domain/types";
import { formatArea, formatLength, formatNumber, mmToDisplay, parseLength } from "../domain/units";

export function Properties() {
  const state = useEditor();
  const project = state.project;
  if (!project) return null;
  const selected = state.selection.map((id) => elementById(project, id)).filter((element): element is Element => Boolean(element));

  return (
    <aside className="properties" aria-label="Properties">
      <header><h2>Properties</h2></header>
      {selected.length === 0 && (
        <div className="prop-body">
          <TextField label="Project" value={project.name} onCommit={(name) => editor.patchProject({ name })} />
          <label className="field">
            <span>Display unit</span>
            <select value={project.displayUnit} onChange={(event) => editor.patchProject({ displayUnit: event.target.value as DisplayUnit })}>
              <option value="mm">Millimeters</option>
              <option value="m">Meters</option>
            </select>
            <small>Geometry stays stored in millimeters.</small>
          </label>
          <p className="meta">{project.elements.length} elements · {stories(project).length} stories</p>
        </div>
      )}
      {selected.length > 1 && (
        <div className="prop-body">
          <p>{selected.length} elements selected.</p>
          <button type="button" className="btn danger" onClick={() => editor.deleteIds(state.selection)}>Delete selection</button>
        </div>
      )}
      {selected.length === 1 && (
        <ElementFields element={selected[0]} unit={project.displayUnit} />
      )}
    </aside>
  );
}

function ElementFields({ element, unit }: { element: Element; unit: DisplayUnit }) {
  const state = useEditor();
  const project = state.project;
  if (!project) return null;
  if (isUnknownElement(element)) {
    return (
      <div className="prop-body">
        <p>This {element.foreignType} is preserved so saving does not drop it. This version does not edit it.</p>
        <p className="meta">{element.id}</p>
      </div>
    );
  }
  const commit = (changes: Parameters<typeof editor.patchElement>[1], label: string) => {
    editor.patchElement(element.id, changes, label);
  };
  return (
    <div className="prop-body">
      <p className="meta">{element.type} · {element.id}</p>
      {element.type === "story" && (
        <>
          <TextField label="Name" value={element.name} onCommit={(name) => commit({ name }, "Rename story")} />
          <LengthField label="Elevation" mm={element.elevation} unit={unit} onCommit={(elevation) => commit({ elevation }, "Change story elevation")} />
          <LengthField label="Floor-to-floor" mm={element.height} unit={unit} onCommit={(height) => commit({ height }, "Change story height")} />
          <button type="button" className="btn danger" onClick={() => deleteStory(element.id, element.name)}>Delete story</button>
        </>
      )}
      {element.type === "gridline" && (
        <>
          <TextField label="Name" value={element.name} onCommit={(name) => commit({ name }, "Rename grid")} />
          <p className="meta">{element.axis === "x" ? "Constant X, parallel to north" : "Constant Y, parallel to east"}</p>
          <LengthField label="Position" mm={element.position} unit={unit} onCommit={(position) => commit({ position }, "Move gridline")} />
        </>
      )}
      {element.type === "wall" && (
        <>
          <StorySelect value={element.storyId} onChange={(storyId) => commit({ storyId }, "Move wall to another story")} />
          <TextField label="Material" value={element.material} onCommit={(material) => commit({ material }, "Change material")} />
          <LengthField label="Thickness" mm={element.thickness} unit={unit} onCommit={(thickness) => commit({ thickness }, "Change thickness")} />
          <LengthField label="Height" mm={element.height} unit={unit} onCommit={(height) => commit({ height }, "Change wall height")} />
          <LengthField label="Base offset" mm={element.baseOffset} unit={unit} onCommit={(baseOffset) => commit({ baseOffset }, "Change base offset")} />
          <p className="meta">Length {formatLength(wallLength(element), unit)}. Joins are square ends, not cleaned miters.</p>
          <h3>Openings</h3>
          {hostedOpenings(project, element.id).map((opening) => (
            <button key={opening.id} type="button" className="nav-item" onClick={() => editor.select([opening.id])}>
              {opening.type} · {formatLength(opening.width, unit)}
            </button>
          ))}
          {hostedOpenings(project, element.id).length === 0 && <p className="muted">No doors or windows on this wall.</p>}
        </>
      )}
      {element.type === "slab" && (
        <>
          <StorySelect value={element.storyId} onChange={(storyId) => commit({ storyId }, "Move slab to another story")} />
          <TextField label="Material" value={element.material} onCommit={(material) => commit({ material }, "Change material")} />
          <LengthField label="Thickness" mm={element.thickness} unit={unit} onCommit={(thickness) => commit({ thickness }, "Change slab thickness")} />
          <LengthField label="Top offset" mm={element.elevationOffset} unit={unit} onCommit={(elevationOffset) => commit({ elevationOffset }, "Change slab elevation")} />
          <p className="meta">Area {formatArea(polygonArea(element.outline))}. The top sits at the story elevation plus this offset. Thickness goes downward.</p>
        </>
      )}
      {element.type === "room" && (
        <>
          <StorySelect value={element.storyId} onChange={(storyId) => commit({ storyId }, "Move room to another story")} />
          <TextField label="Name" value={element.name} onCommit={(name) => commit({ name }, "Rename room")} />
          <TextField label="Number" value={element.number} onCommit={(number) => commit({ number }, "Change room number")} />
          <p className="meta">Area {formatArea(polygonArea(element.outline))}, calculated from this outline. Rooms are not detected from walls.</p>
        </>
      )}
      {(element.type === "door" || element.type === "window") && (
        <>
          <LengthField label="Width" mm={element.width} unit={unit} onCommit={(width) => commit({ width }, "Change opening width")} />
          <LengthField label="Height" mm={element.height} unit={unit} onCommit={(height) => commit({ height }, "Change opening height")} />
          <LengthField label="Sill" mm={element.sill} unit={unit} onCommit={(sill) => commit({ sill }, "Change sill")} />
          <LengthField label="Center along wall" mm={element.offset} unit={unit} onCommit={(offset) => commit({ offset }, "Move opening")} />
          {element.type === "door" && (
            <>
              <label className="field">
                <span>Hinge</span>
                <select value={element.hinge} onChange={(event) => commit({ hinge: event.target.value as "start" | "end" }, "Change hinge")}>
                  <option value="start">Start side</option>
                  <option value="end">End side</option>
                </select>
              </label>
              <label className="field">
                <span>Swing</span>
                <select value={element.swing} onChange={(event) => commit({ swing: event.target.value as "left" | "right" }, "Change swing")}>
                  <option value="left">Left of wall direction</option>
                  <option value="right">Right of wall direction</option>
                </select>
                <small>Shown on the plan. The 3D view shows the opening and a leaf, not the swing arc.</small>
              </label>
            </>
          )}
        </>
      )}
      <button type="button" className="btn danger" onClick={() => editor.deleteIds([element.id])}>Delete</button>
    </div>
  );
}

function deleteStory(id: string, name: string) {
  const project = editor.getState().project;
  if (!project) return;
  const agreed = window.confirm(`Delete ${name} and the elements on it? You can undo this.`);
  if (!agreed) return;
  editor.deleteIds([id]);
}

function StorySelect({ value, onChange }: { value: string; onChange: (storyId: string) => void }) {
  const project = useEditor().project;
  if (!project) return null;
  return (
    <label className="field">
      <span>Story</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {stories(project).map((story) => <option key={story.id} value={story.id}>{story.name}</option>)}
      </select>
    </label>
  );
}

function TextField({ label, value, onCommit }: { label: string; value: string; onCommit: (value: string) => void }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <label className="field">
      <span>{label}</span>
      <input
        value={text}
        onChange={(event) => setText(event.target.value)}
        onBlur={(event) => {
          const next = event.currentTarget.value;
          if (next.trim() && next.trim() !== value) onCommit(next);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") (event.target as HTMLInputElement).blur();
        }}
      />
    </label>
  );
}

function LengthField({ label, mm, unit, onCommit }: { label: string; mm: number; unit: DisplayUnit; onCommit: (mm: number) => void }) {
  const digits = unit === "m" ? 3 : 1;
  const [text, setText] = useState(formatNumber(mmToDisplay(mm, unit), digits));
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setText(formatNumber(mmToDisplay(mm, unit), digits));
    setError(null);
  }, [mm, unit, digits]);
  return (
    <label className="field">
      <span>{label}</span>
      <input
        value={text}
        inputMode="decimal"
        onChange={(event) => setText(event.target.value)}
        onBlur={(event) => {
          const parsed = parseLength(event.currentTarget.value, unit);
          if (parsed === null) {
            setError("Enter a number.");
            return;
          }
          setError(null);
          if (Math.abs(parsed - mm) < 0.05) return;
          onCommit(parsed);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") (event.target as HTMLInputElement).blur();
        }}
      />
      <small>{error ?? unit}</small>
    </label>
  );
}
