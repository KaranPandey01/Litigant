import json
from pathlib import Path

from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/metrics", tags=["metrics"])

RESULTS_PATH = Path(__file__).parent.parent.parent.parent / "docs" / "eval_results.json"


@router.get("/")
def get_metrics():
    """
    Serves the held-out evaluation results produced by
    backend/scripts/evaluate.py (win-rate, $ recovered vs cost, precision on
    contest/no-contest calls). Kept as a static generated file rather than
    computed live so the number shown in the demo always matches what's
    reproducible from the committed evaluation script and dataset.
    """
    if not RESULTS_PATH.exists():
        raise HTTPException(404, "No evaluation results yet — run scripts/evaluate.py first.")
    with open(RESULTS_PATH) as f:
        return json.load(f)
