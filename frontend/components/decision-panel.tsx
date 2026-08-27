"use client";

import { useState } from "react";
import { ShieldCheck, ShieldX, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatINR, formatPercent } from "@/lib/format";
import type { Decision } from "@/lib/types";

interface DecisionPanelProps {
  decision: Decision;
  onApprove?: (approved: boolean) => void;
  approving?: boolean;
}

function MetricBox({
  label,
  value,
  positive,
  negative,
}: {
  label: string;
  value: string;
  positive?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1.5 text-xl font-bold tabular-nums",
          positive && "text-success",
          negative && "text-destructive",
          !positive && !negative && "text-foreground"
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function DecisionPanel({
  decision,
  onApprove,
  approving,
}: DecisionPanelProps) {
  const [confirmReject, setConfirmReject] = useState(false);
  const isContest = decision.recommendation === "contest";
  const evPositive = decision.expected_value_inr >= 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">AI Recommendation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div
          className={cn(
            "flex items-center gap-4 rounded-xl border p-5",
            isContest
              ? "border-success/30 bg-success/5"
              : "border-amber-300 bg-amber-50"
          )}
        >
          <div
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-xl",
              isContest
                ? "bg-success text-success-foreground"
                : "bg-amber-500 text-white"
            )}
          >
            {isContest ? (
              <ShieldCheck className="h-7 w-7" />
            ) : (
              <ShieldX className="h-7 w-7" />
            )}
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Recommendation
            </p>
            <p
              className={cn(
                "text-2xl font-bold tracking-tight",
                isContest ? "text-success" : "text-amber-600"
              )}
            >
              {isContest ? "CONTEST" : "NO CONTEST"}
            </p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Win Probability
            </p>
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {formatPercent(decision.win_probability, 1)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <MetricBox
            label="Expected Recovery"
            value={formatINR(decision.expected_recovery_inr)}
          />
          <MetricBox
            label="Contest Cost"
            value={formatINR(decision.contest_cost_inr)}
          />
          <MetricBox
            label="Expected Value"
            value={formatINR(decision.expected_value_inr)}
            positive={evPositive}
            negative={!evPositive}
          />
        </div>

        <div className="rounded-lg border border-border bg-secondary/30 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Reasoning
          </p>
          <p className="mt-2 text-sm leading-relaxed text-foreground">
            {decision.reasoning}
          </p>
        </div>

        {decision.human_approved ? (
          <div className="flex items-center gap-3 rounded-lg border border-success/30 bg-success/5 p-4">
            <CheckCircle2 className="h-6 w-6 text-success" />
            <div>
              <p className="text-sm font-semibold text-success">
                Decision Approved
              </p>
              <p className="text-xs text-muted-foreground">
                This recommendation has been reviewed and approved by a human
                operator.
              </p>
            </div>
          </div>
        ) : onApprove ? (
          <div className="space-y-3">
            {!confirmReject ? (
              <div className="flex gap-3">
                <Button
                  onClick={() => onApprove(true)}
                  disabled={approving}
                  className="bg-success text-success-foreground hover:bg-success/90"
                >
                  {approving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  )}
                  Approve
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setConfirmReject(true)}
                  disabled={approving}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                <p className="text-sm text-foreground">
                  Confirm rejection of this recommendation?
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onApprove(false)}
                  disabled={approving}
                >
                  {approving ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : null}
                  Confirm Reject
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmReject(false)}
                  disabled={approving}
                >
                  Cancel
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              No action is taken until a human approves. Nothing is ever
              auto-submitted.
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
