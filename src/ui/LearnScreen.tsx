import { useEffect, useState, useSyncExternalStore } from "react";
import { editor } from "../state/editor";
import { createNamed, openSampleProject } from "../platform/session";
import { bg } from "../learn/copy/bg";
import { en } from "../learn/copy/en";
import {
  actionLabelKey,
  activityFor,
  canComplete,
  completion,
  continueTarget,
  courseMinutes,
  isKnownLesson,
  moduleProgress,
  neighbor,
  practiceProjectName,
  quizzesFor,
  REFLECTION_MIN,
  termPair,
  termsFor,
} from "../learn/course";
import { ACTIVITIES, MODULES } from "../learn/curriculum";
import type { LearnAction, Locale } from "../learn/curriculum";
import { formatCount } from "../learn/count";
import { searchGlossary } from "../learn/search";
import { learnStore } from "../learn/store";
import { validateCourse } from "../learn/validate";
import { Modal } from "./Modal";

const COPIES = { en, bg };

function choiceText(choices: object, id: string): string {
  return (choices as Record<string, string>)[id] ?? "";
}

function readActions(activity: (typeof ACTIVITIES)[number]): { primary?: LearnAction; secondary?: LearnAction } {
  const record = activity as { action?: LearnAction; secondaryAction?: LearnAction };
  return { primary: record.action, secondary: record.secondaryAction };
}

