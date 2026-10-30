export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface RecentEntry {
  path: string;
  name: string;
  updatedAt: string;
}

export interface BrowserProject {
  id: string;
  path: string;
  name: string;
  updatedAt: string;
  contents: string;
}

export interface RecoveryRecord {
  savedAt: string;
  path: string | null;
  name: string;
  contents: string;
}

export const STORAGE_KEYS = {
  recent: "lintel.recent",
  browserProjects: "lintel.browserProjects",
  recovery: "lintel.recovery",
  settings: "lintel.assistantSettings",
  panels: "lintel.panels",
} as const;

const RECENT_LIMIT = 8;
const BROWSER_LIMIT = 12;

export function readRecent(store: KeyValueStore): RecentEntry[] {
  return readJson(store, STORAGE_KEYS.recent, []);
}

export function rememberRecent(store: KeyValueStore, entry: RecentEntry): RecentEntry[] {
  const next = [entry, ...readRecent(store).filter((item) => item.path !== entry.path)].slice(0, RECENT_LIMIT);
  store.setItem(STORAGE_KEYS.recent, JSON.stringify(next));
  return next;
}

export function readBrowserProjects(store: KeyValueStore): BrowserProject[] {
  return readJson(store, STORAGE_KEYS.browserProjects, []);
}

export function saveBrowserProject(store: KeyValueStore, project: BrowserProject): void {
  const next = [project, ...readBrowserProjects(store).filter((item) => item.id !== project.id)].slice(0, BROWSER_LIMIT);
  store.setItem(STORAGE_KEYS.browserProjects, JSON.stringify(next));
  rememberRecent(store, { path: project.path, name: project.name, updatedAt: project.updatedAt });
}

export function browserProject(store: KeyValueStore, path: string): BrowserProject | null {
  return readBrowserProjects(store).find((item) => item.path === path) ?? null;
}

export function writeRecovery(store: KeyValueStore, record: RecoveryRecord): void {
  store.setItem(STORAGE_KEYS.recovery, JSON.stringify(record));
}

export function readRecovery(store: KeyValueStore): RecoveryRecord | null {
  const record = readJson<RecoveryRecord | null>(store, STORAGE_KEYS.recovery, null);
  if (!record || typeof record.contents !== "string" || typeof record.savedAt !== "string") return null;
  return record;
}

export function clearRecovery(store: KeyValueStore): void {
  store.removeItem(STORAGE_KEYS.recovery);
}

export function memoryStore(initial: Record<string, string> = {}): KeyValueStore {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
}

export function browserStorage(): KeyValueStore | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

function readJson<T>(store: KeyValueStore, key: string, fallback: T): T {
  const text = store.getItem(key);
  if (!text) return fallback;
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

export function fileNameForProject(name: string): string {
  const cleaned = name.replace(/[<>:"/\\|?*\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim();
  return `${cleaned || "Untitled"}.lintel`;
}

export function browserPath(id: string): string {
  return `browser:${id}`;
}
