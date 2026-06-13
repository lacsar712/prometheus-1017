import json
import logging
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from models.honey_batch import HoneyBatch, BatchEvent
from models.database import Base

logger = logging.getLogger(__name__)

EVENT_TYPE_ICONS = {
    "inspection": "clipboard-check",
    "harvest": "droplets",
    "testing": "flask-conical",
    "bottling": "package",
    "dispatch": "truck",
}

EVENT_TYPE_NAMES = {
    "inspection": "巡检",
    "harvest": "采蜜",
    "testing": "检测",
    "bottling": "灌装",
    "dispatch": "出库",
}

class EventService:
    def __init__(self, db: Session):
        self.db = db

    def get_events_by_batch(self, batch_no: str) -> List[BatchEvent]:
        return self.db.query(BatchEvent).filter(BatchEvent.batch_no == batch_no).order_by(BatchEvent.event_time.asc()).all()

    def event_to_dict(self, event: BatchEvent) -> Dict[str, Any]:
        details = None
        if event.details:
            try:
                details = json.loads(event.details)
            except (json.JSONDecodeError, TypeError):
                details = {"raw": event.details}
        return {
            "id": event.id,
            "batch_no": event.batch_no,
            "event_type": event.event_type,
            "event_type_name": EVENT_TYPE_NAMES.get(event.event_type, event.event_type),
            "event_time": event.event_time.strftime("%Y-%m-%d %H:%M") if event.event_time else "",
            "title": event.title,
            "description": event.description or "",
            "operator": event.operator or "",
            "location": event.location or "",
            "icon": event.icon or EVENT_TYPE_ICONS.get(event.event_type, "circle"),
            "details": details,
        }
