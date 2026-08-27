export type Network = "visa" | "mastercard" | "rupay";

export type DisputeStatus = string;

export interface Dispute {
  id: string;
  network: Network;
  reason_code: string;
  reason_name: string;
  amount_inr: number;
  anomaly_score: number;
  status: DisputeStatus;
  created_at?: string;
}

export interface CollectedField {
  present: boolean;
  strength: 0 | 1 | 2;
  source: string | null;
}

export interface Evidence {
  id: string;
  dispute_id: string;
  required_fields: string[];
  collected_fields: Record<string, CollectedField>;
  completeness_score: number;
  narrative: string;
}

export type Recommendation = "contest" | "no_contest";

export interface Decision {
  id: string;
  dispute_id: string;
  recommendation: Recommendation;
  win_probability: number;
  expected_recovery_inr: number;
  contest_cost_inr: number;
  expected_value_inr: number;
  reasoning: string;
  human_approved: boolean;
}

export interface AuditEntry {
  stage: string;
  detail: Record<string, unknown>;
  timestamp: string;
}

export interface MetricsSummary {
  holdout_set_size: number;
  decision_accuracy: number;
  contest_recommended_count: number;
  no_contest_recommended_count: number;
  total_recovered_inr: number;
  total_contest_cost_spent_inr: number;
  net_value_inr: number;
  missed_recovery_inr_from_no_contest_calls: number;
  note: string;
}

export interface MetricsPerCase {
  dispute_id: string;
  recommendation: string;
  would_have_won: boolean;
  amount_inr: number;
}

export interface Metrics {
  summary: MetricsSummary;
  per_case: MetricsPerCase[];
}

export interface SubmitDisputeRequest {
  network: Network;
  amount_inr: number;
  raw_transaction_data: Record<string, unknown>;
}

export interface ApproveRequest {
  approved: boolean;
}

export interface HealthResponse {
  status: string;
  project: string;
}
