import { addDerivedRooms } from "../domain/edits";
import { elementsOnStory, stories } from "../domain/queries";
import { detectSpaces } from "../domain/spaces";
import { formatArea } from "../domain/units";
import { editor, useEditor } from "../state/editor";
import { isUnknownElement, type Element } from "../domain/types";
import { ok } from "../domain/result";
import { Modal } from "./Modal";
import { useState } from "react";

export function Navigator() {
  const state = useEditor();
  const project = state.project;
  const [finder, setFinder] = useState(false);
  if (!project) return null;
  const grids = project.elements.filter((element) => element.type === "gridline");
  const preserved = project.elements.filter(isUnknownElement);
  return (
    <nav className="navigator" aria-label="Project">
      <header>
        <h2>Project</h2>
      </header>
      <section>
        <h3>Views</h3>
        <button type="button" className={state.view === "plan" ? "nav-item active" : "nav-item"} onClick={() => editor.setView("plan")}>Plan</button>
        <button type="button" className={state.view === "model" ? "nav-item active" : "nav-item"} onClick={() => editor.setView("model")}>3D model</button>
        <button type="button" className={state.view === "section" ? "nav-item active" : "nav-item"} onClick={() => editor.setView("section")}>Section</button>
      </section>
      <section>
        <h3>Stories</h3>
        <button type="button" className="nav-item" onClick={() => setFinder(true)}>Find rooms on this story</button>
        {stories(project).map((story) => (
          <div key={story.id} className="story-block">
            <button
              type="button"
              className={state.activeStoryId === story.id ? "nav-item active" : "nav-item"}
              onClick={() => {
                editor.setStory(story.id);
                editor.select([story.id]);
              }}
            >
              {story.name}
              <small>{story.elevation} mm</small>
            </button>
            <div className="story-children">
              {elementsOnStory(project, story.id).map((element) => (
                <button
                  key={element.id}
                  type="button"
                  className={state.selection.includes(element.id) ? "nav-item child active" : "nav-item child"}
                  onClick={() => {
                    editor.setStory(story.id);
                    editor.select([element.id]);
                    editor.setView("plan");
                  }}
                >
                  {labelFor(element)}
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>
      <section>
        <h3>Sections</h3>
        {project.elements.filter((element) => element.type === "section").length === 0 && <p className="muted">No section lines yet.</p>}
        {project.elements.filter((element) => element.type === "section").map((section) => (
          <button
            key={section.id}
            type="button"
            className={state.selection.includes(section.id) ? "nav-item active" : "nav-item"}
            onClick={() => editor.setActiveSection(section.id)}
          >
            {section.name}
          </button>
        ))}
      </section>
      <section>
        <h3>Grids</h3>
        {grids.length === 0 && <p className="muted">No gridlines yet.</p>}
        {grids.map((grid) => (
          <button
            key={grid.id}
            type="button"
            className={state.selection.includes(grid.id) ? "nav-item active" : "nav-item"}
            onClick={() => editor.select([grid.id])}
          >
            {grid.name}
            <small>{grid.axis === "x" ? "X" : "Y"} {grid.position}</small>
          </button>
        ))}
      </section>
      {preserved.length > 0 && (
        <section>
          <h3>Preserved</h3>
          <p className="muted">Saved with the file. Not shown in the model.</p>
          {preserved.map((element) => (
            <button key={element.id} type="button" className="nav-item" onClick={() => editor.select([element.id])}>
              {element.foreignType}
              <small>{element.id}</small>
            </button>
          ))}
        </section>
      )}
      {finder && <RoomFinder storyId={state.activeStoryId} onClose={() => setFinder(false)} />}
    </nav>
  );
}

function labelFor(element: Element): string {
  if (isUnknownElement(element)) return element.foreignType;
  if (element.type === "room") return `${element.number} ${element.name}`;
  if (element.type === "door") return "Door";
  if (element.type === "window") return "Window";
  if (element.type === "wall") return "Wall";
  if (element.type === "slab") return "Slab";
  return element.type;
}

function RoomFinder({ storyId, onClose }: { storyId: string | null; onClose: () => void }) {
  const project = useEditor().project;
  const report = project && storyId ? detectSpaces(project, storyId) : { spaces: [], openEnds: [], notes: ["Choose a story first."] };
  const [picked, setPicked] = useState<boolean[]>(() => report.spaces.map(() => true));
  return (
    <Modal title="Rooms from walls" onClose={onClose}>
      <p className="meta">These outlines are inset to the inner face of the walls. Nothing is created until you confirm. Open ends are left alone.</p>
      {report.notes.map((note) => <p key={note}>{note}</p>)}
      {report.spaces.length === 0 && <p>No closed room was found on this story.</p>}
      <ul className="recent-list">
        {report.spaces.map((space, index) => (
          <li key={space.wallIds.join("-")}>
            <label className="field">
              <span>
                <input
                  type="checkbox"
                  checked={picked[index] ?? false}
                  onChange={(event) => setPicked((current) => current.map((value, item) => item === index ? event.target.checked : value))}
                />
                {" "}Space {index + 1} · {formatArea(space.areaMm2)} · {space.wallIds.length} walls
              </span>
            </label>
          </li>
        ))}
      </ul>
      <div className="row end">
        <button type="button" className="btn" onClick={onClose}>Cancel</button>
        <button
          type="button"
          className="btn primary"
          disabled={!project || !report.spaces.some((_, index) => picked[index])}
          onClick={() => {
            if (!project) return;
            const chosen = report.spaces.filter((_, index) => picked[index]);
            const existing = project.elements.filter((element) => element.type === "room").length;
            const result = addDerivedRooms(project, chosen.map((space, index) => ({
              storyId: space.storyId,
              outline: space.outline,
              name: `Room ${existing + index + 1}`,
              number: String(existing + index + 1).padStart(2, "0"),
              boundaryWallIds: space.wallIds,
              areaMm2: Math.round(space.areaMm2),
              perimeterMm: space.perimeterMm,
            })));
            if (!result.ok) editor.setStatus(result.error, "error");
            else editor.apply(`Create ${chosen.length} room${chosen.length === 1 ? "" : "s"} from walls`, "user", ok(result.value));
            onClose();
          }}
        >
          Create selected
        </button>
      </div>
    </Modal>
  );
}
