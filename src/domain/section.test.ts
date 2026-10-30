import { describe, expect, it } from "vitest";
import { buildSection } from "./section";
import { createSampleProject } from "./sample";
import type { Section } from "./types";

const cut: Section = {
  id: "section_a",
  type: "section",
  name: "A",
  start: { x: 2500, y: -500 },
  end: { x: 2500, y: 8500 },
  depth: 4000,
  facing: "left",
};

describe("section generation", () => {
  it("cuts the sample walls and slabs from the shared model", () => {
    const drawing = buildSection(createSampleProject(), cut);
    expect(drawing.length).toBeGreaterThan(8000);
    const walls = drawing.items.filter((item) => item.kind === "wall");
    expect(walls.length).toBeGreaterThanOrEqual(2);
    expect(drawing.items.some((item) => item.kind === "slab")).toBe(true);
    expect(drawing.items.some((item) => item.kind === "story" && item.label === "Ground Floor")).toBe(true);
    expect(drawing.items.some((item) => item.kind === "opening" && item.id === "door_entry")).toBe(true);
    expect(drawing.items.some((item) => item.kind === "opening" && item.id === "win_g_w")).toBe(true);
  });

  it("moves the cut when the section line moves", () => {
    const first = buildSection(createSampleProject(), cut);
    const shifted = buildSection(createSampleProject(), { ...cut, start: { x: 7000, y: -500 }, end: { x: 7000, y: 8500 } });
    expect(first.items.some((item) => item.id === "door_entry")).toBe(true);
    expect(shifted.items.some((item) => item.id === "door_entry")).toBe(false);
  });

  it("says when the line is too short to generate", () => {
    const drawing = buildSection(createSampleProject(), { ...cut, end: { x: 2500, y: -400 } });
    expect(drawing.items).toEqual([]);
    expect(drawing.notes[0]).toMatch(/too short/);
  });
});
