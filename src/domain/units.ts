import type { DisplayUnit } from "./types";

export const MM_PER_METER = 1000;

export function mmToDisplay(mm: number, unit: DisplayUnit): number {
  return unit === "m" ? mm / MM_PER_METER : mm;
}

export function displayToMm(value: number, unit: DisplayUnit): number {
  return unit === "m" ? value * MM_PER_METER : value;
}

export function formatNumber(value: number, digits: number): string {
  if (!Number.isFinite(value)) return "—";
  const factor = 10 ** digits;
  const rounded = Math.round(value * factor) / factor;
  return String(rounded);
}

export function formatLength(mm: number, unit: DisplayUnit): string {
  if (unit === "m") return `${formatNumber(mmToDisplay(mm, "m"), 3)} m`;
  return `${formatNumber(mm, 1)} mm`;
}

export function formatArea(mm2: number): string {
  return `${formatNumber(mm2 / 1_000_000, 2)} m²`;
}

export function formatPoint(x: number, y: number, unit: DisplayUnit): string {
  return `E ${formatLength(x, unit)}   N ${formatLength(y, unit)}`;
}

export function parseLength(text: string, unit: DisplayUnit): number | null {
  const trimmed = text.trim().replace(/,/g, "");
  if (!trimmed) return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return null;
  return displayToMm(value, unit);
}

/** Approximate paper scale from CSS pixels. 96 CSS px = 1 inch. */
export function scaleDenominator(pxPerMm: number): number {
  const cssPxPerMm = 96 / 25.4;
  if (pxPerMm <= 0) return 0;
  return Math.max(1, Math.round(cssPxPerMm / pxPerMm));
}
