import { useEffect, useState } from "react";
import { createOpenAIProvider } from "../ai/openai";
import { runAssistantTurn } from "../ai/run";
import { configurationGuide, OLLAMA_PRESET, OPENAI_PRESET, settingsProblem, type AssistantSettings } from "../ai/settings";
import { commitProposal, type ModelEdit } from "../ai/tools";
import { summarizeProject } from "../domain/queries";
import { ok } from "../domain/result";
import { loadAssistantSettings, saveAssistantSettings } from "../platform/files";
import { editor, useEditor } from "../state/editor";
import { Modal } from "./Modal";

interface ChatEntry {
  id: string;
  role: "user" | "assistant" | "note";
  text: string;
  observed?: boolean;
  proposal?: {
    kind: "edit" | "undo_assistant";
    summary: string;
    detail: string;
    edit?: ModelEdit;
    affectedIds?: string[];
    status: "pending" | "applied" | "dismissed" | "failed";
    note?: string;
  };
}

export function Assistant({ onOpenSettings }: { onOpenSettings: () => void }) {
  const state = useEditor();
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [settings, setSettings] = useState<AssistantSettings | null>(null);

  useEffect(() => {
    void loadAssistantSettings().then(setSettings);
  }, [state.sessionId]);

  const problem = settings ? settingsProblem(settings) : "Checking assistant settings…";

  const send = async () => {
    const text = draft.trim();
    const project = editor.getState().project;
    if (!text || !project || !settings || busy) return;
    setDraft("");
    const history = entries.filter((entry) => entry.role === "user" || entry.role === "assistant").map((entry) => ({
      role: entry.role as "user" | "assistant",
      text: entry.text,
    }));
    setEntries((current) => [...current, { id: crypto.randomUUID(), role: "user", text }]);
    setBusy(true);
    const turn = await runAssistantTurn({
      provider: createOpenAIProvider(),
      settings,
      project,
      selection: editor.getState().selection,
      history,
      userText: text,
    });
    setBusy(false);
    setEntries((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        text: turn.error ? turn.error : turn.text || (turn.proposal ? "Review this change. It is not applied yet." : "No reply."),
        observed: turn.observed,
        proposal: turn.proposal
          ? {
            kind: turn.proposal.kind,
            summary: turn.proposal.summary,
            detail: turn.proposal.detail,
            edit: turn.proposal.kind === "edit" ? turn.proposal.edit : undefined,
            affectedIds: turn.proposal.kind === "edit" ? turn.proposal.affectedIds : undefined,
            status: "pending",
          }
          : undefined,
      },
    ]);
  };

  const resolve = (id: string, accept: boolean) => {
    setEntries((current) => current.map((entry) => {
      if (entry.id !== id || !entry.proposal || entry.proposal.status !== "pending") return entry;
      if (!accept) return { ...entry, proposal: { ...entry.proposal, status: "dismissed" } };
      const project = editor.getState().project;
      if (!project) return { ...entry, proposal: { ...entry.proposal, status: "failed", note: "No project is open." } };
      if (entry.proposal.kind === "undo_assistant") {
        const undone = editor.undoAssistant();
        return { ...entry, proposal: { ...entry.proposal, status: undone ? "applied" : "failed", note: editor.getState().status } };
      }
      if (!entry.proposal.edit) {
        return { ...entry, proposal: { ...entry.proposal, status: "failed", note: "The edit was missing." } };
      }
      const result = commitProposal(project, {
        summary: entry.proposal.summary,
        detail: entry.proposal.detail,
        edit: entry.proposal.edit,
        affectedIds: entry.proposal.affectedIds ?? [],
      }, true);
      if (!result.ok) {
        editor.setStatus(result.error, "error");
        return { ...entry, proposal: { ...entry.proposal, status: "failed", note: result.error } };
      }
      editor.apply(entry.proposal.summary, "assistant", ok(result.value));
      return { ...entry, proposal: { ...entry.proposal, status: "applied", note: "Applied. Undo is available." } };
    }));
  };

  return (
    <section className="assistant" aria-label="Assistant">
      <header>
        <h2>Assistant</h2>
        <button type="button" className="btn tiny" onClick={onOpenSettings}>Settings</button>
      </header>
      <div className="assistant-log">
        {entries.length === 0 && (
          <div className="assistant-empty">
            <p>{problem ?? "Ask about the open project, or propose one edit at a time."}</p>
            {problem && <pre>{configurationGuide()}</pre>}
          </div>
        )}
        {entries.map((entry) => (
          <article key={entry.id} className={`bubble ${entry.role}`}>
            <p>{entry.text}</p>
            {entry.role === "assistant" && (
              <p className="observe">{entry.observed ? "Checked against the project" : "Not checked with a tool — treat numbers here as the model’s wording"}</p>
            )}
            {entry.proposal && entry.proposal.status === "pending" && (
              <div className="proposal">
                <strong>{entry.proposal.summary}</strong>
                <p>{entry.proposal.detail}</p>
                <div className="row">
                  <button type="button" className="btn primary" onClick={() => resolve(entry.id, true)}>Apply</button>
                  <button type="button" className="btn" onClick={() => resolve(entry.id, false)}>Dismiss</button>
                </div>
              </div>
            )}
            {entry.proposal && entry.proposal.status !== "pending" && (
              <p className="meta">{entry.proposal.status === "applied" ? "Applied" : entry.proposal.status === "dismissed" ? "Dismissed" : "Not applied"}{entry.proposal.note ? ` — ${entry.proposal.note}` : ""}</p>
            )}
          </article>
        ))}
        {busy && <p className="muted">Asking the model…</p>}
      </div>
      <div className="assistant-compose">
        <button
          type="button"
          className="btn tiny"
          onClick={() => {
            const project = editor.getState().project;
            if (!project) return;
            const summary = summarizeProject(project, editor.getState().selection);
            const lines = [
              `${summary.name}. Internal unit: millimeters. Display unit: ${summary.displayUnit}.`,
              `Stories: ${summary.stories.map((story) => `${story.name} at ${story.elevationMm} mm`).join("; ") || "none"}.`,
              `Counts: ${Object.entries(summary.counts).map(([key, count]) => `${count} ${key}`).join(", ") || "none"}.`,
              summary.calculatedRoomAreaM2.length
                ? `Room areas from outlines: ${summary.calculatedRoomAreaM2.map((room) => `${room.name} ${room.areaM2} m²`).join(", ")}.`
                : "No room outlines.",
              summary.notes[0],
            ];
            setEntries((current) => [...current, { id: crypto.randomUUID(), role: "note", text: lines.join("\n"), observed: true }]);
          }}
        >
          Insert observed summary
        </button>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
        >
          <label className="sr-only" htmlFor="assistant-input">Message</label>
          <textarea
            id="assistant-input"
            value={draft}
            rows={2}
            placeholder={problem ? "Configure a model in Settings to chat" : "Ask about this project"}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
          />
          <button type="submit" className="btn primary" disabled={busy || !draft.trim()}>Send</button>
        </form>
      </div>
    </section>
  );
}

