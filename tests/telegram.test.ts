import { describe, expect, it } from "vitest";
import { buildFallbackMessage } from "@/lib/telegram";
import type { DailyInsight } from "@/lib/types";

describe("telegram fallback message", () => {
  it("renders friendly readable lines with full wording", () => {
    const insight: DailyInsight = {
      tirPercent: 94,
      stdDev: 28.4,
      coefficientVariance: 22.1,
      streakDays: 6,
      recommendation: "Halte Mahlzeiten-Zeitfenster stabil.",
      motivationalMessage: "Du bist stark unterwegs."
    };

    const message = buildFallbackMessage(insight, "2026-03-07");

    expect(message).toContain("94.0% Blutzucker im Idealbereich (TIR)");
    expect(message).toContain("22.1% Blutzucker-Stabilität (CV)");
    expect(message).toContain("🔥 6 Tage in Folge über 70%!");
    expect(message).toContain("Coach-Impuls:");
    expect(message).toContain("Motivation:");
  });
});
