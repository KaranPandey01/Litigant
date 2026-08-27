"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Target,
  TrendingUp,
  Scale,
  AlertTriangle,
  Coins,
  Receipt,
  Info,
  ArrowUpDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatCard } from "@/components/stat-card";
import { RecommendationSplitChart, RecoveryBreakdownChart } from "@/components/metrics-charts";
import { LoadingState, ErrorState, EmptyState } from "@/components/states";
import { getMetrics } from "@/lib/api";
import { formatINR, formatPercent } from "@/lib/format";
import type { Metrics } from "@/lib/types";

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortDesc, setSortDesc] = useState(true);

  useEffect(() => {
    getMetrics()
      .then((data) => {
        setMetrics(data);
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : String(e));
        setLoading(false);
      });
  }, []);

  const sortedCases = useMemo(() => {
    if (!metrics) return [];
    return [...metrics.per_case].sort((a, b) =>
      sortDesc ? b.amount_inr - a.amount_inr : a.amount_inr - b.amount_inr
    );
  }, [metrics, sortDesc]);

  if (loading) {
    return (
      <div className="space-y-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Evaluation Results
        </h1>
        <LoadingState message="Loading metrics…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Evaluation Results
        </h1>
        <ErrorState message={error} />
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="space-y-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Evaluation Results
        </h1>
        <EmptyState
          title="No evaluation results available"
          message="The evaluation pipeline hasn't been run yet. Once it runs against the holdout set, decision accuracy, recovery stats, and per-case breakdowns will appear here."
        />
      </div>
    );
  }

  const s = metrics.summary;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Evaluation Results
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Held-out evaluation of the AI chargeback defense agent — aggregated
          metrics and per-case breakdown.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Decision Accuracy"
          value={formatPercent(s.decision_accuracy, 1)}
          icon={<Target className="h-5 w-5" />}
          caption={`${s.holdout_set_size} holdout cases`}
        />
        <StatCard
          label="Net Value Recovered"
          value={formatINR(s.net_value_inr)}
          icon={<TrendingUp className="h-5 w-5" />}
          accent={s.net_value_inr >= 0 ? "success" : "destructive"}
        />
        <StatCard
          label="Total Recovered"
          value={formatINR(s.total_recovered_inr)}
          icon={<Coins className="h-5 w-5" />}
          accent="success"
        />
        <StatCard
          label="Contest Cost Spent"
          value={formatINR(s.total_contest_cost_spent_inr)}
          icon={<Receipt className="h-5 w-5" />}
        />
        <StatCard
          label="Contest / No-Contest"
          value={`${s.contest_recommended_count} / ${s.no_contest_recommended_count}`}
          icon={<Scale className="h-5 w-5" />}
        />
        <StatCard
          label="Missed Recovery"
          value={formatINR(s.missed_recovery_inr_from_no_contest_calls)}
          icon={<AlertTriangle className="h-5 w-5" />}
          accent="warning"
        />
      </div>

      {/* Visual breakdown */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <RecommendationSplitChart
          contestCount={s.contest_recommended_count}
          noContestCount={s.no_contest_recommended_count}
        />
        <RecoveryBreakdownChart
          recovered={s.total_recovered_inr}
          costSpent={s.total_contest_cost_spent_inr}
          missed={s.missed_recovery_inr_from_no_contest_calls}
        />
      </div>

      {/* Note under decision accuracy */}
      {s.note && (
        <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-5">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
          <div>
            <p className="text-sm font-semibold text-foreground">
              About Decision Accuracy
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {s.note}
            </p>
          </div>
        </div>
      )}

      {/* Per-case table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Per-Case Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {metrics.per_case.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No per-case data available.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dispute ID</TableHead>
                  <TableHead>Recommendation</TableHead>
                  <TableHead>Would Have Won</TableHead>
                  <TableHead
                    className="cursor-pointer select-none text-right"
                    onClick={() => setSortDesc((v) => !v)}
                  >
                    <span className="inline-flex items-center justify-end gap-1 hover:text-foreground">
                      Amount
                      <ArrowUpDown className="h-3.5 w-3.5" />
                    </span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedCases.map((c, i) => (
                  <TableRow key={c.dispute_id ?? i} className="transition-colors hover:bg-muted/50">
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {c.dispute_id?.slice(0, 12) ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          c.recommendation === "contest"
                            ? "default"
                            : "secondary"
                        }
                        className={
                          c.recommendation === "contest"
                            ? "bg-success/90 text-success-foreground"
                            : "bg-amber-100 text-amber-700"
                        }
                      >
                        {c.recommendation === "contest"
                          ? "Contest"
                          : "No Contest"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {c.would_have_won ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                          <span className="h-2 w-2 rounded-full bg-success" />
                          Yes
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                          <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                          No
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {formatINR(c.amount_inr)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
