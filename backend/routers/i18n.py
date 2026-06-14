import logging
from typing import Optional, List
from datetime import datetime

from fastapi import APIRouter, Depends, Query, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from models import get_db, LanguageResource
from services.i18n_service import (
    get_language_bundle,
    get_translation_table,
    get_term_dictionary,
    get_term_categories,
    get_all_namespaces,
    get_all_languages,
    create_or_update_resource,
    delete_resource,
    get_resource,
    get_cache_version,
)
from services.websocket_manager import manager
from schemas.i18n import (
    LanguageResourceCreate,
    LanguageResourceUpdate,
    LanguageBundleResponse,
    TranslationTableResponse,
    TermDictionaryResponse,
    NamespaceListResponse,
    LanguageListResponse,
    LanguageResourceItem,
)

router = APIRouter(prefix="/api/i18n", tags=["i18n"])
logger = logging.getLogger(__name__)


@router.get("/languages", response_model=LanguageListResponse)
async def get_languages():
    return {"languages": get_all_languages()}


@router.get("/namespaces", response_model=NamespaceListResponse)
async def get_namespaces(db: Session = Depends(get_db)):
    return {"namespaces": get_all_namespaces(db)}


@router.get("/bundle", response_model=LanguageBundleResponse)
async def get_bundle(
    language: str = Query(..., description="语言代码"),
    namespace: Optional[str] = Query(None, description="命名空间，为空则返回全部"),
):
    return get_language_bundle(language, namespace)


@router.get("/version")
async def get_version():
    return {"version": get_cache_version()}


@router.get("/translations", response_model=TranslationTableResponse)
async def get_translations(
    namespace: Optional[str] = Query(None, description="按命名空间过滤"),
    key_search: Optional[str] = Query(None, description="按 key 搜索"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(50, ge=1, le=200, description="每页条数"),
    db: Session = Depends(get_db),
):
    return get_translation_table(db, namespace, key_search, page, page_size)


@router.get("/terms", response_model=TermDictionaryResponse)
async def get_terms(
    search_term: Optional[str] = Query(None, description="搜索术语"),
    category: Optional[str] = Query(None, description="按类别过滤"),
):
    return get_term_dictionary(search_term, category)


@router.get("/terms/categories")
async def get_term_cats(db: Session = Depends(get_db)):
    return {"categories": get_term_categories(db)}


@router.get("/resource")
async def get_single_resource(
    language: str = Query(...),
    namespace: str = Query(...),
    key: str = Query(...),
    db: Session = Depends(get_db),
):
    resource = get_resource(db, language, namespace, key)
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    return {
        "id": resource.id,
        "language": resource.language,
        "namespace": resource.namespace,
        "key": resource.key,
        "value": resource.value,
        "created_by": resource.created_by,
        "updated_by": resource.updated_by,
        "created_at": resource.created_at.isoformat(),
        "updated_at": resource.updated_at.isoformat(),
    }


@router.post("/resource")
async def create_resource(
    data: LanguageResourceCreate,
    db: Session = Depends(get_db),
):
    resource = create_or_update_resource(
        db,
        data.language,
        data.namespace,
        data.key,
        data.value,
        data.created_by or "admin",
    )

    await manager.broadcast_hot_update(
        resource.language,
        resource.namespace,
        resource.key,
        resource.value,
    )

    return {
        "status": "success",
        "id": resource.id,
        "language": resource.language,
        "namespace": resource.namespace,
        "key": resource.key,
        "value": resource.value,
    }


@router.put("/resource")
async def update_resource(
    language: str = Query(...),
    namespace: str = Query(...),
    key: str = Query(...),
    data: LanguageResourceUpdate = None,
    db: Session = Depends(get_db),
):
    if data is None:
        raise HTTPException(status_code=400, detail="Request body is required")

    resource = create_or_update_resource(
        db,
        language,
        namespace,
        key,
        data.value,
        data.updated_by or "admin",
    )

    await manager.broadcast_hot_update(
        resource.language,
        resource.namespace,
        resource.key,
        resource.value,
    )

    return {
        "status": "success",
        "id": resource.id,
        "language": resource.language,
        "namespace": resource.namespace,
        "key": resource.key,
        "value": resource.value,
    }


@router.delete("/resource")
async def remove_resource(
    language: str = Query(...),
    namespace: str = Query(...),
    key: str = Query(...),
    db: Session = Depends(get_db),
):
    deleted = delete_resource(db, language, namespace, key)
    if not deleted:
        raise HTTPException(status_code=404, detail="Resource not found")

    await manager.broadcast_hot_update(
        language,
        namespace,
        key,
        "",
    )

    return {"status": "success", "message": "Resource deleted"}


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, client_id: str = "anonymous"):
    await manager.connect(websocket, client_id)
    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "ping":
                await manager.send_personal_message({"type": "pong", "timestamp": datetime.utcnow().isoformat()}, websocket)
            elif data.get("type") == "subscribe":
                await manager.send_personal_message({
                    "type": "subscribed",
                    "message": "Hot update subscription active",
                    "version": get_cache_version(),
                }, websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket, client_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket, client_id)


@router.get("/ws/status")
async def websocket_status():
    return {
        "connected_clients": manager.get_connection_count(),
        "client_ids": manager.get_client_ids(),
    }
