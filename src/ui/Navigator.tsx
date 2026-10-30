import { elementsOnStory, stories } from "../domain/queries";
import { editor, useEditor } from "../state/editor";
import { isUnknownElement, type Element } from "../domain/types";

export function Navigator() {
  const state = useEditor();
  const project = state.project;
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
      </section>
      <section>
        <h3>Stories</h3>
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
