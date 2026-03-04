import { describe, expect, it } from "vitest";
import {
  buildDailyTirSeries,
  filterReadings,
  getDefaultDashboardFilters,
  parseDashboardFilters
} from "@/lib/dashboardFilters";

const samples = [
  { timestamp: new Date("2026-03-01T04:00:00.000Z"), glucose: 65 },
  { timestamp: new Date("2026-03-01T08:00:00.000Z"), glucose: 105 },
  { timestamp: new Date("2026-03-01T12:00:00.000Z"), glucose: 185 },
  { timestamp: new Date("2026-03-02T08:00:00.000Z"), glucose: 140 },
  { timestamp: new Date("2026-03-02T12:00:00.000Z"), glucose: 160 }
];

describe("dashboard filters", () => {
  it("parses defaults", () => {
    const parsed = parseDashboardFilters({});
    expect(parsed).toEqual(getDefaultDashboardFilters());
  });

  it("filters by glucose zone", () => {
    const low = filterReadings(samples, {
      ...getDefaultDashboardFilters(),
      zone: "low"
    });
    expect(low).toHaveLength(1);
    expect(low[0].glucose).toBe(65);
  });

  it("filters by time bucket", () => {
    const morning = filterReadings(samples, {
      ...getDefaultDashboardFilters(),
      timeBucket: "morning"
    });
    expect(morning.map((item) => item.glucose)).toEqual([105, 140]);
  });

  it("builds daily tir series", () => {
    const series = buildDailyTirSeries(samples);
    expect(series).toHaveLength(2);
    expect(series[0].tir).toBeCloseTo(33.33, 1);
    expect(series[1].tir).toBe(100);
  });
});
