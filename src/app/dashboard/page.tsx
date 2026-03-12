import Link from "next/link";
import { endOfDay, format, startOfDay, subDays } from "date-fns";
import { CgmChart } from "@/components/cgm-chart";
import { CgmAgpChart } from "@/components/cgm-agp-chart";
import { CoachProfilePanel } from "@/components/coach-profile-panel";
import { DashboardTabs } from "@/components/dashboard-tabs";
import { DailyTirChart } from "@/components/daily-tir-chart";
import { NewsFeedPanel } from "@/components/news-feed-panel";
import { TirDistribution } from "@/components/tir-distribution";
import { ShareEmailPanel } from "@/components/share-email-panel";
import { SystemQaPanel } from "@/components/system-qa-panel";
import { SummaryKpi } from "@/components/summary-kpi";
import { Card } from "@/components/ui/card";
import { CarbPhotoPanel } from "@/components/carb-photo-panel";
import {
  averageGlucose,
  buildDailyTirSeries,
  filterReadings,
  getDefaultDashboardFilters,
  getRangeDays,
  parseDashboardFilters
} from "@/lib/dashboardFilters";
import { buildDailyInsight } from "@/lib/insights";
import { getCachedNewsDigest } from "@/lib/news";
import { prisma } from "@/lib/prisma";
import type { CgmSample } from "@/lib/types";
import { buildAgpSeries, type AgpPoint } from "@/lib/agp";
import { generateCoachingCopy } from "@/lib/coachingAi";

type DashboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type DashboardTab = "dashboard" | "coach" | "share" | "systems" | "news" | "carbs";
type Lang = "de" | "en";
type ChartMode = "line" | "agp";

export const dynamic = "force-dynamic";

const recommendationTranslations = {
  "No data found for this day. Verify Glooko export and sync job.":
    "Keine Daten für diesen Tag gefunden. Bitte Glooko-Export und Sync-Job prüfen.",
  "Strong control: keep meals and activity timing consistent.":
    "Starke Kontrolle: Behalte Timing von Mahlzeiten und Aktivität konsistent.",
  "TIR is below target. Review meals with largest post-meal rise and adjust insulin timing.":
    "TIR liegt unter dem Ziel. Prüfe Mahlzeiten mit den stärksten Anstiegen nach dem Essen und passe das Insulin-Timing an.",
  "Variance is elevated. Focus on reducing large swings at specific times of day.":
    "Varianz ist erhöht. Reduziere größere Schwankungen zu bestimmten Tageszeiten."
} as const;

const motivationalTranslations = {
  "You are building consistency one reading at a time.":
    "Du baust Konsistenz auf, Wert für Wert.",
  "Progress compounds when you stay in range repeatedly.":
    "Fortschritt verstärkt sich, wenn du wiederholt im Zielbereich bleibst.",
  "Your focus today is setting up tomorrow's stable glucose.":
    "Dein Fokus heute schafft stabile Glukosewerte für morgen.",
  "Small improvements in variance have huge long-term impact.":
    "Kleine Verbesserungen bei der Varianz haben große Langzeitwirkung."
} as const;

function localizeRecommendationText(text: string, lang: Lang): string {
  if (lang === "en") return text;
  return recommendationTranslations[text as keyof typeof recommendationTranslations] ?? text;
}

function localizeMotivationText(text: string, lang: Lang): string {
  if (lang === "en") return text;
  return motivationalTranslations[text as keyof typeof motivationalTranslations] ?? text;
}

function getParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function parseTab(value: string | undefined): DashboardTab {
  if (
    value === "coach" ||
    value === "share" ||
    value === "systems" ||
    value === "news" ||
    value === "carbs"
  ) {
    return value;
  }
  return "dashboard";
}

function parseLang(value: string | undefined): Lang {
  return value === "en" ? "en" : "de";
}

function parseChartMode(value: string | undefined): ChartMode {
  return value === "agp" ? "agp" : "line";
}

async function loadReadings(from: Date, to: Date): Promise<CgmSample[]> {
  try {
    const readings = await Promise.race([
      prisma.cgmReading.findMany({
        where: {
          timestamp: {
            gte: from,
            lte: to
          }
        },
        orderBy: {
          timestamp: "asc"
        }
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("DB timeout")), 3000)
      )
    ]);

    return readings.map((reading) => ({
      timestamp: reading.timestamp,
      glucose: reading.glucose
    }));
  } catch {
    return [];
  }
}

