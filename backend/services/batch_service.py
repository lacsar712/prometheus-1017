import json
import logging
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from models.honey_batch import HoneyBatch, BatchEvent
from models.database import Base

logger = logging.getLogger(__name__)

class BatchService:
    def __init__(self, db: Session):
        self.db = db

    def get_batch_by_no(self, batch_no: str) -> Optional[HoneyBatch]:
        return self.db.query(HoneyBatch).filter(HoneyBatch.batch_no == batch_no).first()

    def list_batches(self, farm_id: Optional[str] = None, honey_type: Optional[str] = None, grade: Optional[str] = None, page: int = 1, page_size: int = 20) -> Dict[str, Any]:
        query = self.db.query(HoneyBatch)
        if farm_id:
            query = query.filter(HoneyBatch.farm_id == farm_id)
        if honey_type:
            query = query.filter(HoneyBatch.honey_type == honey_type)
        if grade:
            query = query.filter(HoneyBatch.grade == grade)
        total = query.count()
        batches = query.order_by(HoneyBatch.harvest_date.desc()).offset((page - 1) * page_size).limit(page_size).all()
        return {"total": total, "batches": batches}

    def batch_to_dict(self, batch: HoneyBatch) -> Dict[str, Any]:
        return {
            "batch_no": batch.batch_no,
            "farm_id": batch.farm_id,
            "farm_name": batch.apiary_name or batch.farm_id,
            "harvest_date": batch.harvest_date.strftime("%Y-%m-%d") if batch.harvest_date else "",
            "net_weight": batch.net_weight,
            "honey_type": batch.honey_type,
            "grade": batch.grade,
            "status": batch.status,
            "apiary_name": batch.apiary_name or "",
            "apiary_location": batch.apiary_location or "",
            "apiary_lat": batch.apiary_lat,
            "apiary_lng": batch.apiary_lng,
            "quality_score": batch.quality_score,
            "quality_report": batch.quality_report or "",
            "created_at": batch.created_at.isoformat() if batch.created_at else "",
        }

    def batch_to_list_item(self, batch: HoneyBatch) -> Dict[str, Any]:
        return {
            "batch_no": batch.batch_no,
            "honey_type": batch.honey_type,
            "grade": batch.grade,
            "farm_name": batch.apiary_name or batch.farm_id,
            "harvest_date": batch.harvest_date.strftime("%Y-%m-%d") if batch.harvest_date else "",
            "status": batch.status,
            "net_weight": batch.net_weight,
        }
