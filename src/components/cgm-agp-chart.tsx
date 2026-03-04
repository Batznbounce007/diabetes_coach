"use client";

import {
  Area,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { AgpPoint } from "@/lib/agp";

type CgmAgpChartProps = {
  points: AgpPoint[];
  lang?: "de" | "en";
};

export function CgmAgpChart({ points, lang = "de" }: CgmAgpChartProps) {
  const legendLabels =
    lang === "de"
      ? {
          target: "Zielbereich 70-180 mg/dL",
          median: "Median (typischer Verlauf)",
          p25to75: "Typischer Bereich (25-75 %)",
          p10to90: "Erweiterter Bereich (10-90 %)",
          minMax: "Min-Max-Spanne"
        }
      : {
          target: "Target range 70-180 mg/dL",
          median: "Median (typical trend)",
          p25to75: "Typical band (25-75%)",
          p10to90: "Extended band (10-90%)",
          minMax: "Min-max range"
        };

  return (
    <div className="space-y-3">
      <div className="h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={points} margin={{ top: 16, right: 20, left: 0, bottom: 20 }}>
          <ReferenceArea y1={70} y2={180} fill="hsl(var(--success))" fillOpacity={0.08} />
          <ReferenceLine y={70} stroke="hsl(var(--success))" strokeDasharray="4 4" />
          <ReferenceLine y={180} stroke="hsl(var(--success))" strokeDasharray="4 4" />

          <XAxis
            dataKey="hourLabel"
            interval={2}
            tick={{ fontSize: 12 }}
            tickMargin={8}
            minTickGap={6}
          />
          <YAxis domain={[40, 420]} tick={{ fontSize: 12 }} />
          <Tooltip />

          <Area
            type="monotone"
            dataKey="p90"
            stroke="transparent"
            fill="hsl(var(--primary))"
            fillOpacity={0.15}
            name="10-90 %"
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="p10"
            stroke="transparent"
            fill="hsl(var(--background))"
            fillOpacity={1}
            name=""
            isAnimationActive={false}
          />

          <Area
            type="monotone"
            dataKey="p75"
            stroke="transparent"
            fill="hsl(var(--primary))"
            fillOpacity={0.3}
            name="25-75 %"
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="p25"
            stroke="transparent"
            fill="hsl(var(--background))"
            fillOpacity={1}
            name=""
            isAnimationActive={false}
          />

          <Line
            type="monotone"
            dataKey="max"
            stroke="hsl(var(--primary))"
            strokeDasharray="5 5"
            dot={false}
            strokeWidth={1.5}
            name="Niedrigster-Höchster Wert"
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="min"
            stroke="hsl(var(--primary))"
            strokeDasharray="5 5"
            dot={false}
            strokeWidth={1.5}
            name=""
            isAnimationActive={false}
          />

          <Line
            type="monotone"
            dataKey="median"
            stroke="hsl(var(--primary))"
            dot={false}
            strokeWidth={3}
            name="Median"
            isAnimationActive={false}
          />
        </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="grid gap-2 text-xs text-muted-foreground md:grid-cols-2 lg:grid-cols-3">
        <div className="inline-flex items-center gap-2">
          <span className="h-2.5 w-5 rounded-sm bg-success/25 ring-1 ring-success/40" />
          <span>{legendLabels.target}</span>
        </div>
        <div className="inline-flex items-center gap-2">
          <span className="h-0.5 w-5 bg-primary" />
          <span>{legendLabels.median}</span>
        </div>
        <div className="inline-flex items-center gap-2">
          <span className="h-2.5 w-5 rounded-sm bg-primary/35" />
          <span>{legendLabels.p25to75}</span>
        </div>
        <div className="inline-flex items-center gap-2">
          <span className="h-2.5 w-5 rounded-sm bg-primary/20" />
          <span>{legendLabels.p10to90}</span>
        </div>
        <div className="inline-flex items-center gap-2">
          <span className="h-0.5 w-5 border-t border-dashed border-primary/80" />
          <span>{legendLabels.minMax}</span>
        </div>
      </div>
    </div>
  );
}
