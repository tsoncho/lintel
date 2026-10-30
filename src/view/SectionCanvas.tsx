import { useEffect, useRef } from "react";
import { buildSection } from "../domain/section";
import type { SectionMark } from "../domain/section";
import { editor } from "../state/editor";
import { pointer } from "../state/pointer";

interface Camera {
  width: number;
  height: number;
  originX: number;
  originZ: number;
  zoom: number;
}

export function SectionCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const camera: Camera = { width: 800, height: 600, originX: 0, originZ: 0, zoom: 0.05 };
    let fitted = -1;
    let drag: { x: number; y: number } | null = null;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      camera.width = Math.max(1, rect.width);
      camera.height = Math.max(1, rect.height);
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.floor(camera.width * ratio);
      canvas.height = Math.floor(camera.height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      draw();
    };

    const project = () => editor.getState().project;
    const section = () => {
      const current = editor.getState();
      return current.project?.elements.find((element) => element.type === "section" && element.id === current.activeSectionId)
        ?? current.project?.elements.find((element) => element.type === "section");
    };

    const fit = () => {
      const active = section();
      const model = project();
      if (!active || active.type !== "section" || !model) return;
      const drawing = buildSection(model, active);
      const marks = drawing.items.filter((item) => item.kind !== "story");
      const maxX = Math.max(drawing.length, ...marks.map((item) => item.x1), 1000);
      const minZ = Math.min(0, ...marks.map((item) => item.z0));
      const maxZ = Math.max(3000, ...marks.map((item) => item.z1));
      camera.zoom = Math.min((camera.width * 0.8) / Math.max(maxX, 1000), (camera.height * 0.75) / Math.max(maxZ - minZ, 1000));
      camera.originX = maxX / 2;
      camera.originZ = (minZ + maxZ) / 2;
    };

    const toScreen = (x: number, z: number) => ({
      x: camera.width / 2 + (x - camera.originX) * camera.zoom,
      y: camera.height / 2 - (z - camera.originZ) * camera.zoom,
    });

    const draw = () => {
      const current = editor.getState();
      if (current.view !== "section") return;
      context.fillStyle = "#f7f4ee";
      context.fillRect(0, 0, camera.width, camera.height);
      const active = section();
      if (!current.project || !active || active.type !== "section") {
        context.fillStyle = "#3f392f";
        context.font = "14px Segoe UI, sans-serif";
        context.fillText("Add a section from the Section tool, then open it here.", 24, 36);
        return;
      }
      if (fitted !== current.fitToken) {
        fitted = current.fitToken;
        fit();
      }
      const drawing = buildSection(current.project, active);
      const order: Record<SectionMark["kind"], number> = { beyond: 0, room: 1, story: 2, slab: 3, wall: 4, opening: 5 };
      const marks = [...drawing.items].sort((left, right) => order[left.kind] - order[right.kind]);
      for (const item of marks) paint(context, camera, toScreen, item, current.selection.includes(item.id));
      context.fillStyle = "#3f392f";
      context.font = "13px Segoe UI, sans-serif";
      context.fillText(`${active.name} · looking ${active.facing} · depth ${(active.depth / 1000).toFixed(1)} m`, 16, 22);
      context.font = "12px Segoe UI, sans-serif";
      context.fillStyle = "#5e564c";
      drawing.notes.forEach((note, index) => context.fillText(note, 16, camera.height - 16 - (drawing.notes.length - 1 - index) * 16));
      pointer.set({ world: null, zoom: camera.zoom });
    };

    const onWheel = (event: WheelEvent) => {
      if (editor.getState().view !== "section") return;
      event.preventDefault();
      camera.zoom = Math.min(1.2, Math.max(0.002, camera.zoom * (event.deltaY > 0 ? 0.9 : 1.1)));
      draw();
    };
    const onDown = (event: PointerEvent) => {
      if (event.button === 1 || event.button === 2) drag = { x: event.clientX, y: event.clientY };
    };
    const onMove = (event: PointerEvent) => {
      if (!drag) return;
      camera.originX -= (event.clientX - drag.x) / camera.zoom;
      camera.originZ += (event.clientY - drag.y) / camera.zoom;
      drag = { x: event.clientX, y: event.clientY };
      draw();
    };
    const onUp = () => {
      drag = null;
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("contextmenu", (event) => event.preventDefault());
    const unsubscribe = editor.subscribe(draw);
    resize();
    return () => {
      unsubscribe();
      observer.disconnect();
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
    };
  }, []);

  return <canvas ref={ref} className="plan-canvas" role="application" aria-label="Section view. Horizontal is along the cut. Vertical is elevation." />;
}

function paint(
  ctx: CanvasRenderingContext2D,
  _camera: Camera,
  toScreen: (x: number, z: number) => { x: number; y: number },
  item: SectionMark,
  selected: boolean,
) {
  if (item.kind === "story") {
    const a = toScreen(item.x0, item.z0);
    const b = toScreen(item.x1, item.z0);
    ctx.strokeStyle = "#c8bfb2";
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    if (item.label) {
      ctx.fillStyle = "#5e564c";
      ctx.font = "12px Segoe UI, sans-serif";
      const width = ctx.measureText(item.label).width;
      ctx.fillText(item.label, Math.max(8, a.x - width - 10), a.y + 4);
    }
    return;
  }
  if (item.kind === "room") {
    if (item.label) {
      ctx.fillStyle = "#2f6a46";
      ctx.font = "12px Segoe UI, sans-serif";
      const width = ctx.measureText(item.label).width;
      const anchor = toScreen((item.x0 + item.x1) / 2, item.z0);
      ctx.fillText(item.label, anchor.x - width / 2, anchor.y - 8);
    }
    return;
  }
  const a = toScreen(item.x0, item.z0);
  const b = toScreen(item.x1, item.z1);
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const w = Math.max(2, Math.abs(b.x - a.x));
  const h = Math.max(2, Math.abs(b.y - a.y));
  if (item.kind === "wall") ctx.fillStyle = selected ? "#4a4036" : "#3a352f";
  else if (item.kind === "beyond") ctx.fillStyle = "rgba(58, 53, 47, 0.28)";
  else if (item.kind === "slab") ctx.fillStyle = "rgba(141, 127, 108, 0.85)";
  else if (item.kind === "opening") ctx.fillStyle = "#f7f4ee";
  else ctx.fillStyle = "rgba(47, 106, 70, 0.15)";
  ctx.fillRect(x, y, w, h);
}
