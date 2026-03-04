import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { emptyCoachProfile } from "@/lib/coachProfile";
import { resolveSystemQa } from "@/lib/systemQa";
import { generateAiAnswer, trimConversation, type QaChatMessage } from "@/lib/systemQaAi";

const requestSchema = z.object({
  question: z.string().trim().min(3),
  lang: z.enum(["de", "en"]).optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1)
      })
    )
    .optional(),
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
    .optional()
});

export async function POST(request: NextRequest) {
  try {
    const payload = requestSchema.parse(await request.json());
    const profile = { ...emptyCoachProfile, ...(payload.profile ?? {}) };
    const resolved = resolveSystemQa(payload.question, profile, 4);
    const history = trimConversation((payload.history ?? []) as QaChatMessage[], 8);
    const aiAnswer = await generateAiAnswer({
      question: payload.question,
      profile,
      matches: resolved.matches,
      history,
      lang: payload.lang ?? "de"
    });

    return NextResponse.json({
      answer: aiAnswer ?? resolved.answer,
      matches: resolved.matches,
      confidence: aiAnswer ? "high" : resolved.confidence,
      mode: aiAnswer ? "ai" : "fallback"
    });
  } catch {
    return NextResponse.json(
      {
        error: "Request invalid"
      },
      { status: 400 }
    );
  }
}
