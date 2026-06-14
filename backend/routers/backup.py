import os
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel

from models.database import get_db
from services.backup_service import BackupService

router = APIRouter(prefix="/api/backup", tags=["数据备份"])


class BackupCreateRequest(BaseModel):
    generated_by: str = "system"
    remarks: Optional[str] = None


class RestoreRequest(BaseModel):
    generated_by: str = "system"
    confirm_text: str


class RollbackRequest(BaseModel):
    generated_by: str = "system"
    confirm_text: str


@router.get("", summary="备份列表")
async def list_backups(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页条数"),
    db: Session = Depends(get_db),
):
    svc = BackupService(db)
    result = svc.list_backups(page=page, page_size=page_size)
    return {
        "total": result["total"],
        "page": result["page"],
        "page_size": result["page_size"],
        "total_pages": (result["total"] + page_size - 1) // page_size,
        "records": [svc.record_to_dict(r) for r in result["records"]],
    }


@router.post("", summary="创建备份")
async def create_backup(
    data: BackupCreateRequest,
    db: Session = Depends(get_db),
):
    svc = BackupService(db)
    try:
        record = svc.create_backup(
            generated_by=data.generated_by,
            remarks=data.remarks
        )
        return {
            "status": "success",
            "backup": svc.record_to_dict(record)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"备份创建失败: {str(e)}")


@router.get("/{backup_id}/download", summary="下载备份文件")
async def download_backup(
    backup_id: int,
    db: Session = Depends(get_db),
):
    svc = BackupService(db)
    backup_path = svc.get_backup_path(backup_id)
    record = svc.get_backup(backup_id)

    if not record or not backup_path or not os.path.exists(backup_path):
        raise HTTPException(status_code=404, detail="备份文件不存在")

    return FileResponse(
        path=backup_path,
        filename=record.filename,
        media_type="application/zip"
    )


@router.post("/{backup_id}/restore", summary="恢复备份")
async def restore_backup(
    backup_id: int,
    data: RestoreRequest,
    db: Session = Depends(get_db),
):
    if data.confirm_text != "RESTORE":
        raise HTTPException(status_code=400, detail="确认文本不正确，请输入 RESTORE")

    svc = BackupService(db)
    try:
        result = svc.restore_backup(
            backup_id=backup_id,
            generated_by=data.generated_by
        )
        return {
            "status": "success",
            "snapshot_id": result["snapshot_id"],
            "backup_id": result["backup_id"],
            "message": "数据恢复成功，已自动生成回滚快照"
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"恢复失败: {str(e)}")


@router.delete("/{backup_id}", summary="删除备份")
async def delete_backup(
    backup_id: int,
    db: Session = Depends(get_db),
):
    svc = BackupService(db)
    record = svc.get_backup(backup_id)
    if not record:
        raise HTTPException(status_code=404, detail="备份记录不存在")

    success = svc.delete_backup(backup_id)
    if not success:
        raise HTTPException(status_code=500, detail="删除失败")

    return {"status": "success", "message": "备份已删除"}


@router.get("/snapshots/list", summary="快照列表")
async def list_snapshots(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页条数"),
    db: Session = Depends(get_db),
):
    svc = BackupService(db)
    result = svc.list_snapshots(page=page, page_size=page_size)
    return {
        "total": result["total"],
        "page": result["page"],
        "page_size": result["page_size"],
        "total_pages": (result["total"] + page_size - 1) // page_size,
        "records": [svc.snapshot_to_dict(r) for r in result["records"]],
    }


@router.post("/snapshots/{snapshot_id}/rollback", summary="回滚到快照")
async def rollback_snapshot(
    snapshot_id: str,
    data: RollbackRequest,
    db: Session = Depends(get_db),
):
    if data.confirm_text != "ROLLBACK":
        raise HTTPException(status_code=400, detail="确认文本不正确，请输入 ROLLBACK")

    svc = BackupService(db)
    try:
        result = svc.rollback_snapshot(
            snapshot_id=snapshot_id,
            generated_by=data.generated_by
        )
        return {
            "status": "success",
            "target_snapshot_id": result["target_snapshot_id"],
            "rollback_snapshot_id": result["rollback_snapshot_id"],
            "message": "回滚成功，已自动生成回滚前快照作为保险"
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"回滚失败: {str(e)}")


@router.delete("/snapshots/{snapshot_id}", summary="删除快照")
async def delete_snapshot(
    snapshot_id: str,
    db: Session = Depends(get_db),
):
    svc = BackupService(db)
    snap = svc.get_snapshot(snapshot_id)
    if not snap:
        raise HTTPException(status_code=404, detail="快照记录不存在")

    success = svc.delete_snapshot(snapshot_id)
    if not success:
        raise HTTPException(status_code=500, detail="删除失败")

    return {"status": "success", "message": "快照已删除"}


@router.get("/snapshots/{snapshot_id}/download", summary="下载快照文件")
async def download_snapshot(
    snapshot_id: str,
    db: Session = Depends(get_db),
):
    svc = BackupService(db)
    snap = svc.get_snapshot(snapshot_id)

    if not snap:
        raise HTTPException(status_code=404, detail="快照不存在")

    snap_path = snap.snapshot_path
    if not snap_path or not os.path.exists(snap_path):
        raise HTTPException(status_code=404, detail="快照文件不存在")

    return FileResponse(
        path=snap_path,
        filename=f"{snapshot_id}.zip",
        media_type="application/zip"
    )
