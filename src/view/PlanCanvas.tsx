import { useEffect, useRef } from "react";
import { DEFAULTS } from "../domain/defaults";
import { addOpening, addRoom, addSlab, addWall, setOutlinePoint, setWallEndpoint, translateElements } from "../domain/edits";
import { distance, roundMm, samePoint } from "../domain/geometry";
import { storyBounds } from "../domain/queries";
import { ok } from "../domain/result";
import type { Project, Vec2 } from "../domain/types";
import { editor } from "../state/editor";
import { pointer } from "../state/pointer";
import { drawPlan, type DraftGraphic, type OpeningGraphic } from "./drawPlan";
import { drawing } from "./drawing";
import { hitTestPlan, nearestWall, screenDistance } from "./hit";
import { fitViewport, panBy, screenToWorld, snapWorld, zoomAt, type Viewport } from "./viewport";

type Drag =
  | { kind: "pan"; x: number; y: number }
  | { kind: "move"; ids: string[]; start: Vec2; base: Project; preview: Project | null }
  | { kind: "endpoint"; id: string; which: "start" | "end"; base: Project; preview: Project | null }
  | { kind: "vertex"; id: string; index: number; base: Project; preview: Project | null };

export function PlanCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const view: Viewport = { width: 800, height: 600, camX: 0, camY: 0, zoom: 0.04 };
    let fitted = -1;
    let seenTool = editor.getState().tool;
    let draft: DraftGraphic | null = null;
    let opening: OpeningGraphic | null = null;
    let preview: Project | null = null;
    let drag: Drag | null = null;
    let space = false;
    let snapPoint: { point: Vec2; kind: string } | null = null;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      view.width = Math.max(1, rect.width);
      view.height = Math.max(1, rect.height);
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.floor(view.width * ratio);
      canvas.height = Math.floor(view.height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      redraw();
    };

    const redraw = () => {
      const current = editor.getState();
      if (!current.project || !current.activeStoryId) return;
      if (fitted !== current.fitToken) {
        fitted = current.fitToken;
        const bounds = storyBounds(current.project, current.activeStoryId);
        if (bounds) Object.assign(view, fitViewport(view, bounds));
        draft = null;
        opening = null;
        preview = null;
      }
      if (seenTool !== current.tool) {
        seenTool = current.tool;
        draft = null;
        opening = null;
      }
      if (current.view === "plan") {
        drawPlan(context, view, {
          project: preview ?? current.project,
          activeStoryId: current.activeStoryId,
          selection: current.selection,
          ghostStories: current.ghostStories,
          gridSize: current.gridSize,
          snapGrid: current.snapGrid,
          draft,
          opening,
          snap: snapPoint,
          displayUnit: current.project.displayUnit,
        });
      }
      pointer.set({ world: snapPoint?.point ?? null, zoom: view.zoom });
    };

    const worldAt = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return screenToWorld(view, { x: event.clientX - rect.left, y: event.clientY - rect.top });
    };

    const snapped = (raw: Vec2, anchor: Vec2 | null, shift: boolean) => {
      const current = editor.getState();
      if (!current.project || !current.activeStoryId) return { point: raw, kind: "free" };
      return snapWorld(raw, current.project, current.activeStoryId, view.zoom, {
        grid: current.snapGrid,
        points: current.snapPoints,
        gridSize: current.gridSize,
      }, anchor, shift);
    };

    const onPointerDown = (event: PointerEvent) => {
      if (editor.getState().view !== "plan") return;
      canvas.setPointerCapture(event.pointerId);
      if (event.button === 1 || event.button === 2 || space) {
        drag = { kind: "pan", x: event.clientX, y: event.clientY };
        return;
      }
      if (event.button !== 0) return;
      const current = editor.getState();
      if (!current.project || !current.activeStoryId) return;
      const raw = worldAt(event);
      if (current.tool === "select") {
        const hit = hitTestPlan(current.project, current.activeStoryId, raw, view, current.selection);
        if (hit?.kind === "handle" && current.selection.length === 1) {
          if (hit.handle === "start" || hit.handle === "end") {
            drag = { kind: "endpoint", id: hit.id, which: hit.handle, base: current.project, preview: null };
          } else {
            drag = { kind: "vertex", id: hit.id, index: hit.handle, base: current.project, preview: null };
          }
          return;
        }
        if (hit?.kind === "element") {
          if (event.shiftKey) editor.toggleSelect(hit.id);
          else if (!current.selection.includes(hit.id)) editor.select([hit.id]);
          const ids = editor.getState().selection;
          drag = { kind: "move", ids, start: raw, base: current.project, preview: null };
          return;
        }
        if (!event.shiftKey) editor.clearSelection();
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      const current = editor.getState();
      if (!current.project || !current.activeStoryId || current.view !== "plan") return;
      const raw = worldAt(event);
      if (drag?.kind === "pan") {
        Object.assign(view, panBy(view, event.clientX - drag.x, event.clientY - drag.y));
        drag.x = event.clientX;
        drag.y = event.clientY;
        redraw();
        return;
      }
      if (drag?.kind === "move") {
        const delta = { x: roundMm(raw.x - drag.start.x), y: roundMm(raw.y - drag.start.y) };
        const moved = translateElements(drag.base, drag.ids, delta);
        drag.preview = moved.ok ? moved.value : drag.preview;
        preview = drag.preview;
        redraw();
        return;
      }
      if (drag && drag.kind === "endpoint") {
        const active = drag;
        const wall = active.base.elements.find((element) => element.id === active.id);
        const fixed = wall && wall.type === "wall" ? (active.which === "start" ? wall.end : wall.start) : null;
        const point = snapped(raw, fixed, event.shiftKey).point;
        const moved = setWallEndpoint(active.base, active.id, active.which, point);
        if (moved.ok) {
          drag.preview = moved.value;
          preview = moved.value;
        }
        snapPoint = { point, kind: "endpoint" };
        redraw();
        return;
      }
      if (drag?.kind === "vertex") {
        const point = snapped(raw, null, event.shiftKey).point;
        const moved = setOutlinePoint(drag.base, drag.id, drag.index, point);
        if (moved.ok) {
          drag.preview = moved.value;
          preview = moved.value;
        }
        snapPoint = { point, kind: "endpoint" };
        redraw();
        return;
      }

      const anchor = draft?.points[draft.points.length - 1] ?? null;
      const hit = snapped(raw, anchor, event.shiftKey);
      snapPoint = hit;
      if (current.tool === "door" || current.tool === "window") {
        const nearest = nearestWall(current.project, current.activeStoryId, raw, view.zoom);
        opening = nearest
          ? {
            wallId: nearest.wall.id,
            kind: current.tool,
            offset: nearest.along,
            width: current.tool === "door" ? DEFAULTS.doorWidth : DEFAULTS.windowWidth,
          }
          : null;
      } else if (draft) {
        draft = { ...draft, cursor: hit.point };
      }
      redraw();
    };

    const onPointerUp = (event: PointerEvent) => {
      const current = editor.getState();
      if (drag?.kind === "pan") {
        drag = null;
        return;
      }
      if (drag?.kind === "move" || drag?.kind === "endpoint" || drag?.kind === "vertex") {
        const next = drag.preview;
        const changed = next && JSON.stringify(next.elements) !== JSON.stringify(drag.base.elements);
        if (next && changed) {
          const label = drag.kind === "move" ? "Move" : drag.kind === "endpoint" ? "Edit wall end" : "Edit corner";
          editor.apply(label, "user", ok(next));
        }
        drag = null;
        preview = null;
        redraw();
        return;
      }
      if (event.button !== 0 || !current.project || !current.activeStoryId) return;
      const raw = worldAt(event);
      const anchor = draft?.points[draft.points.length - 1] ?? null;
      const point = snapped(raw, anchor, event.shiftKey).point;
      if (current.tool === "wall") placeWall(point);
      if (current.tool === "slab" || current.tool === "room") placeCorner(current.tool, point);
      if (current.tool === "door" || current.tool === "window") {
        const nearest = nearestWall(current.project, current.activeStoryId, raw, view.zoom);
        if (!nearest) {
          editor.setStatus("Click closer to a wall.", "error");
          return;
        }
        const result = addOpening(current.project, { kind: current.tool, wallId: nearest.wall.id, along: nearest.along });
        if (!result.ok) editor.setStatus(result.error, "error");
        else editor.apply(result.value.note ?? `Placed ${current.tool}`, "user", ok(result.value.project), [result.value.id]);
      }
      redraw();
    };

    const placeWall = (point: Vec2) => {
      const current = editor.getState();
      if (!current.project || !current.activeStoryId) return;
      if (!draft || draft.tool !== "wall" || !draft.points[0]) {
        draft = { tool: "wall", points: [point], cursor: point };
        return;
      }
      const start = draft.points[0];
      if (distance(start, point) < 50) {
        editor.setStatus("That wall is shorter than 50 mm.", "error");
        return;
      }
      const result = addWall(current.project, { storyId: current.activeStoryId, start, end: point });
      if (!result.ok) editor.setStatus(result.error, "error");
      else {
        editor.apply("Draw wall", "user", ok(result.value.project), [result.value.id]);
        draft = { tool: "wall", points: [point], cursor: point };
      }
    };

    const placeCorner = (tool: "slab" | "room", point: Vec2) => {
      const current = editor.getState();
      if (!current.project || !current.activeStoryId) return;
      if (!draft || draft.tool !== tool) draft = { tool, points: [], cursor: point };
      if (draft.points.length >= 3 && screenDistance(view, point, draft.points[0]) < 12) {
        closeShape();
        return;
      }
      const last = draft.points[draft.points.length - 1];
      if (last && samePoint(last, point)) return;
      draft = { ...draft, points: [...draft.points, point], cursor: point };
    };

    const closeShape = () => {
      const current = editor.getState();
      if (!draft || !current.project || !current.activeStoryId) return false;
      if (draft.tool === "wall") return false;
      if (draft.points.length < 3) {
        editor.setStatus("An outline needs at least 3 points.", "error");
        return true;
      }
      const result = draft.tool === "slab"
        ? addSlab(current.project, { storyId: current.activeStoryId, outline: draft.points })
        : addRoom(current.project, { storyId: current.activeStoryId, outline: draft.points });
      if (!result.ok) editor.setStatus(result.error, "error");
      else editor.apply(draft.tool === "slab" ? "Draw slab" : "Draw room", "user", ok(result.value.project), [result.value.id]);
      draft = null;
      redraw();
      return true;
    };

    const unbind = drawing.bind({
      cancel: () => {
        if (!draft && !opening) return false;
        draft = null;
        opening = null;
        snapPoint = null;
        redraw();
        return true;
      },
      closeShape: () => closeShape(),
      undoPoint: () => {
        if (!draft || draft.points.length === 0) return false;
        draft = { ...draft, points: draft.points.slice(0, -1) };
        if (!draft.points.length) draft = null;
        redraw();
        return true;
      },
      panBy: (dx, dy) => {
        Object.assign(view, panBy(view, dx, dy));
        redraw();
      },
      zoomBy: (factor) => {
        Object.assign(view, zoomAt(view, { x: view.width / 2, y: view.height / 2 }, factor));
        redraw();
      },
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space") space = true;
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") space = false;
    };
    const onWheel = (event: WheelEvent) => {
      if (editor.getState().view !== "plan") return;
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const factor = event.deltaY > 0 ? 0.9 : 1.1;
      Object.assign(view, zoomAt(view, { x: event.clientX - rect.left, y: event.clientY - rect.top }, factor));
      redraw();
    };
    const onContext = (event: Event) => event.preventDefault();
    const onLeave = () => {
      snapPoint = null;
      if (draft) draft = { ...draft, cursor: null };
      opening = null;
      pointer.set({ world: null, zoom: view.zoom });
      redraw();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointerleave", onLeave);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("contextmenu", onContext);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    const unsubscribe = editor.subscribe(redraw);
    resize();

    return () => {
      unsubscribe();
      unbind();
      observer.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("contextmenu", onContext);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  return <canvas ref={ref} className="plan-canvas" role="application" aria-label="Floor plan. North is up." />;
}
