import type { ChatProvider, CompletionRequest, CompletionResponse, ProviderMessage } from "./provider";
import { redactSecret } from "./settings";

interface OpenAIToolCall {
  id?: string;
  function?: { name?: string; arguments?: string };
}

interface OpenAIResponse {
  choices?: { message?: { content?: string | null; tool_calls?: OpenAIToolCall[] } }[];
  error?: { message?: string };
}

export function createOpenAIProvider(): ChatProvider {
  return {
    async complete(request, signal) {
      return completeOpenAI(request, signal);
    },
  };
}

export async function completeOpenAI(request: CompletionRequest, signal?: AbortSignal): Promise<CompletionResponse> {
  const base = request.settings.baseUrl.trim().replace(/\/+$/, "");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (request.settings.apiKey.trim()) headers.Authorization = `Bearer ${request.settings.apiKey.trim()}`;

  let response: Response;
  try {
    response = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers,
      signal,
      body: JSON.stringify({
        model: request.settings.model.trim(),
        temperature: 0.2,
        messages: request.messages.map(toOpenAIMessage),
        tools: request.tools.map((tool) => ({
          type: "function",
          function: { name: tool.name, description: tool.description, parameters: tool.parameters },
        })),
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The provider could not be reached.";
    throw new Error(redactSecret(message, request.settings.apiKey));
  }

  const body = await response.text();
  if (!response.ok) {
    throw new Error(redactSecret(`Provider responded ${response.status}: ${trimBody(body)}`, request.settings.apiKey));
  }

  let parsed: OpenAIResponse;
  try {
    parsed = JSON.parse(body) as OpenAIResponse;
  } catch {
    throw new Error("The provider returned a response that was not JSON.");
  }
  if (parsed.error?.message) throw new Error(redactSecret(parsed.error.message, request.settings.apiKey));

  const message = parsed.choices?.[0]?.message;
  const toolCalls = (message?.tool_calls ?? []).map((call, index) => ({
    id: call.id || `call_${index}`,
    name: call.function?.name || "",
    arguments: parseArguments(call.function?.arguments),
  }));
  return { text: message?.content?.trim() ?? "", toolCalls };
}

export function toOpenAIMessage(message: ProviderMessage): Record<string, unknown> {
  if (message.role === "tool") {
    return { role: "tool", tool_call_id: message.toolCallId, content: message.content };
  }
  if (message.role === "assistant" && "toolCalls" in message) {
    return {
      role: "assistant",
      content: message.content || null,
      tool_calls: message.toolCalls.map((call) => ({
        id: call.id,
        type: "function",
        function: { name: call.name, arguments: call.arguments },
      })),
    };
  }
  return { role: message.role, content: message.content };
}

function parseArguments(raw: string | undefined): unknown {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return { __parseError: "Tool arguments were not valid JSON." };
  }
}

function trimBody(body: string): string {
  const compact = body.replace(/\s+/g, " ").trim();
  return compact.length > 280 ? `${compact.slice(0, 280)}…` : compact || "No details were returned.";
}
