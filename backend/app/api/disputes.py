import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.dispute import Dispute
from app.models.evidence import EvidenceBundle
from app.models.decision import Decision, AuditLogEntry
from app.schemas.dispute import DisputeSubmitRequest, DisputeResponse, EvidenceBundleResponse, DecisionResponse
from app.ml import anomaly_scorer, faiss_index
from app.agent import reason_code_classifier, evidence_assembler, economics

router = APIRouter(prefix="/disputes", tags=["disputes"])


def _log(db: Session, dispute_id: str, stage: str, detail: dict):
    entry = AuditLogEntry(id=str(uuid.uuid4())[:8], dispute_id=dispute_id, stage=stage, detail=detail)
    db.add(entry)
    db.commit()


@router.post("/", response_model=DisputeResponse)
def submit_dispute(payload: DisputeSubmitRequest, db: Session = Depends(get_db)):
    """
    Full pipeline: anomaly score -> reason code classification -> evidence
    assembly -> economics -> decision (unapproved). Every stage writes an
    audit log entry so the whole decision path is inspectable afterward.
    """
    dispute = Dispute(
        network=payload.network.lower(),
        amount_inr=payload.amount_inr,
        raw_transaction_data=payload.raw_transaction_data,
        status="received",
    )
    db.add(dispute)
    db.commit()
    db.refresh(dispute)

    # 1. anomaly score (reused classical ML from the fraud pipeline)
    anomaly = anomaly_scorer.score(payload.raw_transaction_data, payload.amount_inr)
    dispute.anomaly_score = anomaly
    _log(db, dispute.id, "anomaly_scored", {"anomaly_score": anomaly})

    # 2. reason code classification (LLM)
    notice_text = payload.raw_transaction_data.get("dispute_notice_text", "")
    classification = reason_code_classifier.classify(payload.network, notice_text, payload.raw_transaction_data)
    dispute.reason_code = classification["reason_code"]
    dispute.reason_name = classification["reason_name"]
    dispute.status = "classified"
    db.commit()
    _log(db, dispute.id, "reason_code_classified", classification)

    # 3. retrieve similar prior disputes (FAISS)
    similar = faiss_index.retrieve_similar(payload.raw_transaction_data, k=5)
    _log(db, dispute.id, "similar_history_retrieved", {"count": len(similar)})

    # 4. evidence assembly
    evidence_result = evidence_assembler.collect_evidence(
        payload.network, classification["reason_code"], payload.raw_transaction_data, similar
    )
    narrative = evidence_assembler.draft_narrative(
        payload.network, classification["reason_code"], classification["reason_name"],
        evidence_result["collected_fields"], dispute.id,
    )
    bundle = EvidenceBundle(
        id=evidence_assembler.new_bundle_id(),
        dispute_id=dispute.id,
        required_fields=evidence_result["required_fields"],
        collected_fields=evidence_result["collected_fields"],
        completeness_score=evidence_result["completeness_score"],
        narrative=narrative,
    )
    db.add(bundle)
    dispute.status = "evidence_assembled"
    db.commit()
    _log(db, dispute.id, "evidence_assembled", {"completeness_score": evidence_result["completeness_score"]})

    # 5. economics + recommendation
    win_prob = economics.estimate_win_probability(
        payload.network, classification["reason_code"], evidence_result["completeness_score"]
    )
    contest_cost = payload.raw_transaction_data.get("contest_cost_inr", 150.0)
    rec = economics.recommend(payload.amount_inr, contest_cost, win_prob)

    decision = Decision(
        id=str(uuid.uuid4())[:8],
        dispute_id=dispute.id,
        recommendation=rec["recommendation"],
        win_probability=rec["win_probability"],
        expected_recovery_inr=rec["expected_recovery_inr"],
        contest_cost_inr=rec["contest_cost_inr"],
        expected_value_inr=rec["expected_value_inr"],
        reasoning=rec["reasoning"],
        human_approved=False,
    )
    db.add(decision)
    dispute.status = "decided"
    dispute.contest_cost_inr = contest_cost
    db.commit()
    _log(db, dispute.id, "decision_made", rec)

    return dispute


@router.get("/{dispute_id}", response_model=DisputeResponse)
def get_dispute(dispute_id: str, db: Session = Depends(get_db)):
    dispute = db.query(Dispute).filter(Dispute.id == dispute_id).first()
    if not dispute:
        raise HTTPException(404, "Dispute not found")
    return dispute


@router.get("/{dispute_id}/evidence", response_model=EvidenceBundleResponse)
def get_evidence(dispute_id: str, db: Session = Depends(get_db)):
    bundle = db.query(EvidenceBundle).filter(EvidenceBundle.dispute_id == dispute_id).first()
    if not bundle:
        raise HTTPException(404, "Evidence bundle not found")
    return bundle


@router.get("/{dispute_id}/decision", response_model=DecisionResponse)
def get_decision(dispute_id: str, db: Session = Depends(get_db)):
    decision = db.query(Decision).filter(Decision.dispute_id == dispute_id).order_by(Decision.created_at.desc()).first()
    if not decision:
        raise HTTPException(404, "Decision not found")
    return decision


@router.get("/", response_model=list[DisputeResponse])
def list_disputes(db: Session = Depends(get_db)):
    return db.query(Dispute).order_by(Dispute.created_at.desc()).all()
