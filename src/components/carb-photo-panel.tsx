"use client";

import { useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";

type CarbPhotoPanelProps = {
  lang: "de" | "en";
};

type CarbEstimateResult = {
  foodLabel: string;
  estimatedCarbsGrams: number;
  uptakeSpeed: "slow" | "medium" | "fast";
  confidence: "low" | "medium" | "high";
  suggestion: string;
  notes: string[];
};

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function CarbPhotoPanel({ lang }: CarbPhotoPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [estimate, setEstimate] = useState<CarbEstimateResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const t =
    lang === "de"
      ? {
          title: "KH per Foto",
          subtitle:
            "Fotografiere ein Lebensmittel. Du erhältst eine schnelle Kohlenhydrat-Schätzung und wie schnell es voraussichtlich ins Blut geht.",
          openCamera: "Kamera öffnen",
          loading: "Analysiere Foto…",
          error: "Die Analyse konnte gerade nicht durchgeführt werden. Bitte erneut versuchen.",
          uptakeLabel: "Aufnahmegeschwindigkeit",
          confidenceLabel: "Sicherheit",
          carbsLabel: "Geschätzte Kohlenhydrate",
          notesLabel: "Hinweise für die Eingabe",
          speedSlow: "Langsam",
          speedMedium: "Mittel",
          speedFast: "Schnell",
          confidenceLow: "Niedrig",
          confidenceMedium: "Mittel",
          confidenceHigh: "Hoch"
        }
      : {
          title: "Carbs via Photo",
          subtitle:
            "Take a food photo and get a quick carbohydrate estimate plus how fast it may impact glucose.",
          openCamera: "Open camera",
          loading: "Analyzing photo…",
          error: "Analysis could not be completed right now. Please try again.",
          uptakeLabel: "Uptake speed",
          confidenceLabel: "Confidence",
          carbsLabel: "Estimated carbohydrates",
          notesLabel: "Input notes",
          speedSlow: "Slow",
          speedMedium: "Medium",
          speedFast: "Fast",
          confidenceLow: "Low",
          confidenceMedium: "Medium",
          confidenceHigh: "High"
        };

  useEffect(() => {
    const pending = window.sessionStorage.getItem("carb-photo-pending");
    if (!pending) return;
    window.sessionStorage.removeItem("carb-photo-pending");
    setPhotoPreview(pending);
    setIsLoading(true);
    setError("");
    setEstimate(null);
    void fetch("/api/carb-estimate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ imageDataUrl: pending, lang })
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("request failed");
        const payload = (await response.json()) as { result?: CarbEstimateResult };
        if (!payload.result) throw new Error("missing result");
        setEstimate(payload.result);
      })
      .catch(() => setError(t.error))
      .finally(() => setIsLoading(false));
  }, []);

  async function handleFile(file: File) {
    setIsLoading(true);
    setError("");
    setEstimate(null);

    try {
      const imageDataUrl = await fileToDataUrl(file);
      setPhotoPreview(imageDataUrl);

      const response = await fetch("/api/carb-estimate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ imageDataUrl, lang })
      });
      if (!response.ok) throw new Error("request failed");
      const payload = (await response.json()) as { result?: CarbEstimateResult };
      if (!payload.result) throw new Error("missing result");
      setEstimate(payload.result);
    } catch {
      setError(t.error);
    } finally {
      setIsLoading(false);
    }
  }

  const speedLabel =
    estimate?.uptakeSpeed === "slow"
      ? t.speedSlow
      : estimate?.uptakeSpeed === "fast"
        ? t.speedFast
        : t.speedMedium;
  const confidenceLabel =
    estimate?.confidence === "low"
      ? t.confidenceLow
      : estimate?.confidence === "high"
        ? t.confidenceHigh
        : t.confidenceMedium;

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-xl font-semibold">{t.title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t.subtitle}</p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isLoading}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 font-semibold text-primary-foreground disabled:opacity-50"
        >
          <Camera size={16} />
          {isLoading ? t.loading : t.openCamera}
        </button>
      </div>

      {photoPreview ? (
        <div className="mt-4 overflow-hidden rounded-xl border border-border">
          <img src={photoPreview} alt="Food preview" className="max-h-72 w-full object-cover" />
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-lg border border-danger/40 bg-danger/5 p-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      {estimate ? (
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-border bg-secondary/20 p-3">
            <p className="text-xs text-muted-foreground">{t.carbsLabel}</p>
            <p className="text-2xl font-bold">{estimate.estimatedCarbsGrams} g</p>
            <p className="mt-1 text-sm text-muted-foreground">{estimate.foodLabel}</p>
          </div>
          <div className="rounded-xl border border-border bg-secondary/20 p-3">
            <p className="text-xs text-muted-foreground">{t.uptakeLabel}</p>
            <p className="text-2xl font-bold">{speedLabel}</p>
            <p className="mt-1 text-sm text-muted-foreground">{estimate.suggestion}</p>
          </div>
          <div className="rounded-xl border border-border bg-secondary/20 p-3">
            <p className="text-xs text-muted-foreground">{t.confidenceLabel}</p>
            <p className="text-2xl font-bold">{confidenceLabel}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t.notesLabel}</p>
          </div>
          <div className="md:col-span-3 rounded-xl border border-border bg-background p-3">
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {estimate.notes.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </section>
  );
}
