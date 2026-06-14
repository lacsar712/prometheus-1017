from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, Text, BigInteger

from .database import Base


class SnapshotRecord(Base):
    __tablename__ = "snapshot_records"

    id = Column(Integer, primary_key=True, index=True)
    snapshot_id = Column(String, unique=True, index=True, nullable=False)
    file_size = Column(BigInteger, nullable=False, default=0)
    snapshot_type = Column(String, default="pre_restore", nullable=False)
    related_backup_id = Column(Integer, nullable=True)
    generated_by = Column(String, default="system", nullable=False)
    remarks = Column(Text, nullable=True)
    snapshot_path = Column(String, nullable=True)
    is_restored = Column(String, default="no", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
