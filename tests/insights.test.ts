import { describe, expect, it } from "vitest";
import { buildDailyInsight } from "@/lib/insights";

describe("buildDailyInsight", () => {
  it("calculates TIR, SD and streak", () => {
    const data = [
      95, 110, 125, 140, 175, 190, 165, 145, 120, 100, 85, 70
    ].map((glucose, index) => ({
      glucose,
      timestamp: new Date(`2026-03-01T${String(index).padStart(2, "0")}:00:00.000Z`)
    }));

    const result = buildDailyInsight(data, 4);

    expect(result.tirPercent).toBeCloseTo(91.67, 1);
    expect(result.stdDev).toBeGreaterThan(30);
    expect(result.stdDev).toBeLessThan(40);
    expect(result.streakDays).toBe(5);
    expect(result.motivationalMessage.length).toBeGreaterThan(10);
  });

  it("handles empty data", () => {
    const result = buildDailyInsight([], 0);

    expect(result.tirPercent).toBe(0);
    expect(result.stdDev).toBe(0);
    expect(result.streakDays).toBe(0);
    expect(result.recommendation).toContain("No data");
  });
});
