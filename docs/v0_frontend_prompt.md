Build a Next.js (App Router, TypeScript, Tailwind) frontend called "Litigant" —
an AI Chargeback Defense Agent dashboard for merchants. Dark, professional
fintech aesthetic (think Stripe/Razorpay dashboard, not a generic admin
template) — deep charcoal/near-black background, a single accent color
(amber or muted gold), clean sans-serif typography, generous whitespace,
no gradients or glassmorphism.

CONTEXT: Litigant takes an incoming chargeback dispute, identifies its card
network reason code (Visa/Mastercard/RuPay), assembles the specific evidence
that reason code requires, and recommends contest/no-contest based on
measured win probability and recovery economics. Every recommendation is
logged and requires human approval before any action is taken — nothing is
ever auto-submitted.

BACKEND API (FastAPI, base URL via env var NEXT_PUBLIC_API_URL):

- POST /disputes/
  Body: { network: "visa"|"mastercard"|"rupay", amount_inr: number, raw_transaction_data: object }
  raw_transaction_data can include: avs_result, cvv_result, device_seen_before,
  ip_country_match, hours_since_last_txn, dispute_notice_text, contest_cost_inr,
  proof_of_delivery, tracking_number_and_carrier_confirmation, and other
  evidence-field-shaped keys.
  Returns: { id, network, reason_code, reason_name, amount_inr, anomaly_score, status }
  This single call runs the ENTIRE pipeline synchronously (anomaly score →
  reason code classification → evidence assembly → economics → decision).

- GET /disputes/          → list all disputes (array of the same shape as above)
- GET /disputes/{id}      → single dispute
- GET /disputes/{id}/evidence
  Returns: { id, dispute_id, required_fields: string[], collected_fields:
  { [field]: { present: bool, strength: 0|1|2, source: string|null } },
  completeness_score: number (0-1), narrative: string }
- GET /disputes/{id}/decision
  Returns: { id, dispute_id, recommendation: "contest"|"no_contest",
  win_probability: number, expected_recovery_inr: number, contest_cost_inr:
  number, expected_value_inr: number, reasoning: string, human_approved: bool }
- POST /decisions/{decision_id}/approve
  Body: { approved: boolean }
  Returns the updated decision object
- GET /audit/{dispute_id}
  Returns: array of { stage: string, detail: object, timestamp: string }
  Stages appear in order: anomaly_scored, reason_code_classified,
  similar_history_retrieved, evidence_assembled, decision_made, and
  human_approved/human_rejected once acted on.
- GET /metrics/
  Returns held-out evaluation results: { summary: { holdout_set_size,
  decision_accuracy, contest_recommended_count, no_contest_recommended_count,
  total_recovered_inr, total_contest_cost_spent_inr, net_value_inr,
  missed_recovery_inr_from_no_contest_calls, note }, per_case: array }
  This endpoint may 404 if evaluation hasn't been run yet — handle gracefully.
- GET /health → { status: "ok", project: "Litigant" }

PAGES TO BUILD:

1. **/ (Dashboard)**
   - Top stats row pulling from GET /metrics/: decision accuracy, net value
     recovered, contest vs no-contest split, missed recovery — show as
     compact stat cards. If /metrics/ 404s, show an empty/placeholder state,
     not an error screen.
   - A table of recent disputes (GET /disputes/) — columns: ID, network
     (badge-styled), reason code + name, amount (₹ formatted), status,
     anomaly score, created date. Row click navigates to /disputes/[id].
   - A prominent "Submit New Dispute" button opening a form (modal or
     dedicated /disputes/new page) with fields for network (select), amount,
     and a JSON/key-value editor for raw_transaction_data (at minimum:
     avs_result, cvv_result, device_seen_before, ip_country_match,
     hours_since_last_txn, dispute_notice_text as a textarea,
     contest_cost_inr). On submit, POST to /disputes/, then redirect to the
     new dispute's detail page.

2. **/disputes/[id] (Dispute Detail)**
   This is the core screen — it needs to tell the full story of one dispute:
   - Header: dispute ID, network badge, reason code + name, amount, status
   - Evidence panel (GET .../evidence): a checklist-style view of
     required_fields, each showing present/missing with a strength indicator
     (0 = red/missing, 1 = amber/weak, 2 = green/strong), a completeness
     score as a progress bar/ring, and the narrative text as a readable
     block (this is the actual drafted contest response — treat it like a
     document preview).
   - Decision panel (GET .../decision): recommendation as a large, clear
     badge ("CONTEST" or "NO CONTEST", color-coded), win probability as a
     percentage, expected recovery / contest cost / expected value as three
     clear numbers (₹ formatted, expected value colored green if positive,
     red if negative), the reasoning text in full, and an Approve/Reject
     action if human_approved is false — calling POST /decisions/{id}/approve.
     Once approved, show an "Approved" state instead of the buttons.
   - Audit trail panel (GET /audit/{id}): a vertical timeline/stepper showing
     each stage in order with its timestamp and a collapsible raw detail
     JSON view per stage. This is the trust/transparency artifact — make it
     feel inspectable, not buried.

3. **/metrics (Evaluation Results)**
   Full view of GET /metrics/ — the summary stats as cards (same as
   dashboard but larger, with the "note" field shown as an explanatory
   caption under decision_accuracy since it's not a trivial metric), plus a
   table of per_case results (dispute_id, recommendation, would_have_won,
   amount_inr) so a reviewer can audit individual calls, not just trust the
   aggregate.

GENERAL REQUIREMENTS:
- Use fetch with NEXT_PUBLIC_API_URL as the base; centralize API calls in
  lib/api.ts with typed functions matching the schemas above.
- Loading and error states on every data fetch — no blank screens or
  unhandled promise states.
- All currency displayed as ₹ with Indian number formatting (e.g. ₹1,33,126).
- Responsive, but desktop-first — this will be demoed on a laptop in a pitch
  video, not primarily used on mobile.
- No mock/fake data hardcoded into components — everything renders from the
  API responses above, including empty states when a list is empty.
- Keep component structure clean: separate presentational components
  (StatCard, StatusBadge, EvidenceChecklist, AuditTimeline, etc.) from page-
  level data-fetching logic.

Do not include authentication/login — this is a single-tenant demo, no user
accounts needed.
