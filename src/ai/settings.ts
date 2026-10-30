export interface AssistantSettings {
  baseUrl: string;
  model: string;
  apiKey: string;
}

export const OPENAI_PRESET: AssistantSettings = {
  baseUrl: "https://api.openai.com/v1",
  model: "gpt-4o-mini",
  apiKey: "",
};

export const OLLAMA_PRESET: AssistantSettings = {
  baseUrl: "http://127.0.0.1:11434/v1",
  model: "llama3.2",
  apiKey: "",
};

export function emptySettings(): AssistantSettings {
  return { baseUrl: "", model: "", apiKey: "" };
}

export function isLocalBaseUrl(baseUrl: string): boolean {
  try {
    const url = new URL(baseUrl.trim());
    return url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1";
  } catch {
    return false;
  }
}

export function settingsProblem(settings: AssistantSettings): string | null {
  if (!settings.baseUrl.trim() || !settings.model.trim()) {
    return "Choose a provider in Settings. Drawing, saving, and both views work without one.";
  }
  let url: URL;
  try {
    url = new URL(settings.baseUrl.trim());
  } catch {
    return "The base URL is not a valid address.";
  }
  const local = isLocalBaseUrl(settings.baseUrl);
  if (url.protocol !== "https:" && !local) {
    return "Use an https:// address, or http://127.0.0.1 for a model running on this computer.";
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return "The base URL must start with https:// or a local http:// address.";
  }
  if (!local && !settings.apiKey.trim()) {
    return "This provider needs an API key. A model on localhost can leave the key blank.";
  }
  return null;
}

export function configurationGuide(): string {
  return [
    "The assistant is optional. Lintel does not ship with a model key.",
    "Open Settings and either:",
    "• OpenAI-compatible cloud: base URL https://api.openai.com/v1, model gpt-4o-mini, and your API key.",
    "• Local model: base URL http://127.0.0.1:11434/v1 (Ollama), the model name, and no key.",
    "The key stays in the desktop config file, or in this browser profile. It is never saved inside a project.",
    "You can still insert an observed project summary with no model at all.",
  ].join("\n");
}

export function normalizeSettings(value: unknown): AssistantSettings {
  const source = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  return {
    baseUrl: typeof source.baseUrl === "string" ? source.baseUrl.slice(0, 300) : "",
    model: typeof source.model === "string" ? source.model.slice(0, 120) : "",
    apiKey: typeof source.apiKey === "string" ? source.apiKey.slice(0, 400) : "",
  };
}

export function redactSecret(text: string, secret: string): string {
  const trimmed = secret.trim();
  if (!trimmed) return text;
  return text.split(trimmed).join("[redacted]");
}
