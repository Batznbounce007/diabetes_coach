import type { CgmSample, DailyInsight } from "@/lib/types";

const motivationalBank = [
  "You are building consistency one reading at a time.",
  "Progress compounds when you stay in range repeatedly.",
  "Your focus today is setting up tomorrow's stable glucose.",
  "Small improvements in variance have huge long-term impact."
];

function getStandardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Number(Math.sqrt(variance).toFixed(2));
}

function getRecommendation(tir: number, stdDev: number): string {
  if (tir === 0 && stdDev === 0) {
    return "No data found for this day. Verify Glooko export and sync job.";
  }

  if (tir >= 70 && stdDev <= 35) {
    return "Strong control: keep meals and activity timing consistent.";
  }

  if (tir < 70) {
    return "TIR is below target. Review meals with largest post-meal rise and adjust insulin timing.";
  }

  return "Variance is elevated. Focus on reducing large swings at specific times of day.";
}

export function buildDailyInsight(
  samples: CgmSample[],
  currentStreak: number
): DailyInsight {
  if (samples.length === 0) {
    return {
      tirPercent: 0,
      stdDev: 0,
      coefficientVariance: 0,
      streakDays: 0,
      recommendation: getRecommendation(0, 0),
      motivationalMessage: motivationalBank[0]
    };
  }

  const values = samples.map((entry) => entry.glucose);
  const inRange = values.filter((value) => value >= 70 && value <= 180).length;
  const tirPercent = Number(((inRange / values.length) * 100).toFixed(2));
  const stdDev = getStandardDeviation(values);
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const coefficientVariance = Number(
    (mean === 0 ? 0 : (stdDev / mean) * 100).toFixed(2)
  );
  const streakDays = tirPercent > 70 ? currentStreak + 1 : 0;

  return {
    tirPercent,
    stdDev,
    coefficientVariance,
    streakDays,
    recommendation: getRecommendation(tirPercent, stdDev),
    motivationalMessage: motivationalBank[streakDays % motivationalBank.length]
  };
}
