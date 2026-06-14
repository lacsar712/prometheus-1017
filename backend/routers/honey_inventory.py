import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from models.database import get_db
from models.honey_inventory import HoneyInventory, HoneyStockFlow
from models.honey_batch import HoneyBatch
from schemas.honey_inventory import (
    StockFlowCreate,
    InventoryCreate,
    InventoryUpdate,
    InventoryOut,
    StockFlowOut,
    InventoryStats,
    FLOW_TYPES,
    FLOW_TYPE_NAMES,
    SPECS,
    WAREHOUSES,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/honey-inventory", tags=["蜂蜜库存"])


def _inventory_to_out(inv: HoneyInventory) -> dict:
    return {
        "id": inv.id,
        "batch_no": inv.batch_no,
        "warehouse": inv.warehouse,
        "spec": inv.spec,
        "quantity": inv.quantity,
        "unit_price": inv.unit_price,
        "honey_type": inv.honey_type,
        "grade": inv.grade,
        "farm_id": inv.farm_id,
        "low_stock_threshold": inv.low_stock_threshold,
        "is_low_stock": inv.is_low_stock(),
        "total_value": round(inv.quantity * inv.unit_price, 2),
        "created_at": inv.created_at.isoformat() if inv.created_at else None,
        "updated_at": inv.updated_at.isoformat() if inv.updated_at else None,
    }


def _flow_to_out(flow: HoneyStockFlow) -> dict:
    return {
        "id": flow.id,
        "inventory_id": flow.inventory_id,
        "batch_no": flow.batch_no,
        "warehouse": flow.warehouse,
        "spec": flow.spec,
        "flow_type": flow.flow_type,
        "flow_type_name": FLOW_TYPE_NAMES.get(flow.flow_type, flow.flow_type),
        "change_quantity": flow.change_quantity,
        "quantity_before": flow.quantity_before,
        "quantity_after": flow.quantity_after,
        "operator": flow.operator,
        "reason": flow.reason,
        "created_at": flow.created_at.isoformat() if flow.created_at else None,
    }


@router.get("/stats", summary="库存统计卡片数据")
async def get_inventory_stats(db: Session = Depends(get_db)):
    now = datetime.now()
    month_start = datetime(now.year, now.month, 1)

    inventories = db.query(HoneyInventory).all()
    total_quantity = sum(inv.quantity for inv in inventories)
    total_value = round(sum(inv.quantity * inv.unit_price for inv in inventories), 2)

    monthly_flows = db.query(HoneyStockFlow).filter(
        HoneyStockFlow.created_at >= month_start
    ).all()

    monthly_inbound = sum(
        f.change_quantity for f in monthly_flows
        if f.flow_type in ("inbound", "stocktake_gain") and f.change_quantity > 0
    )
    monthly_outbound = sum(
        abs(f.change_quantity) for f in monthly_flows
        if f.flow_type in ("outbound", "stocktake_loss") and f.change_quantity < 0
    )

    return {
        "total_quantity": total_quantity,
        "total_value": total_value,
        "monthly_inbound": monthly_inbound,
        "monthly_outbound": monthly_outbound,
    }


@router.get("/inventories", summary="分页查询库存列表")
async def list_inventories(
    batch_no: Optional[str] = Query(None),
    warehouse: Optional[str] = Query(None),
    spec: Optional[str] = Query(None),
    farm_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(HoneyInventory)

    if batch_no:
        query = query.filter(HoneyInventory.batch_no.ilike(f"%{batch_no}%"))
    if warehouse:
        query = query.filter(HoneyInventory.warehouse == warehouse)
    if spec:
        query = query.filter(HoneyInventory.spec == spec)
    if farm_id:
        query = query.filter(HoneyInventory.farm_id == farm_id)

    total = query.count()
    items = query.order_by(HoneyInventory.updated_at.desc()) \
        .offset((page - 1) * page_size) \
        .limit(page_size) \
        .all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
        "items": [_inventory_to_out(inv) for inv in items],
    }


@router.post("/inventories", summary="创建库存记录")
async def create_inventory(data: InventoryCreate, db: Session = Depends(get_db)):
    existing = db.query(HoneyInventory).filter(
        HoneyInventory.batch_no == data.batch_no,
        HoneyInventory.warehouse == data.warehouse,
        HoneyInventory.spec == data.spec,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="该批次+仓库+规格的库存记录已存在")

    inv = HoneyInventory(
        batch_no=data.batch_no,
        warehouse=data.warehouse,
        spec=data.spec,
        quantity=data.quantity,
        unit_price=data.unit_price,
        honey_type=data.honey_type,
        grade=data.grade,
        farm_id=data.farm_id,
        low_stock_threshold=data.low_stock_threshold,
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)

    if data.quantity > 0:
        flow = HoneyStockFlow(
            inventory_id=inv.id,
            batch_no=inv.batch_no,
            warehouse=inv.warehouse,
            spec=inv.spec,
            flow_type="inbound",
            change_quantity=data.quantity,
            quantity_before=0,
            quantity_after=data.quantity,
            operator="系统",
            reason="初始化库存",
        )
        db.add(flow)
        db.commit()

    return _inventory_to_out(inv)


@router.put("/inventories/{inventory_id}", summary="更新库存基本信息")
async def update_inventory(inventory_id: int, data: InventoryUpdate, db: Session = Depends(get_db)):
    inv = db.query(HoneyInventory).filter(HoneyInventory.id == inventory_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="库存记录不存在")

    if data.unit_price is not None:
        inv.unit_price = data.unit_price
    if data.low_stock_threshold is not None:
        inv.low_stock_threshold = data.low_stock_threshold

    db.commit()
    db.refresh(inv)
    return _inventory_to_out(inv)


@router.get("/inventories/{inventory_id}/flows", summary="获取某条库存的出入库流水")
async def get_inventory_flows(
    inventory_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    inv = db.query(HoneyInventory).filter(HoneyInventory.id == inventory_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="库存记录不存在")

    query = db.query(HoneyStockFlow).filter(HoneyStockFlow.inventory_id == inventory_id)
    total = query.count()
    flows = query.order_by(HoneyStockFlow.created_at.desc()) \
        .offset((page - 1) * page_size) \
        .limit(page_size) \
        .all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "inventory": _inventory_to_out(inv),
        "flows": [_flow_to_out(f) for f in flows],
    }


@router.get("/flows", summary="查询所有出入库流水")
async def list_flows(
    batch_no: Optional[str] = Query(None),
    warehouse: Optional[str] = Query(None),
    flow_type: Optional[str] = Query(None),
    start_time: Optional[datetime] = Query(None),
    end_time: Optional[datetime] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(HoneyStockFlow)

    if batch_no:
        query = query.filter(HoneyStockFlow.batch_no.ilike(f"%{batch_no}%"))
    if warehouse:
        query = query.filter(HoneyStockFlow.warehouse == warehouse)
    if flow_type:
        query = query.filter(HoneyStockFlow.flow_type == flow_type)
    if start_time:
        query = query.filter(HoneyStockFlow.created_at >= start_time)
    if end_time:
        query = query.filter(HoneyStockFlow.created_at <= end_time)

    total = query.count()
    flows = query.order_by(HoneyStockFlow.created_at.desc()) \
        .offset((page - 1) * page_size) \
        .limit(page_size) \
        .all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
        "flows": [_flow_to_out(f) for f in flows],
    }


@router.post("/flows", summary="录入出入库流水（自动更新库存数量）")
async def create_flow(data: StockFlowCreate, db: Session = Depends(get_db)):
    if data.flow_type not in FLOW_TYPES:
        raise HTTPException(status_code=400, detail=f"无效的流水类型: {data.flow_type}")

    inv = db.query(HoneyInventory).filter(
        HoneyInventory.batch_no == data.batch_no,
        HoneyInventory.warehouse == data.warehouse,
        HoneyInventory.spec == data.spec,
    ).first()

    if not inv:
        inv = HoneyInventory(
            batch_no=data.batch_no,
            warehouse=data.warehouse,
            spec=data.spec,
            quantity=0,
            unit_price=0.0,
            low_stock_threshold=10,
        )
        db.add(inv)
        db.flush()

    quantity_before = inv.quantity
    change = data.change_quantity

    if data.flow_type in ("outbound", "stocktake_loss"):
        change = -abs(change)
    else:
        change = abs(change)

    quantity_after = quantity_before + change
    if quantity_after < 0:
        raise HTTPException(
            status_code=400,
            detail=f"库存不足: 当前 {quantity_before}，操作数量 {abs(change)}",
        )

    inv.quantity = quantity_after
    inv.updated_at = datetime.now()

    batch = db.query(HoneyBatch).filter(HoneyBatch.batch_no == data.batch_no).first()
    if batch:
        if not inv.honey_type:
            inv.honey_type = batch.honey_type
        if not inv.grade:
            inv.grade = batch.grade
        if not inv.farm_id:
            inv.farm_id = batch.farm_id

    flow = HoneyStockFlow(
        inventory_id=inv.id,
        batch_no=data.batch_no,
        warehouse=data.warehouse,
        spec=data.spec,
        flow_type=data.flow_type,
        change_quantity=change,
        quantity_before=quantity_before,
        quantity_after=quantity_after,
        operator=data.operator,
        reason=data.reason,
    )
    db.add(flow)
    db.commit()
    db.refresh(flow)

    return _flow_to_out(flow)


@router.get("/meta", summary="获取库存元数据（仓库、规格、流水类型）")
async def get_inventory_meta():
    return {
        "warehouses": WAREHOUSES,
        "specs": SPECS,
        "flow_types": [
            {"code": code, "name": name}
            for code, name in FLOW_TYPE_NAMES.items()
        ],
    }
