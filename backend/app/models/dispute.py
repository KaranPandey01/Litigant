import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Float, DateTime, JSON, Integer

from app.core.db import Base


class Dispute(Base):
    __tablename__ = "disputes"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4())[:8])
    network = Column(String, nullable=False)          # visa / mastercard / rupay
    reason_code = Column(String, nullable=True)        # filled after classification
    reason_name = Column(String, nullable=True)
    category = Column(String, nullable=True)
    amount_inr = Column(Float, nullable=False)
    contest_cost_inr = Column(Float, nullable=True)
    raw_transaction_data = Column(JSON, nullable=False)   # what merchant/API submitted
    anomaly_score = Column(Float, nullable=True)           # from ported fraud pipeline
    status = Column(String, default="received")             # received, classified, evidence_assembled, decided, resolved
    response_window_days = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
