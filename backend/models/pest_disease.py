from sqlalchemy import Column, Integer, String, Text, Float
from models.database import Base


class PestDisease(Base):
    __tablename__ = "pest_diseases"

    id = Column(Integer, primary_key=True, index=True)
    name_cn = Column(String(100), nullable=False, index=True)
    name_en = Column(String(200), nullable=True)
    aliases = Column(Text, nullable=True)
    category = Column(String(20), nullable=False, index=True)
    symptom_tags = Column(Text, nullable=False)
    causes = Column(Text, nullable=True)
    prevention = Column(Text, nullable=True)
    severity = Column(String(20), nullable=False, default="medium")
    image_url = Column(String(500), nullable=True)
