import { describe, expect, it } from "vitest";
import {
  constrainOrthogonal,
  doorSwing,
  openingFits,
  openingsOverlap,
  polygonArea,
  polygonSelfIntersects,
  projectToSegment,
} from "./geometry";

describe("geometry", () => {
  it("measures a square in square millimeters", () => {
    expect(polygonArea([
      { x: 0, y: 0 },
      { x: 1000, y: 0 },
      { x: 1000, y: 1000 },
      { x: 0, y: 1000 },
    ])).toBe(1_000_000);
  });

  it("detects a bowtie", () => {
    expect(polygonSelfIntersects([
      { x: 0, y: 0 },
      { x: 1000, y: 1000 },
      { x: 0, y: 1000 },
      { x: 1000, y: 0 },
    ])).toBe(true);
    expect(polygonSelfIntersects([
      { x: 0, y: 0 },
      { x: 1000, y: 0 },
      { x: 1000, y: 1000 },
      { x: 0, y: 1000 },
    ])).toBe(false);
  });

  it("projects onto a wall and checks openings", () => {
    const hit = projectToSegment({ x: 500, y: 40 }, { x: 0, y: 0 }, { x: 1000, y: 0 });
    expect(hit.along).toBe(500);
    expect(hit.distance).toBe(40);
    expect(openingFits(3000, 1500, 900)).toBe(true);
    expect(openingFits(3000, 100, 900)).toBe(false);
    expect(openingsOverlap([
      { offset: 1000, width: 900 },
      { offset: 1500, width: 900 },
    ])).toBe(true);
  });

  it("locks a point to an axis", () => {
    expect(constrainOrthogonal({ x: 0, y: 0 }, { x: 40, y: 12 })).toEqual({ x: 40, y: 0 });
  });

  it("swings a door into the left side of the wall", () => {
    const swing = doorSwing(
      { start: { x: 0, y: 0 }, end: { x: 2000, y: 0 } },
      { offset: 1000, width: 900, hinge: "start", swing: "left" },
    );
    expect(swing).not.toBeNull();
    const open = swing!.arc[swing!.arc.length - 1];
    expect(open.y).toBeGreaterThan(800);
    expect(open.x).toBeCloseTo(550, 0);
  });
});