export function LearnScreen({ onClose }: { onClose: () => void }) {
  const state = useSyncExternalStore(learnStore.subscribe, learnStore.get, learnStore.get);
  const progress = state.progress;
  const locale = progress.locale;
  const copy = COPIES[locale];
  const ui = copy.ui;
  const [query, setQuery] = useState("");
  const [resetting, setResetting] = useState(false);
  const issues = validateCourse(copy, locale);
  const counts = completion(progress);
  const lessonId = isKnownLesson(progress.lessonId) ? progress.lessonId : null;

  useEffect(() => {
    const previousLang = document.documentElement.lang;
    const previousTitle = document.title;
    document.documentElement.lang = locale;
    document.title = `${ui.title} · Lintel`;
    return () => {
      document.documentElement.lang = previousLang;
      document.title = previousTitle;
    };
  }, [locale, ui.title]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !resetting) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, resetting]);

  const setLocale = (next: Locale) => {
    setQuery("");
    learnStore.setLocale(next);
  };

  const runAction = async (action: LearnAction) => {
    if (state.mode === "newer") return;
    onClose();
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    const opened = action === "new-practice-project"
      ? await createNamed(practiceProjectName(locale))
      : await openSampleProject();
    if (!opened) return;
    if (action === "open-sample-model") editor.setView("model");
    else if (action === "open-sample-section") editor.setView("section");
    else editor.setView("plan");
  };

  return (
    <div className="learn">
      <header className="learn-bar">
        <p className="learn-brand">Lintel</p>
        <h1>{ui.title}</h1>
        <div className="lang-switch" role="radiogroup" aria-label={ui.language}>
          <button type="button" role="radio" aria-checked={locale === "en"} onClick={() => setLocale("en")}>{ui.english}</button>
          <button type="button" role="radio" aria-checked={locale === "bg"} onClick={() => setLocale("bg")}>{ui.bulgarian}</button>
        </div>
        <p className="learn-progress" aria-label={ui.progressLabel}>
          {counts.done} / {counts.total}
        </p>
        <button type="button" className="btn tiny learn-close" onClick={onClose}>{ui.close}</button>
      </header>
      {state.mode === "newer" && <p className="learn-banner" role="status">{ui.newerProgress}</p>}
      {issues.length > 0 && (
        <div className="learn-banner" role="alert">
          <p>Missing translation</p>
          <ul>{issues.slice(0, 8).map((issue) => <li key={issue}>{issue}</li>)}</ul>
        </div>
      )}
      <div className="learn-body">
        <nav className="learn-nav" aria-label={ui.courseNav}>
          <button type="button" className={progress.view === "overview" ? "nav-item active" : "nav-item"} onClick={() => learnStore.patch({ view: "overview" })}>{ui.overview}</button>
          <button type="button" className={progress.view === "glossary" ? "nav-item active" : "nav-item"} onClick={() => learnStore.patch({ view: "glossary" })}>{ui.glossary}</button>
          <h2>{ui.lessonNav}</h2>
          {MODULES.map((module) => {
            const moduleCounts = moduleProgress(progress, module.id);
            return (
              <section key={module.id}>
                <h3>{copy.modules[module.id].title}</h3>
                <p className="meta">{moduleCounts.done}/{moduleCounts.total} · {module.minutes} {ui.minutesShort}</p>
                <ul>
                  {module.lessonIds.map((id) => (
                    <li key={id}>
                      <button
                        type="button"
                        className="nav-item child"
                        aria-current={progress.view === "lesson" && progress.lessonId === id ? "page" : undefined}
                        onClick={() => learnStore.patch({ view: "lesson", lessonId: id })}
                      >
                        <span>{copy.lessons[id].title}</span>
                        {progress.completed.includes(id) ? <small>{ui.done}</small> : null}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </nav>
        <main className="learn-main" id="learn-main">
          {progress.view === "glossary" ? (
            <GlossaryView locale={locale} query={query} onQuery={setQuery} />
          ) : progress.view === "lesson" && lessonId ? (
            <LessonView lessonId={lessonId} onAction={(action) => void runAction(action)} />
          ) : progress.view === "lesson" ? (
            <div className="learn-reading">
              <p>{ui.missingLesson}</p>
              <button type="button" className="btn" onClick={() => learnStore.patch({ view: "overview" })}>{ui.backOverview}</button>
            </div>
          ) : (
            <Overview onContinue={() => {
              const target = continueTarget(progress);
              learnStore.patch({ view: "lesson", lessonId: target });
            }} onReset={() => setResetting(true)} />
          )}
        </main>
      </div>
      {resetting && (
        <Modal title={ui.resetTitle} onClose={() => setResetting(false)} closeLabel={ui.close}>
          <p>{ui.resetBody}</p>
          <div className="row end">
            <button type="button" className="btn" onClick={() => setResetting(false)}>{ui.cancel}</button>
            <button
              type="button"
              className="btn danger"
              onClick={() => {
                learnStore.reset(locale);
                setResetting(false);
              }}
            >
              {ui.resetConfirm}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Overview({ onContinue, onReset }: { onContinue: () => void; onReset: () => void }) {
  const state = useSyncExternalStore(learnStore.subscribe, learnStore.get, learnStore.get);
  const copy = COPIES[state.progress.locale];
  const ui = copy.ui;
  const counts = completion(state.progress);
  return (
    <div className="learn-reading">
      <p className="eyebrow">{ui.duration} · {ui.aboutHours} · {courseMinutes()} {ui.minutesShort}</p>
      <p className="lede">{ui.intro}</p>
      <p>{formatCount(state.progress.locale, MODULES.length, ui.moduleForms)} · {formatCount(state.progress.locale, counts.total, ui.lessonForms)} · {counts.done} / {counts.total}</p>
      <p className="learn-note">{ui.disclaimer}</p>
      <p className="meta">{ui.savedHere}</p>
      <div className="row">
        <button type="button" className="btn primary" onClick={onContinue}>{ui.continue}</button>
      </div>
      {MODULES.map((module) => (
        <section key={module.id} className="learn-module">
          <h2>{copy.modules[module.id].title}</h2>
          <p>{copy.modules[module.id].summary}</p>
          <h3>{ui.objectives}</h3>
          <ul>{copy.modules[module.id].objectives.map((objective) => <li key={objective}>{objective}</li>)}</ul>
        </section>
      ))}
      <button type="button" className="btn danger" onClick={onReset} disabled={state.mode === "newer"}>{ui.reset}</button>
    </div>
  );
}

function LessonView({ lessonId, onAction }: { lessonId: (typeof MODULES)[number]["lessonIds"][number]; onAction: (action: LearnAction) => void }) {
  const state = useSyncExternalStore(learnStore.subscribe, learnStore.get, learnStore.get);
  const progress = state.progress;
  const copy = COPIES[progress.locale];
  const ui = copy.ui;
  const lesson = copy.lessons[lessonId];
  const activity = activityFor(lessonId);
  const activityCopy = ACTIVITIES.find((item) => item.lessonId === lessonId);
  const quizzes = quizzesFor(lessonId);
  const order = MODULES.flatMap((module) => [...module.lessonIds]);
  const index = order.indexOf(lessonId);
  const done = progress.completed.includes(lessonId);
  const ready = canComplete(progress, lessonId);
  const note = progress.notes[lessonId] ?? "";
  const previous = neighbor(lessonId, -1);
  const next = neighbor(lessonId, 1);
  const actions = activityCopy ? readActions(activityCopy) : {};

  return (
    <article className="learn-reading">
      <p className="meta">{index + 1} / {order.length}{done ? ` · ${ui.completed}` : ""}</p>
      <h2>{lesson.title}</h2>
      <p>{lesson.summary}</p>
      <h3>{ui.objectives}</h3>
      <ul>{lesson.objectives.map((objective) => <li key={objective}>{objective}</li>)}</ul>
      {lesson.sections.map((section) => (
        <section key={section.heading}>
          <h3>{section.heading}</h3>
          {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </section>
      ))}
      <h3>{ui.vocabulary}</h3>
      <ul className="term-list">
        {termsFor(lessonId).map((entry) => (
          <li key={entry.id}>
            <strong className="term-pair">{termPair(entry, progress.locale)}</strong>
            <span>{copy.glossary[entry.id]}</span>
          </li>
        ))}
      </ul>
      <h3>{ui.check}</h3>
      {quizzes.map((quiz) => {
        const text = copy.quizzes[quiz.id];
        const chosen = progress.answers[quiz.id];
        const correct = chosen === quiz.correctId;
        return (
          <fieldset key={quiz.id} className="quiz" disabled={state.mode === "newer"}>
            <legend>{text.prompt}</legend>
            {quiz.choiceIds.map((choiceId) => (
              <label key={choiceId} className="quiz-choice">
                <input
                  type="radio"
                  name={quiz.id}
                  value={choiceId}
                  checked={chosen === choiceId}
                  onChange={() => learnStore.patch({ answers: { ...progress.answers, [quiz.id]: choiceId } })}
                />
                <span>{choiceText(text.choices, choiceId)}</span>
              </label>
            ))}
            {chosen && (
              <p className={correct ? "feedback ok" : "feedback"} role="status">
                <strong>{correct ? ui.correctLabel : ui.incorrectLabel}</strong>{" "}
                {correct ? text.correct : text.incorrect}
              </p>
            )}
          </fieldset>
        );
      })}
      {activity && activityCopy && (
        <section className="learn-activity">
          <h3>{ui.activity}</h3>
          <p className="eyebrow">{activity.kind === "lintel" ? ui.modelLabel : ui.paperLabel}</p>
          <h4>{lesson.activity.title}</h4>
          <p>{lesson.activity.instructions}</p>
          <ol>{lesson.activity.steps.map((step) => <li key={step}>{step}</li>)}</ol>
          <p className="learn-note"><strong>{ui.hint}.</strong> {lesson.activity.hint}</p>
          <div className="row">
            {actions.primary && (
              <button type="button" className="btn primary" onClick={() => onAction(actions.primary!)}>{ui[actionLabelKey(actions.primary)]}</button>
            )}
            {actions.secondary && (
              <button type="button" className="btn" onClick={() => onAction(actions.secondary!)}>{ui[actionLabelKey(actions.secondary)]}</button>
            )}
          </div>
          {(actions.primary || actions.secondary) && <p className="meta">{ui.actionNote}</p>}
          {activity.kind === "reflection" ? (
            <label className="field">
              <span>{lesson.activity.title}</span>
              <textarea
                value={note}
                rows={5}
                maxLength={4000}
                disabled={state.mode === "newer"}
                placeholder={ui.reflectionPlaceholder}
                onChange={(event) => learnStore.patch({ notes: { ...progress.notes, [lessonId]: event.target.value } })}
              />
              {note.trim().length > 0 && note.trim().length < REFLECTION_MIN && <small>{ui.reflectionShort}</small>}
            </label>
          ) : (
            <label className="quiz-choice">
              <input
                type="checkbox"
                disabled={state.mode === "newer"}
                checked={progress.checks[activity.id] === true}
                onChange={(event) => learnStore.patch({ checks: { ...progress.checks, [activity.id]: event.target.checked } })}
              />
              <span>{ui.acknowledge}</span>
            </label>
          )}
        </section>
      )}
      <div className="row learn-pager">
        <button type="button" className="btn" disabled={!previous} onClick={() => previous && learnStore.patch({ view: "lesson", lessonId: previous })}>{ui.previous}</button>
        <button
          type="button"
          className="btn primary"
          disabled={!ready || done || state.mode === "newer"}
          onClick={() => learnStore.patch({ completed: progress.completed.includes(lessonId) ? progress.completed : [...progress.completed, lessonId] })}
        >
          {done ? ui.completed : ui.markComplete}
        </button>
        <button type="button" className="btn" disabled={!next} onClick={() => next && learnStore.patch({ view: "lesson", lessonId: next })}>{ui.next}</button>
      </div>
    </article>
  );
}

function GlossaryView({ locale, query, onQuery }: { locale: Locale; query: string; onQuery: (value: string) => void }) {
  const copy = COPIES[locale];
  const ui = copy.ui;
  const hits = searchGlossary(copy, locale, query);
  return (
    <div className="learn-reading">
      <h2>{ui.glossary}</h2>
      <label className="field">
        <span>{ui.searchLabel}</span>
        <input value={query} onChange={(event) => onQuery(event.target.value)} placeholder={ui.searchPlaceholder} />
      </label>
      {hits.length === 0 && <p>{ui.noMatches}</p>}
      <ul className="term-list">
        {hits.map((hit) => (
          <li key={hit.id}>
            <strong className="term-pair">{locale === "bg" ? `${hit.bg} / ${hit.en}` : `${hit.en} / ${hit.bg}`}</strong>
            <span>{hit.definition}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
