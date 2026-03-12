"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import type { NewsItem } from "@/lib/news";
import { trustedSources } from "@/lib/news";

type NewsFeedPanelProps = {
  news: NewsItem[];
  lang: "de" | "en";
};

function formatDate(value: string, lang: "de" | "en"): string {
  if (!value) return lang === "de" ? "Ohne Datum" : "No date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return lang === "de" ? "Ohne Datum" : "No date";
  return format(date, "dd.MM.yyyy");
}

export function NewsFeedPanel({ news, lang }: NewsFeedPanelProps) {
  const [activeLink, setActiveLink] = useState<string | null>(null);
  const [summaryCache, setSummaryCache] = useState<
    Record<string, { summary: string; bullets: string[]; source: string }>
  >({});
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const t =
    lang === "de"
      ? {
          title: "Forschung & Devices",
          subtitle:
            "Relevante Updates zu Diabetes-Forschung, neuen CGMs, Pumpen und Closed-Loop-Systemen.",
          summaryLabel: "Zusammenfassung",
          summaryAction: "Summary anzeigen",
          summaryLoading: "Summary wird geladen …",
          summaryError: "Summary konnte nicht geladen werden.",
          close: "Schließen",
          empty:
            "Der News-Feed ist gerade nicht erreichbar. Nutze rechts die kuratierten Quellen.",
          bestSources: "Beste Quellen",
          bestSourcesHint: "Wissenschaftlich/klinisch relevante Quellen mit hoher Qualität."
        }
      : {
          title: "Research & Devices",
          subtitle:
            "Relevant updates on diabetes research, new CGMs, pumps, and closed-loop systems.",
          summaryLabel: "Summary",
          summaryAction: "Show summary",
          summaryLoading: "Loading summary …",
          summaryError: "Summary could not be loaded.",
          close: "Close",
          empty: "The news feed is currently unavailable. Use the curated sources on the right.",
          bestSources: "Best sources",
          bestSourcesHint: "High-quality scientific and clinically relevant sources."
        };

  const activeItem = useMemo(
    () => (activeLink ? news.find((item) => item.link === activeLink) ?? null : null),
    [activeLink, news]
  );

  async function handleSummary(item: NewsItem) {
    if (summaryCache[item.link]) {
      setActiveLink(item.link);
      return;
    }

    setSummaryError(null);
    setSummaryLoading(true);
    setActiveLink(item.link);

    try {
      const response = await fetch("/api/news-summary", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ link: item.link, title: item.title, lang })
      });

      if (!response.ok) throw new Error("summary_failed");
      const payload = (await response.json()) as {
        summary: string;
        bullets: string[];
      };
      setSummaryCache((prev) => ({
        ...prev,
        [item.link]: {
          summary: payload.summary,
          bullets: payload.bullets ?? [],
          source: item.source
        }
      }));
    } catch {
      setSummaryError(t.summaryError);
    } finally {
      setSummaryLoading(false);
    }
  }

  function closeSummary() {
    setActiveLink(null);
    setSummaryError(null);
    setSummaryLoading(false);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-xl font-semibold">{t.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t.subtitle}</p>

        {news.length === 0 ? (
          <div className="mt-4 rounded-lg border border-border p-4 text-sm text-muted-foreground">
            {t.empty}
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {news.map((item) => (
              <article key={item.link} className="rounded-lg border border-border p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full bg-secondary px-2 py-1">{item.topic}</span>
                  <span>{item.source}</span>
                  <span>{formatDate(item.publishedAt, lang)}</span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-semibold leading-6 text-foreground underline"
                  >
                    {item.title}
                  </a>
                  <button
                    type="button"
                    onClick={() => handleSummary(item)}
                    className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground transition hover:bg-secondary"
                  >
                    {t.summaryAction}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <aside className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-lg font-semibold">{t.bestSources}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{t.bestSourcesHint}</p>
        <ul className="mt-3 space-y-2 text-sm">
          {trustedSources.map((source) => (
            <li key={source.url} className="rounded-lg border border-border/70 p-3">
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-foreground underline"
              >
                {source.label}
              </a>
            </li>
          ))}
        </ul>
      </aside>

      {activeItem ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 px-4 py-10">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{t.summaryLabel}</p>
                <h3 className="mt-1 text-lg font-semibold">{activeItem.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{activeItem.source}</p>
              </div>
              <button
                type="button"
                onClick={closeSummary}
                className="rounded-full border border-border px-3 py-1 text-xs font-semibold"
              >
                {t.close}
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm text-foreground">
              {summaryLoading ? (
                <p className="text-muted-foreground">{t.summaryLoading}</p>
              ) : summaryError ? (
                <p className="text-red-500">{summaryError}</p>
              ) : summaryCache[activeItem.link] ? (
                <>
                  <p>{summaryCache[activeItem.link].summary}</p>
                  {summaryCache[activeItem.link].bullets.length > 0 ? (
                    <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                      {summaryCache[activeItem.link].bullets.map((bullet, idx) => (
                        <li key={`${activeItem.link}-bullet-${idx}`}>{bullet}</li>
                      ))}
                    </ul>
                  ) : null}
                </>
              ) : (
                <p className="text-muted-foreground">{t.summaryLoading}</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
