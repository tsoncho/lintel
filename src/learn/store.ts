import { browserStorage, memoryStore, type KeyValueStore } from "../persistence/library";
import { isKnownLesson } from "./course";
import type { Locale } from "./curriculum";
import { freshProgress, loadProgress, preferredLocale, saveProgress, type ProgressState } from "./progress";
import type { LearnProgress } from "./types";

type Listener = () => void;

const listeners = new Set<Listener>();
const store: KeyValueStore = browserStorage() ?? memoryStore();
let state: ProgressState = loadProgress(store, preferredLocale(typeof navigator === "undefined" ? undefined : navigator.language));

function emit() {
  for (const listener of listeners) listener();
}

function write(next: LearnProgress) {
  state = {
    ...state,
    progress: { ...next, updatedAt: new Date().toISOString() },
  };
  if (state.mode !== "newer") saveProgress(store, state);
  emit();
}

export const learnStore = {
  get: () => state,
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  setLocale(locale: Locale) {
    if (state.mode === "newer") {
      state = { ...state, progress: { ...state.progress, locale } };
      emit();
      return;
    }
    write({ ...state.progress, locale });
  },
  patch(partial: Partial<LearnProgress>) {
    write({ ...state.progress, ...partial });
  },
  reset(locale: Locale) {
    if (state.mode === "newer") return;
    write(freshProgress(locale));
  },
};

export function openLesson(lessonId: string) {
  learnStore.patch({
    view: "lesson",
    lessonId: isKnownLesson(lessonId) ? lessonId : learnStore.get().progress.lessonId,
  });
}
