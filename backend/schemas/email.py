from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, EmailStr


class EmailVariable(BaseModel):
    name: str = Field(..., description="变量名，如 {{farm_name}}")
    label: str = Field(..., description="变量显示名称")
    description: Optional[str] = Field(None, description="变量说明")
    default_value: Optional[Any] = Field(None, description="默认值")


class EmailTemplateBase(BaseModel):
    template_code: str = Field(..., description="模板唯一编码")
    template_name: str = Field(..., description="模板显示名称")
    description: Optional[str] = Field(None, description="模板描述")
    subject: str = Field(..., description="邮件主题，支持变量")
    html_content: str = Field(..., description="邮件HTML内容，Jinja2模板语法")
    variables: List[EmailVariable] = Field(default_factory=list, description="模板可用变量列表")
    category: str = Field("general", description="模板分类：report/alert/general")


class EmailTemplateCreate(EmailTemplateBase):
    is_system: bool = Field(False, description="是否系统内置模板")
    is_active: bool = Field(True, description="是否启用")
    created_by: Optional[str] = Field("admin", description="创建人")


class EmailTemplateUpdate(BaseModel):
    template_name: Optional[str] = None
    description: Optional[str] = None
    subject: Optional[str] = None
    html_content: Optional[str] = None
    variables: Optional[List[EmailVariable]] = None
    category: Optional[str] = None
    is_active: Optional[bool] = None
    updated_by: Optional[str] = Field("admin", description="更新人")


class EmailTemplateItem(BaseModel):
    id: int
    template_code: str
    template_name: str
    description: Optional[str]
    subject: str
    html_content: Optional[str] = None
    variables: List[Dict[str, Any]]
    is_system: bool
    is_active: bool
    category: str
    created_by: str
    updated_by: str
    created_at: str
    updated_at: str


class EmailTemplateListResponse(BaseModel):
    total: int
    templates: List[EmailTemplateItem]


class SendEmailRequest(BaseModel):
    template_id: Optional[int] = Field(None, description="模板ID，与template_code二选一")
    template_code: Optional[str] = Field(None, description="模板编码，与template_id二选一")
    recipients: List[str] = Field(..., description="收件人邮箱列表")
    cc: Optional[List[str]] = Field(default_factory=list, description="抄送列表")
    bcc: Optional[List[str]] = Field(default_factory=list, description="密送列表")
    variables: Dict[str, Any] = Field(default_factory=dict, description="模板变量值")
    subject_override: Optional[str] = Field(None, description="覆盖模板主题")
    created_by: Optional[str] = Field("admin", description="发送人")


class SendEmailResponse(BaseModel):
    status: str
    log_id: int
    message: str


class EmailSendLogItem(BaseModel):
    id: int
    template_id: Optional[int]
    template_code: Optional[str]
    subject: str
    sender: str
    recipients: List[str]
    cc: Optional[List[str]]
    bcc: Optional[List[str]]
    html_content: Optional[str] = None
    variables_used: Optional[Dict[str, Any]]
    status: str
    error_message: Optional[str]
    sent_at: Optional[str]
    send_type: str
    created_by: str
    created_at: str


class EmailSendLogListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    logs: List[EmailSendLogItem]


class TemplatePreviewRequest(BaseModel):
    html_content: str = Field(..., description="模板HTML内容")
    subject: Optional[str] = Field(None, description="邮件主题")
    variables: Dict[str, Any] = Field(default_factory=dict, description="变量值")


class TemplatePreviewResponse(BaseModel):
    rendered_html: str
    rendered_subject: Optional[str]


class MonthlyReportData(BaseModel):
    month: str
    farm_name: str
    total_honey_kg: float
    total_batches: int
    active_hives: int
    avg_temperature: float
    alerts_count: int
    top_honey_types: List[Dict[str, Any]]
    alerts_summary: List[Dict[str, Any]]
    report_generated_at: str


class FarmRecipientCreate(BaseModel):
    farm_id: str = Field(..., description="蜂场ID")
    farm_name: str = Field(..., description="蜂场名称")
    recipient_name: str = Field(..., description="收件人姓名")
    recipient_email: str = Field(..., description="收件人邮箱")
    role: str = Field("owner", description="角色：owner/manager/staff")
    created_by: Optional[str] = Field("admin", description="创建人")


class FarmRecipientUpdate(BaseModel):
    farm_name: Optional[str] = None
    recipient_name: Optional[str] = None
    recipient_email: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    updated_by: Optional[str] = Field("admin", description="更新人")
