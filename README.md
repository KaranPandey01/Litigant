# Litigant — AI Chargeback Defense Agent

**Track 02: AI Risk Manager** — Razorpay AI Buildathon 2026

Merchants lose winnable chargeback disputes not because the transaction was
fraudulent, but because nobody assembles the *specific evidence a given card
network reason code requires* within the response window. Litigant identifies
the reason code, assembles the required evidence bundle from transaction data
and history, and recommends contest / no-contest based on measured win
probability and recovery economics — every step logged, every action gated
behind human approval.

## Why this, not another fraud classifier

Most fraud/dispute projects stop at "is this transaction anomalous." Litigant
starts there (see `app/ml/anomaly_scorer.py`, a reused Isolation Forest
module) but goes further into the part almost nobody builds: **reason-code-specific
evidence assembly and contest economics**. A flagged transaction is not
useful to a merchant on its own — knowing *whether it's worth fighting and
with what proof* is the actual decision they need help with.

## Architecture

```
Dispute submitted (network, amount, transaction data)
        │
        ▼
[Anomaly Scorer] ── classical ML (Isolation Forest + SMOTE-trained)
        │              scores transaction-level anomaly — a statistics
        │              problem, not a language problem
        ▼
[Reason Code Classifier] ── LLM (Claude)
        │              maps dispute notice + metadata to the specific
        │              network reason code (Visa/Mastercard/RuPay)
        ▼
[FAISS Retrieval] ── pulls similar prior disputes/transactions for context
        ▼
[Evidence Assembler]
        │  - deterministic: checks which required fields (per reason code)
        │    are present and how strong each is — auditable arithmetic,
        │    not an LLM guess
        │  - LLM: drafts the human-readable contest narrative from the
        │    collected evidence
        ▼
[Economics Engine] ── deterministic
        │  win probability = reason-code base rate + evidence completeness
        │  expected value = (win_prob × amount) − contest cost
        │  recommends contest / no-contest
        ▼
[Human Approval Gate] ── nothing is ever auto-submitted
        ▼
[Audit Trail] ── every stage logged: inputs, outputs, timestamp
```

**Where AI is used vs. not, deliberately:** anomaly scoring and the economics
engine are classical/deterministic because they're statistics and arithmetic
problems where a black-box LLM call would reduce auditability for no benefit.
Reason-code classification and evidence narrative drafting use the LLM
because they require judgment over unstructured text and network-specific
taxonomies. This split is intentional, not incidental.

## Honest metrics (held-out synthetic set, n=60)

No public chargeback dataset exists, so `data/synthetic_dispute_generator.py`
builds a reproducible dataset (seeded, regeneratable) with ground-truth
win/loss outcomes tied to evidence completeness and reason-code base rates.
`backend/scripts/evaluate.py` runs the deterministic decision layer against
the held-out 30% split — see `docs/eval_results.json` for the full per-case
output, not just the summary.

Latest run:
- **Decision accuracy: 58.3%** (a call counts as correct only if contest→win
  or no-contest→would-have-lost — this penalizes both wasted contests *and*
  missed recoveries, not just one direction)
- 49 contest / 11 no-contest recommendations out of 60 — the no-contest
  branch actually fires; an earlier version of this cost model recommended
  contest 100% of the time, which would have made the economics layer
  meaningless. See "What broke" below.
- Net value across the held-out set: ₹2,57,316 (recovered minus cost spent
  on contests that lost)
- ₹1,33,126 in missed recovery from no-contest calls where the dispute would
  actually have been won — reported honestly rather than hidden, since this
  is the real cost of the model being conservative

## What broke, and what we did about it

Initial synthetic contest costs were a flat small fee (₹50–400) regardless of
dispute size. Against dispute amounts up to ₹45,000, this made "contest
everything" trivially optimal — 100% contest recommendations on the first
evaluation run, which meant the economics layer wasn't actually doing
anything. We caught this by inspecting the evaluation output rather than
trusting the summary number, rebuilt the cost model to scale partly with
dispute size (15–45% of amount + a base fee, closer to real ops-effort
economics), and reran. The no-contest branch now fires appropriately (11/60),
and the decision-accuracy metric moved from a meaningless 100%-contest
baseline to a discriminating 58.3%.

## Project structure

See `backend/app/` for the FastAPI service (models, API, ML, agent layers),
`data/` for the reason-code taxonomy and synthetic dataset generator, and
`docs/` for architecture notes and evaluation output.

## Running locally

```bash
# backend
cd backend
pip install -r requirements.txt
cp ../.env.example ../.env   # fill in ANTHROPIC_API_KEY (optional — falls
                               # back to deterministic stubs without it)
python ../data/synthetic_dispute_generator.py --n 200 --out dataset.json
python -c "
import sys, json; sys.path.insert(0, '.')
from app.ml import anomaly_scorer
data = json.load(open('../data/dataset.json'))
anomaly_scorer.train_and_save(data['train'])
"
python scripts/evaluate.py
uvicorn app.main:app --reload

# tests
pytest tests/ -v
```

## Deployment

Single platform: **Render** (`render.yaml` at repo root) — deploys the
FastAPI backend as a Docker web service, a managed Postgres instance, and the
Next.js frontend, all from one repo/dashboard. Set `ANTHROPIC_API_KEY` in the
Render dashboard (not committed).

## Tech stack

FastAPI · SQLAlchemy · PostgreSQL · scikit-learn (Isolation Forest) · FAISS ·
Anthropic Claude API · Next.js (frontend, see `frontend/`) · Render (deploy)
