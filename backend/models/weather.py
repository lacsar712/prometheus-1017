from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, ForeignKey, Index, JSON
from sqlalchemy.orm import relationship

from .database import Base


class WeatherForecast(Base):
    __tablename__ = "weather_forecasts"

    id = Column(Integer, primary_key=True, index=True)
    farm_id = Column(String, index=True, nullable=False)
    forecast_time = Column(DateTime, nullable=False, index=True)
    forecast_date = Column(String, nullable=False, index=True)
    hour = Column(Integer, nullable=False)
    temperature = Column(Float, nullable=False)
    humidity = Column(Float, nullable=False)
    wind_speed = Column(Float, nullable=False)
    wind_direction = Column(String, nullable=True)
    precipitation = Column(Float, nullable=False, default=0.0)
    weather_code = Column(String, nullable=True)
    weather_desc = Column(String, nullable=True)
    pressure = Column(Float, nullable=True)
    visibility = Column(Float, nullable=True)
    uv_index = Column(Float, nullable=True)
    fetched_at = Column(DateTime, default=datetime.utcnow, index=True)

    __table_args__ = (
        Index('idx_weather_farm_time', 'farm_id', 'forecast_time'),
        Index('idx_weather_farm_date', 'farm_id', 'forecast_date'),
    )


class WeatherAlert(Base):
    __tablename__ = "weather_alerts"

    id = Column(Integer, primary_key=True, index=True)
    farm_id = Column(String, index=True, nullable=False)
    alert_type = Column(String, index=True, nullable=False)
    alert_level = Column(String, nullable=False)
    severity = Column(String, nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    duration_hours = Column(Float, nullable=False)
    peak_value = Column(Float, nullable=True)
    peak_time = Column(DateTime, nullable=True)
    affected_hours = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, default=True)
    is_acknowledged = Column(Boolean, default=False)
    acknowledged_at = Column(DateTime, nullable=True)
    acknowledged_by = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    actions = relationship("AlertAction", back_populates="alert", cascade="all, delete-orphan")

    __table_args__ = (
        Index('idx_alert_farm_active', 'farm_id', 'is_active'),
        Index('idx_alert_farm_type_time', 'farm_id', 'alert_type', 'start_time'),
    )


class AlertAction(Base):
    __tablename__ = "alert_actions"

    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(Integer, ForeignKey('weather_alerts.id'), nullable=False, index=True)
    farm_id = Column(String, index=True, nullable=False)
    action_order = Column(Integer, nullable=False, default=0)
    action_text = Column(String, nullable=False)
    action_category = Column(String, nullable=True)
    is_completed = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)
    completed_by = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    priority = Column(String, default="normal")
    created_at = Column(DateTime, default=datetime.utcnow)

    alert = relationship("WeatherAlert", back_populates="actions")


class AlertActionState(Base):
    __tablename__ = "alert_action_states"

    id = Column(Integer, primary_key=True, index=True)
    farm_id = Column(String, index=True, nullable=False)
    alert_key = Column(String, index=True, nullable=False)
    action_id = Column(String, nullable=False)
    is_completed = Column(Boolean, default=False)
    completed_by = Column(String, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index('idx_action_state_unique', 'farm_id', 'alert_key', 'action_id', unique=True),
    )
