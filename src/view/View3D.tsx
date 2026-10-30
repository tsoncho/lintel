import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { Bounds } from "../domain/types";
import { editor } from "../state/editor";
import { buildModel, type BoxPart, type FlatPart, type ModelPart, type WallPart } from "./model";

export function View3D() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0xe7e1d6);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 20, 5_000_000);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    };
    scene.add(new THREE.HemisphereLight(0xf7f1e6, 0x8d8478, 1.15));
    const sun = new THREE.DirectionalLight(0xffffff, 0.9);
    sun.position.set(0.4, 1, 0.2);
    scene.add(sun);
    const content = new THREE.Group();
    scene.add(content);
    host.appendChild(renderer.domElement);

    let builtVersion = -1;
    let builtFit = -1;
    let builtSelection = "";
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    let down = { x: 0, y: 0 };

    const resize = () => {
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const frameCamera = (bounds: Bounds) => {
      const cx = (bounds.minX + bounds.maxX) / 2;
      const cy = (bounds.minY + bounds.maxY) / 2;
      const cz = (bounds.minZ + bounds.maxZ) / 2;
      const span = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY, bounds.maxZ - bounds.minZ, 4000);
      camera.position.set(cx + span * 0.85, cz + span * 0.72, -cy + span * 0.95);
      controls.target.set(cx, Math.max(cz, 1200), -cy);
      controls.update();
    };

    const paintSelection = () => {
      const selected = new Set(editor.getState().selection);
      content.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (!mesh.isMesh) return;
        const material = mesh.material as THREE.MeshStandardMaterial;
        const id = String(mesh.userData.elementId ?? "");
        const active = selected.has(id);
        material.emissive?.set(active ? 0x9a4318 : 0x000000);
        material.emissiveIntensity = active ? 0.45 : 0;
      });
    };

    const rebuild = () => {
      const current = editor.getState();
      if (!current.project) return;
      clearGroup(content);
      const { parts, bounds } = buildModel(current.project);
      for (const part of parts) addPart(content, part);
      if (bounds && builtFit !== current.fitToken) {
        builtFit = current.fitToken;
        frameCamera(bounds);
      }
      builtVersion = current.version;
      builtSelection = current.selection.join("|");
      paintSelection();
    };

    const sync = () => {
      const current = editor.getState();
      if (!current.project) return;
      if (current.version !== builtVersion || current.fitToken !== builtFit) rebuild();
      else if (current.selection.join("|") !== builtSelection) {
        builtSelection = current.selection.join("|");
        paintSelection();
      }
    };

    let running = true;
    const tick = () => {
      if (!running) return;
      requestAnimationFrame(tick);
      if (editor.getState().view !== "model") return;
      controls.update();
      renderer.render(scene, camera);
    };

    const onPointerDown = (event: PointerEvent) => {
      down = { x: event.clientX, y: event.clientY };
    };
    const onPointerUp = (event: PointerEvent) => {
      if (event.button !== 0) return;
      if (Math.hypot(event.clientX - down.x, event.clientY - down.y) > 5) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointerNdc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObjects(content.children, true);
      const hit = hits.find((item) => item.object.userData.elementId);
      if (!hit) {
        if (!event.shiftKey) editor.clearSelection();
        return;
      }
      const id = String(hit.object.userData.elementId);
      if (event.shiftKey) editor.toggleSelect(id);
      else editor.select([id]);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(host);
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    const unsubscribe = editor.subscribe(sync);
    resize();
    rebuild();
    tick();

    return () => {
      running = false;
      unsubscribe();
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      controls.dispose();
      clearGroup(content);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div ref={hostRef} className="model-view" role="application" aria-label="Three-dimensional model. Drag to orbit." />
  );
}

function addPart(group: THREE.Group, part: ModelPart) {
  if (part.kind === "grid") {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute([
      part.ax, part.az, -part.ay,
      part.bx, part.bz, -part.by,
    ], 3));
    const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0x8d8273 }));
    group.add(line);
    return;
  }
  if (part.kind === "wall") group.add(wallMesh(part));
  if (part.kind === "slab" || part.kind === "room") group.add(flatMesh(part));
  if (part.kind === "door" || part.kind === "window") group.add(boxMesh(part));
}

function wallMesh(part: WallPart): THREE.Group {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(part.length, 0);
  shape.lineTo(part.length, part.height);
  shape.lineTo(0, part.height);
  shape.closePath();
  for (const hole of part.holes) {
    const path = new THREE.Path();
    path.moveTo(hole.x, hole.y);
    path.lineTo(hole.x, hole.y + hole.h);
    path.lineTo(hole.x + hole.w, hole.y + hole.h);
    path.lineTo(hole.x + hole.w, hole.y);
    path.closePath();
    shape.holes.push(path);
  }
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: part.thickness, bevelEnabled: false });
  const material = new THREE.MeshStandardMaterial({ color: 0xd4cbbd, roughness: 0.86, metalness: 0, side: THREE.DoubleSide });
  return withEdges(geometry, material, part.matrix, part.id, 0x3a342c);
}

function flatMesh(part: FlatPart): THREE.Group {
  const shape = new THREE.Shape(part.outline.map((point) => new THREE.Vector2(point.x, point.y)));
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: part.height, bevelEnabled: false });
  const material = part.kind === "room"
    ? new THREE.MeshStandardMaterial({ color: 0x6e9a78, transparent: true, opacity: 0.33, roughness: 1, depthWrite: false, side: THREE.DoubleSide })
    : new THREE.MeshStandardMaterial({ color: 0xb7ad9e, roughness: 0.95, side: THREE.DoubleSide });
  return withEdges(geometry, material, part.matrix, part.id, part.kind === "room" ? 0x2f6a46 : 0x6d6458);
}

function boxMesh(part: BoxPart): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(part.width, part.height, part.depth);
  const material = new THREE.MeshStandardMaterial({
    color: part.kind === "door" ? 0x7a5236 : 0x9ec9d2,
    transparent: part.kind === "window",
    opacity: part.kind === "window" ? 0.55 : 1,
    roughness: 0.45,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.matrixAutoUpdate = false;
  mesh.matrix.fromArray(part.matrix);
  mesh.userData.elementId = part.id;
  return mesh;
}

function withEdges(
  geometry: THREE.BufferGeometry,
  material: THREE.MeshStandardMaterial,
  matrix: number[],
  id: string,
  edgeColor: number,
): THREE.Group {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.matrixAutoUpdate = false;
  mesh.matrix.fromArray(matrix);
  mesh.userData.elementId = id;
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry, 15),
    new THREE.LineBasicMaterial({ color: edgeColor }),
  );
  edges.matrixAutoUpdate = false;
  edges.matrix.fromArray(matrix);
  const group = new THREE.Group();
  group.add(mesh, edges);
  return group;
}

function clearGroup(group: THREE.Group) {
  for (const child of [...group.children]) {
    group.remove(child);
    disposeObject(child);
  }
}

function disposeObject(object: THREE.Object3D) {
  const mesh = object as THREE.Mesh;
  if (mesh.geometry) mesh.geometry.dispose();
  const material = (mesh as THREE.Mesh).material;
  if (Array.isArray(material)) material.forEach((item) => item.dispose());
  else if (material) material.dispose();
  for (const child of [...object.children]) disposeObject(child);
}
