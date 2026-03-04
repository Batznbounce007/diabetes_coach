"use client";

import { useRouter } from "next/navigation";

type ShareRange = "1d" | "7d" | "14d" | "30d";

type ShareRangeFilterProps = {
  lang: "de" | "en";
  currentRange: ShareRange;
  chartMode: "line" | "agp";
  timeBucket: "all" | "night" | "morning" | "afternoon" | "evening";
};

export function ShareRangeFilter({
  lang,
  currentRange,
  chartMode,
  timeBucket
}: ShareRangeFilterProps) {
  const router = useRouter();
  const label = lang === "de" ? "Zeitraum für Teilen" : "Sharing range";
  const day1 = lang === "de" ? "1 Tag" : "1 day";
  const day7 = lang === "de" ? "7 Tage" : "7 days";
  const day14 = lang === "de" ? "14 Tage" : "14 days";
  const day30 = lang === "de" ? "30 Tage" : "30 days";

  function onRangeChange(value: string) {
    const nextRange: ShareRange =
      value === "7d" || value === "14d" || value === "30d" ? value : "1d";
    const params = new URLSearchParams({
      tab: "share",
      lang,
      range: nextRange,
      chartMode,
      timeBucket
    });
    router.replace(`/dashboard?${params.toString()}`, { scroll: false });
  }

  return (
    <label className="space-y-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <select
        value={currentRange}
        onChange={(event) => onRangeChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-border bg-background px-3"
      >
        <option value="1d">{day1}</option>
        <option value="7d">{day7}</option>
        <option value="14d">{day14}</option>
        <option value="30d">{day30}</option>
      </select>
    </label>
  );
}
