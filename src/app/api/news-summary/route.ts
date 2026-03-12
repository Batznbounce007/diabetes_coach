import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({
  link: z.string().url(),
  title: z.string().min(1),
  lang: z.enum(["de", "en"]).default("de")
});

const responseSchema = z.object({
  summary: z.string().min(1),
  bullets: z.array(z.string()).min(1).max(5)
});

function stripHtmlTags(value: string): string {
  return value.replace(/<[^>]*>/g, " ");
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function extractReadableText(html: string): string {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");
  const text = normalizeWhitespace(stripHtmlTags(withoutScripts));
  return text.slice(0, 6000);
}

function extractJsonObject(raw: string): string | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return raw.slice(start, end + 1);
}

async function fetchArticleText(link: string): Promise<string> {
  const response = await fetch(link, {
    redirect: "follow",
    headers: {
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36"
    },
    next: { revalidate: 3600 }
  });

  if (!response.ok) return "";
  const html = await response.text();
  return extractReadableText(html);
}

async function generateSummary(text: string, title: string, lang: "de" | "en") {
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

  const systemPrompt =
    lang === "de"
      ? [
          "Du fasst Diabetes-News sachlich, kurz und gut verständlich zusammen.",
          "Nutze nur JSON mit Keys: summary, bullets.",
          "summary: 2-3 Sätze, neutral, keine medizinische Beratung.",
          "bullets: 2-4 kurze Punkte, klare Fakten oder Erkenntnisse.",
          "Kein Markdown."
        ].join("\n")
      : [
          "You summarize diabetes news clearly and concisely.",
          "Return JSON only with keys: summary, bullets.",
          "summary: 2-3 sentences, neutral, no medical advice.",
          "bullets: 2-4 short points, factual takeaways.",
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
      temperature: 0.3,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: JSON.stringify({
            title,
            content: text
          })
        }
      ]
    })
  });

  if (!response.ok) return null;
  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = data.choices?.[0]?.message?.content ?? "";
  const json = extractJsonObject(raw);
  if (!json) return null;
  const parsed = responseSchema.safeParse(JSON.parse(json));
  if (!parsed.success) return null;
  return parsed.data;
}

export async function POST(request: NextRequest) {
  try {
    const payload = requestSchema.parse(await request.json());
    const text = await fetchArticleText(payload.link);
    if (!text) {
      return NextResponse.json(
        {
          summary:
            payload.lang === "de"
              ? "Für diesen Artikel ist gerade keine Zusammenfassung verfügbar."
              : "No summary is available for this article right now.",
          bullets: []
        },
        { status: 200 }
      );
    }

    const summary = await generateSummary(text, payload.title, payload.lang);
    if (!summary) {
      return NextResponse.json(
        {
          summary:
            payload.lang === "de"
              ? "Für diesen Artikel ist gerade keine Zusammenfassung verfügbar."
              : "No summary is available for this article right now.",
          bullets: []
        },
        { status: 200 }
      );
    }

    return NextResponse.json(summary);
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
}
