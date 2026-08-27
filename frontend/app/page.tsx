"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Target,
  TrendingUp,
  Scale,
  AlertTriangle,
  Plus,
  ArrowRight,
  Search,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatCard } from "@/components/stat-card";
import { NetworkBadge } from "@/components/network-badge";
import { StatusBadge } from "@/components/status-badge";
import { AnomalyScoreIndicator } from "@/components/anomaly-score-indicator";
import { LoadingState, ErrorState, EmptyState } from "@/components/states";
import { listDisputes, getMetrics } from "@/lib/api";
import { formatINR, formatDate, formatPercent } from "@/lib/format";
import type { Dispute, Metrics } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [disputesLoading, setDisputesLoading] = useState(true);
  const [disputesError, setDisputesError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [networkFilter, setNetworkFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState<string | null>(null);


  useEffect(() => {
    listDisputes()
      .then((data) => {
        setDisputes(data);
        setDisputesLoading(false);
      })
      .catch((err) => {
        setDisputesError(err instanceof Error ? err.message : String(err));
        setDisputesLoading(false);
      });
  }, []);

  useEffect(() => {
    getMetrics()
      .then((data) => {
        setMetrics(data);
        setMetricsLoading(false);
      })
      .catch((err) => {
        setMetricsError(err instanceof Error ? err.message : String(err));
        setMetricsLoading(false);
      });
  }, []);

  const networkOptions = useMemo(
    () => Array.from(new Set(disputes.map((d) => d.network))).sort(),
    [disputes]
  );
  const statusOptions = useMemo(
    () => Array.from(new Set(disputes.map((d) => d.status))).sort(),
    [disputes]
  );

  const filteredDisputes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return disputes.filter((d) => {
      if (networkFilter !== "all" && d.network !== networkFilter) return false;
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      if (!q) return true;
      return (
        d.id.toLowerCase().includes(q) ||
        (d.reason_code ?? "").toLowerCase().includes(q) ||
        (d.reason_name ?? "").toLowerCase().includes(q)
      );
    });
  }, [disputes, search, networkFilter, statusFilter]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitor chargeback disputes and AI defense recommendations.
          </p>
        </div>
        <Link href="/disputes/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Submit New Dispute
          </Button>
        </Link>
      </div>

      {/* Stats row */}
      {metricsLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-xl border border-border bg-white"
            />
          ))}
        </div>
      ) : metrics ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Decision Accuracy"
            value={formatPercent(metrics.summary.decision_accuracy, 1)}
            icon={<Target className="h-5 w-5" />}
            caption={`${metrics.summary.holdout_set_size} holdout cases`}
          />
          <StatCard
            label="Net Value Recovered"
            value={formatINR(metrics.summary.net_value_inr)}
            icon={<TrendingUp className="h-5 w-5" />}
            accent={metrics.summary.net_value_inr >= 0 ? "success" : "destructive"}
          />
          <StatCard
            label="Contest / No-Contest"
            value={`${metrics.summary.contest_recommended_count} / ${metrics.summary.no_contest_recommended_count}`}
            icon={<Scale className="h-5 w-5" />}
          />
          <StatCard
            label="Missed Recovery"
            value={formatINR(metrics.summary.missed_recovery_inr_from_no_contest_calls)}
            icon={<AlertTriangle className="h-5 w-5" />}
            accent="warning"
          />
        </div>
      ) : metricsError ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="col-span-full flex items-center justify-center rounded-xl border border-dashed border-border bg-white py-8">
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                Evaluation metrics not available
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Run the evaluation pipeline to see decision accuracy and
                recovery stats here.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Recent disputes */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Recent Disputes</CardTitle>
              <span className="text-xs text-muted-foreground">
                {filteredDisputes.length} of {disputes.length} shown
              </span>
            </div>
            {disputes.length > 0 && (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by dispute ID or reason code…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={networkFilter} onValueChange={setNetworkFilter}>
                  <SelectTrigger className="sm:w-[160px]">
                    <SelectValue placeholder="Network" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All networks</SelectItem>
                    {networkOptions.map((n) => (
                      <SelectItem key={n} value={n}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="sm:w-[160px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {statusOptions.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {disputesLoading ? (
            <LoadingState message="Loading disputes…" />
          ) : disputesError ? (
            <ErrorState message={disputesError} />
          ) : disputes.length === 0 ? (
            <EmptyState
              title="No disputes yet"
              message="Submit a new chargeback dispute to see it appear here."
              action={
                <Link href="/disputes/new">
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Submit New Dispute
                  </Button>
                </Link>
              }
            />
          ) : filteredDisputes.length === 0 ? (
            <EmptyState
              title="No disputes match your filters"
              message="Try a different search term or clear the network/status filters."
              action={
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSearch("");
                    setNetworkFilter("all");
                    setStatusFilter("all");
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Network</TableHead>
                  <TableHead>Reason Code</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Anomaly</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDisputes.map((d) => (
                  <TableRow
                    key={d.id}
                    className="cursor-pointer transition-colors hover:bg-muted/60"
                    onClick={() => router.push(`/disputes/${d.id}`)}
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {d.id.slice(0, 8)}
                    </TableCell>
                    <TableCell>
                      <NetworkBadge network={d.network} />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-mono text-xs font-semibold text-foreground">
                          {d.reason_code}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {d.reason_name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {formatINR(d.amount_inr)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={d.status} />
                    </TableCell>
                    <TableCell>
                      <AnomalyScoreIndicator score={d.anomaly_score} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {d.created_at ? formatDate(d.created_at) : "—"}
                    </TableCell>
                    <TableCell>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
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
