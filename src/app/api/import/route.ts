import { NextRequest, NextResponse } from "next/server";
import { parseGlookoCsv, upsertReadings } from "@/lib/cgmIngest";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body.csv !== "string") {
    return NextResponse.json(
      { error: "Body must include a 'csv' field." },
      { status: 400 }
    );
  }

  const samples = await parseGlookoCsv(body.csv);
  const inserted = await upsertReadings(samples);

  return NextResponse.json({ inserted, samples: samples.length });
}
