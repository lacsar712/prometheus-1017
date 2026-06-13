import os
import json
import shutil
import zipfile
import logging
from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import inspect, text

from models.backup import BackupRecord
from models.database import Base, engine

logger = logging.getLogger(__name__)

BACKUP_DIR = os.getenv("BACKUP_DIR", "./backups")
os.makedirs(BACKUP_DIR, exist_ok=True)

OBJECT_STORAGE_DIR = os.getenv("OBJECT_STORAGE_DIR", "./object_storage")
os.makedirs(OBJECT_STORAGE_DIR, exist_ok=True)


class BackupService:
    def __init__(self, db: Session):
        self.db = db

    def _get_table_names(self) -> List[str]:
        inspector = inspect(engine)
        return inspector.get_table_names()

    def _dump_table_data(self, table_name: str) -> List[Dict[str, Any]]:
        try:
            result = self.db.execute(text(f'SELECT * FROM "{table_name}"'))
            columns = result.keys()
            rows = result.fetchall()
            return [dict(zip(columns, row)) for row in rows]
        except Exception as e:
            logger.error(f"Failed to dump table {table_name}: {e}")
            return []

    def _restore_table_data(self, table_name: str, data: List[Dict[str, Any]]):
        if not data:
            return
        try:
            self.db.execute(text(f'TRUNCATE TABLE "{table_name}" RESTART IDENTITY CASCADE'))
            table = Base.metadata.tables.get(table_name)
            if table is not None:
                self.db.execute(table.insert(), data)
            self.db.commit()
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to restore table {table_name}: {e}")
            raise

    def _collect_object_storage(self) -> List[Dict[str, Any]]:
        objects = []
        if os.path.exists(OBJECT_STORAGE_DIR):
            for root, dirs, files in os.walk(OBJECT_STORAGE_DIR):
                for f in files:
                    filepath = os.path.join(root, f)
                    rel_path = os.path.relpath(filepath, OBJECT_STORAGE_DIR)
                    stat = os.stat(filepath)
                    objects.append({
                        "path": rel_path,
                        "size": stat.st_size,
                        "modified": datetime.fromtimestamp(stat.st_mtime).isoformat()
                    })
        return objects

    def create_backup(self, generated_by: str = "system", remarks: Optional[str] = None) -> BackupRecord:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"backup_full_{timestamp}.zip"
        backup_path = os.path.join(BACKUP_DIR, filename)

        backup_data: Dict[str, Any] = {
            "version": "1.0",
            "created_at": datetime.now().isoformat(),
            "generated_by": generated_by,
            "remarks": remarks,
            "tables": {},
            "object_storage": self._collect_object_storage()
        }

        tables = self._get_table_names()
        for table_name in tables:
            if table_name == "backup_records":
                continue
            backup_data["tables"][table_name] = self._dump_table_data(table_name)

        json_content = json.dumps(backup_data, ensure_ascii=False, default=str)

        with zipfile.ZipFile(backup_path, 'w', zipfile.ZIP_DEFLATED) as zf:
            zf.writestr('backup_data.json', json_content)

            if os.path.exists(OBJECT_STORAGE_DIR):
                for root, dirs, files in os.walk(OBJECT_STORAGE_DIR):
                    for f in files:
                        filepath = os.path.join(root, f)
                        arcname = os.path.join("object_storage", os.path.relpath(filepath, OBJECT_STORAGE_DIR))
                        zf.write(filepath, arcname)

        file_size = os.path.getsize(backup_path)

        record = BackupRecord(
            filename=filename,
            file_size=file_size,
            backup_type="manual",
            status="completed",
            generated_by=generated_by,
            remarks=remarks,
            backup_path=backup_path
        )
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)

        logger.info(f"Backup created: {filename}, size: {file_size} bytes")
        return record

    def create_snapshot(self) -> str:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        snapshot_id = f"snapshot_{timestamp}"
        snapshot_dir = os.path.join(BACKUP_DIR, "snapshots", snapshot_id)
        os.makedirs(snapshot_dir, exist_ok=True)

        snapshot_data: Dict[str, Any] = {
            "version": "1.0",
            "created_at": datetime.now().isoformat(),
            "tables": {}
        }

        tables = self._get_table_names()
        for table_name in tables:
            if table_name == "backup_records":
                continue
            snapshot_data["tables"][table_name] = self._dump_table_data(table_name)

        snapshot_path = os.path.join(snapshot_dir, "snapshot_data.json")
        with open(snapshot_path, 'w', encoding='utf-8') as f:
            json.dump(snapshot_data, f, ensure_ascii=False, default=str)

        logger.info(f"Snapshot created: {snapshot_id}")
        return snapshot_id

    def list_backups(self, page: int = 1, page_size: int = 20) -> Dict[str, Any]:
        query = self.db.query(BackupRecord).order_by(BackupRecord.created_at.desc())
        total = query.count()
        records = query.offset((page - 1) * page_size).limit(page_size).all()
        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "records": records
        }

    def get_backup(self, backup_id: int) -> Optional[BackupRecord]:
        return self.db.query(BackupRecord).filter(BackupRecord.id == backup_id).first()

    def get_backup_path(self, backup_id: int) -> Optional[str]:
        record = self.get_backup(backup_id)
        if not record:
            return None
        return record.backup_path or os.path.join(BACKUP_DIR, record.filename)

    def restore_backup(self, backup_id: int, generated_by: str = "system") -> Dict[str, Any]:
        record = self.get_backup(backup_id)
        if not record:
            raise ValueError(f"Backup record {backup_id} not found")

        backup_path = record.backup_path or os.path.join(BACKUP_DIR, record.filename)
        if not os.path.exists(backup_path):
            raise FileNotFoundError(f"Backup file not found: {backup_path}")

        snapshot_id = self.create_snapshot()

        try:
            with zipfile.ZipFile(backup_path, 'r') as zf:
                with zf.open('backup_data.json') as f:
                    backup_data = json.load(f)

                for table_name, table_data in backup_data.get("tables", {}).items():
                    if table_name == "backup_records":
                        continue
                    self._restore_table_data(table_name, table_data)

                if os.path.exists(OBJECT_STORAGE_DIR):
                    shutil.rmtree(OBJECT_STORAGE_DIR)
                    os.makedirs(OBJECT_STORAGE_DIR, exist_ok=True)

                for name in zf.namelist():
                    if name.startswith("object_storage/") and not name.endswith("/"):
                        rel_path = name[len("object_storage/"):]
                        extract_path = os.path.join(OBJECT_STORAGE_DIR, rel_path)
                        os.makedirs(os.path.dirname(extract_path), exist_ok=True)
                        with zf.open(name) as src, open(extract_path, 'wb') as dst:
                            shutil.copyfileobj(src, dst)

            record.snapshot_id = snapshot_id
            self.db.commit()

            logger.info(f"Backup {backup_id} restored successfully, snapshot: {snapshot_id}")
            return {
                "success": True,
                "snapshot_id": snapshot_id,
                "backup_id": backup_id
            }
        except Exception as e:
            logger.error(f"Restore failed: {e}")
            raise

    def delete_backup(self, backup_id: int) -> bool:
        record = self.get_backup(backup_id)
        if not record:
            return False

        backup_path = record.backup_path or os.path.join(BACKUP_DIR, record.filename)
        if os.path.exists(backup_path):
            os.remove(backup_path)

        self.db.delete(record)
        self.db.commit()
        logger.info(f"Backup {backup_id} deleted: {record.filename}")
        return True

    def record_to_dict(self, record: BackupRecord) -> Dict[str, Any]:
        return {
            "id": record.id,
            "filename": record.filename,
            "file_size": record.file_size,
            "file_size_mb": round(record.file_size / (1024 * 1024), 2) if record.file_size else 0,
            "backup_type": record.backup_type,
            "backup_type_name": "手动备份" if record.backup_type == "manual" else "定时备份",
            "status": record.status,
            "status_name": "已完成" if record.status == "completed" else record.status,
            "generated_by": record.generated_by,
            "remarks": record.remarks,
            "snapshot_id": record.snapshot_id,
            "created_at": record.created_at.isoformat() if record.created_at else None
        }
