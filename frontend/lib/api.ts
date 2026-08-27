import type {
  ApproveRequest,
  AuditEntry,
  Decision,
  Dispute,
  Evidence,
  HealthResponse,
  Metrics,
  SubmitDisputeRequest,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function listDisputes(): Promise<Dispute[]> {
  return request<Dispute[]>("/disputes/");
}

export async function getDispute(id: string): Promise<Dispute> {
  return request<Dispute>(`/disputes/${id}`);
}

export async function getEvidence(disputeId: string): Promise<Evidence> {
  return request<Evidence>(`/disputes/${disputeId}/evidence`);
}

export async function getDecision(disputeId: string): Promise<Decision> {
  return request<Decision>(`/disputes/${disputeId}/decision`);
}

export async function approveDecision(
  decisionId: string,
  approved: boolean
): Promise<Decision> {
  return request<Decision>(`/decisions/${decisionId}/approve`, {
    method: "POST",
    body: JSON.stringify({ approved } satisfies ApproveRequest),
  });
}

export async function getAuditTrail(disputeId: string): Promise<AuditEntry[]> {
  return request<AuditEntry[]>(`/audit/${disputeId}`);
}

export async function getMetrics(): Promise<Metrics | null> {
  const res = await fetch(`${API_URL}/metrics/`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json() as Promise<Metrics>;
}

export async function getHealth(): Promise<HealthResponse> {
  return request<HealthResponse>("/health");
}

export async function submitDispute(
  body: SubmitDisputeRequest
): Promise<Dispute> {
  return request<Dispute>("/disputes/", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export { API_URL };
