import { ACTIVITIES, GLOSSARY, LESSON_TERMS, MODULES, QUIZZES, lessonIds, moduleForLesson } from "./curriculum";
import type { LearnAction, LessonId, Locale } from "./curriculum";
import type { LearnProgress } from "./types";

const NOTE_MIN = 40;

export function orderedLessons(): LessonId[] {
  return lessonIds();
}

export function neighbor(lessonId: string, step: -1 | 1): LessonId | null {
  const order = lessonIds();
  const index = order.indexOf(lessonId as LessonId);
  if (index < 0) return null;
  return order[index + step] ?? null;
}

export function quizzesFor(lessonId: string) {
  return QUIZZES.filter((quiz) => quiz.lessonId === lessonId);
}

export function activityFor(lessonId: string) {
  return ACTIVITIES.find((activity) => activity.lessonId === lessonId) ?? null;
}

export function termsFor(lessonId: LessonId) {
  return LESSON_TERMS[lessonId].map((id) => {
    const entry = GLOSSARY.find((item) => item.id === id);
    if (!entry) throw new Error(`Missing glossary term ${id}`);
    return entry;
  });
}

export function termPair(entry: { en: string; bg: string }, locale: Locale): string {
  return locale === "bg" ? `${entry.bg} / ${entry.en}` : `${entry.en} / ${entry.bg}`;
}

export function courseMinutes(): number {
  return MODULES.reduce((sum, module) => sum + module.minutes, 0);
}

export function isKnownLesson(lessonId: string): lessonId is LessonId {
  return lessonIds().includes(lessonId as LessonId);
}

export function canComplete(progress: LearnProgress, lessonId: string): boolean {
  const quizzes = quizzesFor(lessonId);
  if (quizzes.length === 0 || quizzes.some((quiz) => !progress.answers[quiz.id])) return false;
  const activity = activityFor(lessonId);
  if (!activity) return false;
  if (activity.kind === "reflection") return (progress.notes[lessonId] ?? "").trim().length >= NOTE_MIN;
  return progress.checks[activity.id] === true;
}

export function completion(progress: LearnProgress): { done: number; total: number } {
  const known = new Set(lessonIds());
  const done = progress.completed.filter((id) => known.has(id as LessonId)).length;
  return { done, total: known.size };
}

/** Resume the open lesson when it is unfinished. Otherwise the first unfinished lesson. */
export function continueTarget(progress: LearnProgress): LessonId {
  const order = lessonIds();
  if (isKnownLesson(progress.lessonId) && !progress.completed.includes(progress.lessonId)) return progress.lessonId;
  return order.find((id) => !progress.completed.includes(id)) ?? order[order.length - 1];
}

export function practiceProjectName(locale: Locale): string {
  return locale === "bg" ? "Учебна къща" : "Practice house";
}

export function actionLabelKey(action: LearnAction): "openPlan" | "openModel" | "openSection" | "startPractice" {
  if (action === "open-sample-plan") return "openPlan";
  if (action === "open-sample-model") return "openModel";
  if (action === "open-sample-section") return "openSection";
  return "startPractice";
}

export function moduleProgress(progress: LearnProgress, moduleId: string): { done: number; total: number } {
  const module = MODULES.find((item) => item.id === moduleId);
  if (!module) return { done: 0, total: 0 };
  const done = module.lessonIds.filter((id) => progress.completed.includes(id)).length;
  return { done, total: module.lessonIds.length };
}

export function lessonModuleTitleId(lessonId: string): string | null {
  return moduleForLesson(lessonId);
}

export const REFLECTION_MIN = NOTE_MIN;
