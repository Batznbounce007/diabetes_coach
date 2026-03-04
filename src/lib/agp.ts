import type { CgmSample } from "@/lib/types";

export type AgpPoint = {
  slot: number;
  hourLabel: string;
  min: number;
  p10: number;
  p25: number;
  median: number;
  p75: number;
  p90: number;
  max: number;
};

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const next = sorted[base + 1] ?? sorted[base];
  return sorted[base] + rest * (next - sorted[base]);
}

function getHourInBerlin(date: Date): number {
  const hour = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    hour12: false,
    timeZone: "Europe/Berlin"
  }).format(date);

  return Number(hour);
}

function formatHourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

export function buildAgpSeries(readings: CgmSample[]): AgpPoint[] {
  const bins = new Map<number, number[]>();
  for (let hour = 0; hour < 24; hour += 1) bins.set(hour, []);

  for (const reading of readings) {
    const hour = getHourInBerlin(reading.timestamp);
    bins.get(hour)?.push(reading.glucose);
  }

  return Array.from(bins.entries()).map(([hour, values]) => {
    const sorted = [...values].sort((a, b) => a - b);

    if (sorted.length === 0) {
      return {
        slot: hour,
        hourLabel: formatHourLabel(hour),
        min: 0,
        p10: 0,
        p25: 0,
        median: 0,
        p75: 0,
        p90: 0,
        max: 0
      };
    }

    return {
      slot: hour,
      hourLabel: formatHourLabel(hour),
      min: Number(sorted[0].toFixed(1)),
      p10: Number(quantile(sorted, 0.1).toFixed(1)),
      p25: Number(quantile(sorted, 0.25).toFixed(1)),
      median: Number(quantile(sorted, 0.5).toFixed(1)),
      p75: Number(quantile(sorted, 0.75).toFixed(1)),
      p90: Number(quantile(sorted, 0.9).toFixed(1)),
      max: Number(sorted[sorted.length - 1].toFixed(1))
    };
  });
}
