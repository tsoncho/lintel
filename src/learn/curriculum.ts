/** Language-neutral course structure. Translated text lives in `copy/`. */

export const LOCALES = ["en", "bg"] as const;
export type Locale = (typeof LOCALES)[number];

export const LEARN_ACTIONS = ["open-sample-plan", "open-sample-model", "open-sample-section", "new-practice-project"] as const;
export type LearnAction = (typeof LEARN_ACTIONS)[number];

export const GLOSSARY = [
  { id: "architecture", en: "architecture", bg: "архитектура" },
  { id: "site", en: "site", bg: "терен" },
  { id: "story", en: "storey", bg: "етаж" },
  { id: "plan", en: "floor plan", bg: "план" },
  { id: "elevation", en: "elevation", bg: "фасада" },
  { id: "section", en: "section", bg: "разрез" },
  { id: "scale", en: "scale", bg: "мащаб" },
  { id: "north", en: "north", bg: "север" },
  { id: "dimension", en: "dimension", bg: "размер" },
  { id: "gridline", en: "gridline", bg: "осова линия" },
  { id: "room", en: "room", bg: "помещение" },
  { id: "circulation", en: "circulation", bg: "комуникация" },
  { id: "adjacency", en: "adjacency", bg: "съседство" },
  { id: "privacy", en: "privacy", bg: "уединение" },
  { id: "daylight", en: "daylight", bg: "дневна светлина" },
  { id: "accessibility", en: "accessibility", bg: "достъпност" },
  { id: "foundation", en: "foundation", bg: "фундамент" },
  { id: "structure", en: "structural system", bg: "носеща конструкция" },
  { id: "slab", en: "slab", bg: "плоча" },
  { id: "bearing-wall", en: "load-bearing wall", bg: "носеща стена" },
  { id: "partition", en: "partition", bg: "преградна стена" },
  { id: "envelope", en: "building envelope", bg: "външна обвивка" },
  { id: "roof", en: "roof", bg: "покрив" },
  { id: "opening", en: "opening", bg: "отвор" },
  { id: "lintel", en: "lintel", bg: "щурц" },
  { id: "finishes", en: "finishes", bg: "довършителни работи" },
  { id: "load", en: "load", bg: "товар" },
  { id: "load-path", en: "load path", bg: "път на товара" },
  { id: "span", en: "span", bg: "подпорно разстояние" },
  { id: "brief", en: "brief", bg: "задание" },
  { id: "concept", en: "concept", bg: "концепция" },
  { id: "material", en: "material", bg: "материал" },
  { id: "door", en: "door", bg: "врата" },
  { id: "window", en: "window", bg: "прозорец" },
] as const;

export type GlossaryId = (typeof GLOSSARY)[number]["id"];

export const MODULES = [
  { id: "what", minutes: 20, lessonIds: ["buildings-respond", "how-design-develops"] },
  { id: "drawings", minutes: 25, lessonIds: ["three-drawings", "scale-and-symbols"] },
  { id: "space", minutes: 25, lessonIds: ["rooms-and-movement", "comfort-and-access"] },
  { id: "parts", minutes: 25, lessonIds: ["site-to-roof", "openings-and-finishes"] },
  { id: "standing", minutes: 25, lessonIds: ["loads-and-paths", "spans-and-systems"] },
  { id: "materials", minutes: 20, lessonIds: ["choosing-materials", "comfort-envelope"] },
  { id: "process", minutes: 20, lessonIds: ["brief-and-options", "drawing-to-site"] },
  { id: "capstone", minutes: 30, lessonIds: ["capstone-brief", "capstone-plan", "capstone-review"] },
] as const;

export type ModuleId = (typeof MODULES)[number]["id"];
export type LessonId = (typeof MODULES)[number]["lessonIds"][number];

export const LESSON_TERMS = {
  "buildings-respond": ["architecture", "site", "story"],
  "how-design-develops": ["architecture", "brief", "concept"],
  "three-drawings": ["plan", "elevation", "section"],
  "scale-and-symbols": ["scale", "north", "dimension", "gridline"],
  "rooms-and-movement": ["room", "circulation", "adjacency"],
  "comfort-and-access": ["daylight", "privacy", "accessibility"],
  "site-to-roof": ["foundation", "structure", "slab", "roof"],
  "openings-and-finishes": ["opening", "door", "window", "partition", "finishes", "lintel"],
  "loads-and-paths": ["load", "load-path", "foundation"],
  "spans-and-systems": ["span", "structure", "bearing-wall", "lintel"],
  "choosing-materials": ["material", "finishes", "envelope"],
  "comfort-envelope": ["envelope", "daylight", "material"],
  "brief-and-options": ["brief", "concept", "room"],
  "drawing-to-site": ["plan", "section", "structure"],
  "capstone-brief": ["brief", "privacy", "daylight"],
  "capstone-plan": ["plan", "door", "window", "room"],
  "capstone-review": ["section", "elevation", "concept"],
} as const satisfies Record<LessonId, readonly GlossaryId[]>;

