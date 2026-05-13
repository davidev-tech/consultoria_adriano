import { ArrowUpRight, ArrowDownRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: string;
  delta: string;
  trend: "up" | "down";
  helper: string;
  icon: LucideIcon;
}

export function MetricCard({ label, value, delta, trend, helper, icon: Icon }: MetricCardProps) {
  const positive = trend === "up";
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-soft transition-shadow hover:shadow-card">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </span>
          <span className="text-2xl font-semibold tracking-tight text-foreground">{value}</span>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/40 text-primary-foreground">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 text-xs">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium",
            positive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
          )}
        >
          {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {delta}
        </span>
        <span className="text-muted-foreground">{helper}</span>
      </div>
    </div>
  );
}
