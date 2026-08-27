import { cn } from "@/lib/utils";
import { anomalyBgColor } from "@/lib/format";

export function AnomalyScoreIndicator({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums",
        anomalyBgColor(score)
      )}
    >
      {pct}%
    </span>
  );
}
