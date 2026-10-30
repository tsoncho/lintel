import { describe, expect, it } from "vitest";
import { addDerivedRooms, addOpening, addSection, addWall, applyPropertyPatch, deleteElements, translateElements } from "./edits";
import { undoAssistantHistory, undoHistory, pushHistory, redoHistory } from "./history";
import { parseProjectFile, serializeProjectFile, wrapProject } from "../persistence/file";
import { createSampleProject } from "./sample";
import { detectSpaces } from "./spaces";
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

  it("undoes and redoes a derived room and a section, then reloads them", () => {
    const project = createSampleProject();
    const spaces = detectSpaces(project, "story_ground");
    expect(spaces.spaces.length).toBeGreaterThan(0);
    const createdRooms = addDerivedRooms(
      project,
      spaces.spaces.slice(0, 1).map((space) => ({
        storyId: space.storyId,
        outline: space.outline,
        name: "Detected",
        number: "03",
        boundaryWallIds: space.wallIds,
        areaMm2: space.areaMm2,
        perimeterMm: space.perimeterMm,
      })),
    );
    expect(createdRooms.ok).toBe(true);
    if (!createdRooms.ok) return;
    const section = addSection(createdRooms.value, {
      name: "B",
      start: { x: 1000, y: -500 },
      end: { x: 1000, y: 8500 },
      depth: 5000,
      facing: "right",
    });
    expect(section.ok).toBe(true);
    if (!section.ok) return;
    const withRooms = pushHistory(
      { project, past: [], future: [] },
      { id: "rooms", label: "Create rooms", source: "user", after: createdRooms.value },
    );
    const withSection = pushHistory(withRooms, {
      id: "section",
      label: "Add section",
      source: "user",
      after: section.value.project,
    });
    const undone = undoHistory(withSection);
    if ("error" in undone) throw new Error(undone.error);
    expect(undone.project.elements.some((element) => element.type === "section" && element.name === "B")).toBe(false);
    const redone = redoHistory(undone);
    if ("error" in redone) throw new Error(redone.error);
    const loaded = parseProjectFile(serializeProjectFile(wrapProject(redone.project)));
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const restored = loaded.file.project.elements.find((element) => element.type === "section" && element.name === "B");
    expect(restored && restored.type === "section" && restored.depth === 5000 && restored.facing === "right").toBe(true);
    const room = loaded.file.project.elements.find((element) => element.type === "room" && element.name === "Detected");
    expect(room && room.type === "room" && room.source === "derived" && room.sync === "current" && (room.areaMm2 ?? 0) > 0).toBe(true);
    const stepped = undoHistory(redone);
    if ("error" in stepped) throw new Error(stepped.error);
    const cleared = undoHistory(stepped);
    if ("error" in cleared) throw new Error(cleared.error);
    expect(cleared.project.elements.some((element) => element.type === "room" && element.name === "Detected")).toBe(false);
  });
});
