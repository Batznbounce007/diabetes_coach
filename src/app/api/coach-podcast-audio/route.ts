import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({
  lang: z.enum(["de", "en"]).default("de"),
  title: z.string().min(1),
  dialogue: z
    .array(
      z.object({
        speaker: z.enum(["coach", "you"]),
        line: z.string().min(1)
      })
    )
    .min(2)
});

function buildPodcastScript(
  title: string,
  dialogue: Array<{ speaker: "coach" | "you"; line: string }>,
  lang: "de" | "en"
) {
  const speakerLabel = (speaker: "coach" | "you") =>
    speaker === "coach" ? (lang === "de" ? "Coach" : "Coach") : lang === "de" ? "Du" : "You";
  const lines = dialogue.map((item) => `${speakerLabel(item.speaker)}: ${item.line}`);
  return `${title}\n\n${lines.join("\n")}`;
}

export async function POST(request: NextRequest) {
  try {
    const payload = requestSchema.parse(await request.json());
    const openAiApiKey = process.env.OPENAI_API_KEY;
    if (!openAiApiKey) {
      return NextResponse.json({ error: "OPENAI_API_KEY missing" }, { status: 503 });
    }

    const baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
    const model = process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts";
    const voice =
      process.env.OPENAI_TTS_VOICE || (payload.lang === "de" ? "alloy" : "verse");
    const script = buildPodcastScript(payload.title, payload.dialogue, payload.lang);

    const response = await fetch(`${baseUrl}/audio/speech`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${openAiApiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model,
        voice,
        format: "mp3",
        input: script
      })
    });

    if (!response.ok) {
      return NextResponse.json({ error: "TTS request failed" }, { status: 502 });
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "content-type": "audio/mpeg",
        "cache-control": "no-store"
      }
    });
  } catch {
    return NextResponse.json({ error: "Request invalid" }, { status: 400 });
  }
}
