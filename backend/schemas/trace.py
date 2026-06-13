from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field


class BatchInfoResponse(BaseModel):
    batch_no: str
    farm_id: str
    farm_name: str
    harvest_date: str
    net_weight: float
    honey_type: str
    grade: str
    status: str
    apiary_name: str
    apiary_location: str
    apiary_lat: Optional[float] = None
    apiary_lng: Optional[float] = None
    quality_score: Optional[float] = None
    quality_report: Optional[str] = None
    created_at: str


class EventDetailResponse(BaseModel):
    id: int
    batch_no: str
    event_type: str
    event_time: str
    title: str
    description: Optional[str] = None
    operator: Optional[str] = None
    location: Optional[str] = None
    icon: Optional[str] = None
    details: Optional[dict] = None


class TracePageResponse(BaseModel):
    batch: BatchInfoResponse
    events: List[EventDetailResponse]


class BatchListItemResponse(BaseModel):
    batch_no: str
    honey_type: str
    grade: str
    farm_name: str
    harvest_date: str
    status: str
    net_weight: float


class BatchListResponse(BaseModel):
    total: int
    batches: List[BatchListItemResponse]
