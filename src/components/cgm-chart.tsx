"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

type ChartPoint = {
  time: string;
  glucose: number;
};

type CgmChartProps = {
  points: ChartPoint[];
};

export function CgmChart({ points }: CgmChartProps) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="glucoseGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.55} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <ReferenceArea y1={70} y2={180} fill="hsl(var(--success))" fillOpacity={0.08} />
          <ReferenceLine y={70} stroke="hsl(var(--success))" strokeDasharray="4 4" />
          <ReferenceLine y={180} stroke="hsl(var(--danger))" strokeDasharray="4 4" />
          <XAxis dataKey="time" tick={{ fontSize: 12 }} />
          <YAxis domain={[50, 260]} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Area
            type="monotone"
            dataKey="glucose"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#glucoseGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
