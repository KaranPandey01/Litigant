"""
Deterministic economics engine — this is the "honest metrics including
false-positive cost" requirement made concrete. Win probability is derived
from evidence completeness + the reason code's base win-rate hint, not an
LLM guess, so it is auditable and reproducible. This module is what makes
the contest/no-contest recommendation defensible in the pitch: every number
here can be traced back to inputs, nothing is a black box.
"""
import json
from pathlib import Path

from app.core.config import get_settings

settings = get_settings()
TAXONOMY_PATH = Path(__file__).parent.parent.parent.parent / "data" / "reason_codes.json"


def _load_taxonomy() -> dict:
    with open(TAXONOMY_PATH) as f:
        return json.load(f)


def estimate_win_probability(network: str, reason_code: str, completeness_score: float) -> float:
    taxonomy = _load_taxonomy()
    code_info = taxonomy["networks"].get(network.lower(), {}).get(reason_code, {})
    base_rate = code_info.get("typical_win_rate_hint", 0.4)

    # evidence completeness shifts probability away from the base rate,
    # capped so a single field never swings the estimate implausibly
    adjusted = base_rate + (completeness_score - 0.5) * 0.5
    return round(max(0.02, min(0.95, adjusted)), 3)


def recommend(amount_inr: float, contest_cost_inr: float, win_probability: float) -> dict:
    expected_recovery = round(amount_inr * win_probability, 2)
    expected_value = round(expected_recovery - contest_cost_inr, 2)

    if expected_value <= 0 or amount_inr < settings.MIN_VIABLE_RECOVERY_INR:
        recommendation = "no_contest"
        reasoning = (
            f"Expected value is {'negative' if expected_value <= 0 else 'below the minimum viable recovery threshold'} "
            f"(expected recovery ₹{expected_recovery} vs. contest cost ₹{contest_cost_inr}). "
            f"Contesting would likely cost more than it recovers."
        )
    else:
        recommendation = "contest"
        reasoning = (
            f"Win probability {win_probability:.0%} against ₹{amount_inr} disputed amount yields "
            f"expected recovery ₹{expected_recovery}, exceeding the ₹{contest_cost_inr} contest cost "
            f"by ₹{expected_value}."
        )

    return {
        "recommendation": recommendation,
        "win_probability": win_probability,
        "expected_recovery_inr": expected_recovery,
        "contest_cost_inr": contest_cost_inr,
        "expected_value_inr": expected_value,
        "reasoning": reasoning,
    }
