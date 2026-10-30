import type { Vec2 } from "../domain/types";

export interface PointerReadout {
  world: Vec2 | null;
  zoom: number;
}

let readout: PointerReadout = { world: null, zoom: 0.04 };
const listeners = new Set<() => void>();
let queued = false;

export const pointer = {
  get: () => readout,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  set(next: PointerReadout) {
    readout = next;
    if (queued) return;
    queued = true;
    const flush = () => {
      queued = false;
      for (const listener of listeners) listener();
    };
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(flush);
    else flush();
  },
};
