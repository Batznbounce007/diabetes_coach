import { Telegraf } from "telegraf";
import type { DailyInsight } from "@/lib/types";

function getRangeBadge(tirPercent: number): string {
  if (tirPercent >= 90) return "⭐⭐";
  if (tirPercent >= 80) return "⭐";
  return "";
}

function getStabilityBadge(cvPercent: number): string {
  if (cvPercent <= 30) return "⭐⭐";
  if (cvPercent <= 36) return "⭐";
  return "";
}

function getEncouragement(insight: DailyInsight): string {
  if (insight.tirPercent >= 90 && insight.coefficientVariance <= 36) {
    return "🎉 Glückwunsch! Sehr starker Tag mit viel Zeit im Idealbereich.";
  }

  if (insight.tirPercent >= 70) {
    return "👏 Stark gemacht! Du bist im Zielbereich unterwegs.";
  }

  return "💪 Du bist dran. Kleine Schritte heute bringen morgen Stabilität.";
}

function getStreakLine(streakDays: number): string {
  if (streakDays <= 0) {
    return "🔥 Neuer Start: Heute Fokus auf > 70% im Idealbereich.";
  }

  if (streakDays === 1) {
    return "🔥 1 Tag in Folge über 70%!";
  }

  return `🔥 ${streakDays} Tage in Folge über 70%!`;
}

export function buildFallbackMessage(insight: DailyInsight, day: string): string {
  const rangeBadge = getRangeBadge(insight.tirPercent);
  const stabilityBadge = getStabilityBadge(insight.coefficientVariance);
  const rangeLine = `${insight.tirPercent.toFixed(1)}% Blutzucker im Idealbereich (TIR)${rangeBadge ? ` ${rangeBadge}` : ""}`;
  const stabilityLine = `${insight.coefficientVariance.toFixed(1)}% Blutzucker-Stabilität (CV)${stabilityBadge ? ` ${stabilityBadge}` : ""}`;

  return [
    `Guten Morgen! Dein CGM-Update für ${day}`,
    "",
    rangeLine,
    stabilityLine,
    `Streuung der Werte: ${insight.stdDev.toFixed(1)} mg/dL`,
    "",
    getEncouragement(insight),
    getStreakLine(insight.streakDays),
    "",
    `Coach-Impuls: ${insight.recommendation}`,
    `Motivation: ${insight.motivationalMessage}`
  ].join("\n");
}

function stripMarkdownNoise(text: string): string {
  return text
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/^#+\s?/gm, "")
    .trim();
}

async function generateAiTelegramMessage(
  insight: DailyInsight,
  day: string
): Promise<string | null> {
  const groqApiKey = process.env.GROQ_API_KEY;
  const openAiApiKey = process.env.OPENAI_API_KEY;
  const apiKey = groqApiKey || openAiApiKey;
  if (!apiKey) return null;

  const isGroq = Boolean(groqApiKey);
  const baseUrl = isGroq
    ? process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1"
    : process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  const model = isGroq
    ? process.env.GROQ_MODEL || "llama-3.3-70b-versatile"
    : process.env.OPENAI_MODEL || "gpt-4.1-mini";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  const systemPrompt = [
    "Du bist ein empathischer Diabetes-Coach fuer morgendliche Telegram-Nachrichten.",
    "Antworte nur auf Deutsch.",
    "Erzeuge genau 6 Zeilen, freundlich, motivierend und leicht lesbar.",
    "Keine Markdown-Formatierung, keine Aufzaehlungszeichen, keine Sternchen als Markup.",
    "Stern-Emoji sind erlaubt.",
    "Nutze verstaendliche Begriffe statt Fachabkuerzungen, setze die Kurzform optional in Klammern.",
    "Erwaehne in den Zeilen die bereitgestellten Messwerte konkret."
  ].join("\n");

  const userPayload = {
    date: day,
    timeInRangePercent: insight.tirPercent,
    glucoseStabilityCvPercent: insight.coefficientVariance,
    stdDevMgDl: insight.stdDev,
    streakDaysOver70Tir: insight.streakDays,
    recommendation: insight.recommendation,
    motivation: insight.motivationalMessage,
    targetStyleExample: [
      "94% Blutzucker im Idealbereich (TIR) ⭐",
      "22% Blutzucker-Stabilität (CV) ⭐",
      "🎉 Glückwunsch! Bestwert beim Blutzucker im Idealbereich (TIR)!",
      "🔥 6 Tage in Folge über 70%!"
    ]
  };

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: JSON.stringify(userPayload) }
        ]
      }),
      signal: controller.signal
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const content = payload.choices?.[0]?.message?.content?.trim();
    if (!content) return null;

    const cleaned = stripMarkdownNoise(content);
    const nonEmptyLines = cleaned
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (nonEmptyLines.length < 4) return null;

    return nonEmptyLines.join("\n");
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
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
  const message = (await generateAiTelegramMessage(insight, day)) ?? buildFallbackMessage(insight, day);
  await bot.telegram.sendMessage(chatId, message);
}
