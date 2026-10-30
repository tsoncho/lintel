import { describe, expect, it } from "vitest";
import { pointInPolygon, polygonArea, wallCorners } from "./geometry";
import { JOIN_TOLERANCE_MM, joinFills, wallSolids } from "./joins";
import type { Wall } from "./types";

function wall(id: string, x1: number, y1: number, x2: number, y2: number, thickness = 200): Wall {
  return {
    id,
    type: "wall",
    storyId: "story",
    start: { x: x1, y: y1 },
    end: { x: x2, y: y2 },
    thickness,
    height: 3000,
    baseOffset: 0,
    material: "Brick",
  };
}

function solid(walls: Wall[], id: string) {
  return wallSolids(walls).find((item) => item.id === id);
}

describe("wall joins", () => {
  it("leaves an isolated wall as a rectangle", () => {
    const alone = wall("a", 0, 0, 4000, 0);
    const footprint = solid([alone], "a")?.footprint;
    const plain = wallCorners(alone);
    expect(footprint).toBeTruthy();
    expect(polygonArea(footprint!)).toBeCloseTo(polygonArea(plain!), 0);
  });

  it("covers the outside of a square corner", () => {
    const walls = [wall("east", 0, 0, 4000, 0), wall("north", 0, 0, 0, 4000)];
    const east = solid(walls, "east")!.footprint;
    const north = solid(walls, "north")!.footprint;
    expect(pointInPolygon({ x: -50, y: -50 }, east) || pointInPolygon({ x: -50, y: -50 }, north)).toBe(true);
    expect(pointInPolygon({ x: 50, y: 50 }, east) || pointInPolygon({ x: 50, y: 50 }, north)).toBe(true);
    expect(joinFills(walls).length).toBeGreaterThan(0);
  });

  it("does not join walls that stop short of each other", () => {
    const walls = [wall("a", 0, 0, 2000, 0), wall("b", 2200, 0, 4000, 0)];
    expect(2200 - 2000).toBeGreaterThan(JOIN_TOLERANCE_MM);
    const a = solid(walls, "a")!;
    const alone = wallCorners(walls[0])!;
    expect(polygonArea(a.footprint)).toBeCloseTo(polygonArea(alone), 0);
    expect(pointInPolygon({ x: 2100, y: 0 }, a.footprint)).toBe(false);
  });

  it("trims a stem to the face of a crossing host", () => {
    const host = wall("host", 0, 0, 0, 4000);
    const stem = wall("stem", 0, 2000, 3000, 2000);
    const trimmed = solid([host, stem], "stem")!;
    expect(trimmed.bodyStart).toBeGreaterThan(80);
    expect(trimmed.bodyStart).toBeLessThan(120);
    expect(pointInPolygon({ x: 200, y: 2000 }, trimmed.footprint)).toBe(true);
    expect(pointInPolygon({ x: -150, y: 2000 }, trimmed.footprint)).toBe(false);
    const hostSolid = solid([host, stem], "host")!;
    expect(hostSolid.bodyStart).toBe(0);
    expect(hostSolid.bodyEnd).toBeCloseTo(4000, 0);
  });

  it("keeps a crossing pair overlapped without throwing a spike", () => {
    const walls = [wall("h", 0, 0, 4000, 0), wall("v", 2000, -2000, 2000, 2000)];
    for (const item of wallSolids(walls)) {
      for (const point of item.footprint) {
        const lateral = item.id === "h" ? Math.abs(point.y) : Math.abs(point.x - 2000);
        expect(lateral).toBeLessThanOrEqual(210);
      }
    }
    const horizontal = solid(walls, "h")!.footprint;
    expect(pointInPolygon({ x: 2000, y: 0 }, horizontal)).toBe(true);
  });

  it("does not extend overlapping collinear walls into spikes", () => {
    const walls = [wall("a", 0, 0, 3000, 0), wall("b", 2000, 0, 5000, 0)];
    for (const item of wallSolids(walls)) {
      for (const point of item.footprint) {
        expect(point.x).toBeGreaterThan(-250);
        expect(point.x).toBeLessThan(5250);
        expect(Math.abs(point.y)).toBeLessThanOrEqual(110);
      }
    }
  });
});
