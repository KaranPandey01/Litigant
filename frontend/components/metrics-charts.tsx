"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatINR } from "@/lib/format";

function CurrencyTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-lg border border-border bg-white px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-foreground">
        {formatINR(payload[0].value)}
      </p>
    </div>
  );
}

function CountTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-lg border border-border bg-white px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-foreground">
        {payload[0].value} disputes
      </p>
    </div>
  );
}

export function RecommendationSplitChart({
  contestCount,
  noContestCount,
}: {
  contestCount: number;
  noContestCount: number;
}) {
  const data = [
    { name: "Contest", value: contestCount, fill: "hsl(var(--success))" },
    { name: "No Contest", value: noContestCount, fill: "hsl(38, 92%, 50%)" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recommendation Split</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
            <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12 }} />
            <Tooltip content={<CountTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={36}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function RecoveryBreakdownChart({
  recovered,
  costSpent,
  missed,
}: {
  recovered: number;
  costSpent: number;
  missed: number;
}) {
  const data = [
    { name: "Recovered", value: recovered, fill: "hsl(var(--success))" },
    { name: "Contest Cost", value: costSpent, fill: "hsl(var(--destructive))" },
    { name: "Missed (no-contest)", value: missed, fill: "hsl(38, 92%, 50%)" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recovery Breakdown (₹)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 8, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<CurrencyTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={56}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
