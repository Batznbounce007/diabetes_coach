import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { emptyCoachProfile } from "@/lib/coachProfile";
import { systemKnowledgeBase } from "@/lib/systemKnowledge";

const requestSchema = z.object({
  lang: z.enum(["de", "en"]).default("de"),
  durationMinutes: z.union([z.literal(3), z.literal(5), z.literal(8), z.literal(12)]),
  profile: z
    .object({
      gender: z.string().optional(),
      age: z.string().optional(),
      profession: z.string().optional(),
      insulinTherapy: z.string().optional(),
      usesClosedLoop: z.string().optional(),
      closedLoopSystem: z.string().optional(),
      pumpModel: z.string().optional(),
      cgmSystem: z.string().optional(),
      primaryGoal: z.string().optional(),
      challenge: z.string().optional()
    })
    .partial()
    .optional(),
  metrics: z.object({
    rangeLabel: z.string(),
    tirPercent: z.number(),
    avgGlucose: z.number(),
    medianGlucose: z.number(),
    stdDev: z.number(),
    cv: z.number(),
    lowPercent: z.number(),
    inRangePercent: z.number(),
    highPercent: z.number(),
    streakDays: z.number()
  }),
  coaching: z.object({
    assessment: z.string(),
    actions: z.array(z.string()).default([]),
    motivation: z.string()
  })
});

const responseSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  keyActions: z.array(z.string().min(1)).min(3).max(5),
  dialogue: z
    .array(
      z.object({
        speaker: z.enum(["coach", "you"]),
        line: z.string().min(1)
      })
    )
    .min(6)
    .max(24),
  sources: z.array(z.object({ label: z.string(), url: z.string() })).min(2).max(6)
});

function extractJsonObject(raw: string): string | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return raw.slice(start, end + 1);
}

function pickBestPractices(profile: z.infer<typeof requestSchema>["profile"], limit = 5) {
  const p = { ...emptyCoachProfile, ...(profile ?? {}) };
  const bag = [
    p.closedLoopSystem,
    p.pumpModel,
    p.cgmSystem,
    p.primaryGoal,
    p.challenge
  ]
    .join(" ")
    .toLowerCase();

  const scored = systemKnowledgeBase
    .map((entry) => {
      const text = `${entry.title} ${entry.systems.join(" ")} ${entry.keywords.join(" ")}`.toLowerCase();
      const score = bag
        .split(/\s+/)
        .filter((token) => token.length > 2)
        .reduce((acc, token) => (text.includes(token) ? acc + 1 : acc), 0);
      return { entry, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.entry);

  if (scored.length >= 2) return scored;
  return systemKnowledgeBase.slice(0, limit);
}

async function generateCoachPodcast(payload: z.infer<typeof requestSchema>) {
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

  const bestPractices = pickBestPractices(payload.profile, 5).map((entry) => ({
    title: entry.title,
    sourceLabel: entry.sourceLabel,
    sourceUrl: entry.sourceUrl,
    guidance: entry.answer
  }));

  const systemPrompt =
    payload.lang === "de"
      ? [
          "Du erzeugst ein Coaching-Podcast-Skript für Diabetes-Therapie.",
          "Die Sprache ist Deutsch.",
          "Nutze nur JSON mit Keys: title, summary, keyActions, dialogue, sources.",
          "dialogue: natürlicher Dialog zwischen coach und you, alltagsnah, konkret, motivierend.",
          "Leite Maßnahmen aus Werten, Profil und Best Practices ab.",
          "Keine Markdown-Symbole."
        ].join("\n")
      : [
          "Create a diabetes coaching podcast script.",
          "Language must be English.",
          "Return JSON only with keys: title, summary, keyActions, dialogue, sources.",
          "dialogue: natural conversation between coach and you, concrete and motivating.",
          "Derive actions from metrics, profile, and best-practice sources.",
          "No markdown symbols."
        ].join("\n");

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.35,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: JSON.stringify({
            durationMinutes: payload.durationMinutes,
            profile: { ...emptyCoachProfile, ...(payload.profile ?? {}) },
            metrics: payload.metrics,
            coaching: payload.coaching,
            bestPractices
          })
        }
      ]
    })
  });

  if (!response.ok) return null;
  const body = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const content = body.choices?.[0]?.message?.content?.trim();
  if (!content) return null;
  const json = extractJsonObject(content);
  if (!json) return null;
  const parsed = responseSchema.safeParse(JSON.parse(json));
  if (!parsed.success) return null;
  return parsed.data;
}

export async function POST(request: NextRequest) {
  try {
    const payload = requestSchema.parse(await request.json());
    const generated = await generateCoachPodcast(payload);
    if (generated) return NextResponse.json({ podcast: generated, mode: "ai" });

    const fallbackSources = pickBestPractices(payload.profile, 3).map((entry) => ({
      label: entry.sourceLabel,
      url: entry.sourceUrl
    }));

    const fallback =
      payload.lang === "de"
        ? {
            title: "Coaching-Podcast (Kurzversion)",
            summary:
              "Diese Kurzfassung basiert auf deinen aktuellen Werten und deinem Profil. Nutze sie als praktischen Tagesplan.",
            keyActions: [
              "Prüfe vor Hauptmahlzeiten Timing und Kohlenhydrat-Schätzung.",
              "Beobachte den Verlauf 60-120 Minuten nach dem Essen.",
              "Nutze einen kurzen Tagesrückblick für den nächsten Feinschliff."
            ],
            dialogue: [
              { speaker: "coach", line: "Heute schauen wir auf deinen Verlauf und setzen klare Prioritäten." },
              { speaker: "you", line: "Ich möchte meine Werte stabiler bekommen und besser reagieren." },
              { speaker: "coach", line: "Starte mit dem ersten Hebel: Mahlzeiten-Timing und realistische Kohlenhydrat-Schätzung." },
              { speaker: "you", line: "Wie erkenne ich schnell, ob ich richtig liege?" },
              { speaker: "coach", line: "Vergleiche den Trend 60 bis 120 Minuten nach der Mahlzeit und passe kleine Schritte an." },
              { speaker: "you", line: "Gut, das kann ich direkt umsetzen." }
            ],
            sources: fallbackSources
          }
        : {
            title: "Coaching Podcast (Quick Edition)",
            summary:
              "This short script is based on your current metrics and profile so you can apply clear steps today.",
            keyActions: [
              "Check timing and carb estimation before main meals.",
              "Review the trend 60-120 minutes after meals.",
              "Do a short end-of-day review and adjust one lever."
            ],
            dialogue: [
              { speaker: "coach", line: "Today we review your trend and focus on the highest-impact actions." },
              { speaker: "you", line: "I want more stable values and clearer decisions." },
              { speaker: "coach", line: "Start with meal timing and realistic carb estimation." },
              { speaker: "you", line: "How do I quickly know if it worked?" },
              { speaker: "coach", line: "Check your trend 60 to 120 minutes after meals and adjust in small steps." },
              { speaker: "you", line: "Great, I can implement that today." }
            ],
            sources: fallbackSources
          };

    return NextResponse.json({ podcast: fallback, mode: "fallback" });
  } catch {
    return NextResponse.json({ error: "Request invalid" }, { status: 400 });
  }
}