export const QUIZZES = [
  { id: "buildings-q1", lessonId: "buildings-respond", choiceIds: ["people-place", "ornament", "software"], correctId: "people-place" },
  { id: "architects-q1", lessonId: "how-design-develops", choiceIds: ["unchanged", "revise", "software"], correctId: "revise" },
  { id: "drawings-q1", lessonId: "three-drawings", choiceIds: ["plan", "elevation", "sketch"], correctId: "plan" },
  { id: "drawings-q2", lessonId: "three-drawings", choiceIds: ["section", "plan", "elevation"], correctId: "section" },
  { id: "scale-q1", lessonId: "scale-and-symbols", choiceIds: ["zoom", "millimetres", "north"], correctId: "millimetres" },
  { id: "rooms-q1", lessonId: "rooms-and-movement", choiceIds: ["circulation", "colour", "furniture"], correctId: "circulation" },
  { id: "comfort-q1", lessonId: "comfort-and-access", choiceIds: ["use", "facade", "furniture"], correctId: "use" },
  { id: "parts-q1", lessonId: "site-to-roof", choiceIds: ["foundation", "paint", "swing"], correctId: "foundation" },
  { id: "openings-q1", lessonId: "openings-and-finishes", choiceIds: ["partition", "foundation", "grid"], correctId: "partition" },
  { id: "loads-q1", lessonId: "loads-and-paths", choiceIds: ["path", "colour", "scale"], correctId: "path" },
  { id: "loads-q2", lessonId: "loads-and-paths", choiceIds: ["geometry", "permit", "code"], correctId: "geometry" },
  { id: "spans-q1", lessonId: "spans-and-systems", choiceIds: ["span", "paint", "north"], correctId: "span" },
  { id: "materials-q1", lessonId: "choosing-materials", choiceIds: ["tradeoff", "always-brick", "name"], correctId: "tradeoff" },
  { id: "envelope-q1", lessonId: "comfort-envelope", choiceIds: ["envelope", "furniture", "grid"], correctId: "envelope" },
  { id: "brief-q1", lessonId: "brief-and-options", choiceIds: ["brief", "picture", "licence"], correctId: "brief" },
  { id: "process-q1", lessonId: "drawing-to-site", choiceIds: ["early", "permit", "proof"], correctId: "early" },
  { id: "capstone-brief-q1", lessonId: "capstone-brief", choiceIds: ["reason", "taste", "software"], correctId: "reason" },
  { id: "capstone-plan-q1", lessonId: "capstone-plan", choiceIds: ["separate", "inside", "server"], correctId: "separate" },
  { id: "capstone-review-q1", lessonId: "capstone-review", choiceIds: ["view", "sheet", "permit"], correctId: "view" },
  { id: "capstone-review-q2", lessonId: "capstone-review", choiceIds: ["professionals", "course", "itself"], correctId: "professionals" },
] as const satisfies readonly { id: string; lessonId: LessonId; choiceIds: readonly string[]; correctId: string }[];

export type QuizId = (typeof QUIZZES)[number]["id"];

export const ACTIVITIES = [
  { id: "buildings-act", lessonId: "buildings-respond", kind: "reflection" },
  { id: "architects-act", lessonId: "how-design-develops", kind: "reflection" },
  { id: "drawings-act", lessonId: "three-drawings", kind: "lintel", action: "open-sample-section", secondaryAction: "open-sample-plan" },
  { id: "scale-act", lessonId: "scale-and-symbols", kind: "lintel", action: "open-sample-plan" },
  { id: "rooms-act", lessonId: "rooms-and-movement", kind: "reflection" },
  { id: "comfort-act", lessonId: "comfort-and-access", kind: "lintel", action: "open-sample-model" },
  { id: "parts-act", lessonId: "site-to-roof", kind: "reflection" },
  { id: "openings-act", lessonId: "openings-and-finishes", kind: "lintel", action: "open-sample-plan" },
  { id: "loads-act", lessonId: "loads-and-paths", kind: "reflection" },
  { id: "spans-act", lessonId: "spans-and-systems", kind: "reflection" },
  { id: "materials-act", lessonId: "choosing-materials", kind: "reflection", action: "open-sample-plan" },
  { id: "envelope-act", lessonId: "comfort-envelope", kind: "reflection" },
  { id: "brief-act", lessonId: "brief-and-options", kind: "reflection" },
  { id: "process-act", lessonId: "drawing-to-site", kind: "reflection" },
  { id: "capstone-brief-act", lessonId: "capstone-brief", kind: "reflection" },
  { id: "capstone-plan-act", lessonId: "capstone-plan", kind: "lintel", action: "new-practice-project", secondaryAction: "open-sample-plan" },
  { id: "capstone-review-act", lessonId: "capstone-review", kind: "reflection", action: "open-sample-model" },
] as const satisfies readonly {
  id: string;
  lessonId: LessonId;
  kind: "reflection" | "lintel";
  action?: LearnAction;
  secondaryAction?: LearnAction;
}[];

export type ActivityId = (typeof ACTIVITIES)[number]["id"];

type MissingActivity = Exclude<LessonId, (typeof ACTIVITIES)[number]["lessonId"]>;
type MissingQuiz = Exclude<LessonId, (typeof QUIZZES)[number]["lessonId"]>;
const _activitiesCoverLessons: MissingActivity extends never ? true : MissingActivity = true;
const _quizzesCoverLessons: MissingQuiz extends never ? true : MissingQuiz = true;
void _activitiesCoverLessons;
void _quizzesCoverLessons;

export function lessonIds(): LessonId[] {
  return MODULES.flatMap((module) => [...module.lessonIds]);
}

export function moduleForLesson(lessonId: string): ModuleId | null {
  const found = MODULES.find((module) => (module.lessonIds as readonly string[]).includes(lessonId));
  return found?.id ?? null;
}

export function glossaryEntry(id: string) {
  return GLOSSARY.find((entry) => entry.id === id) ?? null;
}
