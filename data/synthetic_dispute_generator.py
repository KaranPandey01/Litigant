"""
Generates a synthetic dispute dataset since no public chargeback dataset exists.
Each dispute is tagged with a ground-truth reason code, evidence availability
(which fields exist and how strong they are), and a ground-truth outcome
(win/loss if contested) so we can report real precision/recall/win-rate
numbers on a held-out split instead of hand-picking examples.

Run: python synthetic_dispute_generator.py --n 200 --out dataset.json
"""
import argparse
import json
import random
import uuid
from pathlib import Path

random.seed(42)  # reproducible dataset — panel can regenerate and verify

NETWORKS = ["visa", "mastercard", "rupay"]
REASON_CODES = {
    "visa": ["10.4", "13.1", "12.6.1"],
    "mastercard": ["4837", "4855", "4834"],
    "rupay": ["RC-30", "RC-53"],
}

# Evidence "strength" is simulated per field: 0 = missing, 1 = weak/partial, 2 = strong/complete.
# Win probability is a function of (base_win_rate_hint for that code) + evidence completeness,
# NOT a fixed lookup — this is what makes the "held-out" evaluation meaningful rather than trivial.


def load_taxonomy():
    with open(Path(__file__).parent / "reason_codes.json") as f:
        return json.load(f)


def simulate_evidence(required_fields):
    evidence = {}
    for field in required_fields:
        # weighted so most disputes have partial evidence, not perfect or empty
        strength = random.choices([0, 1, 2], weights=[0.25, 0.40, 0.35])[0]
        evidence[field] = strength
    return evidence


def simulate_outcome(base_win_rate, evidence):
    if not evidence:
        completeness = 0
    else:
        completeness = sum(evidence.values()) / (2 * len(evidence))  # 0..1
    # completeness shifts win probability away from the base rate
    win_prob = base_win_rate + (completeness - 0.5) * 0.5
    win_prob = max(0.02, min(0.95, win_prob))
    won = random.random() < win_prob
    return won, round(win_prob, 3)


def generate_dispute(taxonomy):
    network = random.choice(NETWORKS)
    code = random.choice(REASON_CODES[network])
    code_info = taxonomy["networks"][network][code]
    evidence = simulate_evidence(code_info["required_evidence"])
    won, true_win_prob = simulate_outcome(code_info["typical_win_rate_hint"], evidence)

    amount_inr = round(random.uniform(299, 45000), 2)
    # cost scales partly with dispute size (ops effort, documentation complexity)
    # plus a flat network/processing fee — this is what creates real no-contest
    # cases for low-value disputes instead of "always contest" being trivially optimal
    contest_cost_inr = round(amount_inr * random.uniform(0.15, 0.45) + random.uniform(100, 300), 2)

    return {
        "dispute_id": str(uuid.uuid4())[:8],
        "network": network,
        "reason_code": code,
        "reason_name": code_info["name"],
        "category": code_info["category"],
        "amount_inr": amount_inr,
        "contest_cost_inr": contest_cost_inr,
        "evidence_strength": evidence,  # ground truth, used to derive the bundle
        "response_window_days": code_info["response_window_days"],
        "ground_truth": {
            "would_win_if_contested": won,
            "true_win_probability": true_win_prob,
        },
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--n", type=int, default=200)
    parser.add_argument("--out", type=str, default="dataset.json")
    parser.add_argument("--holdout_fraction", type=float, default=0.3)
    args = parser.parse_args()

    taxonomy = load_taxonomy()
    disputes = [generate_dispute(taxonomy) for _ in range(args.n)]
    random.shuffle(disputes)

    split_idx = int(len(disputes) * (1 - args.holdout_fraction))
    train, holdout = disputes[:split_idx], disputes[split_idx:]

    out_path = Path(__file__).parent / args.out
    with open(out_path, "w") as f:
        json.dump({"train": train, "holdout": holdout}, f, indent=2)

    print(f"Generated {len(disputes)} disputes -> {len(train)} train / {len(holdout)} holdout")
    print(f"Written to {out_path}")


if __name__ == "__main__":
    main()
