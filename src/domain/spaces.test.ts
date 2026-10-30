import { describe, expect, it } from "vitest";
import { polygonArea } from "./geometry";
import { createSampleProject } from "./sample";
import { detectSpaces, syncDerivedRooms } from "./spaces";
import type { Project, Room } from "./types";

describe("derived rooms", () => {
  it("finds two closed spaces in the sample and reports none as open", () => {
    const report = detectSpaces(createSampleProject(), "story_ground");
    expect(report.openEnds).toEqual([]);
    expect(report.spaces.length).toBe(2);
    const areas = report.spaces.map((space) => space.areaMm2).sort((a, b) => a - b);
    expect(areas[0]).toBeGreaterThan(10_000_000);
    expect(areas[1]).toBeGreaterThan(areas[0]);
  });

  it("reports an open boundary instead of inventing a room", () => {
    const project = createSampleProject();
    project.elements = project.elements.filter((element) => element.id !== "wall_g_n" && element.id !== "wall_g_part");
    const report = detectSpaces(project, "story_ground");
    expect(report.spaces).toEqual([]);
    expect(report.openEnds.length).toBeGreaterThan(0);
    expect(report.notes.join(" ")).toMatch(/open/i);
  });

  it("keeps a derived room's identity when its walls move, and detaches it when the loop breaks", () => {
    const source = createSampleProject();
    const detected = detectSpaces(source, "story_ground").spaces.find((space) => space.wallIds.includes("wall_g_e"));
    expect(detected).toBeTruthy();
    if (!detected) return;
    const room: Room = {
      id: "room_derived",
      type: "room",
      storyId: "story_ground",
      name: "Detected",
      number: "D1",
      outline: detected.outline,
      source: "derived",
      boundaryWallIds: detected.wallIds,
      sync: "current",
    };
    const project: Project = { ...source, elements: [...source.elements, room] };
    const edited = structuredClone(project);
    for (const element of edited.elements) {
      if (element.type !== "wall") continue;
      if (element.id === "wall_g_e") {
        element.start = { ...element.start, x: element.start.x + 500 };
        element.end = { ...element.end, x: element.end.x + 500 };
      }
      if (element.id === "wall_g_n" || element.id === "wall_g_s") {
        if (element.start.x > 1000) element.start = { ...element.start, x: element.start.x + 500 };
        if (element.end.x > 1000) element.end = { ...element.end, x: element.end.x + 500 };
      }
    }
    const synced = syncDerivedRooms(edited);
    const updated = synced.elements.find((element) => element.id === "room_derived");
    expect(updated?.type).toBe("room");
    if (updated?.type !== "room") return;
    expect(updated.sync).toBe("current");
    expect(updated.name).toBe("Detected");
    expect(polygonArea(updated.outline)).toBeGreaterThan(polygonArea(room.outline) + 1000);

    const broken = {
      ...synced,
      elements: synced.elements.filter((element) => element.id !== "wall_g_e"),
    };
    const detached = syncDerivedRooms(broken).elements.find((element) => element.id === "room_derived");
    expect(detached?.type === "room" && detached.sync).toBe("detached");
  });
});
