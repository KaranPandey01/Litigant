import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.decision import Decision, AuditLogEntry
from app.schemas.dispute import ApproveDecisionRequest, DecisionResponse

router = APIRouter(prefix="/decisions", tags=["decisions"])


@router.post("/{decision_id}/approve", response_model=DecisionResponse)
def approve_decision(decision_id: str, payload: ApproveDecisionRequest, db: Session = Depends(get_db)):
    """
    Nothing gets submitted to a card network without a human hitting this
    endpoint. This is the 'bounded and gated' requirement made real — the
    agent recommends, it never acts unilaterally.
    """
    decision = db.query(Decision).filter(Decision.id == decision_id).first()
    if not decision:
        raise HTTPException(404, "Decision not found")

    decision.human_approved = payload.approved
    db.commit()

    log_entry = AuditLogEntry(
        id=str(uuid.uuid4())[:8],
        dispute_id=decision.dispute_id,
        stage="human_approved" if payload.approved else "human_rejected",
        detail={"decision_id": decision_id, "recommendation": decision.recommendation},
    )
    db.add(log_entry)
    db.commit()

    return decision
