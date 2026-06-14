from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


SUPPORTED_LANGUAGES = ["zh-CN", "en-US", "zh-TW", "ja-JP", "ko-KR"]
DEFAULT_NAMESPACES = ["common", "apiary", "queen", "honey", "feeding", "weather", "alert"]


class LanguageResourceBase(BaseModel):
    language: str = Field(..., description="语言代码")
    namespace: str = Field(..., description="命名空间")
    key: str = Field(..., description="键名")
    value: str = Field(..., description="译文")


class LanguageResourceCreate(LanguageResourceBase):
    created_by: Optional[str] = Field(None, description="创建人")


class LanguageResourceUpdate(BaseModel):
    value: str = Field(..., description="译文")
    updated_by: Optional[str] = Field(None, description="更新人")


class LanguageResourceItem(BaseModel):
    id: int
    language: str
    namespace: str
    key: str
    value: str
    created_by: Optional[str]
    updated_by: Optional[str]
    created_at: str
    updated_at: str


class LanguageResourceResponse(BaseModel):
    total: int
    page: int
    page_size: int
    resources: List[LanguageResourceItem]


class KeyTranslationRow(BaseModel):
    key: str
    namespace: str
    translations: Dict[str, str]


class TranslationTableResponse(BaseModel):
    total: int
    page: int
    page_size: int
    languages: List[str]
    namespaces: List[str]
    rows: List[KeyTranslationRow]


class LanguageBundleResponse(BaseModel):
    language: str
    namespace: str
    resources: Dict[str, str]
    version: str


class TermDictionaryItem(BaseModel):
    id: int
    term: str
    category: str
    definition: str
    synonyms: Optional[str]
    examples: Optional[str]


class TermDictionaryResponse(BaseModel):
    terms: List[TermDictionaryItem]
    total: int


class HotUpdateMessage(BaseModel):
    type: str = "hot_update"
    language: str
    namespace: str
    key: str
    value: str
    timestamp: str


class NamespaceListResponse(BaseModel):
    namespaces: List[str]


class LanguageListResponse(BaseModel):
    languages: List[Dict[str, str]]
