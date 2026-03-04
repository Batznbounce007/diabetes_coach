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
  const t =
    lang === "de"
      ? {
          title: "News: Forschung & Devices",
          subtitle:
            "Relevante Updates zu Diabetes-Forschung, neuen CGMs, Pumpen und Closed-Loop-Systemen.",
          empty:
            "Der News-Feed ist gerade nicht erreichbar. Nutze rechts die kuratierten Quellen.",
          bestSources: "Beste Quellen",
          bestSourcesHint: "Wissenschaftlich/klinisch relevante Quellen mit hoher Qualität."
        }
      : {
          title: "News: Research & Devices",
          subtitle:
            "Relevant updates on diabetes research, new CGMs, pumps, and closed-loop systems.",
          empty: "The news feed is currently unavailable. Use the curated sources on the right.",
          bestSources: "Best sources",
          bestSourcesHint: "High-quality scientific and clinically relevant sources."
        };
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
                <a
                  href={item.link}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold leading-6 text-foreground underline"
                >
                  {item.title}
                </a>
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
    </div>
  );
}
