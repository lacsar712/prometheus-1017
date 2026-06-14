import logging
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import json

from jinja2 import Template, Environment, BaseLoader, select_autoescape
from sqlalchemy.orm import Session

from models.email import EmailTemplate, EmailSendLog, FarmRecipient
from schemas.email import (
    EmailTemplateCreate,
    EmailTemplateUpdate,
    EmailVariable,
    MonthlyReportData,
)

logger = logging.getLogger(__name__)

SMTP_HOST = os.getenv("SMTP_HOST", "mailhog")
SMTP_PORT = int(os.getenv("SMTP_PORT", "1025"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "false").lower() == "true"
DEFAULT_SENDER = os.getenv("EMAIL_SENDER", "apiary@prometheus.local")
DEFAULT_SENDER_NAME = os.getenv("EMAIL_SENDER_NAME", "蜂场监控系统")

jinja_env = Environment(
    loader=BaseLoader(),
    autoescape=select_autoescape(["html", "xml"]),
    trim_blocks=True,
    lstrip_blocks=True,
)

SYSTEM_TEMPLATES = [
    {
        "template_code": "monthly_report",
        "template_name": "月度经营报表",
        "description": "每月自动发送给场主的经营数据汇总报表",
        "category": "report",
        "subject": "{{farm_name}} - {{month}} 月度经营报表",
        "variables": [
            {"name": "farm_name", "label": "蜂场名称"},
            {"name": "month", "label": "统计月份"},
            {"name": "total_honey_kg", "label": "本月采蜜总量(kg)"},
            {"name": "total_batches", "label": "本月生产批次"},
            {"name": "active_hives", "label": "活跃蜂箱数"},
            {"name": "avg_temperature", "label": "月平均温度(°C)"},
            {"name": "alerts_count", "label": "本月告警总数"},
            {"name": "top_honey_types", "label": "蜂蜜品类统计(数组)"},
            {"name": "alerts_summary", "label": "告警分类汇总(数组)"},
            {"name": "report_generated_at", "label": "报表生成时间"},
        ],
        "html_content": """
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 20px; background: #f8fafc; color: #1e293b; }
  .container { max-width: 720px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06); }
  .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 32px 40px; color: white; }
  .header h1 { margin: 0 0 8px 0; font-size: 26px; font-weight: 700; }
  .header p { margin: 0; opacity: 0.9; font-size: 14px; }
  .content { padding: 32px 40px; }
  .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 24px 0; }
  .stat-card { background: linear-gradient(135deg, #fffbeb, #fef3c7); border-radius: 12px; padding: 20px; border: 1px solid #fde68a; }
  .stat-label { font-size: 12px; color: #92400e; margin-bottom: 6px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
  .stat-value { font-size: 24px; font-weight: 700; color: #78350f; }
  .section { margin-top: 28px; }
  .section-title { font-size: 16px; font-weight: 700; color: #1e293b; margin: 0 0 16px 0; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; display: flex; align-items: center; gap: 8px; }
  .section-title::before { content: ''; width: 4px; height: 18px; background: #f59e0b; border-radius: 2px; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th { background: #f1f5f9; text-align: left; padding: 12px 16px; font-weight: 600; color: #475569; }
  td { padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #334155; }
  tr:last-child td { border-bottom: none; }
  .badge { display: inline-block; padding: 2px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; }
  .badge-critical { background: #fee2e2; color: #991b1b; }
  .badge-warning { background: #fef3c7; color: #92400e; }
  .badge-info { background: #dbeafe; color: #1e40af; }
  .footer { padding: 20px 40px; background: #f8fafc; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>🐝 {{farm_name}}</h1>
    <p>{{month}} 月度经营报表 · 生成于 {{report_generated_at}}</p>
  </div>
  <div class="content">
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">采蜜总量</div>
        <div class="stat-value">{{total_honey_kg}} kg</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">生产批次</div>
        <div class="stat-value">{{total_batches}}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">活跃蜂箱</div>
        <div class="stat-value">{{active_hives}}</div>
      </div>
    </div>
    <div class="section">
      <h2 class="section-title">蜂蜜品类统计</h2>
      <table>
        <thead><tr><th>品类</th><th>产量(kg)</th><th>占比</th><th>等级</th></tr></thead>
        <tbody>
        {% for item in top_honey_types %}
          <tr><td>{{item.honey_type}}</td><td>{{item.weight}}</td><td>{{item.percent}}</td><td>{{item.grade}}</td></tr>
        {% endfor %}
        </tbody>
      </table>
    </div>
    <div class="section">
      <h2 class="section-title">告警情况汇总 · 共 {{alerts_count}} 条</h2>
      <table>
        <thead><tr><th>告警类型</th><th>数量</th><th>级别</th></tr></thead>
        <tbody>
        {% for a in alerts_summary %}
          <tr>
            <td>{{a.name}}</td>
            <td>{{a.count}}</td>
            <td><span class="badge badge-{{a.level}}">{{a.level_label}}</span></td>
          </tr>
        {% endfor %}
        </tbody>
      </table>
    </div>
    <div class="section">
      <h2 class="section-title">环境数据</h2>
      <table>
        <tr><td style="width:40%;font-weight:600;color:#475569;">月平均温度</td><td>{{avg_temperature}}°C</td></tr>
      </table>
    </div>
  </div>
  <div class="footer">
    本邮件由蜂场监控系统自动发送 · 如有疑问请联系管理员
  </div>
</div>
</body>
</html>
""",
    },
    {
        "template_code": "temperature_alert",
        "template_name": "温度告警",
        "description": "蜂箱温度异常时发送告警通知",
        "category": "alert",
        "subject": "【温度告警】{{farm_name}} {{hive_id}} 温度{{alert_type}}",
        "variables": [
            {"name": "farm_name", "label": "蜂场名称"},
            {"name": "hive_id", "label": "蜂箱编号"},
            {"name": "alert_type", "label": "告警类型(过高/过低)"},
            {"name": "current_temp", "label": "当前温度(°C)"},
            {"name": "threshold", "label": "告警阈值(°C)"},
            {"name": "location", "label": "蜂箱位置"},
            {"name": "alert_time", "label": "告警时间"},
            {"name": "suggestion", "label": "处置建议"},
        ],
        "html_content": """
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 20px; background: #fef2f2; color: #1e293b; }
  .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(220,38,38,0.12); border: 1px solid #fecaca; }
  .header { background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 28px 32px; color: white; }
  .header h1 { margin: 0 0 6px 0; font-size: 22px; font-weight: 700; display: flex; align-items: center; gap: 10px; }
  .header p { margin: 0; opacity: 0.95; font-size: 13px; }
  .content { padding: 28px 32px; }
  .alert-icon { font-size: 28px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 20px 0; }
  .info-item { background: #fef2f2; border-radius: 10px; padding: 14px 16px; }
  .info-label { font-size: 11px; color: #991b1b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
  .info-value { font-size: 18px; font-weight: 700; color: #7f1d1d; }
  .section-title { font-size: 14px; font-weight: 700; color: #7f1d1d; margin: 24px 0 12px 0; display: flex; align-items: center; gap: 6px; }
  .suggestion-box { background: linear-gradient(135deg, #fff7ed, #ffedd5); border-radius: 12px; padding: 16px 20px; border-left: 4px solid #ea580c; }
  .suggestion-box h4 { margin: 0 0 8px 0; font-size: 14px; color: #9a3412; }
  .suggestion-box p { margin: 0; font-size: 13px; color: #7c2d12; line-height: 1.6; }
  .footer { padding: 16px 32px; background: #fafafa; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1><span class="alert-icon">🌡️</span> 温度告警</h1>
    <p>{{farm_name}} · {{hive_id}} · {{alert_time}}</p>
  </div>
  <div class="content">
    <p style="font-size:15px;color:#334155;margin:0;">检测到蜂箱温度<strong style="color:#dc2626;">{{alert_type}}</strong>，请及时处理！</p>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">当前温度</div>
        <div class="info-value">{{current_temp}}°C</div>
      </div>
      <div class="info-item">
        <div class="info-label">告警阈值</div>
        <div class="info-value">{{threshold}}°C</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px;">
      <div style="background:#f8fafc;border-radius:8px;padding:12px;">
        <div style="font-size:11px;color:#64748b;font-weight:600;">蜂箱位置</div>
        <div style="font-size:14px;font-weight:600;color:#1e293b;margin-top:4px;">{{location}}</div>
      </div>
      <div style="background:#f8fafc;border-radius:8px;padding:12px;">
        <div style="font-size:11px;color:#64748b;font-weight:600;">告警时间</div>
        <div style="font-size:14px;font-weight:600;color:#1e293b;margin-top:4px;">{{alert_time}}</div>
      </div>
    </div>
    <div class="suggestion-box">
      <h4>💡 处置建议</h4>
      <p>{{suggestion}}</p>
    </div>
  </div>
  <div class="footer">蜂场监控系统告警邮件 · 请勿直接回复</div>
</div>
</body>
</html>
""",
    },
    {
        "template_code": "queen_lost_alert",
        "template_name": "失王告警",
        "description": "疑似蜂群失王时发送紧急告警",
        "category": "alert",
        "subject": "【紧急告警】{{farm_name}} {{hive_id}} 疑似失王",
        "variables": [
            {"name": "farm_name", "label": "蜂场名称"},
            {"name": "hive_id", "label": "蜂箱编号"},
            {"name": "location", "label": "蜂箱位置"},
            {"name": "last_queen_seen", "label": "蜂王上次出现时间"},
            {"name": "egg_pattern", "label": "产卵情况描述"},
            {"name": "alert_time", "label": "告警时间"},
            {"name": "confidence", "label": "置信度(%)"},
            {"name": "suggestion", "label": "处置建议"},
        ],
        "html_content": """
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 20px; background: #fef2f2; color: #1e293b; }
  .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(220,38,38,0.15); border: 2px solid #dc2626; }
  .header { background: linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%); padding: 28px 32px; color: white; }
  .header h1 { margin: 0 0 6px 0; font-size: 22px; font-weight: 700; display: flex; align-items: center; gap: 10px; }
  .header p { margin: 0; opacity: 0.95; font-size: 13px; }
  .badge { display: inline-block; padding: 3px 12px; background: #fecaca; color: #7f1d1d; border-radius: 9999px; font-size: 12px; font-weight: 700; margin-top: 8px; }
  .content { padding: 28px 32px; }
  .alert-banner { background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 14px 18px; margin-bottom: 20px; }
  .alert-banner p { margin: 0; color: #7f1d1d; font-size: 14px; font-weight: 500; line-height: 1.6; }
  .detail-row { display: flex; padding: 12px 0; border-bottom: 1px solid #f1f5f9; }
  .detail-label { width: 140px; font-size: 13px; color: #64748b; font-weight: 500; }
  .detail-value { flex: 1; font-size: 14px; color: #1e293b; font-weight: 600; }
  .confidence-bar { height: 8px; background: #f1f5f9; border-radius: 4px; overflow: hidden; margin-top: 6px; }
  .confidence-fill { height: 100%; background: linear-gradient(90deg, #f59e0b, #dc2626); border-radius: 4px; }
  .suggestion-box { background: linear-gradient(135deg, #fff7ed, #ffedd5); border-radius: 12px; padding: 16px 20px; border-left: 4px solid #dc2626; margin-top: 20px; }
  .suggestion-box h4 { margin: 0 0 8px 0; font-size: 14px; color: #991b1b; }
  .suggestion-box p { margin: 0; font-size: 13px; color: #7f1d1d; line-height: 1.7; }
  .footer { padding: 16px 32px; background: #fafafa; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>👑 失王告警</h1>
    <p>{{farm_name}} · {{hive_id}}</p>
    <span class="badge">紧急 · 需要立即处置</span>
  </div>
  <div class="content">
    <div class="alert-banner">
      <p>⚠️ 系统检测到该蜂群疑似失王，请<strong>立即安排养蜂员现场检查确认</strong>，避免蜂群溃散！</p>
    </div>
    <div class="detail-row"><span class="detail-label">蜂箱编号</span><span class="detail-value">{{hive_id}}</span></div>
    <div class="detail-row"><span class="detail-label">蜂箱位置</span><span class="detail-value">{{location}}</span></div>
    <div class="detail-row"><span class="detail-label">蜂王上次出现</span><span class="detail-value">{{last_queen_seen}}</span></div>
    <div class="detail-row"><span class="detail-label">产卵情况</span><span class="detail-value">{{egg_pattern}}</span></div>
    <div class="detail-row">
      <span class="detail-label">失王置信度</span>
      <span class="detail-value">
        {{confidence}}%
        <div class="confidence-bar"><div class="confidence-fill" style="width:{{confidence}}%"></div></div>
      </span>
    </div>
    <div class="detail-row"><span class="detail-label">告警时间</span><span class="detail-value">{{alert_time}}</span></div>
    <div class="suggestion-box">
      <h4>🚨 紧急处置建议</h4>
      <p>{{suggestion}}</p>
    </div>
  </div>
  <div class="footer">蜂场监控系统紧急告警邮件 · 请及时处理</div>
</div>
</body>
</html>
""",
    },
    {
        "template_code": "honey_harvest_complete",
        "template_name": "采蜜完成通知",
        "description": "某蜂场完成采蜜作业时发送通知",
        "category": "general",
        "subject": "【采蜜完成】{{farm_name}} 完成 {{honey_type}} 采收",
        "variables": [
            {"name": "farm_name", "label": "蜂场名称"},
            {"name": "honey_type", "label": "蜂蜜品类"},
            {"name": "harvest_weight", "label": "采收重量(kg)"},
            {"name": "hive_count", "label": "采收蜂箱数"},
            {"name": "harvest_date", "label": "采收日期"},
            {"name": "operator", "label": "操作人"},
            {"name": "quality_grade", "label": "初评等级"},
            {"name": "batch_no", "label": "生产批次号"},
        ],
        "html_content": """
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 20px; background: #f0fdf4; color: #1e293b; }
  .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(22,163,74,0.1); border: 1px solid #bbf7d0; }
  .header { background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 28px 32px; color: white; }
  .header h1 { margin: 0 0 6px 0; font-size: 22px; font-weight: 700; display: flex; align-items: center; gap: 10px; }
  .header p { margin: 0; opacity: 0.95; font-size: 13px; }
  .content { padding: 28px 32px; }
  .banner { background: linear-gradient(135deg, #dcfce7, #bbf7d0); border-radius: 12px; padding: 18px 22px; margin-bottom: 24px; display: flex; align-items: center; gap: 16px; }
  .banner-icon { font-size: 40px; }
  .banner-text { flex: 1; }
  .banner-text strong { font-size: 18px; color: #166534; display: block; margin-bottom: 4px; }
  .banner-text span { font-size: 13px; color: #15803d; }
  .stats-row { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin-bottom: 20px; }
  .stat-box { background: #f0fdf4; border-radius: 10px; padding: 16px; text-align: center; border: 1px solid #bbf7d0; }
  .stat-label { font-size: 11px; color: #166534; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
  .stat-value { font-size: 22px; font-weight: 700; color: #14532d; margin-top: 4px; }
  .stat-unit { font-size: 12px; color: #16a34a; font-weight: 500; }
  .detail-row { display: flex; padding: 12px 0; border-bottom: 1px solid #f1f5f9; }
  .detail-label { width: 120px; font-size: 13px; color: #64748b; font-weight: 500; }
  .detail-value { flex: 1; font-size: 14px; color: #1e293b; font-weight: 600; }
  .grade-badge { display: inline-block; padding: 3px 14px; border-radius: 9999px; font-size: 13px; font-weight: 700; }
  .grade-super { background: linear-gradient(135deg, #fde68a, #fcd34d); color: #92400e; }
  .grade-first { background: linear-gradient(135deg, #bfdbfe, #93c5fd); color: #1e40af; }
  .grade-second { background: linear-gradient(135deg, #e5e7eb, #d1d5db); color: #374151; }
  .footer { padding: 16px 32px; background: #f0fdf4; text-align: center; font-size: 11px; color: #16a34a; border-top: 1px solid #bbf7d0; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>🍯 采蜜完成通知</h1>
    <p>{{farm_name}} · 批次 {{batch_no}}</p>
  </div>
  <div class="content">
    <div class="banner">
      <span class="banner-icon">🎉</span>
      <div class="banner-text">
        <strong>{{honey_type}} 采收完成</strong>
        <span>操作人：{{operator}} · {{harvest_date}}</span>
      </div>
    </div>
    <div class="stats-row">
      <div class="stat-box">
        <div class="stat-label">采收重量</div>
        <div class="stat-value">{{harvest_weight}}<span class="stat-unit"> kg</span></div>
      </div>
      <div class="stat-box">
        <div class="stat-label">采收蜂箱</div>
        <div class="stat-value">{{hive_count}}<span class="stat-unit"> 箱</span></div>
      </div>
    </div>
    <div class="detail-row"><span class="detail-label">蜂场名称</span><span class="detail-value">{{farm_name}}</span></div>
    <div class="detail-row"><span class="detail-label">蜂蜜品类</span><span class="detail-value">{{honey_type}}</span></div>
    <div class="detail-row"><span class="detail-label">生产批次</span><span class="detail-value">{{batch_no}}</span></div>
    <div class="detail-row"><span class="detail-label">采收日期</span><span class="detail-value">{{harvest_date}}</span></div>
    <div class="detail-row"><span class="detail-label">操作人</span><span class="detail-value">{{operator}}</span></div>
    <div class="detail-row">
      <span class="detail-label">初评等级</span>
      <span class="detail-value">
        {% if quality_grade == '特级' %}<span class="grade-badge grade-super">⭐ 特级</span>
        {% elif quality_grade == '一级' %}<span class="grade-badge grade-first">🥇 一级</span>
        {% else %}<span class="grade-badge grade-second">🥈 二级</span>{% endif %}
      </span>
    </div>
  </div>
  <div class="footer">蜂场监控系统 · 采蜜作业已记录入库存台账</div>
</div>
</body>
</html>
""",
    },
]


def _template_to_dict(t: EmailTemplate, include_content: bool = True) -> Dict[str, Any]:
    return {
        "id": t.id,
        "template_code": t.template_code,
        "template_name": t.template_name,
        "description": t.description,
        "subject": t.subject,
        "html_content": t.html_content if include_content else None,
        "variables": t.variables or [],
        "is_system": t.is_system,
        "is_active": t.is_active,
        "category": t.category,
        "created_by": t.created_by,
        "updated_by": t.updated_by,
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "updated_at": t.updated_at.isoformat() if t.updated_at else None,
    }


def _log_to_dict(log: EmailSendLog, include_content: bool = False) -> Dict[str, Any]:
    return {
        "id": log.id,
        "template_id": log.template_id,
        "template_code": log.template_code,
        "subject": log.subject,
        "sender": log.sender,
        "recipients": log.recipients or [],
        "cc": log.cc or [],
        "bcc": log.bcc or [],
        "html_content": log.html_content if include_content else None,
        "variables_used": log.variables_used or {},
        "status": log.status,
        "error_message": log.error_message,
        "sent_at": log.sent_at.isoformat() if log.sent_at else None,
        "send_type": log.send_type,
        "created_by": log.created_by,
        "created_at": log.created_at.isoformat() if log.created_at else None,
    }


def render_template(html_content: str, variables: Dict[str, Any]) -> str:
    template = jinja_env.from_string(html_content)
    return template.render(**variables)


def init_email_templates(db: Session) -> None:
    for tpl_data in SYSTEM_TEMPLATES:
        existing = db.query(EmailTemplate).filter(EmailTemplate.template_code == tpl_data["template_code"]).first()
        if existing:
            continue
        variables_list = []
        for v in tpl_data.get("variables", []):
            variables_list.append({
                "name": v["name"],
                "label": v["label"],
                "description": v.get("description", ""),
                "default_value": v.get("default_value"),
            })
        tpl = EmailTemplate(
            template_code=tpl_data["template_code"],
            template_name=tpl_data["template_name"],
            description=tpl_data.get("description", ""),
            category=tpl_data.get("category", "general"),
            subject=tpl_data["subject"],
            html_content=tpl_data["html_content"],
            variables=variables_list,
            is_system=True,
            is_active=True,
            created_by="system",
            updated_by="system",
        )
        db.add(tpl)
    db.commit()
    logger.info(f"Initialized {len(SYSTEM_TEMPLATES)} system email templates.")


def list_templates(db: Session, category: Optional[str] = None, is_active: Optional[bool] = None) -> Dict[str, Any]:
    query = db.query(EmailTemplate)
    if category:
        query = query.filter(EmailTemplate.category == category)
    if is_active is not None:
        query = query.filter(EmailTemplate.is_active == is_active)
    templates = query.order_by(EmailTemplate.category, EmailTemplate.template_name).all()
    return {
        "total": len(templates),
        "templates": [_template_to_dict(t, include_content=False) for t in templates],
    }


def get_template(db: Session, template_id: int) -> Optional[Dict[str, Any]]:
    t = db.query(EmailTemplate).filter(EmailTemplate.id == template_id).first()
    if not t:
        return None
    return _template_to_dict(t, include_content=True)


def get_template_by_code(db: Session, template_code: str) -> Optional[EmailTemplate]:
    return db.query(EmailTemplate).filter(EmailTemplate.template_code == template_code).first()


def create_template(db: Session, data: EmailTemplateCreate) -> Dict[str, Any]:
    existing = db.query(EmailTemplate).filter(EmailTemplate.template_code == data.template_code).first()
    if existing:
        raise ValueError(f"Template code '{data.template_code}' already exists")

    variables_list = []
    for v in data.variables:
        variables_list.append({
            "name": v.name,
            "label": v.label,
            "description": v.description,
            "default_value": v.default_value,
        })

    tpl = EmailTemplate(
        template_code=data.template_code,
        template_name=data.template_name,
        description=data.description,
        category=data.category,
        subject=data.subject,
        html_content=data.html_content,
        variables=variables_list,
        is_system=data.is_system,
        is_active=data.is_active,
        created_by=data.created_by or "admin",
        updated_by=data.created_by or "admin",
    )
    db.add(tpl)
    db.commit()
    db.refresh(tpl)
    return _template_to_dict(tpl, include_content=True)


def update_template(db: Session, template_id: int, data: EmailTemplateUpdate) -> Optional[Dict[str, Any]]:
    tpl = db.query(EmailTemplate).filter(EmailTemplate.id == template_id).first()
    if not tpl:
        return None

    update_data = data.model_dump(exclude_unset=True)
    if "variables" in update_data and update_data["variables"] is not None:
        variables_list = []
        for v in update_data["variables"]:
            if isinstance(v, EmailVariable):
                variables_list.append({
                    "name": v.name,
                    "label": v.label,
                    "description": v.description,
                    "default_value": v.default_value,
                })
            elif isinstance(v, dict):
                variables_list.append(v)
        update_data["variables"] = variables_list
    update_data["updated_by"] = data.updated_by or "admin"

    for key, value in update_data.items():
        if hasattr(tpl, key) and value is not None:
            setattr(tpl, key, value)

    tpl.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(tpl)
    return _template_to_dict(tpl, include_content=True)


def delete_template(db: Session, template_id: int) -> bool:
    tpl = db.query(EmailTemplate).filter(EmailTemplate.id == template_id).first()
    if not tpl:
        return False
    if tpl.is_system:
        raise ValueError("System templates cannot be deleted")
    db.delete(tpl)
    db.commit()
    return True


def send_email(
    db: Session,
    recipients: List[str],
    subject: str,
    html_content: str,
    cc: Optional[List[str]] = None,
    bcc: Optional[List[str]] = None,
    sender: Optional[str] = None,
    template_id: Optional[int] = None,
    template_code: Optional[str] = None,
    variables_used: Optional[Dict[str, Any]] = None,
    created_by: str = "admin",
    send_type: str = "manual",
) -> Dict[str, Any]:
    sender = sender or DEFAULT_SENDER
    cc = cc or []
    bcc = bcc or []

    log = EmailSendLog(
        template_id=template_id,
        template_code=template_code,
        subject=subject,
        sender=sender,
        recipients=recipients,
        cc=cc,
        bcc=bcc,
        html_content=html_content,
        variables_used=variables_used or {},
        status="pending",
        send_type=send_type,
        created_by=created_by,
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = formataddr((DEFAULT_SENDER_NAME, sender))
        msg["To"] = ", ".join(recipients)
        if cc:
            msg["Cc"] = ", ".join(cc)
        if bcc:
            msg["Bcc"] = ", ".join(bcc)
        msg.attach(MIMEText(html_content, "html", "utf-8"))

        all_recipients = recipients + cc + bcc

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=30) as smtp:
            smtp.ehlo()
            if SMTP_USE_TLS:
                smtp.starttls()
                smtp.ehlo()
            if SMTP_USER and SMTP_PASSWORD:
                smtp.login(SMTP_USER, SMTP_PASSWORD)
            smtp.sendmail(sender, all_recipients, msg.as_string())

        log.status = "success"
        log.sent_at = datetime.utcnow()
        db.commit()
        db.refresh(log)

        return {"status": "success", "log_id": log.id, "message": "Email sent successfully"}
    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        log.status = "failed"
        log.error_message = str(e)
        db.commit()
        db.refresh(log)
        return {"status": "failed", "log_id": log.id, "message": str(e)}


def send_template_email(
    db: Session,
    template_id: Optional[int] = None,
    template_code: Optional[str] = None,
    recipients: Optional[List[str]] = None,
    cc: Optional[List[str]] = None,
    bcc: Optional[List[str]] = None,
    variables: Optional[Dict[str, Any]] = None,
    subject_override: Optional[str] = None,
    created_by: str = "admin",
    send_type: str = "manual",
) -> Dict[str, Any]:
    variables = variables or {}
    recipients = recipients or []

    tpl = None
    if template_id:
        tpl = db.query(EmailTemplate).filter(EmailTemplate.id == template_id).first()
    elif template_code:
        tpl = get_template_by_code(db, template_code)

    if not tpl:
        return {"status": "failed", "log_id": 0, "message": "Template not found"}
    if not tpl.is_active:
        return {"status": "failed", "log_id": 0, "message": "Template is not active"}
    if not recipients:
        return {"status": "failed", "log_id": 0, "message": "No recipients specified"}

    try:
        subject = render_template(subject_override or tpl.subject, variables)
        html = render_template(tpl.html_content, variables)
    except Exception as e:
        return {"status": "failed", "log_id": 0, "message": f"Template render error: {e}"}

    return send_email(
        db=db,
        recipients=recipients,
        cc=cc,
        bcc=bcc,
        subject=subject,
        html_content=html,
        template_id=tpl.id,
        template_code=tpl.template_code,
        variables_used=variables,
        created_by=created_by,
        send_type=send_type,
    )


def list_send_logs(
    db: Session,
    status: Optional[str] = None,
    template_code: Optional[str] = None,
    page: int = 1,
    page_size: int = 50,
) -> Dict[str, Any]:
    query = db.query(EmailSendLog)
    if status:
        query = query.filter(EmailSendLog.status == status)
    if template_code:
        query = query.filter(EmailSendLog.template_code == template_code)

    total = query.count()
    logs = (
        query.order_by(EmailSendLog.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "logs": [_log_to_dict(l, include_content=False) for l in logs],
    }


def get_send_log(db: Session, log_id: int) -> Optional[Dict[str, Any]]:
    log = db.query(EmailSendLog).filter(EmailSendLog.id == log_id).first()
    if not log:
        return None
    return _log_to_dict(log, include_content=True)


def generate_monthly_report_data(farm_id: str, farm_name: str, month: Optional[str] = None) -> MonthlyReportData:
    now = datetime.now()
    if not month:
        first_day_this_month = now.replace(day=1)
        last_month = first_day_this_month - timedelta(days=1)
        month = last_month.strftime("%Y年%m月")

    import random
    rnd = random.Random(f"{farm_id}_{month}")

    honey_types_map = {
        "farm_001": [("洋槐蜜", "特级"), ("百花蜜", "一级")],
        "farm_002": [("椴树蜜", "特级"), ("百花蜜", "二级")],
        "farm_003": [("油菜花蜜", "一级")],
        "farm_004": [("百花蜜", "特级"), ("洋槐蜜", "二级")],
        "farm_005": [("枣花蜜", "一级"), ("百花蜜", "二级")],
        "farm_006": [("荔枝蜜", "特级"), ("荔枝蜜", "一级")],
    }
    types_list = honey_types_map.get(farm_id, [("百花蜜", "一级")])
    if isinstance(types_list, tuple):
        types_list = [types_list]

    total_honey = round(rnd.uniform(1800, 8500), 1)
    remaining = total_honey
    top_types = []
    for i, (ht, grade) in enumerate(types_list):
        if i == len(types_list) - 1:
            w = round(remaining, 1)
        else:
            w = round(remaining * rnd.uniform(0.3, 0.7), 1)
            remaining -= w
        pct = round(w / total_honey * 100, 1)
        top_types.append({"honey_type": ht, "weight": w, "percent": f"{pct}%", "grade": grade})

    alert_types = [
        {"name": "蜂箱温度过高", "level": "critical", "level_label": "严重"},
        {"name": "蜂箱温度过低", "level": "warning", "level_label": "警告"},
        {"name": "疑似失王", "level": "critical", "level_label": "严重"},
        {"name": "蜂螨检测超标", "level": "warning", "level_label": "警告"},
        {"name": "巡检超时未完成", "level": "info", "level_label": "提示"},
    ]
    alerts_summary = []
    total_alerts = 0
    for at in alert_types:
        cnt = rnd.randint(0, 12)
        total_alerts += cnt
        alerts_summary.append({**at, "count": cnt})
    alerts_summary.sort(key=lambda x: x["count"], reverse=True)

    return MonthlyReportData(
        month=month,
        farm_name=farm_name,
        total_honey_kg=total_honey,
        total_batches=rnd.randint(6, 28),
        active_hives=rnd.randint(120, 480),
        avg_temperature=round(rnd.uniform(12, 32), 1),
        alerts_count=total_alerts,
        top_honey_types=top_types,
        alerts_summary=[a for a in alerts_summary if a["count"] > 0],
        report_generated_at=now.strftime("%Y-%m-%d %H:%M:%S"),
    )


def send_monthly_report(db: Session, farm_id: str, farm_name: str, recipients: List[str]) -> Dict[str, Any]:
    report_data = generate_monthly_report_data(farm_id, farm_name)
    variables = report_data.model_dump()
    return send_template_email(
        db=db,
        template_code="monthly_report",
        recipients=recipients,
        variables=variables,
        created_by="scheduler",
        send_type="scheduled",
    )


def _recipient_to_dict(r: FarmRecipient) -> Dict[str, Any]:
    return {
        "id": r.id,
        "farm_id": r.farm_id,
        "farm_name": r.farm_name,
        "recipient_name": r.recipient_name,
        "recipient_email": r.recipient_email,
        "role": r.role,
        "is_active": r.is_active,
        "created_by": r.created_by,
        "updated_by": r.updated_by,
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "updated_at": r.updated_at.isoformat() if r.updated_at else None,
    }


INITIAL_FARM_RECIPIENTS = [
    {"farm_id": "farm_001", "farm_name": "秦岭一号蜂场", "recipient_name": "张场主", "recipient_email": "owner_farm001@apiary.local", "role": "owner"},
    {"farm_id": "farm_001", "farm_name": "秦岭一号蜂场", "recipient_name": "李经理", "recipient_email": "manager_farm001@apiary.local", "role": "manager"},
    {"farm_id": "farm_002", "farm_name": "长白山蜜源基地", "recipient_name": "王场主", "recipient_email": "owner_farm002@apiary.local", "role": "owner"},
    {"farm_id": "farm_003", "farm_name": "云贵高原蜂场", "recipient_name": "刘场主", "recipient_email": "owner_farm003@apiary.local", "role": "owner"},
    {"farm_id": "farm_003", "farm_name": "云贵高原蜂场", "recipient_name": "陈经理", "recipient_email": "manager_farm003@apiary.local", "role": "manager"},
    {"farm_id": "farm_004", "farm_name": "江南水乡蜂场", "recipient_name": "周场主", "recipient_email": "owner_farm004@apiary.local", "role": "owner"},
    {"farm_id": "farm_005", "farm_name": "黄土高原蜂场", "recipient_name": "郑场主", "recipient_email": "owner_farm005@apiary.local", "role": "owner"},
    {"farm_id": "farm_006", "farm_name": "闽南荔枝蜜场", "recipient_name": "何场主", "recipient_email": "owner_farm006@apiary.local", "role": "owner"},
    {"farm_id": "farm_006", "farm_name": "闽南荔枝蜜场", "recipient_name": "林经理", "recipient_email": "manager_farm006@apiary.local", "role": "manager"},
]


def init_farm_recipients(db: Session) -> None:
    for data in INITIAL_FARM_RECIPIENTS:
        existing = db.query(FarmRecipient).filter(
            FarmRecipient.farm_id == data["farm_id"],
            FarmRecipient.recipient_email == data["recipient_email"],
        ).first()
        if existing:
            continue
        r = FarmRecipient(
            farm_id=data["farm_id"],
            farm_name=data["farm_name"],
            recipient_name=data["recipient_name"],
            recipient_email=data["recipient_email"],
            role=data.get("role", "owner"),
            is_active=True,
            created_by="system",
            updated_by="system",
        )
        db.add(r)
    db.commit()
    logger.info(f"Initialized {len(INITIAL_FARM_RECIPIENTS)} farm recipients.")


def list_farm_recipients(db: Session, farm_id: Optional[str] = None, role: Optional[str] = None) -> Dict[str, Any]:
    query = db.query(FarmRecipient)
    if farm_id:
        query = query.filter(FarmRecipient.farm_id == farm_id)
    if role:
        query = query.filter(FarmRecipient.role == role)
    recipients = query.order_by(FarmRecipient.farm_id, FarmRecipient.role).all()
    return {
        "total": len(recipients),
        "recipients": [_recipient_to_dict(r) for r in recipients],
    }


def get_farm_recipient(db: Session, recipient_id: int) -> Optional[Dict[str, Any]]:
    r = db.query(FarmRecipient).filter(FarmRecipient.id == recipient_id).first()
    if not r:
        return None
    return _recipient_to_dict(r)


def create_farm_recipient(db: Session, farm_id: str, farm_name: str, recipient_name: str,
                          recipient_email: str, role: str = "owner", created_by: str = "admin") -> Dict[str, Any]:
    existing = db.query(FarmRecipient).filter(
        FarmRecipient.farm_id == farm_id,
        FarmRecipient.recipient_email == recipient_email,
    ).first()
    if existing:
        raise ValueError(f"Recipient {recipient_email} already exists for farm {farm_id}")

    r = FarmRecipient(
        farm_id=farm_id,
        farm_name=farm_name,
        recipient_name=recipient_name,
        recipient_email=recipient_email,
        role=role,
        is_active=True,
        created_by=created_by,
        updated_by=created_by,
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return _recipient_to_dict(r)


def update_farm_recipient(db: Session, recipient_id: int, **kwargs) -> Optional[Dict[str, Any]]:
    r = db.query(FarmRecipient).filter(FarmRecipient.id == recipient_id).first()
    if not r:
        return None
    for key, value in kwargs.items():
        if hasattr(r, key) and value is not None:
            setattr(r, key, value)
    r.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(r)
    return _recipient_to_dict(r)


def delete_farm_recipient(db: Session, recipient_id: int) -> bool:
    r = db.query(FarmRecipient).filter(FarmRecipient.id == recipient_id).first()
    if not r:
        return False
    db.delete(r)
    db.commit()
    return True


def get_farm_recipient_emails(db: Session, farm_id: str) -> List[str]:
    recipients = db.query(FarmRecipient).filter(
        FarmRecipient.farm_id == farm_id,
        FarmRecipient.is_active == True,
    ).all()
    return [r.recipient_email for r in recipients]
