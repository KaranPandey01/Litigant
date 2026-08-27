"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";
import type { AuditEntry } from "@/lib/types";

const stageLabels: Record<string, string> = {
  anomaly_scored: "Anomaly Scored",
  reason_code_classified: "Reason Code Classified",
  similar_history_retrieved: "Similar History Retrieved",
  evidence_assembled: "Evidence Assembled",
  decision_made: "Decision Made",
  human_approved: "Human Approved",
  human_rejected: "Human Rejected",
};

const stageIcons: Record<string, string> = {
  anomaly_scored: "bg-blue-500",
  reason_code_classified: "bg-indigo-500",
  similar_history_retrieved: "bg-purple-500",
  evidence_assembled: "bg-primary",
  decision_made: "bg-amber-500",
  human_approved: "bg-success",
  human_rejected: "bg-destructive",
};

function StageRow({ entry, isLast }: { entry: AuditEntry; isLast: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const label = stageLabels[entry.stage] ?? entry.stage;
  const dotColor = stageIcons[entry.stage] ?? "bg-muted-foreground";

  return (
    <div className="relative flex gap-4 pb-6 last:pb-0">
      {!isLast && (
        <div className="absolute left-[11px] top-6 h-full w-[2px] bg-border" />
      )}
      <div
        className={cn(
          "z-10 mt-1 h-6 w-6 shrink-0 rounded-full ring-4 ring-white",
          dotColor
        )}
      />
      <div className="flex-1">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center gap-2 text-left"
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-sm font-semibold text-foreground">{label}</span>
        </button>
        <p className="ml-6 mt-0.5 text-xs text-muted-foreground">
          {formatDateTime(entry.timestamp)}
        </p>
        {expanded && (
          <div className="ml-6 mt-3">
            <pre className="overflow-x-auto rounded-lg border border-border bg-secondary/50 p-4 text-xs leading-relaxed text-foreground">
              {JSON.stringify(entry.detail, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

export function AuditTimeline({ entries }: { entries: AuditEntry[] }) {
  return (
    <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
      <h3 className="mb-5 text-lg font-semibold text-foreground">Audit Trail</h3>
      {entries.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No audit entries recorded yet.
        </p>
      ) : (
        <div>
          {entries.map((entry, i) => (
            <StageRow
              key={`${entry.stage}-${i}`}
              entry={entry}
              isLast={i === entries.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