function calculateMedian(readings: CgmSample[]): number {
  if (readings.length === 0) return 0;
  const sorted = readings.map((item) => item.glucose).sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(1));
  }
  return Number(sorted[mid].toFixed(1));
}

function buildRangeLabel(range: string, lang: Lang): string {
  if (lang === "de") {
    if (range === "1d") return "letzten 24 Stunden";
    if (range === "7d") return "letzten 7 Tage";
    if (range === "14d") return "letzten 14 Tage";
    if (range === "30d") return "letzten 30 Tage";
    return "gewählten Zeitraum";
  }
  if (range === "1d") return "last 24 hours";
  if (range === "7d") return "last 7 days";
  if (range === "14d") return "last 14 days";
  if (range === "30d") return "last 30 days";
  return "selected period";
}

function buildRangeOptionLabel(range: string, lang: Lang, now: Date): string {
  const days = getRangeDays(range);
  const start = startOfDay(subDays(now, days - 1));
  const end = endOfDay(now);
  const formatted = `${format(start, "dd.MM.yyyy")} - ${format(end, "dd.MM.yyyy")}`;
  if (lang === "de") {
    if (range === "1d") return `1 Tag (${formatted})`;
    if (range === "7d") return `7 Tage (${formatted})`;
    if (range === "14d") return `14 Tage (${formatted})`;
    if (range === "30d") return `30 Tage (${formatted})`;
    return `${days} Tage (${formatted})`;
  }
  if (range === "1d") return `1 day (${formatted})`;
  return `${days} days (${formatted})`;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const tab = parseTab(getParam(resolvedSearchParams.tab));
  const lang = parseLang(getParam(resolvedSearchParams.lang));
  const chartMode = parseChartMode(getParam(resolvedSearchParams.chartMode));
  const filters = parseDashboardFilters({
    range: getParam(resolvedSearchParams.range),
    timeBucket: getParam(resolvedSearchParams.timeBucket),
    zone: getDefaultDashboardFilters().zone
  });

  const now = new Date();
  const latestSummary = await prisma.dailySummary
    .findFirst({
      orderBy: {
        day: "desc"
      }
    })
    .catch(() => null);

  let filteredReadings: CgmSample[] = [];
  let chartPoints: Array<{ time: string; glucose: number }> = [];
  let dailyTir: Array<{ day: string; tir: number; avg: number; sd: number }> = [];
  let agpPoints: AgpPoint[] = [];
  let news = [] as Awaited<ReturnType<typeof getCachedNewsDigest>>;

  if (tab === "dashboard") {
    const rangeStart = startOfDay(subDays(now, getRangeDays(filters.range) - 1));
    const rangeEnd = endOfDay(now);
    const rangeReadings = await loadReadings(rangeStart, rangeEnd);

    filteredReadings = filterReadings(rangeReadings, filters);
    chartPoints = filteredReadings.slice(-320).map((reading) => ({
      time: `${reading.timestamp.toISOString().slice(5, 10)} ${reading.timestamp
        .toISOString()
        .slice(11, 16)}`,
      glucose: reading.glucose
    }));
    agpPoints = buildAgpSeries(filteredReadings);
    dailyTir = buildDailyTirSeries(filteredReadings);
  } else if (tab === "coach") {
    // Coach tab analyzes the last 7 days.
    const from = startOfDay(subDays(now, 6));
    const to = endOfDay(now);
    filteredReadings = await loadReadings(from, to);
  } else if (tab === "share") {
    // Share tab supports selectable range (1/7/14/30 days).
    const from = startOfDay(subDays(now, getRangeDays(filters.range) - 1));
    const to = endOfDay(now);
    filteredReadings = await loadReadings(from, to);
  } else if (tab === "news") {
    news = await getCachedNewsDigest(18);
  }

  const insight = buildDailyInsight(filteredReadings, latestSummary?.streakDays ?? 0);
  const recommendationText = localizeRecommendationText(insight.recommendation, lang);
  const motivationalText = localizeMotivationText(insight.motivationalMessage, lang);
  const avgGlucose = averageGlucose(filteredReadings);
  const medianGlucose = calculateMedian(filteredReadings);
  const lows = filteredReadings.filter((entry) => entry.glucose < 70).length;
  const highs = filteredReadings.filter((entry) => entry.glucose > 180).length;
  const inRangeCount = filteredReadings.filter((entry) => entry.glucose >= 70 && entry.glucose <= 180).length;
  const totalCount = filteredReadings.length || 1;
  const lowPercent = (lows / totalCount) * 100;
  const inRangePercent = (inRangeCount / totalCount) * 100;
  const highPercent = (highs / totalCount) * 100;
  const rangeLabel = buildRangeLabel(filters.range, lang);
  const aiCoachingCopy = await generateCoachingCopy({
    lang,
    rangeLabel,
    tirPercent: insight.tirPercent,
    avgGlucose,
    medianGlucose,
    stdDev: insight.stdDev,
    cv: insight.coefficientVariance,
    lowPercent,
    inRangePercent,
    highPercent,
    streakDays: latestSummary?.streakDays ?? 0
  });
  const coachingAssessment = aiCoachingCopy?.assessment ?? recommendationText;
  const therapyActions = aiCoachingCopy?.actions ?? [];
  const motivationBoost = aiCoachingCopy?.motivation ?? motivationalText;
  const coachFocusMessage = therapyActions[0] ?? coachingAssessment;
  const coachGoalGuidance = therapyActions[1] ?? therapyActions[0] ?? coachingAssessment;

  const emailSubject = `CGM Tagesbericht ${format(new Date(), "dd.MM.yyyy")}`;
  const emailBody = [
    "Hallo,",
    "",
    "hier ist mein aktueller CGM-Überblick:",
    "",
    `CGM Update (${format(new Date(), "yyyy-MM-dd")})`,
    `TIR: ${insight.tirPercent.toFixed(1)}%`,
    `Avg: ${avgGlucose.toFixed(1)} mg/dL`,
    `SD: ${insight.stdDev.toFixed(1)} mg/dL`,
    `Streak: ${latestSummary?.streakDays ?? 0} day(s)`,
    `Focus: ${insight.recommendation}`,
    "",
    "Viele Grüße"
  ].join("\n");

  const title = lang === "de" ? "CGM Pulse" : "CGM Pulse";
  const subtitle =
    lang === "de"
      ? "Verstehe deine Werte, Coaching-Impulse und Steps zur täglichen Verbesserung"
      : "Understand your values, coaching insights, and daily improvement steps";
  const filterRangeLabel = lang === "de" ? "Zeitraum" : "Range";
  const filterTimeLabel = lang === "de" ? "Tageszeit" : "Time of day";
  const applyFilterLabel = lang === "de" ? "Filter anwenden" : "Apply filters";
  const curveTitle = lang === "de" ? "Glukosekurve (filtered)" : "Glucose curve (filtered)";
  const curveModeLineLabel = lang === "de" ? "Verlauf (1 Tag)" : "Trend (1 day)";
  const curveModeAgpLabel = lang === "de" ? "AGP (14 Tage)" : "AGP (14 days)";
  const dailyOverviewTitle = lang === "de" ? "Tagesübersicht" : "Daily overview";
  const dailyTirTitle = lang === "de" ? "TIR je Tag" : "TIR by day";
  const dayLabel = lang === "de" ? "Tag" : "Day";
  const varianceLabel = lang === "de" ? "Varianz" : "Variance";
  const coachingTitle = lang === "de" ? "Diabetes Coaching" : "Diabetes Coaching";
  const motivationTitle = lang === "de" ? "Motivation" : "Motivation";
  const lowLabel = lang === "de" ? "Niedrig" : "Low";
  const inRangeLabel = lang === "de" ? "Zielbereich" : "In range";
  const highLabel = lang === "de" ? "Hoch" : "High";
  const coachingSummaryLabel = lang === "de" ? "Diabetes Coach" : "Diabetes Coach";
  const coachingActionsLabel = lang === "de" ? "Therapie-Fokus (wichtigste Hebel)" : "Therapy focus (key levers)";
  const shareTitle = lang === "de" ? "Teilen" : "Share";
  const shareText =
    lang === "de"
      ? "Diese Zusammenfassung kannst du per E-Mail mit deinem Behandlungsteam teilen."
      : "Share this summary via email with your care team.";

  const langParams = new URLSearchParams({
    tab,
    range: filters.range,
    timeBucket: filters.timeBucket,
    chartMode
  });
  const hrefDe = `/dashboard?${new URLSearchParams({
    ...Object.fromEntries(langParams),
    lang: "de"
  }).toString()}`;
  const hrefEn = `/dashboard?${new URLSearchParams({
    ...Object.fromEntries(langParams),
    lang: "en"
  }).toString()}`;

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-10">
      <section className="mb-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
            <p className="text-muted-foreground">{subtitle}</p>
          </div>
          <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-card p-1 text-xs">
            <Link
              href={hrefDe}
              scroll={false}
              aria-label="Sprache auf Deutsch setzen"
              title="Deutsch"
              className={`rounded-md px-2 py-1 font-semibold ${
                lang === "de" ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
              }`}
            >
              🇩🇪
            </Link>
            <Link
              href={hrefEn}
              scroll={false}
              aria-label="Switch language to English"
              title="English"
              className={`rounded-md px-2 py-1 font-semibold ${
                lang === "en" ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
              }`}
            >
              🇬🇧
            </Link>
          </div>
        </div>
      </section>

      <section className="sticky top-3 z-40 mb-6">
        <DashboardTabs
          currentTab={tab}
          range={filters.range}
          timeBucket={filters.timeBucket}
          lang={lang}
          chartMode={chartMode}
        />
      </section>

      {tab === "dashboard" ? (
        <>
          <Card className="mb-6">
            <form className="grid gap-3 md:grid-cols-3">
              <input type="hidden" name="tab" value="dashboard" />
              <input type="hidden" name="lang" value={lang} />
              <input type="hidden" name="chartMode" value={chartMode} />
              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">{filterRangeLabel}</span>
                <select
                  name="range"
                  defaultValue={filters.range}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3"
                >
                  <option value="1d">{buildRangeOptionLabel("1d", lang, now)}</option>
                  <option value="7d">{buildRangeOptionLabel("7d", lang, now)}</option>
                  <option value="14d">{buildRangeOptionLabel("14d", lang, now)}</option>
                  <option value="30d">{buildRangeOptionLabel("30d", lang, now)}</option>
                </select>
              </label>

              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">{filterTimeLabel}</span>
                <select
                  name="timeBucket"
                  defaultValue={filters.timeBucket}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3"
                >
                  <option value="all">Alle</option>
                  <option value="night">Nacht (00-06)</option>
                  <option value="morning">Morgen (06-12)</option>
                  <option value="afternoon">Nachmittag (12-18)</option>
                  <option value="evening">Abend (18-24)</option>
                </select>
              </label>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="h-10 w-full rounded-lg bg-primary px-4 font-semibold text-primary-foreground"
                >
                  {applyFilterLabel}
                </button>
              </div>
            </form>
          </Card>

          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <SummaryKpi
              title="Time in Range"
              value={`${insight.tirPercent.toFixed(1)}%`}
              subtitle="Ziel: > 70%"
              variant={insight.tirPercent >= 70 ? "success" : "improve"}
            />
            <SummaryKpi
              title="Durchschnitt"
              value={`${avgGlucose.toFixed(1)} mg/dL`}
              subtitle="Ziel: 80-160 mg/dL"
              variant={avgGlucose >= 80 && avgGlucose <= 160 ? "success" : "improve"}
            />
            <SummaryKpi
              title="Median"
              value={`${medianGlucose.toFixed(1)} mg/dL`}
              subtitle="Robuster Tageswert"
              variant={medianGlucose >= 80 && medianGlucose <= 160 ? "success" : "improve"}
            />
            <SummaryKpi
              title="Streuung (SD)"
              value={`${insight.stdDev.toFixed(1)} mg/dL`}
              subtitle={`CV: ${insight.coefficientVariance.toFixed(1)}%`}
              variant={insight.stdDev <= 35 ? "success" : "improve"}
            />
            <SummaryKpi
              title="Streak"
              value={`${latestSummary?.streakDays ?? 0} Tage`}
              subtitle="TIR > 70%"
              variant={(latestSummary?.streakDays ?? 0) > 0 ? "success" : "improve"}
            />
          </section>

          <section className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
            <Card>
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">{curveTitle}</h2>
                <div className="inline-flex rounded-lg border border-border bg-background p-1 text-xs">
                  <Link
                    href={`/dashboard?${new URLSearchParams({
                      tab: "dashboard",
                      range: filters.range,
                      timeBucket: filters.timeBucket,
                      lang,
                      chartMode: "line"
                    }).toString()}`}
                    scroll={false}
                    className={`rounded-md px-3 py-1 font-semibold ${
                      chartMode === "line"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    {curveModeLineLabel}
                  </Link>
                  <Link
                    href={`/dashboard?${new URLSearchParams({
                      tab: "dashboard",
                      range: filters.range,
                      timeBucket: filters.timeBucket,
                      lang,
                      chartMode: "agp"
                    }).toString()}`}
                    scroll={false}
                    className={`rounded-md px-3 py-1 font-semibold ${
                      chartMode === "agp"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    {curveModeAgpLabel}
                  </Link>
                </div>
              </div>
              {chartMode === "agp" ? (
                <CgmAgpChart points={agpPoints} lang={lang} />
              ) : (
                <CgmChart points={chartPoints} />
              )}
            </Card>

            <Card className="space-y-4">
              <h2 className="text-lg font-semibold">{coachingTitle}</h2>
              <p className="text-sm text-muted-foreground">{coachingAssessment}</p>
              <TirDistribution
                lowPercent={lowPercent}
                inRangePercent={inRangePercent}
                highPercent={highPercent}
                lowLabel={lowLabel}
                inRangeLabel={inRangeLabel}
                highLabel={highLabel}
              />
              <div className="rounded-xl border border-border bg-secondary/30 p-4">
                <p className="text-sm font-semibold">{coachingSummaryLabel}</p>
                <p className="mt-1 text-sm text-muted-foreground">{coachingAssessment}</p>
                {therapyActions.length > 0 ? (
                  <>
                    <p className="mt-3 text-sm font-semibold">{coachingActionsLabel}</p>
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                      {therapyActions.map((action) => (
                        <li key={action}>{action}</li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </div>
              <div className="rounded-xl bg-secondary/70 p-4">
                <p className="text-sm font-semibold">{motivationTitle}</p>
                <p className="mt-1 text-sm text-secondary-foreground">{motivationBoost}</p>
              </div>
            </Card>
          </section>

          <section className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
            <Card>
              <h2 className="mb-4 text-lg font-semibold">{dailyTirTitle}</h2>
              <DailyTirChart points={dailyTir} />
            </Card>

            <Card>
              <h2 className="mb-3 text-lg font-semibold">{dailyOverviewTitle}</h2>
              <div className="max-h-72 overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="py-2">{dayLabel}</th>
                      <th className="py-2">TIR</th>
                      <th className="py-2">Ø mg/dL</th>
                      <th className="py-2">{varianceLabel}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyTir.slice().reverse().map((row) => (
                      <tr key={row.day} className="border-b border-border/60">
                        <td className="py-2">{row.day}</td>
                        <td className="py-2">{row.tir.toFixed(1)}%</td>
                        <td className="py-2">{row.avg.toFixed(1)}</td>
                        <td className="py-2">{row.sd.toFixed(1)} mg/dL</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </section>
        </>
      ) : null}

      {tab === "coach" ? (
        <CoachProfilePanel
          recommendation={coachingAssessment}
          focusMessage={coachFocusMessage}
          goalGuidance={coachGoalGuidance}
          therapyActions={therapyActions}
          motivationalMessage={motivationBoost}
          podcastMetrics={{
            rangeLabel,
            tirPercent: insight.tirPercent,
            avgGlucose,
            medianGlucose,
            stdDev: insight.stdDev,
            cv: insight.coefficientVariance,
            lowPercent,
            inRangePercent,
            highPercent,
            streakDays: latestSummary?.streakDays ?? 0
          }}
          lang={lang}
        />
      ) : null}

      {tab === "share" ? (
        <section className="grid gap-4 md:grid-cols-2">
          <Card className="space-y-3">
            <h2 className="text-xl font-semibold">{shareTitle}</h2>
            <p className="text-sm text-muted-foreground">{shareText}</p>
            <ShareEmailPanel subject={emailSubject} body={emailBody} lang={lang} />
          </Card>

          <Card className="space-y-3">
            <h3 className="text-lg font-semibold">Snapshot</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-secondary/60 p-3">
                <p className="text-muted-foreground">TIR</p>
                <p className="text-xl font-bold">{insight.tirPercent.toFixed(1)}%</p>
              </div>
              <div className="rounded-lg bg-secondary/60 p-3">
                <p className="text-muted-foreground">Durchschnitt</p>
                <p className="text-xl font-bold">{avgGlucose.toFixed(1)}</p>
              </div>
              <div className="rounded-lg bg-secondary/60 p-3">
                <p className="text-muted-foreground">SD</p>
                <p className="text-xl font-bold">{insight.stdDev.toFixed(1)}</p>
              </div>
              <div className="rounded-lg bg-secondary/60 p-3">
                <p className="text-muted-foreground">Streak</p>
                <p className="text-xl font-bold">{latestSummary?.streakDays ?? 0}</p>
              </div>
            </div>
          </Card>
        </section>
      ) : null}

      {tab === "systems" ? <SystemQaPanel lang={lang} /> : null}
      {tab === "news" ? <NewsFeedPanel news={news} lang={lang} /> : null}
      {tab === "carbs" ? <CarbPhotoPanel lang={lang} /> : null}
    </main>
  );
}
