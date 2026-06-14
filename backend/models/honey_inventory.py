from datetime import datetime

from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Index, ForeignKey

from .database import Base


class HoneyInventory(Base):
    __tablename__ = "honey_inventories"

    id = Column(Integer, primary_key=True, index=True)
    batch_no = Column(String, index=True, nullable=False)
    warehouse = Column(String, index=True, nullable=False)
    spec = Column(String, nullable=False)
    quantity = Column(Integer, default=0, nullable=False)
    unit_price = Column(Float, default=0.0, nullable=False)
    honey_type = Column(String, nullable=True)
    grade = Column(String, nullable=True)
    farm_id = Column(String, nullable=True)
    low_stock_threshold = Column(Integer, default=10, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index('idx_inv_batch_warehouse', 'batch_no', 'warehouse', 'spec', unique=True),
    )

    def is_low_stock(self):
        return self.quantity <= self.low_stock_threshold


class HoneyStockFlow(Base):
    __tablename__ = "honey_stock_flows"

    id = Column(Integer, primary_key=True, index=True)
    inventory_id = Column(Integer, ForeignKey('honey_inventories.id'), index=True, nullable=False)
    batch_no = Column(String, index=True, nullable=False)
    warehouse = Column(String, index=True, nullable=False)
    spec = Column(String, nullable=False)
    flow_type = Column(String, nullable=False)
    change_quantity = Column(Integer, nullable=False)
    quantity_before = Column(Integer, nullable=False)
    quantity_after = Column(Integer, nullable=False)
    operator = Column(String, nullable=False)
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    __table_args__ = (
        Index('idx_flow_inv_time', 'inventory_id', 'created_at'),
        Index('idx_flow_batch_time', 'batch_no', 'created_at'),
    )
