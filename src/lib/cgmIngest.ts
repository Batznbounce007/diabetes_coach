import { parse } from "csv-parse/sync";
import { parse as parseDate, isValid } from "date-fns";
import type { CgmSample } from "@/lib/types";

function normalizeTimestamp(raw: string): Date | null {
  const trimmed = raw.trim();
  const isoCandidate = trimmed.replace(" ", "T");
  const isoWithZ = isoCandidate.endsWith("Z") ? isoCandidate : `${isoCandidate}Z`;
  const isoDate = new Date(isoWithZ);
  if (!Number.isNaN(isoDate.getTime())) return isoDate;

  const formats = [
    "dd.MM.yyyy HH:mm",
    "dd.MM.yyyy HH:mm:ss",
    "dd/MM/yyyy HH:mm",
    "dd/MM/yyyy HH:mm:ss"
  ];

  for (const format of formats) {
    const parsed = parseDate(trimmed, format, new Date());
    if (isValid(parsed)) return parsed;
  }

  return null;
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

function normalizeRecord(record: Record<string, string>): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(record)) {
    const cleanedKey = key.replace(/^\uFEFF/, "").trim();
    normalized[cleanedKey] = value;
  }
  return normalized;
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
      const normalizedRow = normalizeRecord(row);
      const timestampRaw =
        normalizedRow.Timestamp ??
        normalizedRow.Zeitstempel ??
        normalizedRow["Datum/Uhrzeit"] ??
        pickField(normalizedRow, [/timestamp|zeit|datum/]);
      const glucoseRaw =
        normalizedRow["Glucose mg/dL"] ??
        normalizedRow["Glucose (mg/dl)"] ??
        normalizedRow["Glukose mg/dl"] ??
        normalizedRow["Glukose (mg/dl)"] ??
        normalizedRow["CGM Glucose Value (mg/dl)"] ??
        normalizedRow["CGM Glukosewert (mg/dl)"] ??
        pickField(normalizedRow, [/(glucose|glukose|cgm)/, /mg\/?dl/]);

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
