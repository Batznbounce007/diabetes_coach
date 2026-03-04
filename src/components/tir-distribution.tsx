type TirDistributionProps = {
  lowPercent: number;
  inRangePercent: number;
  highPercent: number;
  lowLabel?: string;
  inRangeLabel?: string;
  highLabel?: string;
};

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

export function TirDistribution({
  lowPercent,
  inRangePercent,
  highPercent,
  lowLabel = "Niedrig",
  inRangeLabel = "Zielbereich",
  highLabel = "Hoch"
}: TirDistributionProps) {
  const low = clampPercent(lowPercent);
  const inRange = clampPercent(inRangePercent);
  const high = clampPercent(highPercent);

  return (
    <div className="space-y-3">
      <div className="h-3 w-full overflow-hidden rounded-full bg-secondary/60">
        <div className="flex h-full w-full">
          <div className="bg-danger" style={{ width: `${low}%` }} />
          <div className="bg-success" style={{ width: `${inRange}%` }} />
          <div className="bg-accent" style={{ width: `${high}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-lg border border-border bg-background p-2">
          <p className="text-muted-foreground">{lowLabel}</p>
          <p className="font-semibold text-danger">{low.toFixed(1)}%</p>
        </div>
        <div className="rounded-lg border border-border bg-background p-2">
          <p className="text-muted-foreground">{inRangeLabel}</p>
          <p className="font-semibold text-success">{inRange.toFixed(1)}%</p>
        </div>
        <div className="rounded-lg border border-border bg-background p-2">
          <p className="text-muted-foreground">{highLabel}</p>
          <p className="font-semibold text-accent">{high.toFixed(1)}%</p>
        </div>
      </div>
    </div>
  );
}
