"""
Classifies an incoming dispute into a specific card-network reason code.
This is genuinely an LLM-appropriate task: the merchant's dispute notice
text/metadata is unstructured and the mapping to a reason code requires
judgment across network-specific taxonomies — not a fixed lookup table.
"""
import json
from pathlib import Path

from google import genai

from app.core.config import get_settings

settings = get_settings()
_client = genai.Client(api_key=settings.GEMINI_API_KEY) if settings.GEMINI_API_KEY else None

TAXONOMY_PATH = Path(__file__).parent.parent.parent.parent / "data" / "reason_codes.json"


def _load_taxonomy() -> dict:
    with open(TAXONOMY_PATH) as f:
        return json.load(f)


def classify(network: str, dispute_notice_text: str, raw_transaction_data: dict) -> dict:
    """
    Returns: {"reason_code": str, "reason_name": str, "confidence": float, "rationale": str}
    """
    taxonomy = _load_taxonomy()
    network_codes = taxonomy["networks"].get(network.lower(), {})

    if _client is None:
        # deterministic fallback for local/offline runs without an API key
        first_code = next(iter(network_codes)) if network_codes else "UNKNOWN"
        return {
            "reason_code": first_code,
            "reason_name": network_codes.get(first_code, {}).get("name", "Unknown"),
            "confidence": 0.0,
            "rationale": "No GEMINI_API_KEY configured — deterministic fallback used.",
        }

    codes_summary = "\n".join(
        f"- {code}: {info['name']} (category: {info['category']})"
        for code, info in network_codes.items()
    )

    prompt = f"""You are classifying a card network chargeback dispute into the correct reason code.

Network: {network}
Available reason codes for this network:
{codes_summary}

Dispute notice text from the network: "{dispute_notice_text}"
Transaction metadata: {json.dumps(raw_transaction_data)}

Respond ONLY with JSON, no markdown, no preamble:
{{"reason_code": "<code>", "confidence": <0.0-1.0>, "rationale": "<one sentence>"}}"""

    try:
        response = _client.models.generate_content(model=settings.GEMINI_MODEL, contents=prompt)
        text = response.text.strip()
        if text.startswith("```"):
            text = text.strip("`")
            if text.startswith("json"):
                text = text[4:]
            text = text.strip()
        parsed = json.loads(text)
        code = parsed["reason_code"]
        if code not in network_codes:
            raise ValueError(f"Model returned unknown reason code: {code}")

        return {
            "reason_code": code,
            "reason_name": network_codes.get(code, {}).get("name", "Unknown"),
            "confidence": parsed.get("confidence", 0.0),
            "rationale": parsed.get("rationale", ""),
        }
    except Exception as e:
        # A live LLM call can fail for many reasons (model retired, rate limit,
        # malformed JSON, network hiccup). A dispute-processing pipeline should
        # degrade to a clear, auditable fallback rather than crash the request --
        # the alternative is a 500 that loses the merchant's whole submission.
        first_code = next(iter(network_codes)) if network_codes else "UNKNOWN"
        return {
            "reason_code": first_code,
            "reason_name": network_codes.get(first_code, {}).get("name", "Unknown"),
            "confidence": 0.0,
            "rationale": f"Gemini classification failed ({type(e).__name__}) — deterministic fallback used.",
        }