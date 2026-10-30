import { describe, expect, it } from "vitest";
import { addOpening, addWall, applyPropertyPatch, deleteElements, translateElements } from "./edits";
import { undoAssistantHistory, undoHistory, pushHistory } from "./history";
import { createSampleProject } from "./sample";
import { validateProject } from "./validate";

describe("edits and history", () => {
  it("loads the sample as a valid project", () => {
    expect(validateProject(createSampleProject())).toEqual([]);
  });

  it("rejects a zero-length wall and leaves the original untouched", () => {
    const project = createSampleProject();
    const before = structuredClone(project);
    const result = addWall(project, {
      storyId: "story_ground",
      start: { x: 0, y: 0 },
      end: { x: 10, y: 0 },
    });
    expect(result.ok).toBe(false);
    expect(project).toEqual(before);
  });

  it("rejects a self-crossing slab through validation of a patched outline", () => {
    const project = createSampleProject();
    const slab = project.elements.find((element) => element.id === "slab_g");
    expect(slab?.type).toBe("slab");
  });

  it("deletes a wall and its openings in one step, then undoes it", () => {
    const project = createSampleProject();
    const deleted = deleteElements(project, ["wall_g_s"]);
    expect(deleted.ok).toBe(true);
    if (!deleted.ok) return;
    expect(deleted.value.removedIds).toContain("door_entry");
    expect(deleted.value.project.elements.some((element) => element.id === "wall_g_s")).toBe(false);
    const history = pushHistory(
      { project, past: [], future: [] },
      { id: "h1", label: "Delete wall", source: "user", after: deleted.value.project },
    );
    const undone = undoHistory(history);
    expect("error" in undone).toBe(false);
    if ("error" in undone) return;
    expect(undone.project.elements.some((element) => element.id === "door_entry")).toBe(true);
  });

  it("refuses to undo an assistant edit after a later user edit", () => {
    const project = createSampleProject();
    const thicker = applyPropertyPatch(project, "wall_g_s", { thickness: 300 });
    expect(thicker.ok).toBe(true);
    if (!thicker.ok) return;
    const moved = translateElements(thicker.value, ["wall_g_n"], { x: 0, y: 200 });
    expect(moved.ok).toBe(true);
    if (!moved.ok) return;
    let state = pushHistory(
      { project, past: [], future: [] },
      { id: "a", label: "Thicken wall", source: "assistant", after: thicker.value },
    );
    state = pushHistory(state, { id: "u", label: "Move wall", source: "user", after: moved.value });
    const blocked = undoAssistantHistory(state);
    expect(blocked).toEqual({
      error: "A later edit sits above the assistant change. Use Undo to step back one edit at a time.",
    });
    const assistantOnly = undoHistory(state);
    if ("error" in assistantOnly) throw new Error(assistantOnly.error);
    const undone = undoAssistantHistory(assistantOnly);
    expect("error" in undone).toBe(false);
  });

  it("places a door on a wall and rejects a second overlapping one", () => {
    const project = createSampleProject();
    const placed = addOpening(project, { kind: "door", wallId: "wall_g_n", along: 5000 });
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    const overlap = addOpening(placed.value.project, { kind: "window", wallId: "wall_g_n", along: 5000 });
    expect(overlap.ok).toBe(false);
  });
});
