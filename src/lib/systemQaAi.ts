import type { CoachProfile } from "@/lib/coachProfile";
import type { RankedKnowledge } from "@/lib/systemQa";

export type QaChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type GenerateAiAnswerInput = {
  question: string;
  profile: CoachProfile;
  matches: RankedKnowledge[];
  history: QaChatMessage[];
  lang?: "de" | "en";
};

function sanitizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function trimConversation(
  history: QaChatMessage[],
  maxMessages = 8
): QaChatMessage[] {
  return history
    .filter((message) => message.content.trim().length > 0)
    .slice(-maxMessages);
}

export function buildSourceContext(matches: RankedKnowledge[]): string {
  if (matches.length === 0) {
    return "Keine passenden Quellen gefunden.";
  }

  return matches
    .map(
      (entry, index) =>
        `[${index + 1}] ${entry.title}\nQuelle: ${entry.sourceLabel} (${entry.sourceUrl})\nInhalt: ${sanitizeText(entry.answer)}`
    )
    .join("\n\n");
}

export function buildSystemPrompt(
  profile: CoachProfile,
  sourcesBlock: string,
  lang: "de" | "en" = "de"
): string {
  const profileSummary = [
    `Geschlecht: ${profile.gender || "unbekannt"}`,
    `Alter: ${profile.age || "unbekannt"}`,
    `Beruf: ${profile.profession || "unbekannt"}`,
    `Therapie: ${profile.insulinTherapy || "unbekannt"}`,
    `Closed Loop: ${profile.usesClosedLoop || "unbekannt"}`,
    `Closed-Loop-System: ${profile.closedLoopSystem || "unbekannt"}`,
    `Pumpe: ${profile.pumpModel || "unbekannt"}`,
    `CGM: ${profile.cgmSystem || "unbekannt"}`,
    `Primäres Ziel: ${profile.primaryGoal || "unbekannt"}`,
    `Herausforderung: ${profile.challenge || "unbekannt"}`
  ].join("\n");

  return [
    "Du bist ein Diabetes-Tech-Coach für CGM/Pumpe/Closed-Loop.",
    `Antworte präzise, konkret, in klaren Schritten und strikt in ${lang === "de" ? "Deutsch" : "Englisch"}.`,
    "Nutze KEIN Markdown: keine Sternchen, keine fetten Marker, keine Backticks.",
    "Formatiere als klaren Fließtext oder nummerierte Liste ohne Sonderzeichen-Markup.",
    "Nutze nur die bereitgestellten Quellen. Wenn Details fehlen, sage es explizit.",
    "Gib am Ende immer eine kurze Sicherheitshinweis-Zeile: 'Das ersetzt keine ärztliche Beratung.'",
    "Wenn es Rückfragen gibt, beziehe den bisherigen Chatverlauf ein.",
    "",
    "Nutzerprofil:",
    profileSummary,
    "",
    "Wissensquellen:",
    sourcesBlock
  ].join("\n");
}

export async function generateAiAnswer(input: GenerateAiAnswerInput): Promise<string | null> {
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

  const systemPrompt = buildSystemPrompt(
    input.profile,
    buildSourceContext(input.matches),
    input.lang ?? "de"
  );
  const trimmedHistory = trimConversation(input.history, 8);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          ...trimmedHistory.map((message) => ({
            role: message.role,
            content: message.content
          })),
          {
            role: "user",
            content: input.question
          }
        ]
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const content = payload.choices?.[0]?.message?.content?.trim();
    if (!content) return null;
    return content;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
