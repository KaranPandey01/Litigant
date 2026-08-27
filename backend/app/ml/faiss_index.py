"""
FAISS-backed retrieval of similar prior transactions/disputes — ported from
the existing fraud-detection RAG layer. Used to give the evidence-assembly
agent real context (prior transaction history, similar past disputes and
their outcomes) instead of reasoning from the current dispute alone.
"""
from pathlib import Path
import json
import numpy as np
import faiss

INDEX_PATH = Path(__file__).parent / "model_store" / "dispute_history.index"
METADATA_PATH = Path(__file__).parent / "model_store" / "dispute_history_meta.json"

VECTOR_DIM = 6  # matches FEATURE_ORDER length in anomaly_scorer for simplicity


def _vectorize(record: dict) -> np.ndarray:
    v = [
        record.get("amount_inr", 0.0),
        1 if record.get("avs_result") == "match" else 0,
        1 if record.get("cvv_result") == "match" else 0,
        1 if record.get("device_seen_before") else 0,
        1 if record.get("ip_country_match") else 0,
        float(record.get("hours_since_last_txn", 24)),
    ]
    return np.array(v, dtype="float32")


def build_index(history_records: list[dict]):
    """history_records: prior disputes/transactions with known outcomes, used as retrieval corpus."""
    vectors = np.vstack([_vectorize(r) for r in history_records]).astype("float32")
    index = faiss.IndexFlatL2(VECTOR_DIM)
    index.add(vectors)

    INDEX_PATH.parent.mkdir(parents=True, exist_ok=True)
    faiss.write_index(index, str(INDEX_PATH))
    with open(METADATA_PATH, "w") as f:
        json.dump(history_records, f)


def retrieve_similar(record: dict, k: int = 5) -> list[dict]:
    """Returns up to k most similar prior disputes/transactions with their outcomes."""
    if not INDEX_PATH.exists() or not METADATA_PATH.exists():
        return []
    index = faiss.read_index(str(INDEX_PATH))
    with open(METADATA_PATH) as f:
        metadata = json.load(f)

    query = _vectorize(record).reshape(1, -1)
    k = min(k, index.ntotal)
    if k == 0:
        return []
    distances, indices = index.search(query, k)
    results = []
    for dist, idx in zip(distances[0], indices[0]):
        if 0 <= idx < len(metadata):
            item = dict(metadata[idx])
            item["similarity_distance"] = float(dist)
            results.append(item)
    return results
