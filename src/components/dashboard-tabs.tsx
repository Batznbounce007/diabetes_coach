"use client";

import Link from "next/link";
import { Activity, Camera, MessageCircleQuestion, Newspaper, Share2, Sparkles } from "lucide-react";
import { useRef } from "react";

type DashboardTab = "dashboard" | "coach" | "systems" | "news" | "share" | "carbs";
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
  iconOnly?: boolean;
}> = [
  { value: "dashboard", label: { de: "Dashboard", en: "Dashboard" }, icon: Activity },
  { value: "coach", label: { de: "Diabetes Coach", en: "Diabetes Coach" }, icon: Sparkles },
  {
    value: "systems",
    label: { de: "Fragen & Antworten", en: "Questions & Answers" },
    icon: MessageCircleQuestion
  },
  { value: "news", label: { de: "News & Forschung", en: "News & Research" }, icon: Newspaper },
  { value: "carbs", label: { de: "KH schätzen", en: "Carb estimate" }, icon: Camera },
  { value: "share", label: { de: "Teilen", en: "Share" }, icon: Share2, iconOnly: true }
];

export function DashboardTabs({
  currentTab,
  range,
  timeBucket,
  lang,
  chartMode
}: DashboardTabsProps) {
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  function handleOpenCamera(targetHref: string) {
    cameraInputRef.current?.click();

    const input = cameraInputRef.current;
    if (!input) return;
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result ?? "");
        if (dataUrl.startsWith("data:image/")) {
          window.sessionStorage.setItem("carb-photo-pending", dataUrl);
          window.location.href = targetHref;
        }
      };
      reader.readAsDataURL(file);
      input.value = "";
    };
  }

  return (
    <div className="rounded-2xl border border-border/70 bg-card/90 p-2 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/75">
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
      />
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

          if (tab.value === "carbs") {
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => handleOpenCamera(href)}
                aria-label={tab.label[lang]}
                title={tab.label[lang]}
                className={`group relative inline-flex min-w-max snap-start items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-background text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Icon size={16} className={isActive ? "opacity-100" : "opacity-80"} />
                {!tab.iconOnly ? <span>{tab.label[lang]}</span> : null}
                {isActive ? (
                  <span className="absolute inset-x-3 -bottom-1 h-0.5 rounded-full bg-primary-foreground/80" />
                ) : null}
              </button>
            );
          }

          return (
            <Link
              key={tab.value}
              href={href}
              scroll={false}
              aria-label={tab.label[lang]}
              title={tab.label[lang]}
              className={`group relative inline-flex min-w-max snap-start items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-background text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Icon size={16} className={isActive ? "opacity-100" : "opacity-80"} />
              {!tab.iconOnly ? <span>{tab.label[lang]}</span> : null}
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
