import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type SummaryKpiProps = {
  title: string;
  value: string;
  subtitle: string;
  variant?: "improve" | "success";
};

export function SummaryKpi({ title, value, subtitle, variant = "improve" }: SummaryKpiProps) {
  return (
    <Card className="flex h-full flex-col gap-3">
      <div className="grid min-h-[64px] grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
        <p className="min-w-0 pr-1 text-sm leading-snug text-muted-foreground">{title}</p>
        <Badge
          className={
            variant === "success"
              ? "shrink-0 whitespace-nowrap bg-success px-3 py-1.5 text-sm leading-none text-white"
              : "shrink-0 whitespace-nowrap bg-amber-100 px-3 py-1.5 text-sm leading-none text-amber-800"
          }
        >
          <span className="whitespace-nowrap">{variant === "success" ? "On Target" : "Needs Focus"}</span>
        </Badge>
      </div>
      <p className="text-3xl font-bold leading-[1.05] tracking-tight">{value}</p>
      <p className="mt-auto text-sm text-muted-foreground">{subtitle}</p>
    </Card>
  );
}
