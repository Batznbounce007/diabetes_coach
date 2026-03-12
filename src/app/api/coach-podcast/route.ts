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
    .min(10)
    .max(80),
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
  const targetTurnsByMinutes: Record<3 | 5 | 8 | 12, number> = {
    3: 14,
    5: 22,
    8: 34,
    12: 48
  };
  const targetTurns = targetTurnsByMinutes[payload.durationMinutes];

  const systemPrompt =
    payload.lang === "de"
      ? [
          "Du erzeugst ein hochwertiges Coaching-Podcast-Skript für Diabetes-Therapie im Stil eines natürlichen Dialogs.",
          "Die Sprache ist Deutsch.",
          "Nutze nur JSON mit Keys: title, summary, keyActions, dialogue, sources.",
          `dialogue: exakt ${targetTurns} Sprecherwechsel mit abwechselnden Rollen coach/you.`,
          "Der Dialog soll menschlich wirken: Rückfragen, kurze Reaktionen, Klarstellungen, kleine Zusammenfassungen.",
          "Inhaltlich tief: konkrete Therapie-Hebel, konkrete Alltagsschritte, Priorisierung (1., 2., 3. Hebel).",
          "Coach-Ton: motivierend, diszipliniert, positiv, aber respektvoll.",
          "Leite Maßnahmen streng aus Werten, Profil und Best Practices ab und nenne keine medizinischen Diagnosen.",
          "Keine Markdown-Symbole."
        ].join("\n")
      : [
          "Create a high-quality diabetes coaching podcast script with natural conversational flow.",
          "Language must be English.",
          "Return JSON only with keys: title, summary, keyActions, dialogue, sources.",
          `dialogue: exactly ${targetTurns} turns, alternating coach/you roles.`,
          "Make it human and dynamic: follow-up questions, clarifications, short recaps, practical coaching moments.",
          "Depth: concrete therapy levers, concrete daily actions, ranked priorities (1st, 2nd, 3rd lever).",
          "Coach tone: motivating, disciplined, positive, respectful.",
          "Derive actions from metrics, profile, and best-practice sources; do not make diagnoses.",
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
            targetTurns,
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
              { speaker: "coach", line: "Heute gehen wir strukturiert durch deine Werte und setzen klare Prioritäten." },
              { speaker: "you", line: "Super, ich will konkrete Schritte statt nur Theorie." },
              { speaker: "coach", line: "Erster Hebel: Timing vor Mahlzeiten. Wenn du 10 bis 20 Minuten früher bolst, sinken häufig Spitzen." },
              { speaker: "you", line: "Und wenn die Werte trotzdem lange hoch bleiben?" },
              { speaker: "coach", line: "Dann ist Hebel zwei deine Kohlenhydrat-Schätzung. Für 5 Tage konsequent abwiegen und mit deinem Verlauf abgleichen." },
              { speaker: "you", line: "Wie erkenne ich schnell, ob das wirkt?" },
              { speaker: "coach", line: "Checke 60 bis 120 Minuten nach dem Essen. Wenn die Kurve flacher wird, bist du auf Kurs." },
              { speaker: "you", line: "Klingt machbar. Was ist Hebel drei?" },
              { speaker: "coach", line: "Hebel drei: täglicher Mini-Review am Abend. Nur zwei Fragen: Was hat gut funktioniert? Was passe ich morgen minimal an?" },
              { speaker: "you", line: "Das gibt mir einen klaren Plan." }
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
              { speaker: "coach", line: "Today we turn your data into a clear plan with top-priority actions." },
              { speaker: "you", line: "Great. I need practical steps, not generic advice." },
              { speaker: "coach", line: "First lever: pre-meal timing. A 10-20 minute lead can reduce meal spikes." },
              { speaker: "you", line: "What if highs still stay elevated for too long?" },
              { speaker: "coach", line: "Second lever: carb estimation precision. Weigh and compare outcomes for five days." },
              { speaker: "you", line: "How do I verify quickly if it works?" },
              { speaker: "coach", line: "Review the curve at 60-120 minutes post meal. A flatter rise means better control." },
              { speaker: "you", line: "Makes sense. What is the third lever?" },
              { speaker: "coach", line: "Third lever: evening micro-review. Ask: what worked today, and what one tweak for tomorrow?" },
              { speaker: "you", line: "Perfect, that gives me a concrete routine." }
            ],
            sources: fallbackSources
          };

    return NextResponse.json({ podcast: fallback, mode: "fallback" });
  } catch {
    return NextResponse.json({ error: "Request invalid" }, { status: 400 });
  }
}
