from datetime import datetime, timezone

from sqlalchemy import Column, String, ForeignKey, DateTime, JSON, Float

from app.core.db import Base


class EvidenceBundle(Base):
    __tablename__ = "evidence_bundles"

    id = Column(String, primary_key=True)
    dispute_id = Column(String, ForeignKey("disputes.id"), nullable=False)
    required_fields = Column(JSON, nullable=False)     # from reason_codes.json for this code
    collected_fields = Column(JSON, nullable=False)     # field -> {present: bool, strength: 0/1/2, source: str}
    completeness_score = Column(Float, nullable=False)  # 0..1
    narrative = Column(String, nullable=True)             # LLM-drafted response narrative
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
