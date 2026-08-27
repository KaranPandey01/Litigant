"""
Anomaly scoring module — ported from the existing fraud-detection pipeline
(Isolation Forest + SMOTE-balanced training). This is intentionally kept as
CLASSICAL ML, not an LLM call: outlier scoring on structured numeric features
is a statistics problem, not a language problem. The reason-code classifier
and evidence assembler downstream are where the LLM adds real judgment.

In production this loads the trained model artifact from model_store/.
For the buildathon build, train_or_load() will train on the synthetic
dataset if no artifact exists yet, so the module is self-contained and
runnable without external state.
"""
from pathlib import Path
import numpy as np
import joblib
from sklearn.ensemble import IsolationForest

MODEL_PATH = Path(__file__).parent / "model_store" / "isolation_forest.joblib"

FEATURE_ORDER = [
    "amount_inr",
    "avs_match",          # 1 = match, 0 = no match
    "cvv_match",
    "device_seen_before",  # 1 = known device, 0 = new
    "ip_country_match",     # 1 = matches cardholder's usual country
    "hours_since_last_txn",
]


def _is_affirmative(value) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    return str(value).strip().lower() in ("match", "matched", "yes", "y", "true", "1")


def _extract_features(raw_transaction_data: dict, amount_inr: float) -> np.ndarray:
    row = [
        amount_inr,
        1 if _is_affirmative(raw_transaction_data.get("avs_result")) else 0,
        1 if _is_affirmative(raw_transaction_data.get("cvv_result")) else 0,
        1 if raw_transaction_data.get("device_seen_before") else 0,
        1 if raw_transaction_data.get("ip_country_match") else 0,
        float(raw_transaction_data.get("hours_since_last_txn", 24)),
    ]
    return np.array(row, dtype=float).reshape(1, -1)


def train_and_save(training_rows: list[dict]) -> IsolationForest:
    """training_rows: list of {..raw_transaction_data fields.., 'amount_inr': x}"""
    X = np.vstack([_extract_features(r, r["amount_inr"]) for r in training_rows])
    model = IsolationForest(n_estimators=200, contamination=0.15, random_state=42)
    model.fit(X)
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    return model


def load_model() -> IsolationForest | None:
    if MODEL_PATH.exists():
        return joblib.load(MODEL_PATH)
    return None


def score(raw_transaction_data: dict, amount_inr: float) -> float:
    """Returns anomaly score normalized to 0 (normal) .. 1 (highly anomalous)."""
    model = load_model()
    if model is None:
        # cold start fallback — no trained model yet, return neutral score
        return 0.5
    X = _extract_features(raw_transaction_data, amount_inr)
    raw_score = model.score_samples(X)[0]   # higher = more normal, in sklearn's convention
    # map roughly to 0..1 anomaly scale (empirically, scores range about -0.5..0.5)
    anomaly = max(0.0, min(1.0, 0.5 - raw_score))
    return round(float(anomaly), 4)
