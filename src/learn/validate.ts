import { ACTIVITIES, GLOSSARY, LESSON_TERMS, LOCALES, MODULES, QUIZZES, lessonIds } from "./curriculum";
import type { Locale } from "./curriculum";
import type { CourseCopy } from "./types";

const PLACEHOLDER = /TODO|TBD|lorem ipsum|\[missing\]/i;

export function validateCourse(copy: CourseCopy, locale: Locale): string[] {
  const issues: string[] = [];
  const seenLessons = new Set<string>();
  for (const module of MODULES) {
    for (const lessonId of module.lessonIds) {
      if (seenLessons.has(lessonId)) issues.push(`Duplicate lesson ${lessonId}`);
      seenLessons.add(lessonId);
    }
    const moduleCopy = copy.modules[module.id];
    requireText(issues, `${locale} module ${module.id} title`, moduleCopy?.title);
    checkScript(issues, locale, `${module.id} title`, moduleCopy?.title ?? "");
    requireText(issues, `${locale} module ${module.id} summary`, moduleCopy?.summary, 40);
    checkScript(issues, locale, `${module.id} summary`, moduleCopy?.summary ?? "");
    if (!moduleCopy || moduleCopy.objectives.length < 2) issues.push(`${locale} module ${module.id} needs two objectives`);
    moduleCopy?.objectives.forEach((objective, index) => {
      requireText(issues, `${locale} ${module.id} objective ${index}`, objective, 20);
      checkScript(issues, locale, `${module.id} objective ${index}`, objective);
    });
  }

  const lessonIdList = lessonIds();
  if (seenLessons.size !== lessonIdList.length) issues.push("Lesson list does not match modules");

  for (const lessonId of lessonIdList) {
    const lesson = copy.lessons[lessonId];
    requireText(issues, `${locale} lesson ${lessonId} title`, lesson?.title);
    checkScript(issues, locale, `${lessonId} title`, lesson?.title ?? "");
    requireText(issues, `${locale} lesson ${lessonId} summary`, lesson?.summary, 40);
    checkScript(issues, locale, `${lessonId} summary`, lesson?.summary ?? "");
    if (!lesson || lesson.objectives.length < 2) issues.push(`${locale} ${lessonId} needs two objectives`);
    lesson?.objectives.forEach((objective, index) => {
      requireText(issues, `${locale} ${lessonId} objective ${index}`, objective, 20);
      checkScript(issues, locale, `${lessonId} objective ${index}`, objective);
    });
    if (!lesson || lesson.sections.length < 2) issues.push(`${locale} ${lessonId} needs two sections`);
    lesson?.sections.forEach((section, index) => {
      requireText(issues, `${locale} ${lessonId} section ${index}`, section.heading, 8);
      checkScript(issues, locale, `${lessonId} heading ${index}`, section.heading);
      if (section.paragraphs.length < 1) issues.push(`${locale} ${lessonId} section ${index} is empty`);
      section.paragraphs.forEach((paragraph, paragraphIndex) => {
        requireText(issues, `${locale} ${lessonId} p ${index}.${paragraphIndex}`, paragraph, 80);
        checkScript(issues, locale, `${lessonId} p ${index}.${paragraphIndex}`, paragraph);
      });
    });
    const terms = LESSON_TERMS[lessonId];
    if (terms.length < 2) issues.push(`${lessonId} needs vocabulary`);
    requireText(issues, `${locale} ${lessonId} activity title`, lesson?.activity.title);
    checkScript(issues, locale, `${lessonId} activity title`, lesson?.activity.title ?? "");
    requireText(issues, `${locale} ${lessonId} activity`, lesson?.activity.instructions, 40);
    if (!lesson || lesson.activity.steps.length < 2) issues.push(`${locale} ${lessonId} activity needs two steps`);
    lesson?.activity.steps.forEach((step, index) => {
      requireText(issues, `${locale} ${lessonId} step ${index}`, step, 20);
      checkScript(issues, locale, `${lessonId} step ${index}`, step);
    });
    requireText(issues, `${locale} ${lessonId} hint`, lesson?.activity.hint, 20);
    checkScript(issues, locale, `${lessonId} hint`, lesson?.activity.hint ?? "");
    checkScript(issues, locale, `${lessonId} activity`, lesson?.activity.instructions ?? "");
  }

  const quizIds = new Set<string>();
  for (const quiz of QUIZZES) {
    if (quizIds.has(quiz.id)) issues.push(`Duplicate quiz ${quiz.id}`);
    quizIds.add(quiz.id);
    if (!(quiz.choiceIds as readonly string[]).includes(quiz.correctId)) issues.push(`${quiz.id} correct choice is not listed`);
    if (new Set(quiz.choiceIds).size !== quiz.choiceIds.length) issues.push(`${quiz.id} has duplicate choices`);
    const text = copy.quizzes[quiz.id];
    requireText(issues, `${locale} ${quiz.id} prompt`, text?.prompt, 20);
    checkScript(issues, locale, `${quiz.id} prompt`, text?.prompt ?? "");
    const choices = text?.choices as Record<string, string> | undefined;
    for (const choiceId of quiz.choiceIds) {
      requireText(issues, `${locale} ${quiz.id} ${choiceId}`, choices?.[choiceId]);
      checkScript(issues, locale, `${quiz.id} ${choiceId}`, choices?.[choiceId] ?? "");
    }
    const extra = choices ? Object.keys(choices).filter((id) => !(quiz.choiceIds as readonly string[]).includes(id)) : [];
    if (extra.length) issues.push(`${locale} ${quiz.id} has unknown choices ${extra.join(",")}`);
    requireText(issues, `${locale} ${quiz.id} correct feedback`, text?.correct, 40);
    requireText(issues, `${locale} ${quiz.id} incorrect feedback`, text?.incorrect, 40);
    checkScript(issues, locale, `${quiz.id} feedback`, `${text?.correct ?? ""} ${text?.incorrect ?? ""}`);
  }

  const activityLessons = new Set<string>();
  for (const activity of ACTIVITIES) {
    if (activityLessons.has(activity.lessonId)) issues.push(`Two activities for ${activity.lessonId}`);
    activityLessons.add(activity.lessonId);
    const record = activity as { id: string; kind: string; action?: string };
    if (record.kind === "lintel" && !record.action) issues.push(`${record.id} needs a Lintel action`);
  }
  for (const lessonId of lessonIdList) {
    if (!activityLessons.has(lessonId)) issues.push(`No activity for ${lessonId}`);
  }

  const glossaryIds = new Set<string>();
  const enTerms = new Set<string>();
  const bgTerms = new Set<string>();
  for (const entry of GLOSSARY) {
    if (glossaryIds.has(entry.id)) issues.push(`Duplicate glossary id ${entry.id}`);
    glossaryIds.add(entry.id);
    if (!entry.en.trim() || !entry.bg.trim()) issues.push(`Glossary ${entry.id} is missing a term`);
    if (enTerms.has(entry.en.toLowerCase())) issues.push(`Duplicate English term ${entry.en}`);
    if (bgTerms.has(entry.bg.toLowerCase())) issues.push(`Duplicate Bulgarian term ${entry.bg}`);
    enTerms.add(entry.en.toLowerCase());
    bgTerms.add(entry.bg.toLowerCase());
    if (!/[A-Za-z]/.test(entry.en)) issues.push(`English term ${entry.id} has no Latin letters`);
    if (!/[А-Яа-я]/.test(entry.bg)) issues.push(`Bulgarian term ${entry.id} has no Cyrillic`);
    const definition = copy.glossary[entry.id];
    requireText(issues, `${locale} glossary ${entry.id}`, definition, 40);
    checkScript(issues, locale, `glossary ${entry.id}`, definition ?? "");
  }

  const ui = copy.ui;
  const skipScript = new Set(["english", "bulgarian"]);
  for (const [key, value] of Object.entries(ui)) {
    if (key === "lessonForms" || key === "moduleForms") {
      const forms = value as UiForms;
      requireText(issues, `${locale} ${key}.one`, forms.one);
      requireText(issues, `${locale} ${key}.few`, forms.few);
      requireText(issues, `${locale} ${key}.many`, forms.many);
      continue;
    }
    if (typeof value !== "string") {
      issues.push(`${locale} ui ${key} is not text`);
      continue;
    }
    requireText(issues, `${locale} ui ${key}`, value);
    if (!skipScript.has(key) && value.length > 24) checkScript(issues, locale, `ui ${key}`, value);
  }

  if (!LOCALES.includes(locale)) issues.push(`Unknown locale ${locale}`);
  return issues;
}

interface UiForms {
  one: string;
  few: string;
  many: string;
}

function requireText(issues: string[], label: string, value: string | undefined, min = 2): void {
  if (!value || value.trim().length < min) issues.push(`${label} is missing`);
  else if (PLACEHOLDER.test(value)) issues.push(`${label} still has a placeholder`);
}

function checkScript(issues: string[], locale: Locale, label: string, value: string): void {
  const cyrillic = value.match(/[А-Яа-я]/g)?.length ?? 0;
  const latin = value.match(/[A-Za-z]/g)?.length ?? 0;
  if (locale === "bg" && cyrillic <= latin) issues.push(`${label} is not Bulgarian`);
  if (locale === "en" && latin <= cyrillic) issues.push(`${label} is not English`);
}
