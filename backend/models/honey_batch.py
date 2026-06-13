from datetime import datetime

from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Index

from .database import Base


class HoneyBatch(Base):
    __tablename__ = "honey_batches"

    id = Column(Integer, primary_key=True, index=True)
    batch_no = Column(String, unique=True, index=True, nullable=False)
    farm_id = Column(String, index=True, nullable=False)
    harvest_date = Column(DateTime, nullable=False)
    net_weight = Column(Float, nullable=False)
    honey_type = Column(String, nullable=False)
    grade = Column(String, nullable=False)
    status = Column(String, default="生产中", nullable=False)
    apiary_name = Column(String, nullable=True)
    apiary_location = Column(String, nullable=True)
    apiary_lat = Column(Float, nullable=True)
    apiary_lng = Column(Float, nullable=True)
    quality_score = Column(Float, nullable=True)
    quality_report = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class BatchEvent(Base):
    __tablename__ = "batch_events"

    id = Column(Integer, primary_key=True, index=True)
    batch_no = Column(String, index=True, nullable=False)
    event_type = Column(String, index=True, nullable=False)
    event_time = Column(DateTime, nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    operator = Column(String, nullable=True)
    location = Column(String, nullable=True)
    icon = Column(String, nullable=True)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index('idx_batch_event_time', 'batch_no', 'event_time'),
    )
