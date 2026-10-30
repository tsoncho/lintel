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
          <button type="button" className="btn primary" onClick={() => setNaming(true)}>New project</button>
          <button type="button" className="btn" onClick={() => void openProject()}>Open</button>
        </div>
        <div className="start-actions">
          <button type="button" className="btn" onClick={() => void openSampleProject()}>Open Courtyard Studio</button>
          <button type="button" className="btn" onClick={onLearn}>Learn / Учи</button>
        </div>
      </section>
      <aside className="start-side" aria-label="Recent projects">
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
        {recent.length === 0 && <p className="muted">Projects you save will be listed here.</p>}
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
      <svg className="watermark" viewBox="0 0 640 480" aria-hidden="true">
        <rect x="80" y="90" width="360" height="250" />
        <line x1="80" y1="210" x2="440" y2="210" />
        <line x1="250" y1="90" x2="250" y2="340" />
        <circle cx="80" cy="360" r="16" />
        <circle cx="250" cy="360" r="16" />
        <circle cx="440" cy="360" r="16" />
      </svg>
    </main>
  );
}
