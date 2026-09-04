"""
Assembles the evidence bundle required for a given reason code, scores its
completeness, and drafts the human-readable contest narrative. The narrative
draft is an LLM task (language generation from structured evidence); the
completeness scoring is deterministic (transparent, auditable arithmetic —
not an LLM guess), matching the "right tool for the right task" principle.
"""
import json
import uuid
from pathlib import Path

from google import genai

from app.core.config import get_settings

settings = get_settings()
_client = genai.Client(api_key=settings.GEMINI_API_KEY) if settings.GEMINI_API_KEY else None

TAXONOMY_PATH = Path(__file__).parent.parent.parent.parent / "data" / "reason_codes.json"

# The submission form collects transaction-level signals (avs_result,
# device_seen_before, ...) which are also useful, differently-named inputs
# to the evidence bundle's required fields (avs_match_result,
# device_fingerprint_history, ...). Without this map, evidence collected
# via the standard submission form would show as "missing" even when the
# merchant provided it — caught by cross-checking the actual frontend form
# fields against this module's expectations.
FIELD_ALIASES = {
    "avs_match_result": ["avs_result"],
    "cvv_match_result": ["cvv_result"],
    "device_fingerprint_history": ["device_seen_before"],
    "ip_geolocation_consistency": ["ip_country_match"],
    "3ds_authentication_result": ["threeds_result", "3ds_result"],
    "otp_or_authentication_log": ["otp_result", "threeds_result"],
}


def _resolve_field_value(field: str, raw_transaction_data: dict):
    if field in raw_transaction_data and raw_transaction_data[field] not in (None, ""):
        return raw_transaction_data[field]
    for alias in FIELD_ALIASES.get(field, []):
        if alias in raw_transaction_data and raw_transaction_data[alias] not in (None, ""):
            return raw_transaction_data[alias]
    return None


def _load_taxonomy() -> dict:
    with open(TAXONOMY_PATH) as f:
        return json.load(f)


def collect_evidence(network: str, reason_code: str, raw_transaction_data: dict, similar_history: list[dict]) -> dict:
    """
    Deterministic evidence collection: checks which required fields are present
    in the transaction data or retrieved history, and how strong each is.
    strength: 0 = missing, 1 = weak/inferred, 2 = strong/direct.
    """
    taxonomy = _load_taxonomy()
    code_info = taxonomy["networks"].get(network.lower(), {}).get(reason_code, {})
    required_fields = code_info.get("required_evidence", [])

    collected = {}
    for field in required_fields:
        resolved_value = _resolve_field_value(field, raw_transaction_data)
        if resolved_value is not None:
            direct = field in raw_transaction_data and raw_transaction_data[field] not in (None, "")
            collected[field] = {
                "present": True,
                "strength": 2 if direct else 1,  # direct field = strong, alias-resolved = weak
                "source": "transaction_data" if direct else "transaction_data_alias",
            }
        elif similar_history:
            # weaker signal — inferred from similar prior transactions/disputes
            collected[field] = {"present": True, "strength": 1, "source": "similar_history"}
        else:
            collected[field] = {"present": False, "strength": 0, "source": None}

    if required_fields:
        completeness = sum(v["strength"] for v in collected.values()) / (2 * len(required_fields))
    else:
        completeness = 0.0

    return {
        "required_fields": required_fields,
        "collected_fields": collected,
        "completeness_score": round(completeness, 3),
    }


def draft_narrative(network: str, reason_code: str, reason_name: str, collected_fields: dict, dispute_id: str) -> str:
    if _client is None:
        present = [f for f, v in collected_fields.items() if v["present"]]
        missing = [f for f, v in collected_fields.items() if not v["present"]]
        return (
            f"[Offline draft — no GEMINI_API_KEY] Dispute {dispute_id} under {network} code {reason_code} "
            f"({reason_name}). Evidence available: {', '.join(present) or 'none'}. "
            f"Evidence missing: {', '.join(missing) or 'none'}."
        )

    prompt = f"""Draft a concise, professional chargeback contest response for a merchant, to submit to
the card network. This is a factual evidence summary, not a persuasive essay.

Network: {network}
Reason code: {reason_code} ({reason_name})
Dispute ID: {dispute_id}
Evidence collected: {json.dumps(collected_fields, indent=2)}

Write 3-5 sentences summarizing the evidence being submitted and why it addresses this specific
reason code. If evidence is missing or weak for a required field, note it plainly rather than
overstating the case — the merchant needs an honest assessment, not marketing copy."""

    try:
        response = _client.models.generate_content(model=settings.GEMINI_MODEL, contents=prompt)
        return response.text.strip()
    except Exception as e:
        present = [f for f, v in collected_fields.items() if v["present"]]
        missing = [f for f, v in collected_fields.items() if not v["present"]]
        return (
            f"[Gemini narrative failed ({type(e).__name__}) — deterministic fallback used] "
            f"Dispute {dispute_id} under {network} code {reason_code} ({reason_name}). "
            f"Evidence available: {', '.join(present) or 'none'}. "
            f"Evidence missing: {', '.join(missing) or 'none'}."
        )


def new_bundle_id() -> str:
    return str(uuid.uuid4())[:8]