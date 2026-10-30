import { describe, expect, it } from "vitest";
import { createSampleProject } from "../domain/sample";
import { memoryStore, rememberRecent, saveBrowserProject, writeRecovery, readRecovery, clearRecovery } from "./library";
import { parseProjectFile, serializeProjectFile, wrapProject } from "./file";

describe("project files", () => {
  it("round-trips the sample and stays stable", () => {
    const text = serializeProjectFile(wrapProject(createSampleProject()));
    const loaded = parseProjectFile(text);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.file.project.elements).toHaveLength(createSampleProject().elements.length);
    const again = serializeProjectFile(loaded.file);
    const second = parseProjectFile(again);
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(serializeProjectFile(second.file)).toBe(again);
  });

  it("loads a version 1 file and saves it as version 2 without dropping rooms", () => {
    const current = JSON.parse(serializeProjectFile(wrapProject(createSampleProject()))) as {
      schemaVersion: number;
      project: { elements: { type: string }[] };
    };
    current.schemaVersion = 1;
    current.project.elements = current.project.elements.filter((element) => element.type !== "section");
    const loaded = parseProjectFile(JSON.stringify(current));
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.migratedFrom).toBe(1);
    expect(loaded.file.schemaVersion).toBe(2);
    expect(loaded.file.project.elements.some((element) => element.type === "room")).toBe(true);
    const saved = JSON.parse(serializeProjectFile(loaded.file)) as { schemaVersion: number };
    expect(saved.schemaVersion).toBe(2);
  });

  it("rejects a newer schema without dropping data into a project", () => {
    const result = parseProjectFile(JSON.stringify({
      format: "lintel-project",
      schemaVersion: 3,
      project: { id: "p", name: "X", displayUnit: "mm", createdAt: "t", updatedAt: "t", elements: [] },
    }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]).toMatch(/schema version 3/);
    expect(result.errors[0]).toMatch(/not modified/);
  });

  it("preserves unknown elements and extra fields", () => {
    const sample = wrapProject(createSampleProject());
    const json = JSON.parse(serializeProjectFile(sample)) as {
      project: { elements: Record<string, unknown>[] };
      reviewedBy?: string;
    };
    json.reviewedBy = "office";
    json.project.elements.push({
      id: "column_1",
      type: "column",
      profile: "300x300",
      note: null,
    });
    const wall = json.project.elements.find((element) => element.id === "wall_g_s");
    wall!.fireRating = "EI60";
    const loaded = parseProjectFile(JSON.stringify(json));
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.file.preserved?.reviewedBy).toBe("office");
    const column = loaded.file.project.elements.find((element) => element.id === "column_1");
    expect(column && "preserved" in column && column.raw).toMatchObject({ profile: "300x300", note: null });
    const saved = JSON.parse(serializeProjectFile(loaded.file)) as {
      reviewedBy: string;
      project: { elements: Record<string, unknown>[] };
    };
    expect(saved.reviewedBy).toBe("office");
    expect(saved.project.elements.find((element) => element.id === "column_1")).toMatchObject({ profile: "300x300", note: null });
    expect(saved.project.elements.find((element) => element.id === "wall_g_s")?.fireRating).toBe("EI60");
  });

  it("rejects an invalid wall instead of skipping it", () => {
    const json = JSON.parse(serializeProjectFile(wrapProject(createSampleProject()))) as {
      project: { elements: { id: string; end?: { x: number; y: number } }[] };
    };
    const wall = json.project.elements.find((element) => element.id === "wall_g_s");
    wall!.end = { x: 0, y: 0 };
    const loaded = parseProjectFile(JSON.stringify(json));
    expect(loaded.ok).toBe(false);
    if (loaded.ok) return;
    expect(loaded.errors.join(" ")).toMatch(/shorter/);
  });

  it("stores recovery outside the project list", () => {
    const store = memoryStore();
    saveBrowserProject(store, {
      id: "p1",
      path: "browser:p1",
      name: "House",
      updatedAt: "2026-01-01T00:00:00.000Z",
      contents: "{}",
    });
    writeRecovery(store, {
      savedAt: "2026-01-02T00:00:00.000Z",
      path: "browser:p1",
      name: "House",
      contents: "{\"format\":\"lintel-project\"}",
    });
    expect(readRecovery(store)?.name).toBe("House");
    clearRecovery(store);
    expect(readRecovery(store)).toBeNull();
    rememberRecent(store, { path: "C:/models/house.lintel", name: "House", updatedAt: "2026-01-03T00:00:00.000Z" });
    expect(store.getItem("lintel.recent")).toContain("house.lintel");
    expect(store.getItem("lintel.recent")).not.toContain("apiKey");
  });
});
