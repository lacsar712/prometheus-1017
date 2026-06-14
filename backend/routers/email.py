import logging
from typing import Optional, List
from datetime import datetime

from fastapi import APIRouter, Depends, Query, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from models import get_db
from services.email_service import (
    list_templates,
    get_template,
    create_template,
    update_template,
    delete_template,
    send_template_email,
    send_email as service_send_email,
    list_send_logs,
    get_send_log,
    render_template,
    send_monthly_report,
    generate_monthly_report_data,
    list_farm_recipients,
    get_farm_recipient,
    create_farm_recipient,
    update_farm_recipient,
    delete_farm_recipient,
)
from schemas.email import (
    EmailTemplateCreate,
    EmailTemplateUpdate,
    EmailTemplateListResponse,
    SendEmailRequest,
    SendEmailResponse,
    EmailSendLogListResponse,
    TemplatePreviewRequest,
    TemplatePreviewResponse,
    EmailTemplateItem,
    FarmRecipientCreate,
    FarmRecipientUpdate,
)

router = APIRouter(prefix="/api/email", tags=["email"])
logger = logging.getLogger(__name__)


@router.get("/templates", response_model=EmailTemplateListResponse)
async def get_templates(
    category: Optional[str] = Query(None, description="按分类过滤：report/alert/general"),
    is_active: Optional[bool] = Query(None, description="按启用状态过滤"),
    db: Session = Depends(get_db),
):
    return list_templates(db, category=category, is_active=is_active)


@router.get("/templates/{template_id}")
async def get_single_template(template_id: int, db: Session = Depends(get_db)):
    tpl = get_template(db, template_id)
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")
    return tpl


@router.post("/templates")
async def create_new_template(data: EmailTemplateCreate, db: Session = Depends(get_db)):
    try:
        tpl = create_template(db, data)
        return {"status": "success", "template": tpl}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/templates/{template_id}")
async def update_existing_template(
    template_id: int,
    data: EmailTemplateUpdate,
    db: Session = Depends(get_db),
):
    tpl = update_template(db, template_id, data)
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"status": "success", "template": tpl}


