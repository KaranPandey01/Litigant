"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Send, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { submitDispute } from "@/lib/api";
import type { Network } from "@/lib/types";

interface FieldState {
  value: string;
  type: "text" | "number" | "boolean" | "match";
}

const evidenceFields: { key: string; label: string; type: "text" | "number" | "boolean" | "match" }[] = [
  { key: "avs_result", label: "AVS Result", type: "match" },
  { key: "cvv_result", label: "CVV Result", type: "match" },
  { key: "device_seen_before", label: "Device Seen Before", type: "boolean" },
  { key: "ip_country_match", label: "IP Country Match", type: "boolean" },
  { key: "hours_since_last_txn", label: "Hours Since Last Transaction", type: "number" },
  { key: "contest_cost_inr", label: "Contest Cost (₹)", type: "number" },
  { key: "proof_of_delivery", label: "Proof of Delivery", type: "text" },
  { key: "tracking_number_and_carrier_confirmation", label: "Tracking # & Carrier Confirmation", type: "text" },
];

function boolSelect(value: string, onChange: (v: string) => void) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select…" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="true">Yes</SelectItem>
        <SelectItem value="false">No</SelectItem>
      </SelectContent>
    </Select>
  );
}

function matchSelect(value: string, onChange: (v: string) => void) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select…" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="match">Match</SelectItem>
        <SelectItem value="no_match">No Match</SelectItem>
      </SelectContent>
    </Select>
  );
}

export default function NewDisputePage() {
  const router = useRouter();
  const [network, setNetwork] = useState<Network | "">("");
  const [amount, setAmount] = useState("");
  const [disputeNotice, setDisputeNotice] = useState("");
  const [fields, setFields] = useState<Record<string, FieldState>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setField(key: string, value: string, type: FieldState["type"]) {
    setFields((prev) => ({ ...prev, [key]: { value, type } }));
  }

  function buildRawData(): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    for (const [key, state] of Object.entries(fields)) {
      if (state.value === "") continue;
      if (state.type === "number") {
        data[key] = Number(state.value);
      } else if (state.type === "boolean") {
        data[key] = state.value === "true";
      } else {
        data[key] = state.value;
      }
    }
    if (disputeNotice.trim()) {
      data.dispute_notice_text = disputeNotice.trim();
    }
    return data;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!network || !amount) return;

    const amountNum = Number(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Please enter a valid amount.");
      return;
    }

    setSubmitting(true);
    setError(null);
    const toastId = toast.loading("Running the pipeline…", {
      description: "Scoring anomaly, classifying reason code, assembling evidence, and computing economics.",
    });
    submitDispute({
      network: network as Network,
      amount_inr: amountNum,
      raw_transaction_data: buildRawData(),
    })
      .then((dispute) => {
        toast.success("Dispute processed", {
          id: toastId,
          description: `Reason code ${dispute.reason_code ?? "—"} identified. Opening dispute detail…`,
        });
        router.push(`/disputes/${dispute.id}`);
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        setSubmitting(false);
        toast.error("Submission failed", { id: toastId, description: message });
      });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
          Submit New Dispute
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter the chargeback details. The AI will run the full pipeline:
          anomaly scoring, reason code classification, evidence assembly, and
          decision recommendation.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Core fields */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dispute Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="network">Card Network</Label>
              <Select
                value={network}
                onValueChange={(v) => setNetwork(v as Network)}
              >
                <SelectTrigger id="network">
                  <SelectValue placeholder="Select network…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="visa">Visa</SelectItem>
                  <SelectItem value="mastercard">Mastercard</SelectItem>
                  <SelectItem value="rupay">RuPay</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Dispute Amount (₹)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="e.g. 15000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Evidence fields */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Transaction & Evidence Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label htmlFor="dispute_notice">Dispute Notice Text</Label>
              <Textarea
                id="dispute_notice"
                placeholder="Paste the chargeback notice or reason from the card network…"
                value={disputeNotice}
                onChange={(e) => setDisputeNotice(e.target.value)}
                className="mt-2 min-h-[100px]"
              />
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {evidenceFields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={field.key}>{field.label}</Label>
                  {field.type === "boolean" ? (
                    boolSelect(
                      fields[field.key]?.value ?? "",
                      (v) => setField(field.key, v, "boolean")
                    )
                  ) : field.type === "match" ? (
                    matchSelect(
                      fields[field.key]?.value ?? "",
                      (v) => setField(field.key, v, "match")
                    )
                  ) : (
                    <Input
                      id={field.key}
                      type={field.type === "number" ? "number" : "text"}
                      placeholder={
                        field.type === "number" ? "e.g. 72" : "e.g. DL9928 confirmed"
                      }
                      value={fields[field.key]?.value ?? ""}
                      onChange={(e) =>
                        setField(field.key, e.target.value, field.type)
                      }
                    />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div>
              <p className="text-sm font-medium text-destructive">
                Submission failed
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{error}</p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={submitting || !network || !amount}>
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            {submitting ? "Processing…" : "Submit Dispute"}
          </Button>
          <Link href="/">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
