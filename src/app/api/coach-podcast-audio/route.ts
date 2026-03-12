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
    .max(80)
});

type WavMeta = {
  sampleRate: number;
  bitsPerSample: number;
  channels: number;
};

function buildSpeechInstructions(lang: "de" | "en", speaker: "coach" | "you") {
  if (lang === "de") {
    if (speaker === "coach") {
      return [
        "Du bist der Haupt-Host eines hochwertigen Coaching-Podcasts.",
        "Sprich selbstsicher, warm, motivierend und mit natürlicher Prosodie.",
        "Klar verständlich, lebendig, mit kurzen, natürlichen Pausen."
      ].join(" ");
    }
    return [
      "Du bist der Co-Host in einem Coaching-Podcast.",
      "Sprich natürlich, reflektiert und dialogisch, mit leicht anderer Klangfärbung als der Host.",
      "Klar, menschlich, alltagsnah."
    ].join(" ");
  }

  if (speaker === "coach") {
    return [
      "You are the main host of a premium coaching podcast.",
      "Use confident, warm, motivating delivery with natural prosody.",
      "Keep pacing dynamic and clear."
    ].join(" ");
  }

  return [
    "You are the co-host in a coaching podcast.",
    "Sound natural and reflective, with a distinct but compatible tone to the host.",
    "Keep it conversational and human."
  ].join(" ");
}

function extractWavData(buffer: Buffer): { meta: WavMeta; pcm: Buffer } {
  if (buffer.length < 44) throw new Error("Invalid WAV: too short");
  if (buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error("Invalid WAV header");
  }

  let offset = 12;
  let sampleRate = 0;
  let bitsPerSample = 0;
  let channels = 0;
  let pcmData: Buffer | null = null;

  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString("ascii", offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;
    const chunkEnd = chunkStart + chunkSize;
    if (chunkEnd > buffer.length) break;

    if (chunkId === "fmt ") {
      const audioFormat = buffer.readUInt16LE(chunkStart);
      channels = buffer.readUInt16LE(chunkStart + 2);
      sampleRate = buffer.readUInt32LE(chunkStart + 4);
      bitsPerSample = buffer.readUInt16LE(chunkStart + 14);
      if (audioFormat !== 1) throw new Error("Only PCM WAV is supported");
    } else if (chunkId === "data") {
      pcmData = buffer.subarray(chunkStart, chunkEnd);
    }

    offset = chunkEnd + (chunkSize % 2);
  }

  if (!pcmData || !sampleRate || !bitsPerSample || !channels) {
    throw new Error("WAV metadata/data missing");
  }

  return {
    meta: { sampleRate, bitsPerSample, channels },
    pcm: pcmData
  };
}

function buildWavFromPcm(meta: WavMeta, chunks: Buffer[]) {
  const pcm = Buffer.concat(chunks);
  const byteRate = meta.sampleRate * meta.channels * (meta.bitsPerSample / 8);
  const blockAlign = meta.channels * (meta.bitsPerSample / 8);
  const header = Buffer.alloc(44);

  header.write("RIFF", 0, 4, "ascii");
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8, 4, "ascii");
  header.write("fmt ", 12, 4, "ascii");
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(meta.channels, 22);
  header.writeUInt32LE(meta.sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(meta.bitsPerSample, 34);
  header.write("data", 36, 4, "ascii");
  header.writeUInt32LE(pcm.length, 40);

  return Buffer.concat([header, pcm]);
}

function makeSilence(meta: WavMeta, ms: number) {
  const bytesPerSample = meta.bitsPerSample / 8;
  const frameBytes = bytesPerSample * meta.channels;
  const frames = Math.max(1, Math.floor((meta.sampleRate * ms) / 1000));
  return Buffer.alloc(frames * frameBytes, 0);
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
    const hostVoice =
      process.env.OPENAI_TTS_VOICE_COACH ||
      process.env.OPENAI_TTS_VOICE ||
      (payload.lang === "de" ? "sage" : "verse");
    const coHostVoice = process.env.OPENAI_TTS_VOICE_COHOST || "alloy";
    const turns = payload.dialogue.slice(0, 48);

    let wavMeta: WavMeta | null = null;
    const pcmParts: Buffer[] = [];

    for (const turn of turns) {
      const voice = turn.speaker === "coach" ? hostVoice : coHostVoice;
      const instructions = buildSpeechInstructions(payload.lang, turn.speaker);
      const response = await fetch(`${baseUrl}/audio/speech`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${openAiApiKey}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model,
          voice,
          format: "wav",
          input: turn.line,
          instructions
        })
      });

      if (!response.ok) {
        return NextResponse.json({ error: "TTS request failed" }, { status: 502 });
      }

      const wavBuffer = Buffer.from(await response.arrayBuffer());
      const { meta, pcm } = extractWavData(wavBuffer);

      if (!wavMeta) {
        wavMeta = meta;
      } else if (
        wavMeta.sampleRate !== meta.sampleRate ||
        wavMeta.bitsPerSample !== meta.bitsPerSample ||
        wavMeta.channels !== meta.channels
      ) {
        return NextResponse.json({ error: "TTS audio format mismatch" }, { status: 502 });
      }

      pcmParts.push(pcm);
      pcmParts.push(makeSilence(wavMeta, 220));
    }

    if (!wavMeta || pcmParts.length === 0) {
      return NextResponse.json({ error: "No audio generated" }, { status: 502 });
    }

    const audioBuffer = buildWavFromPcm(wavMeta, pcmParts);
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "content-type": "audio/wav",
        "cache-control": "no-store"
      }
    });
  } catch {
    return NextResponse.json({ error: "Request invalid" }, { status: 400 });
  }
}
