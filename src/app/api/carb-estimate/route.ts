import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({
  imageDataUrl: z.string().startsWith("data:image/"),
  lang: z.enum(["de", "en"]).optional().default("de")
});

const resultSchema = z.object({
  foodLabel: z.string().min(1),
  estimatedCarbsGrams: z.number().min(0).max(300),
  uptakeSpeed: z.enum(["slow", "medium", "fast"]),
  confidence: z.enum(["low", "medium", "high"]),
  suggestion: z.string().min(1),
  notes: z.array(z.string().min(1)).min(2).max(5)
});

function extractJsonObject(raw: string): string | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return raw.slice(start, end + 1);
}

async function inferWithVision(imageDataUrl: string, lang: "de" | "en") {
  const openAiApiKey = process.env.OPENAI_API_KEY;
  const groqApiKey = process.env.GROQ_API_KEY;
  const apiKey = openAiApiKey || groqApiKey;
  if (!apiKey) return null;

  const useOpenAi = Boolean(openAiApiKey);
  const baseUrl = useOpenAi
    ? process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"
    : process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1";
  const model = useOpenAi
    ? process.env.OPENAI_VISION_MODEL || process.env.OPENAI_MODEL || "gpt-4.1-mini"
    : process.env.GROQ_VISION_MODEL || process.env.GROQ_MODEL || "llama-3.2-90b-vision-preview";

  const systemPrompt =
    lang === "de"
      ? [
          "Du analysierst ein Lebensmittel-Foto für Diabetes-Management.",
          "Gib NUR JSON zurück mit diesen Keys:",
          "foodLabel, estimatedCarbsGrams, uptakeSpeed, confidence, suggestion, notes",
          "estimatedCarbsGrams: integer in Gramm.",
          "uptakeSpeed: slow | medium | fast.",
          "confidence: low | medium | high.",
          "suggestion: 1 kurzer Satz für Pumpen/App-Eingabe.",
          "notes: 2-5 kurze Stichpunkte."
        ].join("\n")
      : [
          "Analyze a food photo for diabetes management.",
          "Return JSON only with keys:",
          "foodLabel, estimatedCarbsGrams, uptakeSpeed, confidence, suggestion, notes",
          "estimatedCarbsGrams: integer grams.",
          "uptakeSpeed: slow | medium | fast.",
          "confidence: low | medium | high.",
          "suggestion: one short sentence for pump/app entry.",
          "notes: 2-5 short bullet-style strings."
        ].join("\n");

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
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: lang === "de" ? "Bitte analysiere dieses Lebensmittel." : "Please analyze this food." },
            { type: "image_url", image_url: { url: imageDataUrl } }
          ]
        }
      ]
    })
  });

  if (!response.ok) return null;
  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const content = payload.choices?.[0]?.message?.content?.trim();
  if (!content) return null;
  const jsonText = extractJsonObject(content);
  if (!jsonText) return null;
  const parsed = resultSchema.safeParse(JSON.parse(jsonText));
  if (!parsed.success) return null;
  return parsed.data;
}

export async function POST(request: NextRequest) {
  try {
    const payload = requestSchema.parse(await request.json());
    const aiResult = await inferWithVision(payload.imageDataUrl, payload.lang);
    if (aiResult) {
      return NextResponse.json({ result: aiResult });
    }

    return NextResponse.json(
      {
        result: {
          foodLabel: payload.lang === "de" ? "Lebensmittel (unsicher erkannt)" : "Food (uncertain detection)",
          estimatedCarbsGrams: 20,
          uptakeSpeed: "medium",
          confidence: "low",
          suggestion:
            payload.lang === "de"
              ? "Bitte Menge manuell gegenprüfen, dann in Pumpe/App übernehmen."
              : "Please verify portion size manually before entering in pump/app.",
          notes:
            payload.lang === "de"
              ? [
                  "Portionsgröße per Augenmaß validieren.",
                  "Bei Unsicherheit eher konservativ eintragen.",
                  "Verlauf nach 60-120 Minuten prüfen."
                ]
              : [
                  "Validate portion size visually.",
                  "Use a conservative entry when uncertain.",
                  "Check trend again after 60-120 minutes."
                ]
        }
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ error: "Request invalid" }, { status: 400 });
  }
}
