"use client";

import Link from "next/link";
import { Activity, MessageCircleQuestion, Newspaper, Share2, Sparkles } from "lucide-react";

type DashboardTab = "dashboard" | "coach" | "systems" | "news" | "share";
type Lang = "de" | "en";

type DashboardTabsProps = {
  currentTab: DashboardTab;
  range: string;
  timeBucket: string;
  lang: Lang;
  chartMode: "line" | "agp";
};

const tabs: Array<{
  value: DashboardTab;
  label: Record<Lang, string>;
  icon: typeof Activity;
}> = [
  { value: "dashboard", label: { de: "Dashboard", en: "Dashboard" }, icon: Activity },
  { value: "coach", label: { de: "Diabetes Coach", en: "Diabetes Coach" }, icon: Sparkles },
  {
    value: "systems",
    label: { de: "Fragen & Antworten", en: "Questions & Answers" },
    icon: MessageCircleQuestion
  },
  { value: "news", label: { de: "News & Forschung", en: "News & Research" }, icon: Newspaper },
  { value: "share", label: { de: "Teilen", en: "Share" }, icon: Share2 }
];

export function DashboardTabs({
  currentTab,
  range,
  timeBucket,
  lang,
  chartMode
}: DashboardTabsProps) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card/90 p-2 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/75">
      <div className="no-scrollbar flex snap-x gap-2 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.value === currentTab;
          const href = `/dashboard?${new URLSearchParams({
            range,
            timeBucket,
            lang,
            chartMode,
            tab: tab.value
          }).toString()}`;

          return (
            <Link
              key={tab.value}
              href={href}
              scroll={false}
              className={`group relative inline-flex min-w-max snap-start items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-background text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Icon size={16} className={isActive ? "opacity-100" : "opacity-80"} />
              <span>{tab.label[lang]}</span>
              {isActive ? (
                <span className="absolute inset-x-3 -bottom-1 h-0.5 rounded-full bg-primary-foreground/80" />
              ) : null}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
