from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import Optional

from models.database import get_db
from services.batch_service import BatchService
from services.event_service import EventService
from services.qrcode_service import QRCodeService

router = APIRouter(prefix="/api/trace", tags=["蜂蜜溯源"])

@router.get("/meta/honey-types", summary="蜜种列表")
async def get_honey_types():
    return {
        "honey_types": ["洋槐蜜", "荔枝蜜", "百花蜜", "椴树蜜", "油菜花蜜", "枣花蜜"],
        "grades": ["特级", "一级", "二级"],
    }

@router.get("/batches", summary="批次列表查询")
async def list_batches(
    farm_id: Optional[str] = Query(None, description="蜂场ID"),
    honey_type: Optional[str] = Query(None, description="蜜种"),
    grade: Optional[str] = Query(None, description="品级"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    svc = BatchService(db)
    result = svc.list_batches(farm_id=farm_id, honey_type=honey_type, grade=grade, page=page, page_size=page_size)
    return {
        "total": result["total"],
        "batches": [svc.batch_to_list_item(b) for b in result["batches"]],
    }

@router.get("/{batch_no}", summary="批次溯源详情")
async def get_trace_page(batch_no: str, db: Session = Depends(get_db)):
    batch_svc = BatchService(db)
    event_svc = EventService(db)
    batch = batch_svc.get_batch_by_no(batch_no)
    if not batch:
        raise HTTPException(status_code=404, detail=f"批次 {batch_no} 不存在")
    events = event_svc.get_events_by_batch(batch_no)
    return {
        "batch": batch_svc.batch_to_dict(batch),
        "events": [event_svc.event_to_dict(e) for e in events],
    }

@router.get("/{batch_no}/qrcode", summary="批次二维码PNG")
async def get_batch_qrcode(batch_no: str, size: int = Query(300, ge=100, le=800)):
    qr_svc = QRCodeService()
    png_data = qr_svc.generate_qr_png(batch_no, size=size)
    return Response(content=png_data, media_type="image/png")

@router.get("/{batch_no}/label-pdf", summary="蜂蜜瓶贴PDF导出")
async def get_batch_label_pdf(batch_no: str, db: Session = Depends(get_db)):
    batch_svc = BatchService(db)
    batch = batch_svc.get_batch_by_no(batch_no)
    if not batch:
        raise HTTPException(status_code=404, detail=f"批次 {batch_no} 不存在")
    qr_svc = QRCodeService()
    pdf_data = qr_svc.generate_label_pdf(
        batch_no=batch.batch_no,
        honey_type=batch.honey_type,
        grade=batch.grade,
        net_weight=batch.net_weight,
        apiary_name=batch.apiary_name or "",
        harvest_date=batch.harvest_date.strftime("%Y-%m-%d") if batch.harvest_date else "",
    )
    return Response(
        content=pdf_data,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename=label_{batch_no}.pdf"},
    )
