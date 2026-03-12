"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import type { NewsItem } from "@/lib/news";
import { trustedSources } from "@/lib/newsSources";

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
          summaryActionShort: "Summary",
          summaryLoading: "Summary wird geladen …",
          summaryError: "Summary konnte nicht geladen werden.",
          close: "Schließen",
          navHint: "Pfeile wechseln",
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
          summaryActionShort: "Summary",
          summaryLoading: "Loading summary …",
          summaryError: "Summary could not be loaded.",
          close: "Close",
          navHint: "Arrow keys",
          empty: "The news feed is currently unavailable. Use the curated sources on the right.",
          bestSources: "Best sources",
          bestSourcesHint: "High-quality scientific and clinically relevant sources."
        };

  const activeItem = useMemo(
    () => (activeLink ? news.find((item) => item.link === activeLink) ?? null : null),
    [activeLink, news]
  );

  const activeIndex = useMemo(
    () => (activeItem ? news.findIndex((item) => item.link === activeItem.link) : -1),
    [activeItem, news]
  );

  function navigateSummary(direction: "prev" | "next") {
    if (!news.length || activeIndex === -1) return;
    const delta = direction === "next" ? 1 : -1;
    const nextIndex = (activeIndex + delta + news.length) % news.length;
    setActiveLink(news[nextIndex]?.link ?? null);
    setSummaryError(null);
    setSummaryLoading(false);
  }

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

  useEffect(() => {
    if (!activeItem) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeSummary();
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        navigateSummary("next");
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        navigateSummary("prev");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeItem, activeIndex, news]);

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
              <article
                key={item.link}
                className="rounded-xl border border-border bg-background/40 p-4 shadow-[0_1px_0_rgba(0,0,0,0.02)]"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full bg-secondary px-2 py-1 font-medium">
                      {item.topic}
                    </span>
                    <span className="text-foreground/70">{item.source}</span>
                    <button
                      type="button"
                      onClick={() => handleSummary(item)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/70 bg-secondary/70 text-[11px] font-semibold text-foreground transition hover:bg-secondary"
                      aria-label={t.summaryAction}
                      title={t.summaryAction}
                    >
                      <span
                        aria-hidden="true"
                        className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground shadow-sm"
                      >
                        ✨
                      </span>
                    </button>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(item.publishedAt, lang)}
                  </span>
                </div>

                <div className="mt-3">
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-semibold leading-6 text-foreground underline-offset-4 hover:underline"
                  >
                    {item.title}
                  </a>
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
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 rounded-full border border-border/70 px-2 py-1 text-[11px] text-muted-foreground">
                  <span aria-hidden="true">◀</span>
                  <span aria-hidden="true">▶</span>
                  <span className="sr-only">{t.navHint}</span>
                </div>
                <button
                  type="button"
                  onClick={closeSummary}
                  className="rounded-full border border-border px-3 py-1 text-xs font-semibold"
                >
                  {t.close}
                </button>
              </div>
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