@router.delete("/templates/{template_id}")
async def remove_template(template_id: int, db: Session = Depends(get_db)):
    try:
        deleted = delete_template(db, template_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Template not found")
        return {"status": "success", "message": "Template deleted"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/preview", response_model=TemplatePreviewResponse)
async def preview_template(data: TemplatePreviewRequest):
    try:
        rendered_html = render_template(data.html_content, data.variables or {})
        rendered_subject = None
        if data.subject:
            rendered_subject = render_template(data.subject, data.variables or {})
        return {"rendered_html": rendered_html, "rendered_subject": rendered_subject}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Template render error: {e}")


@router.post("/send", response_model=SendEmailResponse)
async def send_template_email_endpoint(data: SendEmailRequest, db: Session = Depends(get_db)):
    if not data.template_id and not data.template_code:
        raise HTTPException(status_code=400, detail="Either template_id or template_code is required")
    if not data.recipients:
        raise HTTPException(status_code=400, detail="At least one recipient is required")

    result = send_template_email(
        db=db,
        template_id=data.template_id,
        template_code=data.template_code,
        recipients=data.recipients,
        cc=data.cc,
        bcc=data.bcc,
        variables=data.variables,
        subject_override=data.subject_override,
        created_by=data.created_by or "admin",
        send_type="manual",
    )
    if result["status"] != "success":
        raise HTTPException(status_code=500, detail=result["message"])
    return result


@router.post("/send-test")
async def send_test_email(
    template_id: Optional[int] = Query(None),
    template_code: Optional[str] = Query(None),
    to_email: str = Query(..., description="测试收件人邮箱"),
    db: Session = Depends(get_db),
):
    if not template_id and not template_code:
        raise HTTPException(status_code=400, detail="Either template_id or template_code is required")

    from services.email_service import get_template_by_code
    tpl = None
    if template_id:
        tpl_data = get_template(db, template_id)
        if tpl_data:
            tpl = get_template_by_code(db, tpl_data["template_code"])
    else:
        tpl = get_template_by_code(db, template_code)

    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")

    variables = {}
    for v in tpl.variables or []:
        name = v.get("name") if isinstance(v, dict) else getattr(v, 'name', str(v))
        default = v.get("default_value") if isinstance(v, dict) else getattr(v, 'default_value', None)
        if default is not None:
            variables[name] = default
        else:
            name_lower = name.lower()
            if "top_honey_types" in name_lower:
                variables[name] = [
                    {"honey_type": "洋槐蜜", "weight": 850.5, "percent": "56.7%", "grade": "特级"},
                    {"honey_type": "百花蜜", "weight": 650.0, "percent": "43.3%", "grade": "一级"},
                ]
            elif "alerts_summary" in name_lower:
                variables[name] = [
                    {"name": "蜂箱温度过高", "count": 3, "level": "critical", "level_label": "严重"},
                    {"name": "蜂螨检测超标", "count": 5, "level": "warning", "level_label": "警告"},
                ]
            elif "report_generated" in name_lower:
                variables[name] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            elif "last_queen" in name_lower:
                variables[name] = "3天前"
            elif "egg_pattern" in name_lower:
                variables[name] = "未见正常产卵模式"
            elif "batch_no" in name_lower:
                variables[name] = "B20240115001"
            elif "alert_type" in name_lower:
                variables[name] = "过高"
            elif "farm_name" in name_lower:
                variables[name] = "秦岭一号蜂场"
            elif "farm" in name_lower:
                variables[name] = "秦岭一号蜂场"
            elif "month" in name_lower:
                variables[name] = "2024年01月"
            elif "temperature" in name_lower or "temp" in name_lower:
                variables[name] = 36.5
            elif "hive" in name_lower:
                variables[name] = "QL-0001"
            elif "threshold" in name_lower:
                variables[name] = 35
            elif "confidence" in name_lower:
                variables[name] = 85
            elif "operator" in name_lower:
                variables[name] = "张建国"
            elif "location" in name_lower:
                variables[name] = "A区-12"
            elif "quality_grade" in name_lower or "grade" in name_lower:
                variables[name] = "特级"
            elif "weight" in name_lower or "honey" in name_lower or "harvest" in name_lower:
                variables[name] = 1500
            elif "count" in name_lower or "batches" in name_lower or "batch" in name_lower or "alerts_count" in name_lower:
                variables[name] = 25
            elif "time" in name_lower or "date" in name_lower:
                variables[name] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            elif "suggestion" in name_lower:
                variables[name] = "建议立即检查蜂箱情况，采取相应措施"
            elif "name" in name_lower:
                variables[name] = "秦岭一号蜂场"
            else:
                variables[name] = f"示例值_{name}"

    result = send_template_email(
        db=db,
        template_id=template_id,
        template_code=template_code,
        recipients=[to_email],
        variables=variables,
        created_by="test",
        send_type="test",
    )
    if result["status"] != "success":
        raise HTTPException(status_code=500, detail=result["message"])
    return result


@router.get("/logs", response_model=EmailSendLogListResponse)
async def get_send_logs(
    status: Optional[str] = Query(None, description="按状态过滤：success/failed/pending"),
    template_code: Optional[str] = Query(None, description="按模板编码过滤"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(50, ge=1, le=200, description="每页条数"),
    db: Session = Depends(get_db),
):
    return list_send_logs(db, status=status, template_code=template_code, page=page, page_size=page_size)


@router.get("/logs/{log_id}")
async def get_single_log(log_id: int, db: Session = Depends(get_db)):
    log = get_send_log(db, log_id)
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
    return log


@router.post("/monthly-report/send")
async def trigger_monthly_report(
    farm_id: str = Query(..., description="蜂场ID"),
    farm_name: str = Query(..., description="蜂场名称"),
    recipients: str = Query(..., description="收件人，多个用逗号分隔"),
    db: Session = Depends(get_db),
):
    recipient_list = [r.strip() for r in recipients.split(",") if r.strip()]
    if not recipient_list:
        raise HTTPException(status_code=400, detail="At least one recipient is required")
    result = send_monthly_report(db, farm_id, farm_name, recipient_list)
    if result["status"] != "success":
        raise HTTPException(status_code=500, detail=result["message"])
    return result


@router.get("/monthly-report/preview")
async def preview_monthly_report(
    farm_id: str = Query(..., description="蜂场ID"),
    farm_name: str = Query(..., description="蜂场名称"),
):
    report_data = generate_monthly_report_data(farm_id, farm_name)
    return {"status": "success", "data": report_data.model_dump()}


@router.get("/recipients")
async def get_recipients(
    farm_id: Optional[str] = Query(None, description="按蜂场ID过滤"),
    role: Optional[str] = Query(None, description="按角色过滤：owner/manager/staff"),
    db: Session = Depends(get_db),
):
    return list_farm_recipients(db, farm_id=farm_id, role=role)


@router.get("/recipients/{recipient_id}")
async def get_single_recipient(recipient_id: int, db: Session = Depends(get_db)):
    r = get_farm_recipient(db, recipient_id)
    if not r:
        raise HTTPException(status_code=404, detail="Recipient not found")
    return r


@router.post("/recipients")
async def create_new_recipient(data: FarmRecipientCreate, db: Session = Depends(get_db)):
    try:
        r = create_farm_recipient(
            db,
            farm_id=data.farm_id,
            farm_name=data.farm_name,
            recipient_name=data.recipient_name,
            recipient_email=data.recipient_email,
            role=data.role,
            created_by=data.created_by or "admin",
        )
        return {"status": "success", "recipient": r}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/recipients/{recipient_id}")
async def update_existing_recipient(
    recipient_id: int,
    data: FarmRecipientUpdate,
    db: Session = Depends(get_db),
):
    update_data = data.model_dump(exclude_none=True)
    updated_by = update_data.pop("updated_by", "admin")
    update_data["updated_by"] = updated_by
    r = update_farm_recipient(db, recipient_id, **update_data)
    if not r:
        raise HTTPException(status_code=404, detail="Recipient not found")
    return {"status": "success", "recipient": r}


@router.delete("/recipients/{recipient_id}")
async def remove_recipient(recipient_id: int, db: Session = Depends(get_db)):
    deleted = delete_farm_recipient(db, recipient_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Recipient not found")
    return {"status": "success", "message": "Recipient deleted"}
