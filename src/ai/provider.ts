import type { AssistantSettings } from "./settings";

export interface ToolSchema {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ProviderToolCall {
  id: string;
  name: string;
  arguments: unknown;
}

export type ProviderMessage =
  | { role: "system" | "user" | "assistant"; content: string }
  | { role: "assistant"; content: string; toolCalls: { id: string; name: string; arguments: string }[] }
  | { role: "tool"; toolCallId: string; content: string };

export interface CompletionRequest {
  settings: AssistantSettings;
  messages: ProviderMessage[];
  tools: ToolSchema[];
}

export interface CompletionResponse {
  text: string;
  toolCalls: ProviderToolCall[];
}

/** Provider-neutral chat completion. Implementations must not receive the project file. */
export interface ChatProvider {
  complete(request: CompletionRequest, signal?: AbortSignal): Promise<CompletionResponse>;
}
