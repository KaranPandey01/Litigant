from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.decision import AuditLogEntry

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("/{dispute_id}")
def get_audit_trail(dispute_id: str, db: Session = Depends(get_db)):
    """
    Full stage-by-stage log for one dispute — anomaly score, reason code
    classification, evidence assembly, decision, human approval. This is
    the artifact that answers 'can I trust this system' in the panel.
    """
    entries = (
        db.query(AuditLogEntry)
        .filter(AuditLogEntry.dispute_id == dispute_id)
        .order_by(AuditLogEntry.created_at.asc())
        .all()
    )
    if not entries:
        raise HTTPException(404, "No audit trail for this dispute")
    return [
        {"stage": e.stage, "detail": e.detail, "timestamp": e.created_at.isoformat()}
        for e in entries
    ]
