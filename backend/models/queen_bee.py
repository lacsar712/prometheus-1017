from datetime import datetime

from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, Index
from sqlalchemy.orm import relationship

from .database import Base


class QueenBee(Base):
    __tablename__ = "queen_bees"

    id = Column(Integer, primary_key=True, index=True)
    queen_no = Column(String, unique=True, index=True, nullable=False)
    bee_species = Column(String, index=True, nullable=False)
    mother_id = Column(Integer, ForeignKey("queen_bees.id"), nullable=True)
    birth_date = Column(DateTime, nullable=False)
    retirement_date = Column(DateTime, nullable=True)
    egg_quality_score = Column(Integer, nullable=False, default=3)
    temperament_score = Column(Integer, nullable=False, default=3)
    current_hive = Column(String, nullable=True)
    farm_id = Column(String, index=True, nullable=False)
    notes = Column(Text, nullable=True)
    is_retired = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    mother = relationship("QueenBee", remote_side=[id], backref="daughters")

    __table_args__ = (
        Index('idx_queen_species', 'bee_species', 'is_retired'),
        Index('idx_queen_farm', 'farm_id', 'is_retired'),
    )
