"""
Runs the deterministic parts of the pipeline (evidence completeness ->
economics -> recommendation) against the held-out synthetic dispute set
and reports honest metrics: this is what "measured accuracy, not a
cherry-picked match" means for this project.

Deliberately evaluates the economics/decision layer without live LLM calls
(reason-code classification is assumed correct here, since ground-truth
reason codes are already tagged in the synthetic set) — this isolates
whether the DECISION LOGIC is sound, which is the part that has to be
defensible to a panel. Run scripts/evaluate_end_to_end.py separately if
you want to include LLM classification accuracy too.

Run: python scripts/evaluate.py
"""
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.agent import economics  # noqa: E402

DATA_PATH = Path(__file__).parent.parent.parent / "data" / "dataset.json"
OUT_PATH = Path(__file__).parent.parent.parent / "docs" / "eval_results.json"


def evidence_completeness(dispute: dict) -> float:
    strengths = dispute["evidence_strength"]
    if not strengths:
        return 0.0
    return sum(strengths.values()) / (2 * len(strengths))


def run():
    with open(DATA_PATH) as f:
        data = json.load(f)
    holdout = data["holdout"]

    correct_decisions = 0
    total_recovered = 0.0
    total_contest_cost_spent = 0.0
    total_missed_recovery = 0.0  # money left on the table by wrongly recommending no-contest
    contest_count = 0
    no_contest_count = 0

    per_case = []

    for d in holdout:
        completeness = evidence_completeness(d)
        win_prob = economics.estimate_win_probability(d["network"], d["reason_code"], completeness)
        rec = economics.recommend(d["amount_inr"], d["contest_cost_inr"], win_prob)

        actually_won = d["ground_truth"]["would_win_if_contested"]

        if rec["recommendation"] == "contest":
            contest_count += 1
            total_contest_cost_spent += d["contest_cost_inr"]
            if actually_won:
                total_recovered += d["amount_inr"]
                correct_decisions += 1
            # if contested and lost, cost was spent for nothing — already counted above
            else:
                correct_decisions += 0  # explicit for clarity: a loss after contesting is a wrong call
        else:
            no_contest_count += 1
            if actually_won:
                # would have won if contested — money left on the table
                total_missed_recovery += d["amount_inr"]
            else:
                correct_decisions += 1  # correctly avoided a losing, cost-incurring contest

        per_case.append({
            "dispute_id": d["dispute_id"],
            "recommendation": rec["recommendation"],
            "would_have_won": actually_won,
            "amount_inr": d["amount_inr"],
        })

    n = len(holdout)
    decision_accuracy = round(correct_decisions / n, 3) if n else 0.0
    net_value = round(total_recovered - total_contest_cost_spent, 2)

    results = {
        "holdout_set_size": n,
        "decision_accuracy": decision_accuracy,
        "contest_recommended_count": contest_count,
        "no_contest_recommended_count": no_contest_count,
        "total_recovered_inr": round(total_recovered, 2),
        "total_contest_cost_spent_inr": round(total_contest_cost_spent, 2),
        "net_value_inr": net_value,
        "missed_recovery_inr_from_no_contest_calls": round(total_missed_recovery, 2),
        "note": (
            "decision_accuracy counts a call correct when: (a) contest was recommended and the "
            "dispute would have been won, or (b) no-contest was recommended and the dispute would "
            "have been lost. This is an honest metric — it penalizes both wasted contests and "
            "missed recoveries, not just one direction."
        ),
    }

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_PATH, "w") as f:
        json.dump({"summary": results, "per_case": per_case}, f, indent=2)

    print(json.dumps(results, indent=2))
    print(f"\nFull results written to {OUT_PATH}")


if __name__ == "__main__":
    run()
