import type { Project } from "./types";

const STAMP = "2026-01-15T09:00:00.000Z";

/**
 * Courtyard Studio — a two-storey sample with grids, walls, a slab on each
 * floor, doors, windows, and two explicit rooms. Stairs are not part of this version.
 */
export function createSampleProject(): Project {
  return {
    id: "project_courtyard",
    name: "Courtyard Studio",
    displayUnit: "mm",
    createdAt: STAMP,
    updatedAt: STAMP,
    elements: [
      { id: "story_ground", type: "story", name: "Ground Floor", elevation: 0, height: 3000 },
      { id: "story_upper", type: "story", name: "Upper Floor", elevation: 3000, height: 3000 },
      { id: "grid_a", type: "gridline", name: "A", axis: "x", position: 0 },
      { id: "grid_b", type: "gridline", name: "B", axis: "x", position: 6000 },
      { id: "grid_c", type: "gridline", name: "C", axis: "x", position: 10000 },
      { id: "grid_1", type: "gridline", name: "1", axis: "y", position: 0 },
      { id: "grid_2", type: "gridline", name: "2", axis: "y", position: 8000 },
      wall("wall_g_s", "story_ground", 0, 0, 10000, 0, 200, 2850, "Brick"),
      wall("wall_g_e", "story_ground", 10000, 0, 10000, 8000, 200, 2850, "Brick"),
      wall("wall_g_n", "story_ground", 10000, 8000, 0, 8000, 200, 2850, "Brick"),
      wall("wall_g_w", "story_ground", 0, 8000, 0, 0, 200, 2850, "Brick"),
      wall("wall_g_part", "story_ground", 6000, 0, 6000, 8000, 120, 2850, "Stud"),
      {
        id: "slab_g",
        type: "slab",
        storyId: "story_ground",
        outline: [
          { x: -100, y: -100 },
          { x: 10100, y: -100 },
          { x: 10100, y: 8100 },
          { x: -100, y: 8100 },
        ],
        thickness: 200,
        elevationOffset: 0,
        material: "Concrete",
      },
      {
        id: "room_studio",
        type: "room",
        storyId: "story_ground",
        name: "Studio",
        number: "01",
        outline: [
          { x: 200, y: 200 },
          { x: 5800, y: 200 },
          { x: 5800, y: 7800 },
          { x: 200, y: 7800 },
        ],
      },
      {
        id: "door_entry",
        type: "door",
        wallId: "wall_g_s",
        offset: 2500,
        width: 900,
        height: 2100,
        sill: 0,
        hinge: "start",
        swing: "left",
      },
      {
        id: "door_studio",
        type: "door",
        wallId: "wall_g_part",
        offset: 4000,
        width: 900,
        height: 2100,
        sill: 0,
        hinge: "start",
        swing: "left",
      },
      window("win_g_e1", "wall_g_e", 2200, 1500),
      window("win_g_e2", "wall_g_e", 5600, 1500),
      window("win_g_w", "wall_g_w", 4000, 1600),
      wall("wall_u_s", "story_upper", 0, 0, 10000, 0, 200, 2700, "Brick"),
      wall("wall_u_e", "story_upper", 10000, 0, 10000, 8000, 200, 2700, "Brick"),
      wall("wall_u_n", "story_upper", 10000, 8000, 0, 8000, 200, 2700, "Brick"),
      wall("wall_u_w", "story_upper", 0, 8000, 0, 0, 200, 2700, "Brick"),
      {
        id: "slab_u",
        type: "slab",
        storyId: "story_upper",
        outline: [
          { x: -100, y: -100 },
          { x: 10100, y: -100 },
          { x: 10100, y: 8100 },
          { x: -100, y: 8100 },
        ],
        thickness: 200,
        elevationOffset: 0,
        material: "Concrete",
      },
      {
        id: "room_loft",
        type: "room",
        storyId: "story_upper",
        name: "Loft",
        number: "02",
        outline: [
          { x: 200, y: 200 },
          { x: 9800, y: 200 },
          { x: 9800, y: 7800 },
          { x: 200, y: 7800 },
        ],
      },
      window("win_u_s", "wall_u_s", 5000, 1800),
    ],
  };
}

export function createEmptyProject(name: string, now = new Date().toISOString()): Project {
  return {
    id: `project_${crypto.randomUUID()}`,
    name: name.trim() || "Untitled",
    displayUnit: "mm",
    createdAt: now,
    updatedAt: now,
    elements: [
      {
        id: `story_${crypto.randomUUID()}`,
        type: "story",
        name: "Ground Floor",
        elevation: 0,
        height: 3000,
      },
    ],
  };
}

function wall(
  id: string,
  storyId: string,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  thickness: number,
  height: number,
  material: string,
): Project["elements"][number] {
  return {
    id,
    type: "wall",
    storyId,
    start: { x: x1, y: y1 },
    end: { x: x2, y: y2 },
    thickness,
    height,
    baseOffset: 0,
    material,
  };
}

function window(id: string, wallId: string, offset: number, width: number): Project["elements"][number] {
  return {
    id,
    type: "window",
    wallId,
    offset,
    width,
    height: 1200,
    sill: 900,
  };
}
