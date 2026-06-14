from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, JSON, ForeignKey, Index
from sqlalchemy.orm import relationship

from .database import Base


class EmailTemplate(Base):
    __tablename__ = "email_templates"

    id = Column(Integer, primary_key=True, index=True)
    template_code = Column(String, unique=True, index=True, nullable=False)
    template_name = Column(String, index=True, nullable=False)
    description = Column(String, nullable=True)
    subject = Column(String, nullable=False)
    html_content = Column(Text, nullable=False)
    variables = Column(JSON, default=list, nullable=False)
    is_system = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    category = Column(String, default="general", nullable=False)
    created_by = Column(String, default="system", nullable=False)
    updated_by = Column(String, default="system", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, index=True)


class EmailSendLog(Base):
    __tablename__ = "email_send_logs"

    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey("email_templates.id"), nullable=True, index=True)
    template_code = Column(String, index=True, nullable=True)
    subject = Column(String, nullable=False)
    sender = Column(String, nullable=False)
    recipients = Column(JSON, default=list, nullable=False)
    cc = Column(JSON, default=list, nullable=True)
    bcc = Column(JSON, default=list, nullable=True)
    html_content = Column(Text, nullable=False)
    variables_used = Column(JSON, default=dict, nullable=True)
    status = Column(String, default="pending", nullable=False, index=True)
    error_message = Column(Text, nullable=True)
    sent_at = Column(DateTime, nullable=True, index=True)
    send_type = Column(String, default="manual", nullable=False)
    created_by = Column(String, default="system", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    template = relationship("EmailTemplate")

    __table_args__ = (
        Index("idx_email_log_status_time", "status", "created_at"),
    )


class FarmRecipient(Base):
    __tablename__ = "farm_recipients"

    id = Column(Integer, primary_key=True, index=True)
    farm_id = Column(String, index=True, nullable=False)
    farm_name = Column(String, nullable=False)
    recipient_name = Column(String, nullable=False)
    recipient_email = Column(String, nullable=False)
    role = Column(String, default="owner", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_by = Column(String, default="system", nullable=False)
    updated_by = Column(String, default="system", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, index=True)

    __table_args__ = (
        Index("idx_farm_recipient_farm_email", "farm_id", "recipient_email", unique=True),
    )
