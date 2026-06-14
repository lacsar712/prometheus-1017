from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, Field


FLOW_TYPES = ["inbound", "outbound", "transfer", "stocktake_gain", "stocktake_loss"]

FLOW_TYPE_NAMES = {
    "inbound": "入库",
    "outbound": "出库",
    "transfer": "调拨",
    "stocktake_gain": "盘盈",
    "stocktake_loss": "盘亏",
}

SPECS = ["250g", "500g", "1kg"]

WAREHOUSES = ["主仓库", "华东分仓", "华北分仓", "华南分仓"]


class StockFlowCreate(BaseModel):
    batch_no: str
    warehouse: str
    spec: str
    flow_type: str
    change_quantity: int
    operator: str
    reason: Optional[str] = None


class InventoryCreate(BaseModel):
    batch_no: str
    warehouse: str
    spec: str
    quantity: int = 0
    unit_price: float = 0.0
    honey_type: Optional[str] = None
    grade: Optional[str] = None
    farm_id: Optional[str] = None
    low_stock_threshold: int = 10


class InventoryUpdate(BaseModel):
    quantity: Optional[int] = None
    unit_price: Optional[float] = None
    low_stock_threshold: Optional[int] = None


class InventoryOut(BaseModel):
    id: int
    batch_no: str
    warehouse: str
    spec: str
    quantity: int
    unit_price: float
    honey_type: Optional[str] = None
    grade: Optional[str] = None
    farm_id: Optional[str] = None
    low_stock_threshold: int
    is_low_stock: bool
    total_value: float
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class StockFlowOut(BaseModel):
    id: int
    inventory_id: int
    batch_no: str
    warehouse: str
    spec: str
    flow_type: str
    flow_type_name: str
    change_quantity: int
    quantity_before: int
    quantity_after: int
    operator: str
    reason: Optional[str] = None
    created_at: Optional[datetime] = None


class InventoryStats(BaseModel):
    total_quantity: int
    total_value: float
    monthly_inbound: int
    monthly_outbound: int
