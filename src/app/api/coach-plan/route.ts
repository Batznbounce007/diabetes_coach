import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { emptyCoachProfile } from "@/lib/coachProfile";
import { systemKnowledgeBase } from "@/lib/systemKnowledge";

const requestSchema = z.object({
  lang: z.enum(["de", "en"]).default("de"),
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
  })
});

const responseSchema = z.object({
  summary: z.string().min(1),
  actions: z.array(z.string().min(1)).min(4).max(8),
  motivation: z.string().min(1),
  tone: z.enum(["praise", "push", "balanced"])
});

function extractJsonObject(raw: string): string | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return raw.slice(start, end + 1);
}

function pickBestPractices(profile: z.infer<typeof requestSchema>["profile"], limit = 6) {
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

  const ranked = systemKnowledgeBase
    .map((entry) => {
      const hay = `${entry.title} ${entry.systems.join(" ")} ${entry.keywords.join(" ")}`.toLowerCase();
      const score = bag
        .split(/\s+/)
        .filter((token) => token.length > 2)
        .reduce((sum, token) => (hay.includes(token) ? sum + 1 : sum), 0);
      return { entry, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.entry);

  return ranked.length > 0 ? ranked : systemKnowledgeBase.slice(0, limit);
}

async function generatePlan(payload: z.infer<typeof requestSchema>) {
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

  const practices = pickBestPractices(payload.profile, 6).map((entry) => ({
    title: entry.title,
    sourceLabel: entry.sourceLabel,
    sourceUrl: entry.sourceUrl,
    practice: entry.answer
  }));

  const systemPrompt =
    payload.lang === "de"
      ? [
          "Du bist ein sehr konkreter Diabetes Performance Coach.",
          "Ton: wie ein guter Sportcoach (fokussiert, motivierend, diszipliniert, respektvoll).",
          "Passe den Ton auf die Werte an: Bei guten Werten loben + stabilisieren; bei schwächeren Werten klar pushen.",
          "Nutze nur JSON mit Keys: summary, actions, motivation, tone.",
          "summary: 2-3 Sätze, datenbasiert und profilorientiert.",
          "actions: 4-8 konkrete Maßnahmen im Format 'Wenn ..., dann ...', sofort umsetzbar.",
          "Jede Maßnahme mit messbarer Routine (z. B. Timing, Frequenz, Kontrollzeitpunkt).",
          "motivation: 2-3 Sätze mit starker Startenergie für heute.",
          "tone: praise | push | balanced.",
          "Kein Markdown."
        ].join("\n")
      : [
          "You are a very concrete diabetes performance coach.",
          "Tone: focused, motivating, disciplined, respectful.",
          "Adapt to metrics: praise and stabilize when values are strong; push clearly when not.",
          "Return JSON only with keys: summary, actions, motivation, tone.",
          "summary: 2-3 sentences, data-based and profile-oriented.",
          "actions: 4-8 concrete steps in 'If ..., then ...' format.",
          "Each action must include a measurable routine (timing/frequency/checkpoint).",
          "motivation: 2-3 sentences with strong momentum for today.",
          "tone: praise | push | balanced.",
          "No markdown."
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
            profile: { ...emptyCoachProfile, ...(payload.profile ?? {}) },
            metrics: payload.metrics,
            practices
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
    const generated = await generatePlan(payload);
    if (generated) return NextResponse.json({ plan: generated, mode: "ai" });

    const strongDay = payload.metrics.tirPercent >= 80 && payload.metrics.cv <= 36;
    const fallback =
      payload.lang === "de"
        ? {
            summary: strongDay
              ? "Starker Verlauf: Du liegst stabil im Zielbereich und hast eine gute Basis für konstante Tage. Der Fokus liegt jetzt auf Wiederholbarkeit und sauberer Routine."
              : "Dein Verlauf zeigt Potenzial durch klare Hebel bei Mahlzeiten, Timing und Nachkontrolle. Mit disziplinierten Mini-Anpassungen kannst du die nächsten Tage deutlich stabiler machen.",
            actions: [
              "Wenn Werte nach Mahlzeiten regelmäßig steigen, dann setze den Bolus 10-20 Minuten vor dem Essen und prüfe den Trend nach 60 und 120 Minuten.",
              "Wenn du nach 2 Stunden noch über Ziel bist, dann überprüfe die Kohlenhydrat-Schätzung mit Küchenwaage bei mindestens 1 Hauptmahlzeit pro Tag.",
              "Wenn Abendwerte schwanken, dann halte Abendessen-Zeitfenster und Portionsgrößen an 4 von 7 Tagen möglichst konstant.",
              "Wenn unerklärlich hohe Werte auftreten, dann prüfe Katheter/Infusionsset, Insulinalter und Pumpenverbindung sofort als 3-Punkte-Check.",
              "Wenn du im Closed Loop bist, dann dokumentiere 1 Woche lang Muster (Mahlzeit, Aktivität, Korrektur), bevor du größere Profiländerungen machst."
            ],
            motivation: strongDay
              ? "Das ist Champions-League-Niveau: Du arbeitest sauber, ruhig und konsequent. Halte die Disziplin, dann wird aus guten Tagen eine neue Normalität."
              : "Jetzt zählt Fokus statt Perfektion: Jeder saubere Schritt heute ist ein Sieg für morgen. Bleib dran, arbeite strukturiert, und du wirst die Kurve klar nach oben drehen.",
            tone: strongDay ? "praise" : "push"
          }
        : {
            summary: strongDay
              ? "Strong trend: you are stable in range and have a solid baseline. The next step is repeatability through disciplined routines."
              : "Your trend shows clear improvement potential through meal timing, carb estimation, and structured checks. Small disciplined changes can stabilize the coming days.",
            actions: [
              "If post-meal values rise repeatedly, then pre-bolus 10-20 minutes before meals and check trends at 60 and 120 minutes.",
              "If values are still high after 2 hours, then validate carb estimation with a kitchen scale for at least one main meal per day.",
              "If evening values swing, then keep dinner timing and portions consistent on at least 4 of 7 days.",
              "If unexplained highs occur, then run a 3-point check immediately: infusion set, insulin age, and pump connection.",
              "If you use closed loop, then log one week of patterns (meal, activity, correction) before major profile changes."
            ],
            motivation: strongDay
              ? "You are operating with champion-level consistency. Keep the discipline and turn strong days into your standard."
              : "Focus beats perfection right now. Every clean action today improves tomorrow’s stability, so stay structured and keep moving forward.",
            tone: strongDay ? "praise" : "push"
          };

    return NextResponse.json({ plan: fallback, mode: "fallback" });
  } catch {
    return NextResponse.json({ error: "Request invalid" }, { status: 400 });
  }
}
