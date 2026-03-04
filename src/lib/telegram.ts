import { Telegraf } from "telegraf";
import type { DailyInsight } from "@/lib/types";

function buildMessage(insight: DailyInsight, day: string): string {
  return [
    `CGM Report (${day})`,
    `TIR (70-180): ${insight.tirPercent.toFixed(1)}%`,
    `SD: ${insight.stdDev.toFixed(1)} mg/dL`,
    `CV: ${insight.coefficientVariance.toFixed(1)}%`,
    `Streak (TIR >70%): ${insight.streakDays} day(s)`,
    `Recommendation: ${insight.recommendation}`,
    `Motivation: ${insight.motivationalMessage}`
  ].join("\n");
}

export async function sendDailyTelegram(
  insight: DailyInsight,
  day: string
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    throw new Error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID");
  }

  const bot = new Telegraf(token);
  await bot.telegram.sendMessage(chatId, buildMessage(insight, day));
}
