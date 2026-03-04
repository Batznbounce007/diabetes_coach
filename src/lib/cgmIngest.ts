import { parse } from "csv-parse/sync";
import { z } from "zod";
import type { CgmSample } from "@/lib/types";

const rowSchema = z.object({
  Timestamp: z.string(),
  "Glucose mg/dL": z.string().optional(),
  "CGM Glucose Value (mg/dl)": z.string().optional()
});

function normalizeTimestamp(raw: string): Date | null {
  const iso = raw.replace(" ", "T") + "Z";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function parseGlookoCsv(csvContent: string): Promise<CgmSample[]> {
  const lines = csvContent.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const headerIndex = lines.findIndex(
    (line) =>
      line.includes("Timestamp") &&
      (line.includes("Glucose mg/dL") || line.includes("CGM Glucose Value (mg/dl)"))
  );

  const normalizedCsv =
    headerIndex >= 0 ? `${lines.slice(headerIndex).join("\n")}\n` : csvContent;

  const records = parse(normalizedCsv, {
    columns: true,
    trim: true,
    skip_empty_lines: true,
    relax_column_count: true,
    bom: true
  }) as Record<string, string>[];

  return records
    .map((record) => rowSchema.safeParse(record))
    .filter((parsed) => parsed.success)
    .map((parsed) => parsed.data)
    .map((row) => {
      const timestamp = normalizeTimestamp(row.Timestamp);
      const glucose = Number(
        row["Glucose mg/dL"] ?? row["CGM Glucose Value (mg/dl)"] ?? Number.NaN
      );

      if (!timestamp || Number.isNaN(glucose)) {
        return null;
      }

      return {
        timestamp,
        glucose
      } satisfies CgmSample;
    })
    .filter((sample): sample is CgmSample => sample !== null);
}

export async function upsertReadings(samples: CgmSample[]): Promise<number> {
  if (samples.length === 0) return 0;
  const { prisma } = await import("@/lib/prisma");

  const result = await prisma.cgmReading.createMany({
    data: samples.map((sample) => ({
      source: "glooko",
      timestamp: sample.timestamp,
      glucose: Math.round(sample.glucose)
    })),
    skipDuplicates: true
  });

  return result.count;
}