export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useState<AssistantSettings>(OPENAI_PRESET);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void loadAssistantSettings().then((loaded) => {
      if (loaded.baseUrl || loaded.model || loaded.apiKey) setSettings(loaded);
    });
  }, []);
  return (
    <Modal title="Assistant settings" onClose={onClose}>
      <p className="meta">The key is stored outside the project file. On the desktop app it goes in the user config folder. In the browser it stays in local storage.</p>
      <div className="row">
        <button type="button" className="btn tiny" onClick={() => setSettings({ ...OPENAI_PRESET, apiKey: settings.apiKey })}>OpenAI preset</button>
        <button type="button" className="btn tiny" onClick={() => setSettings(OLLAMA_PRESET)}>Local Ollama preset</button>
      </div>
      <label className="field">
        <span>Base URL</span>
        <input value={settings.baseUrl} onChange={(event) => setSettings({ ...settings, baseUrl: event.target.value })} placeholder="https://api.openai.com/v1" />
      </label>
      <label className="field">
        <span>Model</span>
        <input value={settings.model} onChange={(event) => setSettings({ ...settings, model: event.target.value })} placeholder="gpt-4o-mini" />
      </label>
      <label className="field">
        <span>API key</span>
        <input type="password" value={settings.apiKey} autoComplete="off" onChange={(event) => setSettings({ ...settings, apiKey: event.target.value })} />
        <small>Leave blank for a model on this computer.</small>
      </label>
      {error && <p className="error-text">{error}</p>}
      <div className="row end">
        <button type="button" className="btn" onClick={onClose}>Cancel</button>
        <button
          type="button"
          className="btn primary"
          onClick={() => {
            void saveAssistantSettings(settings).then(() => onClose()).catch((reason: unknown) => {
              setError(reason instanceof Error ? reason.message : "Could not store settings.");
            });
          }}
        >
          Save settings
        </button>
      </div>
    </Modal>
  );
}
