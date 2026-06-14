from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, field_validator


BEE_SPECIES_LIST = ["意大利蜂", "中华蜜蜂", "卡尼鄂拉蜂", "高加索蜂", "东北黑蜂", "新疆黑蜂"]


class QueenBeeBase(BaseModel):
    queen_no: str = Field(..., description="女王蜂唯一编号")
    bee_species: str = Field(..., description="蜂种")
    mother_id: Optional[int] = Field(None, description="父代女王蜂ID")
    birth_date: datetime = Field(..., description="出生日期")
    egg_quality_score: int = Field(3, ge=1, le=5, description="产卵质量评分 1-5")
    temperament_score: int = Field(3, ge=1, le=5, description="性情评分 1-5")
    current_hive: Optional[str] = Field(None, description="当前所在蜂箱")
    farm_id: str = Field(..., description="所属蜂场ID")
    notes: Optional[str] = Field(None, description="备注")

    @field_validator('bee_species')
    @classmethod
    def validate_species(cls, v):
        if v not in BEE_SPECIES_LIST:
            raise ValueError(f'无效的蜂种: {v}，有效蜂种为: {", ".join(BEE_SPECIES_LIST)}')
        return v


class QueenBeeCreate(QueenBeeBase):
    pass


class QueenBeeUpdate(BaseModel):
    bee_species: Optional[str] = Field(None, description="蜂种")
    mother_id: Optional[int] = Field(None, description="父代女王蜂ID")
    birth_date: Optional[datetime] = Field(None, description="出生日期")
    egg_quality_score: Optional[int] = Field(None, ge=1, le=5, description="产卵质量评分 1-5")
    temperament_score: Optional[int] = Field(None, ge=1, le=5, description="性情评分 1-5")
    current_hive: Optional[str] = Field(None, description="当前所在蜂箱")
    notes: Optional[str] = Field(None, description="备注")

    @field_validator('bee_species')
    @classmethod
    def validate_species(cls, v):
        if v is not None and v not in BEE_SPECIES_LIST:
            raise ValueError(f'无效的蜂种: {v}，有效蜂种为: {", ".join(BEE_SPECIES_LIST)}')
        return v


class QueenBeeRetire(BaseModel):
    retirement_date: Optional[datetime] = Field(None, description="退役日期")
    notes: Optional[str] = Field(None, description="退役备注")


class QueenBeeListItem(BaseModel):
    id: int
    queen_no: str
    bee_species: str
    mother_id: Optional[int]
    mother_queen_no: Optional[str]
    birth_date: str
    retirement_date: Optional[str]
    egg_quality_score: int
    temperament_score: int
    current_hive: Optional[str]
    farm_id: str
    farm_name: str
    is_retired: int
    age_days: int


class QueenBeeListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    queens: List[QueenBeeListItem]


class QueenBeeDetailResponse(BaseModel):
    id: int
    queen_no: str
    bee_species: str
    mother_id: Optional[int]
    mother_queen_no: Optional[str]
    birth_date: str
    retirement_date: Optional[str]
    egg_quality_score: int
    temperament_score: int
    current_hive: Optional[str]
    farm_id: str
    farm_name: str
    is_retired: int
    notes: Optional[str]
    age_days: int
    daughter_count: int


class FamilyTreeNode(BaseModel):
    id: int
    queen_no: str
    bee_species: str
    birth_date: str
    retirement_date: Optional[str]
    egg_quality_score: int
    temperament_score: int
    current_hive: Optional[str]
    is_retired: int
    generation: int
    mother_id: Optional[int]


class FamilyTreeResponse(BaseModel):
    center_queen: QueenBeeDetailResponse
    generations: int
    nodes: List[FamilyTreeNode]
    has_more_ancestors: bool


class BeeSpeciesListResponse(BaseModel):
    species: List[str]


class QueenBeeSelectItem(BaseModel):
    id: int
    queen_no: str
    bee_species: str
    is_retired: int
