import type { CgmSample } from "@/lib/types";

export type TimeBucket = "all" | "night" | "morning" | "afternoon" | "evening";
export type ZoneFilter = "all" | "in" | "high" | "low";
export type RangeFilter = "1d" | "7d" | "14d" | "30d";

export type DashboardFilters = {
  range: RangeFilter;
  timeBucket: TimeBucket;
  zone: ZoneFilter;
};

export type DailyTirPoint = {
  day: string;
  tir: number;
  avg: number;
  sd: number;
};

const defaultFilters: DashboardFilters = {
  range: "14d",
  timeBucket: "all",
  zone: "all"
};

export function getDefaultDashboardFilters(): DashboardFilters {
  return defaultFilters;
}

export function getRangeDays(range: RangeFilter): number {
  const mapping: Record<RangeFilter, number> = {
    "1d": 1,
    "7d": 7,
    "14d": 14,
    "30d": 30
  };
  return mapping[range];
}

export function parseDashboardFilters(input: Record<string, string | undefined>): DashboardFilters {
  const range = ["1d", "7d", "14d", "30d"].includes(input.range ?? "")
    ? (input.range as RangeFilter)
    : defaultFilters.range;
  const timeBucket = ["all", "night", "morning", "afternoon", "evening"].includes(
    input.timeBucket ?? ""
  )
    ? (input.timeBucket as TimeBucket)
    : defaultFilters.timeBucket;
  const zone = ["all", "in", "high", "low"].includes(input.zone ?? "")
    ? (input.zone as ZoneFilter)
    : defaultFilters.zone;

  return { range, timeBucket, zone };
}

function berlinHour(date: Date): number {
  const hour = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    hour12: false,
    timeZone: "Europe/Berlin"
  }).format(date);
  return Number(hour);
}

function berlinDay(date: Date): string {
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Europe/Berlin"
  }).format(date);
}

function inTimeBucket(date: Date, bucket: TimeBucket): boolean {
  if (bucket === "all") return true;
  const hour = berlinHour(date);

  if (bucket === "night") return hour < 6;
  if (bucket === "morning") return hour >= 6 && hour < 12;
  if (bucket === "afternoon") return hour >= 12 && hour < 18;
  return hour >= 18;
}

function inZone(glucose: number, zone: ZoneFilter): boolean {
  if (zone === "all") return true;
  if (zone === "in") return glucose >= 70 && glucose <= 180;
  if (zone === "high") return glucose > 180;
  return glucose < 70;
}

export function filterReadings(readings: CgmSample[], filters: DashboardFilters): CgmSample[] {
  return readings.filter(
    (reading) => inTimeBucket(reading.timestamp, filters.timeBucket) && inZone(reading.glucose, filters.zone)
  );
}

export function buildDailyTirSeries(readings: CgmSample[]): DailyTirPoint[] {
  const byDay = new Map<string, number[]>();

  for (const reading of readings) {
    const key = berlinDay(reading.timestamp);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)?.push(reading.glucose);
  }

  return [...byDay.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, values]) => {
      const inRange = values.filter((value) => value >= 70 && value <= 180).length;
      const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
      const variance =
        values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length;
      const sd = Math.sqrt(variance);
      return {
        day,
        tir: Number(((inRange / values.length) * 100).toFixed(2)),
        avg: Number(avg.toFixed(1)),
        sd: Number(sd.toFixed(1))
      };
    });
}

export function averageGlucose(readings: CgmSample[]): number {
  if (readings.length === 0) return 0;
  return Number(
    (readings.reduce((sum, reading) => sum + reading.glucose, 0) / readings.length).toFixed(1)
  );
}
