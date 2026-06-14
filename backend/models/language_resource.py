from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, Index, UniqueConstraint

from .database import Base


class LanguageResource(Base):
    __tablename__ = "language_resources"

    id = Column(Integer, primary_key=True, index=True)
    language = Column(String, index=True, nullable=False)
    namespace = Column(String, index=True, nullable=False)
    key = Column(String, index=True, nullable=False)
    value = Column(Text, nullable=False)
    created_by = Column(String, nullable=True)
    updated_by = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('language', 'namespace', 'key', name='uix_lang_ns_key'),
        Index('idx_lang_ns', 'language', 'namespace'),
    )


class TermDictionary(Base):
    __tablename__ = "term_dictionaries"

    id = Column(Integer, primary_key=True, index=True)
    term = Column(String, index=True, nullable=False)
    category = Column(String, index=True, nullable=False)
    definition = Column(Text, nullable=False)
    synonyms = Column(Text, nullable=True)
    examples = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
