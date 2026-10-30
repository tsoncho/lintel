import { emptySettings, normalizeSettings, type AssistantSettings } from "../ai/settings";
import { browserStorage, STORAGE_KEYS } from "../persistence/library";

export function isDesktop(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

async function invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  const module = await import("@tauri-apps/api/core");
  return module.invoke<T>(command, args);
}

export async function pickOpenPath(): Promise<string | null> {
  return invoke<string | null>("pick_open_path");
}

export async function pickSavePath(suggested: string): Promise<string | null> {
  return invoke<string | null>("pick_save_path", { suggested });
}

export async function readTextFile(path: string): Promise<string> {
  return invoke<string>("read_project_file", { path });
}

export async function writeTextFile(path: string, contents: string): Promise<void> {
  await invoke("write_project_file", { path, contents });
}

export async function loadAssistantSettings(): Promise<AssistantSettings> {
  if (isDesktop()) {
    try {
      const text = await invoke<string>("read_settings");
      return normalizeSettings(JSON.parse(text) as unknown);
    } catch {
      return emptySettings();
    }
  }
  return readLocalSettings();
}

export async function saveAssistantSettings(settings: AssistantSettings): Promise<void> {
  const payload = JSON.stringify({
    baseUrl: settings.baseUrl.trim(),
    model: settings.model.trim(),
    apiKey: settings.apiKey,
  });
  if (isDesktop()) {
    await invoke("write_settings", { contents: payload });
    return;
  }
  const store = browserStorage();
  if (!store) throw new Error("This browser cannot store assistant settings.");
  store.setItem(STORAGE_KEYS.settings, payload);
}

function readLocalSettings(): AssistantSettings {
  const store = browserStorage();
  const text = store?.getItem(STORAGE_KEYS.settings);
  if (!text) return emptySettings();
  try {
    return normalizeSettings(JSON.parse(text) as unknown);
  } catch {
    return emptySettings();
  }
}

export function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function pickBrowserFile(): Promise<{ name: string; text: string } | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".lintel,.json,application/json";
    let settled = false;
    const finish = (value: { name: string; text: string } | null) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        finish(null);
        return;
      }
      finish({ name: file.name, text: await file.text() });
    };
    window.addEventListener("focus", () => {
      window.setTimeout(() => {
        if (!input.files?.length) finish(null);
      }, 400);
    }, { once: true });
    input.click();
  });
}
