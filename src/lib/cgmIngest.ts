import { parse } from "csv-parse/sync";
import type { CgmSample } from "@/lib/types";

function normalizeTimestamp(raw: string): Date | null {
  const iso = raw.replace(" ", "T") + "Z";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

function detectDelimiter(line: string): string | undefined {
  if (line.includes(";") && !line.includes(",")) return ";";
  if (line.includes(",")) return ",";
  return undefined;
}

function pickField(
  record: Record<string, string>,
  patterns: RegExp[]
): string | undefined {
  const entries = Object.entries(record);
  for (const [key, value] of entries) {
    const normalized = key.toLowerCase();
    if (patterns.every((pattern) => pattern.test(normalized))) {
      return value;
    }
  }
  return undefined;
}

export async function parseGlookoCsv(csvContent: string): Promise<CgmSample[]> {
  const lines = csvContent.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const headerIndex = lines.findIndex(
    (line) =>
      /timestamp|zeit|datum/i.test(line) &&
      /(glucose|glukose|cgm)/i.test(line)
  );

  const normalizedCsv = headerIndex >= 0 ? `${lines.slice(headerIndex).join("\n")}\n` : csvContent;
  const delimiter = detectDelimiter(lines[headerIndex >= 0 ? headerIndex : 0] ?? "");

  const records = parse(normalizedCsv, {
    columns: true,
    trim: true,
    skip_empty_lines: true,
    relax_column_count: true,
    bom: true,
    delimiter
  }) as Record<string, string>[];

  return records
    .map((row) => {
      const timestampRaw =
        row.Timestamp ??
        row.Zeitstempel ??
        row["Datum/Uhrzeit"] ??
        pickField(row, [/timestamp|zeit|datum/]);
      const glucoseRaw =
        row["Glucose mg/dL"] ??
        row["Glucose (mg/dl)"] ??
        row["Glukose mg/dl"] ??
        row["Glukose (mg/dl)"] ??
        row["CGM Glucose Value (mg/dl)"] ??
        row["CGM Glukosewert (mg/dl)"] ??
        pickField(row, [/(glucose|glukose|cgm)/, /mg\/?dl/]);

      const timestamp = timestampRaw ? normalizeTimestamp(String(timestampRaw)) : null;
      const glucose = glucoseRaw
        ? Number(String(glucoseRaw).replace(",", "."))
        : Number.NaN;

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
  const timestamps = samples.map((sample) => sample.timestamp.getTime());
  const minTimestamp = new Date(Math.min(...timestamps));
  const maxTimestamp = new Date(Math.max(...timestamps));

  const result = await prisma.$transaction(async (tx) => {
    await tx.cgmReading.deleteMany({
      where: {
        source: "glooko",
        timestamp: {
          gte: minTimestamp,
          lte: maxTimestamp
        }
      }
    });

    return tx.cgmReading.createMany({
      data: samples.map((sample) => ({
        source: "glooko",
        timestamp: sample.timestamp,
        glucose: Math.round(sample.glucose)
      })),
      skipDuplicates: true
    });
  });

  return result.count;
}
