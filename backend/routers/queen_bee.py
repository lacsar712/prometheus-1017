from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from models.database import get_db
from services.queen_bee_service import QueenBeeService
from schemas.queen_bee import (
    QueenBeeCreate,
    QueenBeeUpdate,
    QueenBeeRetire,
    QueenBeeListResponse,
    QueenBeeDetailResponse,
    FamilyTreeResponse,
    BeeSpeciesListResponse,
)

router = APIRouter(prefix="/api/queen-bee", tags=["女王蜂家谱"])


@router.get("/species", summary="蜂种列表")
async def get_bee_species(db: Session = Depends(get_db)):
    svc = QueenBeeService(db)
    return {"species": svc.get_bee_species()}


@router.get("/selectable", summary="可选女王蜂列表（用于父代选择）")
async def get_selectable_queens(
    exclude_id: Optional[int] = Query(None, description="排除的女王蜂ID"),
    bee_species: Optional[str] = Query(None, description="按蜂种过滤"),
    include_retired: bool = Query(True, description="是否包含已退役蜂王"),
    db: Session = Depends(get_db),
):
    svc = QueenBeeService(db)
    queens = svc.get_selectable_queens(
        exclude_id=exclude_id,
        bee_species=bee_species,
        include_retired=include_retired,
    )
    return {"queens": queens}


@router.get("", summary="女王蜂列表")
async def list_queens(
    farm_id: Optional[str] = Query(None, description="蜂场ID"),
    bee_species: Optional[str] = Query(None, description="蜂种"),
    search: Optional[str] = Query(None, description="编号/蜂箱搜索"),
    is_retired: Optional[int] = Query(None, description="是否退役 0=现役 1=退役"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页条数"),
    db: Session = Depends(get_db),
):
    svc = QueenBeeService(db)
    result = svc.list_queens(
        farm_id=farm_id,
        bee_species=bee_species,
        search=search,
        is_retired=is_retired,
        page=page,
        page_size=page_size,
    )
    return {
        "total": result["total"],
        "page": page,
        "page_size": page_size,
        "queens": [svc.queen_to_list_item(q) for q in result["queens"]],
    }


@router.get("/{queen_id}", summary="女王蜂详情")
async def get_queen_detail(queen_id: int, db: Session = Depends(get_db)):
    svc = QueenBeeService(db)
    queen = svc.get_queen_by_id(queen_id)
    if not queen:
        raise HTTPException(status_code=404, detail="女王蜂不存在")
    return svc.queen_to_detail(queen)


@router.get("/{queen_id}/family-tree", summary="女王蜂家谱树")
async def get_family_tree(
    queen_id: int,
    generations: int = Query(5, ge=1, le=20, description="向上追溯代数"),
    db: Session = Depends(get_db),
):
    svc = QueenBeeService(db)
    try:
        return svc.get_family_tree(queen_id, generations=generations)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("", summary="登记女王蜂")
async def create_queen(data: QueenBeeCreate, db: Session = Depends(get_db)):
    svc = QueenBeeService(db)
    try:
        return svc.create_queen(data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{queen_id}", summary="修改女王蜂信息")
async def update_queen(queen_id: int, data: QueenBeeUpdate, db: Session = Depends(get_db)):
    svc = QueenBeeService(db)
    try:
        return svc.update_queen(queen_id, data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{queen_id}/retire", summary="标记女王蜂退役")
async def retire_queen(queen_id: int, data: QueenBeeRetire, db: Session = Depends(get_db)):
    svc = QueenBeeService(db)
    try:
        return svc.retire_queen(queen_id, data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/validate/mother", summary="校验父代设置合法性")
async def validate_mother(
    queen_id: Optional[int] = Query(None, description="当前女王蜂ID（新建时为空）"),
    mother_id: int = Query(..., description="拟设置的父代ID"),
    bee_species: str = Query(..., description="当前蜂种"),
    db: Session = Depends(get_db),
):
    svc = QueenBeeService(db)

    mother = svc.get_queen_by_id(mother_id)
    if not mother:
        raise HTTPException(status_code=400, detail="父代女王蜂不存在")

    if queen_id is not None:
        if mother_id == queen_id:
            raise HTTPException(status_code=400, detail="不能将自己设为父代")

        if svc._check_circular_reference(queen_id, mother_id):
            raise HTTPException(status_code=400, detail="父代设置会导致循环引用")

    if mother.bee_species != bee_species:
        raise HTTPException(
            status_code=400,
            detail=f"父代蜂种 ({mother.bee_species}) 与当前蜂种 ({bee_species}) 不一致"
        )

    return {"valid": True, "message": "父代设置合法"}
