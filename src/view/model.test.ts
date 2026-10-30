import { describe, expect, it } from "vitest";
import { createSampleProject } from "../domain/sample";
import { hitTestPlan } from "./hit";
import { buildModel } from "./model";
import type { Viewport } from "./viewport";

const view: Viewport = { width: 800, height: 600, camX: 0, camY: 0, zoom: 0.05 };

describe("plan hit testing and 3D parts", () => {
  it("prefers a door over the wall that hosts it", () => {
    const project = createSampleProject();
    const hit = hitTestPlan(project, "story_ground", { x: 2500, y: 0 }, view, []);
    expect(hit).toEqual({ kind: "element", id: "door_entry" });
    const wall = hitTestPlan(project, "story_ground", { x: 8000, y: 0 }, view, []);
    expect(wall).toEqual({ kind: "element", id: "wall_g_s" });
  });

  it("builds wall solids with an opening for the entry door", () => {
    const { parts } = buildModel(createSampleProject());
    const south = parts.find((part) => part.kind === "wall" && part.id === "wall_g_s");
    expect(south && south.kind === "wall" && south.holes.length).toBeGreaterThan(0);
    expect(parts.some((part) => part.kind === "door" && part.id === "door_entry")).toBe(true);
    expect(parts.filter((part) => part.kind === "slab")).toHaveLength(2);
    const wall = parts.find((part) => part.kind === "wall" && part.id === "wall_g_s");
    expect(wall && wall.kind === "wall" && wall.matrix).toHaveLength(16);
  });
});
