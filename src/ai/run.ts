import { summarizeProject } from "../domain/queries";
import type { Project } from "../domain/types";
import type { ChatProvider, ProviderMessage } from "./provider";
import type { AssistantSettings } from "./settings";
import { settingsProblem } from "./settings";
import { parseToolCall, runReadTool, TOOL_SCHEMAS, type AssistantProposal } from "./tools";

export interface AssistantTurn {
  text: string;
  observed: boolean;
  toolsUsed: string[];
  proposal?: AssistantProposal;
  error?: string;
}

const MAX_ROUNDS = 4;

export async function runAssistantTurn(input: {
  provider: ChatProvider;
  settings: AssistantSettings;
  project: Project;
  selection: string[];
  history: { role: "user" | "assistant"; text: string }[];
  userText: string;
  signal?: AbortSignal;
}): Promise<AssistantTurn> {
  const problem = settingsProblem(input.settings);
  if (problem) return { text: "", observed: false, toolsUsed: [], error: problem };

  const messages: ProviderMessage[] = [
    { role: "system", content: systemPrompt(input.project, input.selection) },
    ...input.history.slice(-8).map((item) => ({ role: item.role, content: item.text }) as const),
    { role: "user", content: input.userText },
  ];

  const toolsUsed: string[] = [];
  let proposal: AssistantProposal | undefined;
  let lastText = "";

  try {
    for (let round = 0; round < MAX_ROUNDS; round += 1) {
      const response = await input.provider.complete(
        { settings: input.settings, messages, tools: TOOL_SCHEMAS },
        input.signal,
      );
      lastText = response.text || lastText;
      if (!response.toolCalls.length) {
        return { text: response.text, observed: toolsUsed.length > 0, toolsUsed, proposal };
      }

      messages.push({
        role: "assistant",
        content: response.text,
        toolCalls: response.toolCalls.map((call) => ({
          id: call.id,
          name: call.name,
          arguments: JSON.stringify(call.arguments ?? {}),
        })),
      });

      for (const call of response.toolCalls) {
        toolsUsed.push(call.name);
        const parsed = parseToolCall(call.name, call.arguments, input.project);
        if (!parsed.ok) {
          messages.push({ role: "tool", toolCallId: call.id, content: JSON.stringify({ error: parsed.error }) });
          continue;
        }
        if (parsed.value.name === "propose_model_edit") {
          proposal = { kind: "edit", ...parsed.value.proposal };
          messages.push({
            role: "tool",
            toolCallId: call.id,
            content: JSON.stringify({
              status: "waiting_for_user_confirmation",
              detail: parsed.value.proposal.detail,
              note: "The project has not changed.",
            }),
          });
          return {
            text: response.text,
            observed: true,
            toolsUsed,
            proposal,
          };
        }
        if (parsed.value.name === "undo_last_assistant_edit") {
          proposal = {
            kind: "undo_assistant",
            summary: "Undo the last assistant edit",
            detail: "This undoes only the latest change, and only when that change was made by the assistant.",
          };
          return { text: response.text, observed: true, toolsUsed, proposal };
        }
        const result = runReadTool(input.project, input.selection, parsed.value);
        messages.push({
          role: "tool",
          toolCallId: call.id,
          content: JSON.stringify(result.ok ? result.value : { error: result.error }).slice(0, 100_000),
        });
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "The assistant request failed.";
    return { text: lastText, observed: toolsUsed.length > 0, toolsUsed, error: message };
  }

  return {
    text: lastText || "The assistant stopped before it finished. Try a narrower question.",
    observed: toolsUsed.length > 0,
    toolsUsed,
    proposal,
  };
}

function systemPrompt(project: Project, selection: string[]): string {
  const summary = summarizeProject(project, selection);
  return [
    "You are the assistant inside Lintel, an architectural modeling application.",
    "Use tools for any count, area, length, or element id. Do not invent those.",
    "Room areas and wall areas reported by tools are calculated from stored geometry. Say that. Do not produce cost, code, or compliance claims.",
    "Coordinates and lengths in tool arguments are millimeters. X is east, Y is north, elevations go up.",
    "You cannot run shell commands, code, SQL, or file operations. You cannot edit roofs, stairs, sheets, or materials libraries.",
    "Model edits must go through propose_model_edit. Never say an edit was applied. The user confirms it.",
    "If a request is outside the tools, say this version does not support it.",
    "Observed project summary at send time:",
    JSON.stringify(summary),
  ].join("\n");
}
