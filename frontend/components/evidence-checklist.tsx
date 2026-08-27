import { Check, X, Minus, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Evidence } from "@/lib/types";

function StrengthIcon({ strength }: { strength: 0 | 1 | 2 }) {
  if (strength === 2)
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100">
        <Check className="h-3 w-3 text-emerald-600" />
      </span>
    );
  if (strength === 1)
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100">
        <Minus className="h-3 w-3 text-amber-600" />
      </span>
    );
  return (
    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100">
      <X className="h-3 w-3 text-red-600" />
    </span>
  );
}

function strengthLabel(strength: number): string {
  if (strength === 2) return "Strong";
  if (strength === 1) return "Weak";
  return "Missing";
}

function strengthColor(strength: number): string {
  if (strength === 2) return "text-emerald-600";
  if (strength === 1) return "text-amber-600";
  return "text-red-600";
}

function formatFieldName(field: string): string {
  return field
    .replace(/_/g, " ")
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function EvidenceChecklist({ evidence }: { evidence: Evidence }) {
  const completenessPct = Math.round(evidence.completeness_score * 100);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Evidence Assembly</CardTitle>
          <div className="text-right">
            <span className="text-2xl font-bold text-primary">
              {completenessPct}%
            </span>
            <p className="text-xs text-muted-foreground">Complete</p>
          </div>
        </div>
        <Progress value={completenessPct} className="mt-2 h-2" />
      </CardHeader>
      <CardContent className="space-y-2">
        {evidence.required_fields.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No required fields specified.
          </p>
        )}
        {evidence.required_fields.map((field) => {
          const collected = evidence.collected_fields[field];
          const strength = collected?.strength ?? 0;
          const present = collected?.present ?? false;
          return (
            <div
              key={field}
              className={cn(
                "flex items-center justify-between rounded-lg border px-3 py-2.5",
                present ? "border-border bg-white" : "border-red-200 bg-red-50/40"
              )}
            >
              <div className="flex items-center gap-3">
                <StrengthIcon strength={strength} />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {formatFieldName(field)}
                  </p>
                  {collected?.source && (
                    <p className="text-xs text-muted-foreground">
                      Source: {collected.source}
                    </p>
                  )}
                </div>
              </div>
              <span
                className={cn(
                  "text-xs font-semibold",
                  strengthColor(strength)
                )}
              >
                {strengthLabel(strength)}
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export function NarrativeBlock({ narrative }: { narrative: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5 text-primary" />
          Drafted Contest Response
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-border bg-secondary/30 p-5">
          <div className="mb-3 flex items-center gap-2 border-b border-border pb-3 text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-red-400" />
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="ml-2">narrative.txt</span>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {narrative}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
