from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, Text, BigInteger

from .database import Base


class BackupRecord(Base):
    __tablename__ = "backup_records"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True, nullable=False)
    file_size = Column(BigInteger, nullable=False, default=0)
    backup_type = Column(String, default="manual", nullable=False)
    status = Column(String, default="completed", nullable=False)
    generated_by = Column(String, default="system", nullable=False)
    remarks = Column(Text, nullable=True)
    snapshot_id = Column(String, nullable=True)
    backup_path = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
