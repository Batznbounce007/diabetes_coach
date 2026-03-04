import { describe, expect, it } from "vitest";
import { rankKnowledgeEntries, resolveSystemQa } from "@/lib/systemQa";

const profile = {
  gender: "male",
  age: "34",
  profession: "office",
  insulinTherapy: "pump",
  pumpModel: "CamAPS",
  cgmSystem: "Libre 3",
  primaryGoal: "tir",
  challenge: "post meal highs"
};

describe("rankKnowledgeEntries", () => {
  it("returns relevant entries for post-meal highs", () => {
    const result = rankKnowledgeEntries(
      "Wie reduziere ich hohe Werte nach dem Essen im Closed Loop?",
      profile,
      3
    );

    expect(result.length).toBeGreaterThan(0);
    expect(result[0].title.toLowerCase()).toContain("post-meal");
  });

  it("uses profile system context", () => {
    const result = rankKnowledgeEntries("Was ist bei Signalabbrüchen wichtig?", profile, 5);

    expect(result.length).toBeGreaterThan(0);
    expect(
      result.some((entry) => entry.matchReasons.some((reason) => reason.startsWith("System match:")))
    ).toBe(true);
  });

  it("returns a fallback response when no direct match exists", () => {
    const result = resolveSystemQa("Ich habe irgendein undefiniertes Problem", profile, 3);

    expect(result.answer.length).toBeGreaterThan(20);
    expect(result.matches.length).toBeGreaterThan(0);
    expect(["high", "medium", "low"]).toContain(result.confidence);
  });
});
