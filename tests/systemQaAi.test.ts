import { describe, expect, it } from "vitest";
import {
  buildSourceContext,
  buildSystemPrompt,
  trimConversation,
  type QaChatMessage
} from "@/lib/systemQaAi";

describe("systemQaAi helpers", () => {
  it("trims conversation to latest messages", () => {
    const history: QaChatMessage[] = Array.from({ length: 12 }).map((_, index) => ({
      role: index % 2 === 0 ? "user" : "assistant",
      content: `message-${index}`
    }));

    const trimmed = trimConversation(history, 4);
    expect(trimmed.length).toBe(4);
    expect(trimmed[0].content).toBe("message-8");
    expect(trimmed[3].content).toBe("message-11");
  });

  it("builds readable source context", () => {
    const sourceBlock = buildSourceContext([
      {
        id: "s1",
        title: "CGM Signalabbrueche",
        systems: ["cgm"],
        keywords: ["signal"],
        answer: "Bluetooth und Distanz pruefen",
        sourceLabel: "Libre Hilfe",
        sourceUrl: "https://example.com/libre",
        sourceType: "manual",
        score: 9,
        matchReasons: ["Keyword match: signal"]
      }
    ]);

    expect(sourceBlock).toContain("CGM Signalabbrueche");
    expect(sourceBlock).toContain("Libre Hilfe");
    expect(sourceBlock).toContain("https://example.com/libre");
  });

  it("embeds profile and sources in system prompt", () => {
    const prompt = buildSystemPrompt(
      {
        gender: "male",
        age: "34",
        profession: "office",
        insulinTherapy: "pump",
        pumpModel: "CamAPS",
        cgmSystem: "Libre 3",
        primaryGoal: "TIR",
        challenge: "post meal highs"
      },
      "source-block"
    );

    expect(prompt).toContain("Nutzerprofil");
    expect(prompt).toContain("CamAPS");
    expect(prompt).toContain("source-block");
  });
});

