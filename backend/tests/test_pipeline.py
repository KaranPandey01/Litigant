from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_submit_dispute_runs_full_pipeline():
    payload = {
        "network": "mastercard",
        "amount_inr": 8000.0,
        "raw_transaction_data": {
            "avs_result": "match",
            "cvv_result": "match",
            "device_seen_before": True,
            "ip_country_match": True,
            "hours_since_last_txn": 6,
            "dispute_notice_text": "Cardholder claims goods not delivered.",
            "contest_cost_inr": 300,
        },
    }
    r = client.post("/disputes/", json=payload)
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "decided"
    assert body["reason_code"] is not None

    dispute_id = body["id"]

    r_evidence = client.get(f"/disputes/{dispute_id}/evidence")
    assert r_evidence.status_code == 200
    assert 0.0 <= r_evidence.json()["completeness_score"] <= 1.0

    r_decision = client.get(f"/disputes/{dispute_id}/decision")
    assert r_decision.status_code == 200
    decision = r_decision.json()
    assert decision["recommendation"] in ("contest", "no_contest")
    assert decision["human_approved"] is False

    r_audit = client.get(f"/audit/{dispute_id}")
    assert r_audit.status_code == 200
    stages = [e["stage"] for e in r_audit.json()]
    assert "decision_made" in stages


def test_approve_decision_gate():
    payload = {
        "network": "rupay",
        "amount_inr": 3000.0,
        "raw_transaction_data": {"contest_cost_inr": 200},
    }
    r = client.post("/disputes/", json=payload)
    dispute_id = r.json()["id"]

    r_decision = client.get(f"/disputes/{dispute_id}/decision")
    decision_id = r_decision.json()["id"]

    r_approve = client.post(f"/decisions/{decision_id}/approve", json={"approved": True})
    assert r_approve.status_code == 200
    assert r_approve.json()["human_approved"] is True
