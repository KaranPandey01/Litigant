from datetime import datetime, timezone

from sqlalchemy import Column, String, ForeignKey, DateTime, Float, Boolean, JSON

from app.core.db import Base


class Decision(Base):
    __tablename__ = "decisions"

    id = Column(String, primary_key=True)
    dispute_id = Column(String, ForeignKey("disputes.id"), nullable=False)
    recommendation = Column(String, nullable=False)      # "contest" | "no_contest"
    win_probability = Column(Float, nullable=False)
    expected_recovery_inr = Column(Float, nullable=False)
    contest_cost_inr = Column(Float, nullable=False)
    expected_value_inr = Column(Float, nullable=False)    # win_prob * amount - cost
    reasoning = Column(String, nullable=True)              # human-readable explanation
    human_approved = Column(Boolean, default=False)         # gated — nothing auto-submits
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class AuditLogEntry(Base):
    __tablename__ = "audit_log"

    id = Column(String, primary_key=True)
    dispute_id = Column(String, ForeignKey("disputes.id"), nullable=False)
    stage = Column(String, nullable=False)   # e.g. "anomaly_scored", "reason_code_classified", "evidence_assembled", "decision_made", "human_approved"
    detail = Column(JSON, nullable=False)      # exact inputs/outputs at that stage — this is the trust artifact
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
