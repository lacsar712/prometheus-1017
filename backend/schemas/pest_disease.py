from typing import Optional, List
from pydantic import BaseModel, Field


class PestDiseaseBase(BaseModel):
    name_cn: str = Field(..., description="中文名称")
    name_en: Optional[str] = Field(None, description="英文名称")
    aliases: Optional[str] = Field(None, description="别名，逗号分隔")
    category: str = Field(..., description="分类：disease / pest / poisoning")
    symptom_tags: str = Field(..., description="症状标签，逗号分隔")
    causes: Optional[str] = Field(None, description="成因")
    prevention: Optional[str] = Field(None, description="防治方案")
    severity: str = Field("medium", description="严重级别：low / medium / high / critical")
    image_url: Optional[str] = Field(None, description="配图URL")


class PestDiseaseCreate(PestDiseaseBase):
    pass


class PestDiseaseUpdate(BaseModel):
    name_cn: Optional[str] = None
    name_en: Optional[str] = None
    aliases: Optional[str] = None
    category: Optional[str] = None
    symptom_tags: Optional[str] = None
    causes: Optional[str] = None
    prevention: Optional[str] = None
    severity: Optional[str] = None
    image_url: Optional[str] = None


class PestDiseaseOut(PestDiseaseBase):
    id: int

    class Config:
        from_attributes = True


class DiagnosisRequest(BaseModel):
    symptoms: List[str] = Field(..., description="观察到的症状标签集合")
    extra_text: Optional[str] = Field(None, description="补充文字描述")


class DiagnosisResultItem(BaseModel):
    pest_disease: PestDiseaseOut
    similarity: float = Field(..., description="相似度 0~1")
    matched_symptoms: List[str] = Field(..., description="匹配到的症状标签")
