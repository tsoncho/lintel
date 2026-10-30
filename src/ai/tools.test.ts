import { describe, expect, it, vi } from "vitest";
import { createSampleProject } from "../domain/sample";
import { completeOpenAI } from "./openai";
import { runAssistantTurn } from "./run";
import type { ChatProvider } from "./provider";
import { applyModelEdit, commitProposal, parseToolCall } from "./tools";
import { OPENAI_PRESET } from "./settings";

const settings = { ...OPENAI_PRESET, apiKey: "test-key" };

describe("assistant tools", () => {
  it("rejects an unknown edit operation and a bad property", () => {
    const project = createSampleProject();
    expect(parseToolCall("propose_model_edit", {
      summary: "Nope",
      edit: { op: "run_shell", command: "del" },
    }, project).ok).toBe(false);

    const bad = parseToolCall("propose_model_edit", {
      summary: "Rename a wall like a story",
      edit: { op: "set_properties", elementId: "wall_g_s", changes: { name: "South" } },
    }, project);
    expect(bad.ok).toBe(false);
  });

  it("does not apply a proposal until it is confirmed", () => {
    const project = createSampleProject();
    const parsed = parseToolCall("propose_model_edit", {
      summary: "Thicken the south wall",
      edit: { op: "set_properties", elementId: "wall_g_s", changes: { thickness: 300 } },
    }, project);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok || parsed.value.name !== "propose_model_edit") return;
    const before = structuredClone(project);
    const blocked = commitProposal(project, parsed.value.proposal, false);
    expect(blocked.ok).toBe(false);
    expect(project).toEqual(before);
    const applied = commitProposal(project, parsed.value.proposal, true);
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    const wall = applied.value.elements.find((element) => element.id === "wall_g_s");
    expect(wall && "thickness" in wall && wall.thickness).toBe(300);
  });

  it("stops a scripted provider at the confirmation card", async () => {
    const project = createSampleProject();
    const provider: ChatProvider = {
      complete: vi.fn(async () => ({
        text: "I would thicken the south wall.",
        toolCalls: [
          {
            id: "call_1",
            name: "propose_model_edit",
            arguments: {
              summary: "Thicken the south wall",
              edit: { op: "set_properties", elementId: "wall_g_s", changes: { thickness: 320 } },
            },
          },
        ],
      })),
    };
    const turn = await runAssistantTurn({
      provider,
      settings,
      project,
      selection: [],
      history: [],
      userText: "Make the south wall 320 mm.",
    });
    expect(turn.proposal?.kind).toBe("edit");
    expect(turn.observed).toBe(true);
    expect(provider.complete).toHaveBeenCalledOnce();
    const wall = project.elements.find((element) => element.id === "wall_g_s");
    expect(wall && "thickness" in wall && wall.thickness).toBe(200);
  });

  it("reports a missing provider without throwing", async () => {
    const turn = await runAssistantTurn({
      provider: { complete: async () => ({ text: "", toolCalls: [] }) },
      settings: { baseUrl: "", model: "", apiKey: "" },
      project: createSampleProject(),
      selection: [],
      history: [],
      userText: "How many walls?",
    });
    expect(turn.error).toMatch(/Settings/);
  });

  it("redacts the API key from provider errors", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("bad test-key", { status: 401 })));
    await expect(completeOpenAI({
      settings,
      messages: [{ role: "user", content: "Hello" }],
      tools: [],
    })).rejects.toThrow(/\[redacted\]/);
    expect(fetch).toHaveBeenCalled();
    const body = JSON.parse((fetch as unknown as { mock: { calls: [string, { body: string }][] } }).mock.calls[0][1].body);
    expect(body.model).toBe("gpt-4o-mini");
    vi.unstubAllGlobals();
  });

  it("creates a wall only through the validated edit", () => {
    const project = createSampleProject();
    const created = applyModelEdit(project, {
      op: "create_wall",
      storyId: "story_ground",
      start: { x: 0, y: 4000 },
      end: { x: 6000, y: 4000 },
      thickness: 120,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.value.elements.length).toBe(project.elements.length + 1);
  });
});
