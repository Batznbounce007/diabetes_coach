type Lang = "de" | "en";

type GenerateCoachingCopyInput = {
  lang: Lang;
  rangeLabel: string;
  tirPercent: number;
  avgGlucose: number;
  medianGlucose: number;
  stdDev: number;
  cv: number;
  lowPercent: number;
  inRangePercent: number;
  highPercent: number;
  streakDays: number;
};

export type CoachingCopy = {
  assessment: string;
  actions: string[];
  motivation: string;
};

function extractJsonObject(raw: string): string | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return raw.slice(start, end + 1);
}

function sanitizeActions(actions: unknown): string[] {
  if (!Array.isArray(actions)) return [];
  return actions
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0)
    .slice(0, 3);
}

export async function generateCoachingCopy(
  input: GenerateCoachingCopyInput
): Promise<CoachingCopy | null> {
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

  const systemPrompt =
    input.lang === "de"
      ? [
          "Du bist ein motivierender Diabetes-Coach für CGM-Daten.",
          "Erstelle kurze, klare und konkrete Coaching-Texte auf Deutsch.",
          "Nutze nur JSON mit den Keys: assessment, actions, motivation.",
          "assessment: genau 1 Satz, datenbasiert für den gewählten Zeitraum.",
          "actions: 2-3 konkrete Therapie-Hebel als kurze Sätze (keine Aufzählungssymbole).",
          "motivation: sehr positiv, umsetzungsorientiert, Startenergie für heute.",
          "Runde TIR (%) und Durchschnitt (mg/dL) immer auf ganze Zahlen.",
          "Kein Markdown, keine Sternchen, keine zusätzlichen Keys."
        ].join("\n")
      : [
          "You are a motivating diabetes coach for CGM data.",
          "Write short, concrete coaching text in English.",
          "Return JSON only with keys: assessment, actions, motivation.",
          "assessment: exactly 1 sentence, data-based for the selected period.",
          "actions: 2-3 concrete therapy levers as short sentences.",
          "motivation: highly positive and action-oriented to help start today.",
          "Always round TIR (%) and average (mg/dL) to whole numbers.",
          "No markdown and no extra keys."
        ].join("\n");

  const roundedTir = Math.round(input.tirPercent);
  const roundedAvg = Math.round(input.avgGlucose);
  const roundedStdDev = Math.round(input.stdDev);

  const userPayload = {
    period: input.rangeLabel,
    tirPercent: roundedTir,
    avgMgDl: roundedAvg,
    medianMgDl: input.medianGlucose,
    stdDevMgDl: roundedStdDev,
    coefficientVariancePercent: input.cv,
    lowPercent: input.lowPercent,
    inRangePercent: input.inRangePercent,
    highPercent: input.highPercent,
    streakDays: input.streakDays
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
        temperature: 0.3,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: JSON.stringify(userPayload)
          }
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

    const jsonText = extractJsonObject(content);
    if (!jsonText) return null;

    const parsed = JSON.parse(jsonText) as Partial<CoachingCopy>;
    const assessment = typeof parsed.assessment === "string" ? parsed.assessment.trim() : "";
    const motivation = typeof parsed.motivation === "string" ? parsed.motivation.trim() : "";
    const actions = sanitizeActions(parsed.actions);

    if (!assessment || !motivation || actions.length === 0) return null;

    return {
      assessment,
      actions,
      motivation
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
