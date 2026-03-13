import { endOfDay, startOfDay, subDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { buildDailyInsight } from "@/lib/insights";
import { sendDailyTelegram, sendPlainTelegram } from "@/lib/telegram";
import type { DailyInsight } from "@/lib/types";

export async function computeAndStoreDailySummary(day: Date): Promise<DailyInsight> {
  const dayStart = startOfDay(day);
  const dayEnd = endOfDay(day);
  const previousDayStart = startOfDay(subDays(day, 1));

  const [readings, previousStreak] = await Promise.all([
    prisma.cgmReading.findMany({
      where: {
        timestamp: {
          gte: dayStart,
          lte: dayEnd
        }
      },
      orderBy: { timestamp: "asc" }
    }),
    prisma.dailySummary.findUnique({
      where: { day: previousDayStart }
    })
  ]);

  const insight = buildDailyInsight(
    readings.map((item) => ({ timestamp: item.timestamp, glucose: item.glucose })),
    previousStreak?.streakDays ?? 0
  );

  await prisma.dailySummary.upsert({
    where: { day: dayStart },
    create: { day: dayStart, ...insight },
    update: insight
  });

  return insight;
}

export async function sendDailySummaryMessage(day: Date): Promise<void> {
  const dayStart = startOfDay(day);
  let summary = await prisma.dailySummary.findUnique({
    where: { day: dayStart }
  });

  const isEmptySummary = (value: typeof summary): boolean => {
    if (!value) return true;
    if (value.tirPercent === 0 && value.stdDev === 0) return true;
    if (value.recommendation.toLowerCase().includes("no data found")) return true;
    return false;
  };

  if (isEmptySummary(summary)) {
    const dayLabel = dayStart.toISOString().slice(0, 10);
    await sendPlainTelegram(
      `Guten Morgen! Für ${dayLabel} liegen noch keine neuen CGM-Daten vor. Bitte prüfe den Export und die Analyse.`
    );
    return;
  }

  const insight: DailyInsight = {
    tirPercent: summary.tirPercent,
    stdDev: summary.stdDev,
    coefficientVariance: summary.coefficientVariance,
    streakDays: summary.streakDays,
    recommendation: summary.recommendation,
    motivationalMessage: summary.motivationalMessage
  };

  await sendDailyTelegram(insight, summary.day.toISOString().slice(0, 10));
}

export async function runDailyDigest(day: Date): Promise<void> {
  await computeAndStoreDailySummary(day);
  await sendDailySummaryMessage(day);
}
