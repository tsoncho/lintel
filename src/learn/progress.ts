import { lessonIds } from "./curriculum";
import type { Locale } from "./curriculum";
import { LEARN_PROGRESS_KEY, LEARN_PROGRESS_VERSION, type LearnProgress } from "./types";
import type { KeyValueStore } from "../persistence/library";

const KNOWN = new Set(["schemaVersion", "locale", "view", "lessonId", "completed", "answers", "notes", "checks", "updatedAt"]);

export interface ProgressState {
  mode: "ok" | "newer" | "fresh";
  progress: LearnProgress;
  extra: Record<string, unknown>;
  raw: string | null;
}

export function preferredLocale(language: string | undefined): Locale {
  return language?.toLowerCase().startsWith("bg") ? "bg" : "en";
}

export function freshProgress(locale: Locale, now = "1970-01-01T00:00:00.000Z"): LearnProgress {
  return {
    schemaVersion: LEARN_PROGRESS_VERSION,
    locale,
    view: "overview",
    lessonId: lessonIds()[0],
    completed: [],
    answers: {},
    notes: {},
    checks: {},
    updatedAt: now,
  };
}

export function loadProgress(store: KeyValueStore, locale: Locale, now?: string): ProgressState {
  const raw = store.getItem(LEARN_PROGRESS_KEY);
  if (!raw) return { mode: "fresh", progress: freshProgress(locale, now), extra: {}, raw: null };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { mode: "fresh", progress: freshProgress(locale, now), extra: {}, raw };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { mode: "fresh", progress: freshProgress(locale, now), extra: {}, raw };
  }
  const record = parsed as Record<string, unknown>;
  if (typeof record.schemaVersion === "number" && record.schemaVersion > LEARN_PROGRESS_VERSION) {
    return { mode: "newer", progress: freshProgress(localeFrom(record, locale), now), extra: {}, raw };
  }
  if (record.schemaVersion !== LEARN_PROGRESS_VERSION) {
    return { mode: "fresh", progress: freshProgress(locale, now), extra: {}, raw };
  }
  const extra: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (!KNOWN.has(key)) extra[key] = value;
  }
  return { mode: "ok", progress: sanitize(record, locale), extra, raw };
}

export function saveProgress(store: KeyValueStore, state: ProgressState): void {
  if (state.mode === "newer") return;
  const payload = { ...state.extra, ...state.progress, schemaVersion: LEARN_PROGRESS_VERSION };
  store.setItem(LEARN_PROGRESS_KEY, JSON.stringify(payload));
}

function localeFrom(record: Record<string, unknown>, fallback: Locale): Locale {
  return record.locale === "bg" || record.locale === "en" ? record.locale : fallback;
}

function sanitize(record: Record<string, unknown>, fallback: Locale): LearnProgress {
  const base = freshProgress(localeFrom(record, fallback));
  const view = record.view === "glossary" || record.view === "lesson" || record.view === "overview" ? record.view : "overview";
  return {
    schemaVersion: 1,
    locale: localeFrom(record, fallback),
    view,
    lessonId: typeof record.lessonId === "string" && record.lessonId.trim() ? record.lessonId : base.lessonId,
    completed: uniqueStrings(record.completed),
    answers: stringRecord(record.answers),
    notes: stringRecord(record.notes),
    checks: booleanRecord(record.checks),
    updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : base.updatedAt,
  };
}

function uniqueStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const next: string[] = [];
  for (const item of value) {
    if (typeof item === "string" && item && !next.includes(item)) next.push(item);
  }
  return next;
}

function stringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const next: Record<string, string> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === "string") next[key] = item;
  }
  return next;
}

function booleanRecord(value: unknown): Record<string, boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const next: Record<string, boolean> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === "boolean") next[key] = item;
  }
  return next;
}
