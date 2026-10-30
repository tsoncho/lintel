import { describe, expect, it } from "vitest";
import { memoryStore } from "../persistence/library";
import { bg } from "./copy/bg";
import { en } from "./copy/en";
import { bgCount } from "./count";
import { canComplete, continueTarget } from "./course";
import { lessonIds } from "./curriculum";
import { freshProgress, loadProgress, saveProgress } from "./progress";
import { searchGlossary } from "./search";
import { LEARN_PROGRESS_KEY, type LearnProgress } from "./types";
import { validateCourse } from "./validate";

describe("architecture course", () => {
  it("accepts the English and Bulgarian curricula", () => {
    expect(validateCourse(en, "en")).toEqual([]);
    expect(validateCourse(bg, "bg")).toEqual([]);
  });

  it("flags a paragraph left in the wrong language", () => {
    const broken = structuredClone(bg);
    broken.lessons["buildings-respond"].sections[0].paragraphs[0] =
      "This paragraph was left in English by mistake and is long enough to be checked.";
    expect(validateCourse(broken, "bg").some((issue) => issue.includes("not Bulgarian"))).toBe(true);
  });

  it("flags a quiz choice missing from a translation", () => {
    const broken = structuredClone(en);
    const choices = { ...broken.quizzes["buildings-q1"].choices } as Record<string, string>;
    delete choices["people-place"];
    broken.quizzes["buildings-q1"] = {
      ...broken.quizzes["buildings-q1"],
      choices: choices as typeof broken.quizzes["buildings-q1"]["choices"],
    };
    expect(validateCourse(broken, "en").some((issue) => issue.includes("people-place"))).toBe(true);
  });

  it("searches glossary terms in either language", () => {
    expect(searchGlossary(en, "en", "разрез").map((hit) => hit.id)).toContain("section");
    expect(searchGlossary(bg, "bg", "section").map((hit) => hit.id)).toContain("section");
    expect(searchGlossary(en, "en", "floor plan").map((hit) => hit.id)).toEqual(["plan"]);
    expect(searchGlossary(bg, "bg", "no-such-term")).toEqual([]);
  });

  it("keeps lesson, answers, and unknown ids when the language changes", () => {
    const store = memoryStore();
    const initial = freshProgress("en", "2026-01-01T00:00:00.000Z");
    initial.view = "lesson";
    initial.lessonId = "three-drawings";
    initial.completed = ["buildings-respond", "retired-lesson"];
    initial.answers = { "drawings-q1": "plan", "old-question": "kept" };
    initial.notes = { "buildings-respond": "A kitchen serves the people who cook." };
    saveProgress(store, { mode: "ok", progress: initial, extra: { extraFlag: true }, raw: null });
    const loaded = loadProgress(store, "bg");
    expect(loaded.progress.completed).toContain("retired-lesson");
    expect(loaded.extra.extraFlag).toBe(true);
    loaded.progress.locale = "bg";
    saveProgress(store, loaded);
    const again = loadProgress(store, "en");
    expect(again.progress.locale).toBe("bg");
    expect(again.progress.lessonId).toBe("three-drawings");
    expect(again.progress.answers["drawings-q1"]).toBe("plan");
    expect(again.progress.answers["old-question"]).toBe("kept");
    expect(again.progress.notes["buildings-respond"]).toContain("kitchen");
    expect(again.extra.extraFlag).toBe(true);
  });

  it("does not overwrite progress from a newer schema", () => {
    const store = memoryStore();
    const raw = JSON.stringify({ schemaVersion: 2, locale: "bg", secret: "keep" });
    store.setItem(LEARN_PROGRESS_KEY, raw);
    const loaded = loadProgress(store, "en");
    expect(loaded.mode).toBe("newer");
    loaded.progress.locale = "en";
    loaded.progress.completed = ["buildings-respond"];
    saveProgress(store, loaded);
    expect(store.getItem(LEARN_PROGRESS_KEY)).toBe(raw);
  });

  it("requires an answer and a real note before a reflection lesson is complete", () => {
    const progress: LearnProgress = freshProgress("en");
    expect(canComplete(progress, "buildings-respond")).toBe(false);
    progress.answers["buildings-q1"] = "people-place";
    progress.notes["buildings-respond"] = "too short";
    expect(canComplete(progress, "buildings-respond")).toBe(false);
    progress.notes["buildings-respond"] = "The kitchen is for the people who cook, and the window is there so they can see the garden.";
    expect(canComplete(progress, "buildings-respond")).toBe(true);
    progress.completed = ["buildings-respond"];
    expect(canComplete(progress, "buildings-respond")).toBe(true);
  });

  it("resumes an unfinished lesson before skipping ahead", () => {
    const progress = freshProgress("bg");
    progress.lessonId = "scale-and-symbols";
    expect(continueTarget(progress)).toBe("scale-and-symbols");
    progress.completed = lessonIds().filter((id) => id !== "comfort-and-access");
    progress.lessonId = "capstone-review";
    expect(continueTarget(progress)).toBe("comfort-and-access");
  });

  it("uses Bulgarian count forms", () => {
    expect(bgCount(1, "урок", "урока", "уроци")).toBe("1 урок");
    expect(bgCount(2, "урок", "урока", "уроци")).toBe("2 урока");
    expect(bgCount(5, "урок", "урока", "уроци")).toBe("5 уроци");
    expect(bgCount(11, "урок", "урока", "уроци")).toBe("11 уроци");
    expect(bgCount(21, "урок", "урока", "уроци")).toBe("21 урок");
    expect(bgCount(22, "модул", "модула", "модули")).toBe("22 модула");
  });
});
