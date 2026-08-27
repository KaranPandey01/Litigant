from typing import Optional
from pydantic import BaseModel, ConfigDict
from datetime import datetime


class DisputeSubmitRequest(BaseModel):
    network: str                       # visa | mastercard | rupay
    amount_inr: float
    raw_transaction_data: dict          # avs_result, cvv_result, device_id, ip, shipping_address, etc.


class DisputeResponse(BaseModel):
    id: str
    network: str
    reason_code: Optional[str]
    reason_name: Optional[str]
    amount_inr: float
    anomaly_score: Optional[float]
    status: str
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class EvidenceBundleResponse(BaseModel):
    id: str
    dispute_id: str
    required_fields: list[str]
    collected_fields: dict
    completeness_score: float
    narrative: Optional[str]

    model_config = ConfigDict(from_attributes=True)


class DecisionResponse(BaseModel):
    id: str
    dispute_id: str
    recommendation: str
    win_probability: float
    expected_recovery_inr: float
    contest_cost_inr: float
    expected_value_inr: float
    reasoning: Optional[str]
    human_approved: bool

    model_config = ConfigDict(from_attributes=True)


class ApproveDecisionRequest(BaseModel):
    approved: bool
