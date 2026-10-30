import { useEffect, useState } from "react";
import { browserStorage, clearRecovery, readRecent, readRecovery, type RecentEntry, type RecoveryRecord } from "../persistence/library";
import { createNamed, openProject, openSampleProject, openStored, restoreRecovery } from "../platform/session";
import { APP_VERSION } from "../version";
import { Mark } from "./Mark";
import { Modal } from "./Modal";

export function StartScreen({ onLearn }: { onLearn: () => void }) {
  const [recent, setRecent] = useState<RecentEntry[]>([]);
  const [recovery, setRecovery] = useState<RecoveryRecord | null>(null);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("Untitled");

  useEffect(() => {
    const store = browserStorage();
    if (!store) return;
    setRecent(readRecent(store));
    setRecovery(readRecovery(store));
  }, []);

  return (
    <main className="start">
      <section className="start-hero">
        <Mark size={42} />
        <p className="eyebrow">Architectural model studio</p>
        <h1>Lintel</h1>
        <p className="lede">
          Draw a plan, look at the same building in 3D, and keep the model in a file you can reopen.
        </p>
        <p className="start-facts">North is up · Distances stay in millimeters · Plan, 3D, and section share one model</p>
        <div className="start-actions">
          <button type="button" className="btn primary start-create" onClick={() => setNaming(true)}>New project</button>
          <button type="button" className="btn" onClick={() => void openProject()}>Open</button>
        </div>
        <div className="start-entries">
          <button type="button" className="start-entry" onClick={() => void openSampleProject()}>
            <span>Sample</span>
            <strong>Courtyard Studio</strong>
            <small>A two-storey model you can inspect and edit.</small>
          </button>
          <button type="button" className="start-entry" onClick={onLearn}>
            <span>Course</span>
            <strong>Learn / Учи</strong>
            <small>Architecture basics in English and Bulgarian.</small>
          </button>
        </div>
      </section>
      <aside className="start-side" aria-label="Recent projects">
        <div className="start-sheet" aria-hidden="true">
          <svg viewBox="0 0 360 220">
            <rect x="18" y="18" width="324" height="184" />
            <rect x="58" y="42" width="200" height="136" />
            <line x1="158" y1="42" x2="158" y2="178" />
            <line x1="58" y1="108" x2="258" y2="108" />
            <path d="M108 178 A28 28 0 0 1 136 150" />
            <rect x="214" y="70" width="18" height="28" />
            <rect x="214" y="122" width="18" height="28" />
            <circle cx="58" cy="188" r="8" />
            <circle cx="158" cy="188" r="8" />
            <circle cx="258" cy="188" r="8" />
            <text x="58" y="188">A</text>
            <text x="158" y="188">B</text>
            <text x="258" y="188">C</text>
            <path d="M300 48 V78" />
            <path d="M300 48 L294 58 L306 58 Z" />
            <text x="292" y="92">N</text>
          </svg>
        </div>
        <h2>Recent</h2>
        {recovery && (
          <div className="recovery">
            <strong>Unsaved work</strong>
            <p>{recovery.name} · {new Date(recovery.savedAt).toLocaleString()}</p>
            <div className="row">
              <button type="button" className="btn primary" onClick={() => void restoreRecovery(recovery.contents, recovery.path)}>Restore</button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  const store = browserStorage();
                  if (store) clearRecovery(store);
                  setRecovery(null);
                }}
              >
                Discard
              </button>
            </div>
          </div>
        )}
        {recent.length === 0 && (
          <p className="start-empty">No saved projects yet. A new project or Courtyard Studio will show up here after you save.</p>
        )}
        <ul className="recent-list">
          {recent.map((entry) => (
            <li key={entry.path}>
              <button type="button" onClick={() => void openStored(entry.path)}>
                <span>{entry.name}</span>
                <small>{entry.path.startsWith("browser:") ? "In this browser" : entry.path}</small>
              </button>
            </li>
          ))}
        </ul>
        <p className="start-foot">Lintel {APP_VERSION} · Plan X east, Y north</p>
      </aside>
      {naming && (
        <Modal title="New project" onClose={() => setNaming(false)}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setNaming(false);
              void createNamed(name.trim() || "Untitled");
            }}
          >
            <label className="field">
              <span>Name</span>
              <input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} />
            </label>
            <div className="row end">
              <button type="button" className="btn" onClick={() => setNaming(false)}>Cancel</button>
              <button type="submit" className="btn primary">Create</button>
            </div>
          </form>
        </Modal>
      )}
    </main>
  );
}
