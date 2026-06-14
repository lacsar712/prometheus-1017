import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from models.database import get_db
from models.pest_disease import PestDisease
from schemas.pest_disease import (
    PestDiseaseCreate,
    PestDiseaseUpdate,
    PestDiseaseOut,
    DiagnosisRequest,
    DiagnosisResultItem,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/pest-disease", tags=["pest-disease"])


def _to_out(pd: PestDisease) -> PestDiseaseOut:
    return PestDiseaseOut(
        id=pd.id,
        name_cn=pd.name_cn,
        name_en=pd.name_en,
        aliases=pd.aliases,
        category=pd.category,
        symptom_tags=pd.symptom_tags,
        causes=pd.causes,
        prevention=pd.prevention,
        severity=pd.severity,
        image_url=pd.image_url,
    )


@router.get("/list", summary="获取病虫害知识库列表")
def list_pest_diseases(
    category: Optional[str] = Query(None, description="分类筛选: disease/pest/poisoning"),
    keyword: Optional[str] = Query(None, description="搜索关键词（中文名/别名）"),
    db: Session = Depends(get_db),
):
    query = db.query(PestDisease)
    if category:
        query = query.filter(PestDisease.category == category)
    if keyword:
        kw = f"%{keyword}%"
        query = query.filter(
            (PestDisease.name_cn.ilike(kw))
            | (PestDisease.aliases.ilike(kw))
            | (PestDisease.name_en.ilike(kw))
        )
    items = query.order_by(PestDisease.id).all()
    return [_to_out(i) for i in items]


@router.get("/{item_id}", summary="获取单个病虫害详情")
def get_pest_disease(item_id: int, db: Session = Depends(get_db)):
    pd = db.query(PestDisease).filter(PestDisease.id == item_id).first()
    if not pd:
        raise HTTPException(status_code=404, detail="病虫害条目不存在")
    return _to_out(pd)


@router.post("/", summary="新增病虫害条目", response_model=PestDiseaseOut)
def create_pest_disease(data: PestDiseaseCreate, db: Session = Depends(get_db)):
    pd = PestDisease(**data.model_dump())
    db.add(pd)
    db.commit()
    db.refresh(pd)
    logger.info(f"Created pest disease entry: {pd.name_cn}")
    return _to_out(pd)


@router.put("/{item_id}", summary="更新病虫害条目", response_model=PestDiseaseOut)
def update_pest_disease(item_id: int, data: PestDiseaseUpdate, db: Session = Depends(get_db)):
    pd = db.query(PestDisease).filter(PestDisease.id == item_id).first()
    if not pd:
        raise HTTPException(status_code=404, detail="病虫害条目不存在")
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(pd, key, value)
    db.commit()
    db.refresh(pd)
    return _to_out(pd)


@router.delete("/{item_id}", summary="删除病虫害条目")
def delete_pest_disease(item_id: int, db: Session = Depends(get_db)):
    pd = db.query(PestDisease).filter(PestDisease.id == item_id).first()
    if not pd:
        raise HTTPException(status_code=404, detail="病虫害条目不存在")
    db.delete(pd)
    db.commit()
    return {"status": "success", "id": item_id}


@router.get("/symptoms/all", summary="获取所有症状标签（去重）")
def get_all_symptoms(db: Session = Depends(get_db)):
    items = db.query(PestDisease.symptom_tags).all()
    tag_set = set()
    for (tags_str,) in items:
        if tags_str:
            for t in tags_str.split(","):
                t = t.strip()
                if t:
                    tag_set.add(t)
    return {"symptoms": sorted(tag_set)}


@router.post("/diagnose", summary="症状诊断：按相似度返回可能病害排行")
def diagnose(data: DiagnosisRequest, db: Session = Depends(get_db)):
    input_set = set(s.strip() for s in data.symptoms if s.strip())
    if not input_set:
        raise HTTPException(status_code=400, detail="请至少输入一个症状标签")

    if data.extra_text:
        extra_kw_set = set()
        for kw in data.extra_text.replace("，", ",").replace("、", ",").split(","):
            kw = kw.strip()
            if kw:
                extra_kw_set.add(kw)
        input_set = input_set | extra_kw_set

    items = db.query(PestDisease).all()
    results: List[DiagnosisResultItem] = []

    for pd in items:
        pd_tags = set(t.strip() for t in pd.symptom_tags.split(",") if t.strip())
        if not pd_tags:
            continue
        matched = input_set & pd_tags
        if not matched:
            continue
        similarity = len(matched) / len(pd_tags)
        severity_boost = {"critical": 0.05, "high": 0.03, "medium": 0.0, "low": -0.02}.get(pd.severity, 0.0)
        final_score = min(1.0, similarity + severity_boost)
        results.append(
            DiagnosisResultItem(
                pest_disease=_to_out(pd),
                similarity=round(final_score, 4),
                matched_symptoms=sorted(matched),
            )
        )

    results.sort(key=lambda x: x.similarity, reverse=True)
    return {"results": results[:20], "input_symptoms": sorted(input_set)}
