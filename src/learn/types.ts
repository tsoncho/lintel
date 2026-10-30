import type { GlossaryId, LessonId, Locale, ModuleId } from "./curriculum";
import type { QUIZZES } from "./curriculum";

export interface UiCopy {
  title: string;
  intro: string;
  close: string;
  overview: string;
  glossary: string;
  continue: string;
  language: string;
  english: string;
  bulgarian: string;
  duration: string;
  aboutHours: string;
  minutesShort: string;
  disclaimer: string;
  objectives: string;
  vocabulary: string;
  check: string;
  activity: string;
  hint: string;
  previous: string;
  next: string;
  markComplete: string;
  completed: string;
  done: string;
  progressLabel: string;
  searchLabel: string;
  searchPlaceholder: string;
  noMatches: string;
  reset: string;
  resetTitle: string;
  resetBody: string;
  resetConfirm: string;
  cancel: string;
  reflectionPlaceholder: string;
  reflectionShort: string;
  acknowledge: string;
  openPlan: string;
  openModel: string;
  openSection: string;
  startPractice: string;
  actionNote: string;
  correctLabel: string;
  incorrectLabel: string;
  backOverview: string;
  paperLabel: string;
  modelLabel: string;
  savedHere: string;
  missingLesson: string;
  newerProgress: string;
  lessonForms: { one: string; few: string; many: string };
  moduleForms: { one: string; few: string; many: string };
  courseNav: string;
  lessonNav: string;
}

export interface ModuleCopy {
  title: string;
  summary: string;
  objectives: string[];
}

export interface LessonCopy {
  title: string;
  summary: string;
  objectives: string[];
  sections: { heading: string; paragraphs: string[] }[];
  activity: { title: string; instructions: string; steps: string[]; hint: string };
}

export type QuizCopyMap = {
  [Q in (typeof QUIZZES)[number] as Q["id"]]: {
    prompt: string;
    choices: Record<Q["choiceIds"][number], string>;
    correct: string;
    incorrect: string;
  };
};

export interface CourseCopy {
  ui: UiCopy;
  modules: Record<ModuleId, ModuleCopy>;
  lessons: Record<LessonId, LessonCopy>;
  quizzes: QuizCopyMap;
  glossary: Record<GlossaryId, string>;
}

export interface LearnProgress {
  schemaVersion: 1;
  locale: Locale;
  view: "overview" | "glossary" | "lesson";
  lessonId: string;
  completed: string[];
  answers: Record<string, string>;
  notes: Record<string, string>;
  checks: Record<string, boolean>;
  updatedAt: string;
}

export const LEARN_PROGRESS_VERSION = 1;
export const LEARN_PROGRESS_KEY = "lintel.learn.progress";
