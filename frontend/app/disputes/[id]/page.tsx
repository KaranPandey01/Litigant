"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { NetworkBadge } from "@/components/network-badge";
import { StatusBadge } from "@/components/status-badge";
import { AnomalyScoreIndicator } from "@/components/anomaly-score-indicator";
import { EvidenceChecklist, NarrativeBlock } from "@/components/evidence-checklist";
import { DecisionPanel } from "@/components/decision-panel";
import { AuditTimeline } from "@/components/audit-timeline";
import { LoadingState, ErrorState } from "@/components/states";
import {
  getDispute,
  getEvidence,
  getDecision,
  getAuditTrail,
  approveDecision,
} from "@/lib/api";
import { formatINR } from "@/lib/format";
import type {
  AuditEntry,
  Decision,
  Dispute,
  Evidence,
} from "@/lib/types";

export default function DisputeDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const router = useRouter();

  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [disputeLoading, setDisputeLoading] = useState(true);
  const [disputeError, setDisputeError] = useState<string | null>(null);

  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [evidenceLoading, setEvidenceLoading] = useState(true);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);

  const [decision, setDecision] = useState<Decision | null>(null);
  const [decisionLoading, setDecisionLoading] = useState(true);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [copied, setCopied] = useState(false);

  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(true);
  const [auditError, setAuditError] = useState<string | null>(null);

  useEffect(() => {
    getDispute(id)
      .then((d) => {
        setDispute(d);
        setDisputeLoading(false);
      })
      .catch((e) => {
        setDisputeError(e instanceof Error ? e.message : String(e));
        setDisputeLoading(false);
      });
  }, [id]);

  useEffect(() => {
    getEvidence(id)
      .then((d) => {
        setEvidence(d);
        setEvidenceLoading(false);
      })
      .catch((e) => {
        setEvidenceError(e instanceof Error ? e.message : String(e));
        setEvidenceLoading(false);
      });
  }, [id]);

  useEffect(() => {
    getDecision(id)
      .then((d) => {
        setDecision(d);
        setDecisionLoading(false);
      })
      .catch((e) => {
        setDecisionError(e instanceof Error ? e.message : String(e));
        setDecisionLoading(false);
      });
  }, [id]);

  useEffect(() => {
    getAuditTrail(id)
      .then((d) => {
        setAudit(d);
        setAuditLoading(false);
      })
      .catch((e) => {
        setAuditError(e instanceof Error ? e.message : String(e));
        setAuditLoading(false);
      });
  }, [id]);

  function handleCopyId() {
    navigator.clipboard.writeText(dispute?.id ?? id).then(() => {
      setCopied(true);
      toast.success("Dispute ID copied", { description: dispute?.id ?? id });
      setTimeout(() => setCopied(false), 1800);
    });
  }

  function handleApprove(approved: boolean) {
    if (!decision) return;
    setApproving(true);
    approveDecision(decision.id, approved)
      .then((updated) => {
        setDecision(updated);
        setApproving(false);
        if (approved) {
          toast.success("Decision approved", {
            description: `${decision.recommendation === "contest" ? "Contest" : "No-contest"} recommendation confirmed for dispute ${id}. This is now logged in the audit trail.`,
          });
        } else {
          toast.info("Decision rejected", {
            description: `The recommendation for dispute ${id} was not approved. No action will be taken.`,
          });
        }
      })
      .catch((e) => {
        setApproving(false);
        const message = e instanceof Error ? e.message : String(e);
        setDecisionError(message);
        toast.error("Failed to record decision", { description: message });
      });
  }

  if (disputeLoading) {
    return <LoadingState message="Loading dispute…" />;
  }

  if (disputeError || !dispute) {
    return (
      <div className="space-y-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <ErrorState
          message={disputeError ?? "Dispute not found"}
          onRetry={() => router.refresh()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      {/* Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-foreground">
                  Dispute{" "}
                  <span className="font-mono text-muted-foreground">
                    {dispute.id.slice(0, 12)}
                  </span>
                </h1>
                <button
                  onClick={handleCopyId}
                  title="Copy full dispute ID"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-success" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
                <StatusBadge status={dispute.status} />
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Network:</span>
                  <NetworkBadge network={dispute.network} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Reason Code:</span>
                  <span className="font-mono font-semibold text-foreground">
                    {dispute.reason_code}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Reason:</span>
                  <span className="text-foreground">{dispute.reason_name}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-6">
              <div className="text-right">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Amount
                </p>
                <p className="text-2xl font-bold tabular-nums text-foreground">
                  {formatINR(dispute.amount_inr)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Anomaly Score
                </p>
                <div className="mt-1">
                  <AnomalyScoreIndicator score={dispute.anomaly_score} />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Decision panel — prominent, right after header */}
      <div>
        {decisionLoading ? (
          <Card>
            <CardContent className="py-12">
              <LoadingState message="Loading recommendation…" />
            </CardContent>
          </Card>
        ) : decisionError ? (
          <Card>
            <CardContent className="py-12">
              <ErrorState message={decisionError} />
            </CardContent>
          </Card>
        ) : decision ? (
          <DecisionPanel
            decision={decision}
            onApprove={handleApprove}
            approving={approving}
          />
        ) : null}
      </div>

      {/* Evidence + Narrative */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {evidenceLoading ? (
          <Card>
            <CardContent className="py-12">
              <LoadingState message="Loading evidence…" />
            </CardContent>
          </Card>
        ) : evidenceError ? (
          <Card>
            <CardContent className="py-12">
              <ErrorState message={evidenceError} />
            </CardContent>
          </Card>
        ) : evidence ? (
          <EvidenceChecklist evidence={evidence} />
        ) : null}

        {evidenceLoading ? (
          <Card>
            <CardContent className="py-12">
              <LoadingState message="Loading narrative…" />
            </CardContent>
          </Card>
        ) : evidenceError ? (
          <Card>
            <CardContent className="py-12">
              <ErrorState message={evidenceError} />
            </CardContent>
          </Card>
        ) : evidence ? (
          <NarrativeBlock narrative={evidence.narrative} />
        ) : null}
      </div>

      {/* Audit trail */}
      <div>
        {auditLoading ? (
          <Card>
            <CardContent className="py-12">
              <LoadingState message="Loading audit trail…" />
            </CardContent>
          </Card>
        ) : auditError ? (
          <Card>
            <CardContent className="py-12">
              <ErrorState message={auditError} />
            </CardContent>
          </Card>
        ) : (
          <AuditTimeline entries={audit} />
        )}
      </div>
    </div>
  );
}
