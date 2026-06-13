import logging
import time
import random
import json
import os
import asyncio
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from collections import defaultdict

from fastapi import FastAPI, HTTPException, Request, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, ForeignKey, Index
from sqlalchemy.orm import Session, relationship
from pydantic import BaseModel, Field
import httpx

from models.database import Base, engine, SessionLocal, get_db
from models.honey_batch import HoneyBatch, BatchEvent
from models.weather import WeatherForecast, WeatherAlert, AlertAction
from routers.trace import router as trace_router
from services.weather_service import (
    generate_hourly_forecast,
    generate_daily_summary,
    detect_extreme_weather,
    generate_alert_actions,
    ALERT_TYPE_META,
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

PROMETHEUS_URL = os.getenv("PROMETHEUS_URL", "http://prometheus:9090")

CACHE_TTL = 5
_cache: Dict[str, Dict[str, Any]] = {}


def get_cache(key: str) -> Optional[Any]:
    entry = _cache.get(key)
    if entry and (time.time() - entry["time"]) < CACHE_TTL:
        return entry["data"]
    return None


def set_cache(key: str, data: Any) -> None:
    _cache[key] = {"data": data, "time": time.time()}


class Item(Base):
    __tablename__ = "items"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String)


FEED_TYPES = {
    "sugar_syrup": {"name": "白糖糖浆", "unit": "kg", "default_safety_stock": 500},
    "pollen_cake": {"name": "花粉饼", "unit": "kg", "default_safety_stock": 100},
    "compound_feed": {"name": "复合饲料", "unit": "kg", "default_safety_stock": 200},
    "mineral_salt_water": {"name": "矿物盐水", "unit": "L", "default_safety_stock": 300},
}

SEASONS = ["立春", "雨水", "惊蛰", "春分", "清明", "谷雨",
           "立夏", "小满", "芒种", "夏至", "小暑", "大暑",
           "立秋", "处暑", "白露", "秋分", "寒露", "霜降",
           "立冬", "小雪", "大雪", "冬至", "小寒", "大寒"]

BEE_STRENGTHS = ["weak", "medium", "strong"]


class FeedingRecord(Base):
    __tablename__ = "feeding_records"

    id = Column(Integer, primary_key=True, index=True)
    farm_id = Column(String, index=True, nullable=False)
    hive_id = Column(String, index=True, nullable=False)
    feed_type = Column(String, index=True, nullable=False)
    ratio = Column(String, nullable=True)
    amount = Column(Float, nullable=False)
    feeder = Column(String, nullable=False)
    feeding_time = Column(DateTime, nullable=False, index=True)
    colony_status = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    period = Column(String, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index('idx_feeding_farm_time', 'farm_id', 'feeding_time'),
        Index('idx_feeding_type_time', 'feed_type', 'feeding_time'),
    )


class MaterialStock(Base):
    __tablename__ = "material_stocks"

    id = Column(Integer, primary_key=True, index=True)
    feed_type = Column(String, unique=True, index=True, nullable=False)
    current_stock = Column(Float, default=0.0, nullable=False)
    safety_stock = Column(Float, nullable=False)
    unit = Column(String, nullable=False)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def is_below_safety(self):
        return self.current_stock < self.safety_stock


class StockTransaction(Base):
    __tablename__ = "stock_transactions"

    id = Column(Integer, primary_key=True, index=True)
    feed_type = Column(String, index=True, nullable=False)
    change_amount = Column(Float, nullable=False)
    transaction_type = Column(String, nullable=False)
    related_record_id = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


class InAppMessage(Base):
    __tablename__ = "in_app_messages"

    id = Column(Integer, primary_key=True, index=True)
    recipient = Column(String, index=True, nullable=False)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    message_type = Column(String, default="stock_alert", nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


class HiveInfo(Base):
    __tablename__ = "hive_infos"

    id = Column(String, primary_key=True, index=True)
    farm_id = Column(String, index=True, nullable=False)
    hive_number = Column(String, nullable=False)
    location = Column(String, nullable=True)
    queen_age = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class FeedingRecordCreate(BaseModel):
    farm_id: str
    hive_ids: List[str]
    feed_type: str
    ratio: Optional[str] = None
    amount_per_hive: float
    feeder: str
    feeding_time: datetime
    colony_status: Optional[str] = None
    notes: Optional[str] = None
    period: str


class StockInbound(BaseModel):
    feed_type: str
    amount: float
    notes: Optional[str] = None


class RatioRecommendationRequest(BaseModel):
    solar_term: str
    temperature: float
    colony_strength: str
    period: Optional[str] = None


class AlertActionUpdate(BaseModel):
    is_completed: bool
    completed_by: Optional[str] = None
    notes: Optional[str] = None


class WeatherAlertAck(BaseModel):
    acknowledged: bool
    acknowledged_by: Optional[str] = None


_WEATHER_CACHE: Dict[str, Dict[str, Any]] = {}
_WEATHER_CACHE_TTL = 3600


def _get_cached_weather(key: str) -> Optional[Any]:
    entry = _WEATHER_CACHE.get(key)
    if entry and (time.time() - entry["time"]) < _WEATHER_CACHE_TTL:
        return entry["data"]
    return None


def _set_cached_weather(key: str, data: Any) -> None:
    _WEATHER_CACHE[key] = {"data": data, "time": time.time()}


def _get_period_by_date(d: datetime) -> str:
    month = d.month
    if 2 <= month <= 4:
        return "spring_breeding"
    elif 8 <= month <= 9:
        return "autumn_breeding"
    elif 10 <= month or month <= 1:
        return "wintering"
    else:
        return "normal"


def init_db():
    retries = 5
    while retries > 0:
        try:
            Base.metadata.create_all(bind=engine)
            logger.info("Database tables created successfully.")
            _init_material_stocks()
            _init_hive_infos()
            _init_honey_batches()
            break
        except Exception as e:
            logger.error(f"Database connection failed: {e}. Retrying in 5 seconds...")
            retries -= 1
            time.sleep(5)


def _init_material_stocks():
    db = SessionLocal()
    try:
        for feed_type, info in FEED_TYPES.items():
            existing = db.query(MaterialStock).filter(MaterialStock.feed_type == feed_type).first()
            if not existing:
                stock = MaterialStock(
                    feed_type=feed_type,
                    current_stock=round(random.uniform(info["default_safety_stock"] * 0.6, info["default_safety_stock"] * 1.5), 1),
                    safety_stock=info["default_safety_stock"],
                    unit=info["unit"]
                )
                db.add(stock)
        db.commit()
        logger.info("Material stocks initialized.")
    except Exception as e:
        logger.error(f"Failed to init material stocks: {e}")
        db.rollback()
    finally:
        db.close()


def _init_hive_infos():
    db = SessionLocal()
    try:
        for farm in BEE_FARMS:
            farm_rnd = _seeded_random(farm["id"])
            hive_count = farm_rnd.randint(120, 480)
            existing_count = db.query(HiveInfo).filter(HiveInfo.farm_id == farm["id"]).count()
            if existing_count == 0:
                for i in range(1, hive_count + 1):
                    hive_id = f"{farm['id']}_hive_{i:04d}"
                    hive = HiveInfo(
                        id=hive_id,
                        farm_id=farm["id"],
                        hive_number=f"{farm['id'].split('_')[1].upper()}-{i:04d}",
                        location=f"区域{chr(65 + (i // 50) % 26)}-{(i % 50) + 1}"
                    )
                    db.add(hive)
        db.commit()
        logger.info("Hive infos initialized.")
    except Exception as e:
        logger.error(f"Failed to init hive infos: {e}")
        db.rollback()
    finally:
        db.close()


HONEY_TYPES_MAP = {
    "farm_001": [("洋槐蜜", "特级"), ("百花蜜", "一级")],
    "farm_002": [("椴树蜜", "特级"), ("百花蜜", "二级")],
    "farm_003": ("油菜花蜜", "一级"),
    "farm_004": [("百花蜜", "特级"), ("洋槐蜜", "二级")],
    "farm_005": [("枣花蜜", "一级"), ("百花蜜", "二级")],
    "farm_006": [("荔枝蜜", "特级"), ("荔枝蜜", "一级")],
}

QUALITY_TEMPLATES = {
    "特级": {
        "score_range": (92, 99),
        "report": "本品经严格质量检测，各项指标均达到国家标准特级要求。水分含量≤18%，还原糖≥65%，淀粉酶活性≥8mL/(g·h)，无抗生素残留，无农药检出。色泽纯正，香气浓郁，口感细腻。",
    },
    "一级": {
        "score_range": (82, 91),
        "report": "本品质量检测合格，各项指标达到国家标准一级要求。水分含量≤20%，还原糖≥60%，淀粉酶活性≥4mL/(g·h)，无抗生素残留，无农药检出。品质优良，风味纯正。",
    },
    "二级": {
        "score_range": (70, 81),
        "report": "本品质量检测合格，各项指标达到国家标准二级要求。水分含量≤22%，还原糖≥55%，淀粉酶活性≥2mL/(g·h)，无抗生素残留，无农药检出。符合食用标准。",
    },
}

EVENT_TEMPLATES = [
    {
        "event_type": "inspection",
        "title": "蜂群巡检",
        "icon": "clipboard-check",
        "desc_templates": [
            "对{farm}区域{area}的{count}个蜂箱完成例行巡检，蜂群状态良好，蜂王产卵正常。",
            "巡检{farm}蜂场{area}区域，蜂群活跃度{level}，巢脾整洁度达标，未发现异常。",
        ],
    },
    {
        "event_type": "harvest",
        "title": "采蜜作业",
        "icon": "droplets",
        "desc_templates": [
            "在{farm}完成{honey_type}采蜜作业，本次采收{weight}kg，蜜脾封盖率{rate}%。",
            "采蜜团队于{farm}执行{honey_type}采收，使用摇蜜机分离，蜂蜜经初滤后入罐暂存。",
        ],
    },
    {
        "event_type": "testing",
        "title": "质量检测",
        "icon": "flask-conical",
        "desc_templates": [
            "批次{batch_no}送检完成，检测项目：水分、还原糖、淀粉酶值、羟甲基糠醛、抗生素、农药残留。检测结果：{grade}级合格。",
            "实验室对批次{batch_no}进行全项检测，波美度{baume}°Bé，各项指标符合{grade}级标准。",
        ],
    },
    {
        "event_type": "bottling",
        "title": "灌装封口",
        "icon": "package",
        "desc_templates": [
            "批次{batch_no}在洁净车间完成灌装，灌装规格{spec}，封口检测合格率{pass_rate}%。",
            "批次{batch_no}灌装完成，全程10万级净化车间作业，每瓶均经金属检测与封口检验。",
        ],
    },
    {
        "event_type": "dispatch",
        "title": "出库发货",
        "icon": "truck",
        "desc_templates": [
            "批次{batch_no}已通过最终检验，从仓库发出，冷链运输至{destination}。",
            "批次{batch_no}完成出库，物流单号{tracking}，预计{days}日送达。",
        ],
    },
]


def _init_honey_batches():
    db = SessionLocal()
    try:
        existing_count = db.query(HoneyBatch).count()
        if existing_count > 0:
            return

        now = datetime.now()
        batch_idx = 1
        for farm in BEE_FARMS:
            farm_id = farm["id"]
            types_list = HONEY_TYPES_MAP.get(farm_id, [("百花蜜", "一级")])
            if isinstance(types_list, tuple):
                types_list = [types_list]

            for honey_type, grade in types_list:
                for offset_days in range(0, 90, 30):
                    harvest_date = now - timedelta(days=offset_days + _seeded_random(f"{farm_id}_{honey_type}_{offset_days}").randint(1, 28))
                    rnd = _seeded_random(f"{farm_id}_{honey_type}_{offset_days}")
                    net_weight = round(rnd.uniform(25, 250), 1)
                    batch_no = f"B{harvest_date.strftime('%Y%m%d')}{batch_idx:03d}"
                    batch_idx += 1

                    qt = QUALITY_TEMPLATES.get(grade, QUALITY_TEMPLATES["二级"])
                    quality_score = round(rnd.uniform(*qt["score_range"]), 1)
                    quality_report = qt["report"]

                    statuses = ["生产中", "已检测", "已灌装", "已出库"]
                    status_idx = min(3, offset_days // 20)
                    status = statuses[status_idx]

                    batch = HoneyBatch(
                        batch_no=batch_no,
                        farm_id=farm_id,
                        harvest_date=harvest_date,
                        net_weight=net_weight,
                        honey_type=honey_type,
                        grade=grade,
                        status=status,
                        apiary_name=farm["name"],
                        apiary_location=farm["location"],
                        apiary_lat=farm["lat"],
                        apiary_lng=farm["lng"],
                        quality_score=quality_score,
                        quality_report=quality_report,
                    )
                    db.add(batch)
                    db.flush()

                    event_date = harvest_date
                    for evt_tpl in EVENT_TEMPLATES:
                        event_rnd = _seeded_random(f"evt_{batch_no}_{evt_tpl['event_type']}")
                        event_date = event_date + timedelta(hours=event_rnd.randint(12, 72))
                        if event_date > now and evt_tpl["event_type"] == "dispatch":
                            break

                        tpl = event_rnd.choice(evt_tpl["desc_templates"])
                        operator_rnd = _seeded_random(f"op_{farm_id}")
                        keepers = [k for k in BEEKEEPERS if k["farm_id"] == farm_id]
                        operator = keepers[event_rnd.randint(0, len(keepers) - 1)]["name"] if keepers else "系统"

                        desc = tpl.format(
                            farm=farm["name"],
                            area=f"区域{chr(65 + event_rnd.randint(0, 5))}",
                            count=event_rnd.randint(30, 80),
                            level=event_rnd.choice(["良好", "正常", "偏弱"]),
                            honey_type=honey_type,
                            weight=round(event_rnd.uniform(50, 200), 1),
                            rate=event_rnd.randint(85, 99),
                            batch_no=batch_no,
                            grade=grade,
                            baume=event_rnd.randint(41, 43),
                            spec=event_rnd.choice(["500g/瓶", "250g/瓶", "1kg/罐"]),
                            pass_rate=event_rnd.randint(98, 100),
                            destination=event_rnd.choice(["华东配送中心", "北京仓库", "上海分仓", "广州仓库"]),
                            tracking=f"SF{event_rnd.randint(1000000000, 9999999999)}",
                            days=event_rnd.randint(2, 5),
                        )

                        details = None
                        if evt_tpl["event_type"] == "testing":
                            details = json.dumps({
                                "moisture": f"{round(event_rnd.uniform(15, 20), 1)}%",
                                "reducing_sugar": f"{round(event_rnd.uniform(60, 72), 1)}%",
                                "diastase": f"{round(event_rnd.uniform(4, 15), 1)} mL/(g·h)",
                                "hmf": f"{round(event_rnd.uniform(2, 15), 1)} mg/kg",
                            }, ensure_ascii=False)
                        elif evt_tpl["event_type"] == "harvest":
                            details = json.dumps({
                                "hive_count": event_rnd.randint(40, 120),
                                "method": "摇蜜机分离",
                                "filter": "80目初滤",
                            }, ensure_ascii=False)

                        event = BatchEvent(
                            batch_no=batch_no,
                            event_type=evt_tpl["event_type"],
                            event_time=event_date,
                            title=evt_tpl["title"],
                            description=desc,
                            operator=operator,
                            location=farm["location"],
                            icon=evt_tpl["icon"],
                            details=details,
                        )
                        db.add(event)

        db.commit()
        logger.info("Honey batches and events initialized.")
    except Exception as e:
        logger.error(f"Failed to init honey batches: {e}")
        db.rollback()
    finally:
        db.close()


app = FastAPI(title="FastAPI Prometheus Demo - 蜂场监控大屏")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


instrumentator = Instrumentator(
    should_group_status_codes=False,
    should_ignore_untemplated=True,
    should_respect_env_var=True,
    excluded_handlers=[".*admin.*", "/metrics"],
    env_var_name="ENABLE_METRICS",
)
instrumentator.instrument(app).expose(app)

app.include_router(trace_router)

BEE_FARMS = [
    {"id": "farm_001", "name": "秦岭一号蜂场", "location": "陕西宝鸡太白县", "lat": 34.05, "lng": 107.32, "region": "西北"},
    {"id": "farm_002", "name": "长白山蜜源基地", "location": "吉林延边安图县", "lat": 42.58, "lng": 128.16, "region": "东北"},
    {"id": "farm_003", "name": "云贵高原蜂场", "location": "云南曲靖罗平县", "lat": 24.88, "lng": 104.31, "region": "西南"},
    {"id": "farm_004", "name": "江南水乡蜂场", "location": "浙江湖州德清县", "lat": 30.54, "lng": 120.08, "region": "华东"},
    {"id": "farm_005", "name": "黄土高原蜂场", "location": "山西忻州静乐县", "lat": 38.34, "lng": 111.92, "region": "华北"},
    {"id": "farm_006", "name": "闽南荔枝蜜场", "location": "福建漳州诏安县", "lat": 23.71, "lng": 117.17, "region": "华南"},
]

ALERT_TYPES = [
    {"code": "TEMP_HIGH", "name": "蜂箱温度过高", "level": "critical", "icon": "thermometer"},
    {"code": "TEMP_LOW", "name": "蜂箱温度过低", "level": "warning", "icon": "thermometer"},
    {"code": "HUMID_HIGH", "name": "箱内湿度过高", "level": "warning", "icon": "droplets"},
    {"code": "WEIGHT_DROP", "name": "蜂箱重量骤降", "level": "critical", "icon": "scale"},
    {"code": "BEE_COUNT_LOW", "name": "蜂群数量下降", "level": "warning", "icon": "bug"},
    {"code": "QUEEN_LOST", "name": "疑似失王", "level": "critical", "icon": "crown"},
    {"code": "MITE_ALERT", "name": "蜂螨检测超标", "level": "warning", "icon": "bug-off"},
    {"code": "INSPECTION_DUE", "name": "巡检超时未完成", "level": "info", "icon": "clipboard-list"},
]

BEEKEEPERS = [
    {"id": "bk_001", "name": "张建国", "farm_id": "farm_001", "status": "on_duty"},
    {"id": "bk_002", "name": "李秀梅", "farm_id": "farm_001", "status": "on_duty"},
    {"id": "bk_003", "name": "王德才", "farm_id": "farm_002", "status": "on_duty"},
    {"id": "bk_004", "name": "赵春燕", "farm_id": "farm_002", "status": "off_duty"},
    {"id": "bk_005", "name": "刘志强", "farm_id": "farm_003", "status": "on_duty"},
    {"id": "bk_006", "name": "陈美华", "farm_id": "farm_003", "status": "on_duty"},
    {"id": "bk_007", "name": "杨明远", "farm_id": "farm_003", "status": "on_duty"},
    {"id": "bk_008", "name": "周文斌", "farm_id": "farm_004", "status": "on_duty"},
    {"id": "bk_009", "name": "吴桂芳", "farm_id": "farm_004", "status": "on_duty"},
    {"id": "bk_010", "name": "郑海涛", "farm_id": "farm_005", "status": "on_duty"},
    {"id": "bk_011", "name": "孙丽娟", "farm_id": "farm_005", "status": "off_duty"},
    {"id": "bk_012", "name": "何金生", "farm_id": "farm_006", "status": "on_duty"},
    {"id": "bk_013", "name": "林秀英", "farm_id": "farm_006", "status": "on_duty"},
    {"id": "bk_014", "name": "黄卫东", "farm_id": "farm_006", "status": "on_duty"},
]


def _get_farm(farm_id: Optional[str]) -> List[Dict[str, Any]]:
    if farm_id:
        return [f for f in BEE_FARMS if f["id"] == farm_id]
    return BEE_FARMS.copy()


def _seeded_random(seed_str: str) -> random.Random:
    return random.Random(hash(seed_str) & 0xffffffff)


def generate_farm_colony_distribution(farm_id: Optional[str] = None) -> Dict[str, Any]:
    now = datetime.now()
    date_key = now.strftime("%Y%m%d")
    cache_key = f"geo_colony_{farm_id or 'all'}_{date_key}"

    cached = get_cache(cache_key)
    if cached:
        return cached

    farms = _get_farm(farm_id)
    result_farms = []
    total_hives = 0
    total_strength = 0.0
    region_summary: Dict[str, Dict[str, Any]] = defaultdict(lambda: {"farms": 0, "hives": 0, "avg_strength": 0.0})

    for farm in farms:
        rnd = _seeded_random(f"{farm['id']}_{date_key}")
        hive_count = rnd.randint(120, 480)
        avg_strength = round(rnd.uniform(0.72, 0.98), 3)
        strength_level = "strong" if avg_strength >= 0.85 else ("medium" if avg_strength >= 0.75 else "weak")

        hive_distribution = {
            "strong": round(hive_count * rnd.uniform(0.38, 0.52)),
            "medium": round(hive_count * rnd.uniform(0.32, 0.42)),
            "weak": 0,
        }
        hive_distribution["weak"] = hive_count - hive_distribution["strong"] - hive_distribution["medium"]

        total_hives += hive_count
        total_strength += avg_strength

        region_summary[farm["region"]]["farms"] += 1
        region_summary[farm["region"]]["hives"] += hive_count

        result_farms.append({
            **farm,
            "hive_count": hive_count,
            "avg_strength": avg_strength,
            "strength_level": strength_level,
            "hive_distribution": hive_distribution,
        })

    for r in region_summary:
        region_summary[r]["avg_strength"] = round(
            sum(f["avg_strength"] for f in result_farms if f["region"] == r) / region_summary[r]["farms"], 3
        )

    result = {
        "timestamp": now.isoformat(),
        "farm_count": len(farms),
        "total_hives": total_hives,
        "avg_strength": round(total_strength / len(farms), 3) if farms else 0,
        "farms": result_farms,
        "region_summary": dict(region_summary),
    }

    set_cache(cache_key, result)
    return result


def generate_honey_progress(farm_id: Optional[str] = None) -> Dict[str, Any]:
    now = datetime.now()
    date_key = now.strftime("%Y%m%d")
    hour_key = now.strftime("%H")
    cache_key = f"honey_{farm_id or 'all'}_{date_key}_{hour_key}"

    cached = get_cache(cache_key)
    if cached:
        return cached

    farms = _get_farm(farm_id)
    hour_of_day = now.hour + now.minute / 60
    daily_progress = max(0.05, min(0.98, (hour_of_day - 6) / 14)) if 6 <= hour_of_day <= 20 else (
        0.05 if hour_of_day < 6 else 0.98
    )

    total_today_target = 0
    total_today_harvested = 0
    total_cumulative = 0
    farm_details = []

    for farm in farms:
        rnd = _seeded_random(f"{farm['id']}_{date_key}")
        today_target = round(rnd.uniform(280, 720), 1)
        today_harvested = round(today_target * daily_progress * rnd.uniform(0.88, 1.06), 1)
        cumulative = round(rnd.uniform(42000, 98000) + today_harvested, 1)

        hourly_data = []
        cum = 0
        for h in range(6, 21):
            hr = rnd.uniform(0.04, 0.10)
            amt = round(today_target * hr, 1)
            cum += amt
            hourly_data.append({
                "hour": f"{h:02d}:00",
                "amount": amt,
                "cumulative": round(cum, 1),
            })
        if hourly_data:
            hourly_data[-1]["cumulative"] = today_harvested

        total_today_target += today_target
        total_today_harvested += today_harvested
        total_cumulative += cumulative

        farm_details.append({
            "farm_id": farm["id"],
            "farm_name": farm["name"],
            "today_target": today_target,
            "today_harvested": today_harvested,
            "completion_rate": round(today_harvested / today_target, 3),
            "cumulative": cumulative,
            "hourly_data": hourly_data,
        })

    result = {
        "timestamp": now.isoformat(),
        "today_date": now.strftime("%Y-%m-%d"),
        "daily_progress": round(daily_progress, 3),
        "today_target": round(total_today_target, 1),
        "today_harvested": round(total_today_harvested, 1),
        "completion_rate": round(total_today_harvested / total_today_target, 3) if total_today_target else 0,
        "cumulative_total": round(total_cumulative, 1),
        "unit": "kg",
        "farm_details": farm_details,
    }

    set_cache(cache_key, result)
    return result


def generate_alerts(farm_id: Optional[str] = None) -> Dict[str, Any]:
    now = datetime.now()
    minute_key = now.strftime("%Y%m%d%H%M")
    cache_key = f"alerts_{farm_id or 'all'}_{minute_key}"

    cached = get_cache(cache_key)
    if cached:
        return cached

    farms = _get_farm(farm_id)
    rnd = _seeded_random(f"alerts_{now.strftime('%Y%m%d%H')}")

    top_alerts = []
    for farm in farms:
        farm_rnd = _seeded_random(f"{farm['id']}_{now.strftime('%Y%m%d')}")
        alert_count = farm_rnd.randint(2, 7)
        farm_alerts = farm_rnd.sample(ALERT_TYPES, k=min(alert_count, len(ALERT_TYPES)))
        for at in farm_alerts:
            count = farm_rnd.randint(1, 18)
            top_alerts.append({
                "farm_id": farm["id"],
                "farm_name": farm["name"],
                "region": farm["region"],
                "alert_code": at["code"],
                "alert_name": at["name"],
                "level": at["level"],
                "count": count,
                "first_seen": (now - timedelta(hours=farm_rnd.randint(1, 22), minutes=farm_rnd.randint(0, 59))).isoformat(),
            })

    level_order = {"critical": 0, "warning": 1, "info": 2}
    top_alerts.sort(key=lambda x: (level_order[x["level"]], -x["count"]))
    top_alerts = top_alerts[:5]

    timeline_start = now - timedelta(hours=24)
    timeline = []
    for i in range(24 * 12):
        slot_time = timeline_start + timedelta(minutes=5 * i)
        slot_rnd = _seeded_random(f"timeline_{slot_time.strftime('%Y%m%d%H%M')}_{farm_id or 'all'}")
        critical = 1 if slot_rnd.random() < 0.04 else 0
        warning = slot_rnd.randint(0, 2) if slot_rnd.random() < 0.25 else 0
        info = slot_rnd.randint(0, 1) if slot_rnd.random() < 0.18 else 0
        total = critical + warning + info
        if total > 0 or slot_rnd.random() < 0.08:
            timeline.append({
                "time": slot_time.isoformat(),
                "critical": critical,
                "warning": warning,
                "info": info,
                "total": total,
            })

    level_counts = {"critical": 0, "warning": 0, "info": 0}
    for t in timeline:
        level_counts["critical"] += t["critical"]
        level_counts["warning"] += t["warning"]
        level_counts["info"] += t["info"]
    for a in top_alerts:
        level_counts[a["level"]] += a["count"]

    result = {
        "timestamp": now.isoformat(),
        "top_alerts": top_alerts,
        "timeline": timeline,
        "timeline_window": "24h",
        "level_counts": level_counts,
        "total_alerts_24h": sum(level_counts.values()),
    }

    set_cache(cache_key, result)
    return result


def generate_overview_stats(farm_id: Optional[str] = None) -> Dict[str, Any]:
    now = datetime.now()
    date_key = now.strftime("%Y%m%d")
    hour_key = now.strftime("%H")
    cache_key = f"overview_{farm_id or 'all'}_{date_key}_{hour_key}"

    cached = get_cache(cache_key)
    if cached:
        return cached

    farms = _get_farm(farm_id)
    geo_data = generate_farm_colony_distribution(farm_id)

    total_hives = geo_data["total_hives"]
    active_hives = round(total_hives * random.uniform(0.92, 0.97))
    idle_hives = total_hives - active_hives

    assigned_keepers = [k for k in BEEKEEPERS if not farm_id or k["farm_id"] == farm_id]
    on_duty_keepers = [k for k in assigned_keepers if k["status"] == "on_duty"]

    today_pending = round(total_hives * random.uniform(0.08, 0.18))
    today_completed = round(today_pending * random.uniform(0.35, 0.72))
    today_remaining = today_pending - today_completed

    farm_stats = []
    for farm in farms:
        farm_geo = next(f for f in geo_data["farms"] if f["id"] == farm["id"])
        farm_hives = farm_geo["hive_count"]
        farm_active = round(farm_hives * random.uniform(0.90, 0.98))
        farm_keepers = [k for k in assigned_keepers if k["farm_id"] == farm["id"]]
        farm_keepers_on = [k for k in farm_keepers if k["status"] == "on_duty"]
        farm_pending = round(farm_hives * random.uniform(0.07, 0.19))
        farm_done = round(farm_pending * random.uniform(0.30, 0.75))
        farm_stats.append({
            "farm_id": farm["id"],
            "farm_name": farm["name"],
            "region": farm["region"],
            "total_hives": farm_hives,
            "active_hives": farm_active,
            "beekeepers_total": len(farm_keepers),
            "beekeepers_on_duty": len(farm_keepers_on),
            "inspection_pending": farm_pending,
            "inspection_completed": farm_done,
            "inspection_remaining": farm_pending - farm_done,
        })

    result = {
        "timestamp": now.isoformat(),
        "farm_count": len(farms),
        "hives": {
            "total": total_hives,
            "active": active_hives,
            "idle": idle_hives,
            "active_rate": round(active_hives / total_hives, 3) if total_hives else 0,
        },
        "beekeepers": {
            "total": len(assigned_keepers),
            "on_duty": len(on_duty_keepers),
            "off_duty": len(assigned_keepers) - len(on_duty_keepers),
            "attendance_rate": round(len(on_duty_keepers) / len(assigned_keepers), 3) if assigned_keepers else 0,
        },
        "inspection": {
            "today_pending": today_pending,
            "today_completed": today_completed,
            "today_remaining": today_remaining,
            "completion_rate": round(today_completed / today_pending, 3) if today_pending else 0,
        },
        "farm_stats": farm_stats,
    }

    set_cache(cache_key, result)
    return result


@app.on_event("startup")
async def startup_event():
    init_db()
    logger.info("Application started.")


@app.get("/")
async def root():
    return {"message": "Welcome to FastAPI Prometheus Demo API - 蜂场监控大屏系统"}


@app.get("/api/success")
async def success_endpoint():
    logger.info("Success endpoint called")
    return {"status": "success", "data": "Hello World"}


@app.get("/api/slow")
async def slow_endpoint():
    delay = random.uniform(0.5, 2.0)
    logger.info(f"Slow endpoint called, sleeping for {delay:.2f}s")
    await asyncio.sleep(delay)
    return {"status": "success", "delay": delay}


@app.get("/api/error")
async def error_endpoint():
    logger.error("Error endpoint called - simulating 500 failure")
    raise HTTPException(status_code=500, detail="Simulated Internal Server Error")


@app.get("/api/items")
async def read_items(db: Session = Depends(get_db)):
    items = db.query(Item).all()
    return items


@app.post("/api/items")
async def create_item(name: str, description: str, db: Session = Depends(get_db)):
    db_item = Item(name=name, description=description)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    logger.info(f"Created item: {db_item.name}")
    return db_item


@app.get("/api/dashboard/geo-colony")
async def dashboard_geo_colony(farm_id: Optional[str] = Query(None, description="单蜂场ID，为空则全部蜂场")):
    return generate_farm_colony_distribution(farm_id)


@app.get("/api/dashboard/honey-progress")
async def dashboard_honey_progress(farm_id: Optional[str] = Query(None, description="单蜂场ID，为空则全部蜂场")):
    return generate_honey_progress(farm_id)


@app.get("/api/dashboard/alerts")
async def dashboard_alerts(farm_id: Optional[str] = Query(None, description="单蜂场ID，为空则全部蜂场")):
    return generate_alerts(farm_id)


@app.get("/api/dashboard/overview-stats")
async def dashboard_overview_stats(farm_id: Optional[str] = Query(None, description="单蜂场ID，为空则全部蜂场")):
    return generate_overview_stats(farm_id)


@app.get("/api/dashboard/all")
async def dashboard_all(farm_id: Optional[str] = Query(None, description="单蜂场ID，为空则全部蜂场")):
    return {
        "timestamp": datetime.now().isoformat(),
        "geo_colony": generate_farm_colony_distribution(farm_id),
        "honey_progress": generate_honey_progress(farm_id),
        "alerts": generate_alerts(farm_id),
        "overview_stats": generate_overview_stats(farm_id),
        "cache_ttl_seconds": CACHE_TTL,
    }


@app.get("/api/dashboard/farms")
async def dashboard_farms_list():
    return {
        "timestamp": datetime.now().isoformat(),
        "farms": BEE_FARMS,
        "default_rotation_interval": 30,
    }


@app.api_route("/api/prometheus/{path:path}", methods=["GET", "POST"])
async def prometheus_proxy(
    request: Request,
    path: str,
):
    url = f"{PROMETHEUS_URL}/{path}"
    params = dict(request.query_params)
    method = request.method

    logger.info(f"Proxying Prometheus request: {method} {url}")

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            if method == "GET":
                resp = await client.get(url, params=params)
            else:
                body = await request.body()
                resp = await client.post(url, params=params, content=body, headers={"Content-Type": request.headers.get("Content-Type", "application/x-www-form-urlencoded")})

            return {
                "status_code": resp.status_code,
                "data": resp.json() if resp.headers.get("content-type", "").startswith("application/json") else resp.text,
            }
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail=f"无法连接到 Prometheus 服务 ({PROMETHEUS_URL})")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prometheus 代理错误: {str(e)}")


def _update_stock_and_alert(db: Session, feed_type: str, change_amount: float, 
                            transaction_type: str, related_record_id: int = None, notes: str = None):
    stock = db.query(MaterialStock).filter(MaterialStock.feed_type == feed_type).first()
    if not stock:
        raise HTTPException(status_code=404, detail=f"物资 {feed_type} 不存在")
    
    old_below = stock.is_below_safety()
    stock.current_stock += change_amount
    if stock.current_stock < 0:
        raise HTTPException(status_code=400, detail=f"物资 {FEED_TYPES[feed_type]['name']} 库存不足")
    
    transaction = StockTransaction(
        feed_type=feed_type,
        change_amount=change_amount,
        transaction_type=transaction_type,
        related_record_id=related_record_id,
        notes=notes
    )
    db.add(transaction)
    
    if not old_below and stock.is_below_safety():
        message = InAppMessage(
            recipient="farm_owner",
            title=f"⚠️ 物资库存预警: {FEED_TYPES[feed_type]['name']}",
            content=f"{FEED_TYPES[feed_type]['name']} 当前库存为 {stock.current_stock:.1f} {stock.unit}，已低于安全库存 {stock.safety_stock} {stock.unit}，请及时补货！",
            message_type="stock_alert"
        )
        db.add(message)
        logger.warning(f"Stock alert triggered for {feed_type}: {stock.current_stock} < {stock.safety_stock}")
    
    return stock


@app.get("/api/feeding/records", summary="分页查询饲喂记录")
async def get_feeding_records(
    farm_id: Optional[str] = Query(None, description="蜂场ID"),
    feed_type: Optional[str] = Query(None, description="饲喂物类型"),
    start_time: Optional[datetime] = Query(None, description="开始时间"),
    end_time: Optional[datetime] = Query(None, description="结束时间"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页条数"),
    db: Session = Depends(get_db)
):
    query = db.query(FeedingRecord)
    
    if farm_id:
        query = query.filter(FeedingRecord.farm_id == farm_id)
    if feed_type:
        query = query.filter(FeedingRecord.feed_type == feed_type)
    if start_time:
        query = query.filter(FeedingRecord.feeding_time >= start_time)
    if end_time:
        query = query.filter(FeedingRecord.feeding_time <= end_time)
    
    total = query.count()
    records = query.order_by(FeedingRecord.feeding_time.desc()) \
        .offset((page - 1) * page_size) \
        .limit(page_size) \
        .all()
    
    result = []
    for r in records:
        farm = next((f for f in BEE_FARMS if f["id"] == r.farm_id), None)
        feed_info = FEED_TYPES.get(r.feed_type, {})
        result.append({
            "id": r.id,
            "farm_id": r.farm_id,
            "farm_name": farm["name"] if farm else r.farm_id,
            "hive_id": r.hive_id,
            "feed_type": r.feed_type,
            "feed_name": feed_info.get("name", r.feed_type),
            "ratio": r.ratio,
            "amount": r.amount,
            "unit": feed_info.get("unit", ""),
            "feeder": r.feeder,
            "feeding_time": r.feeding_time.isoformat(),
            "colony_status": r.colony_status,
            "notes": r.notes,
            "period": r.period,
            "created_at": r.created_at.isoformat()
        })
    
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
        "records": result
    }


@app.post("/api/feeding/records", summary="批量创建饲喂记录")
async def create_feeding_records(
    data: FeedingRecordCreate,
    db: Session = Depends(get_db)
):
    if data.feed_type not in FEED_TYPES:
        raise HTTPException(status_code=400, detail=f"无效的饲喂物类型: {data.feed_type}")
    
    farm = next((f for f in BEE_FARMS if f["id"] == data.farm_id), None)
    if not farm:
        raise HTTPException(status_code=404, detail=f"蜂场不存在: {data.farm_id}")
    
    total_amount = data.amount_per_hive * len(data.hive_ids)
    
    _update_stock_and_alert(
        db, data.feed_type, -total_amount, 
        "feeding_consume", notes=f"饲喂消耗: {len(data.hive_ids)} 个蜂箱"
    )
    
    created_ids = []
    for hive_id in data.hive_ids:
        record = FeedingRecord(
            farm_id=data.farm_id,
            hive_id=hive_id,
            feed_type=data.feed_type,
            ratio=data.ratio,
            amount=data.amount_per_hive,
            feeder=data.feeder,
            feeding_time=data.feeding_time,
            colony_status=data.colony_status,
            notes=data.notes,
            period=data.period
        )
        db.add(record)
        db.flush()
        created_ids.append(record.id)
    
    db.commit()
    
    logger.info(f"Created {len(created_ids)} feeding records for farm {data.farm_id}")
    
    return {
        "status": "success",
        "created_count": len(created_ids),
        "record_ids": created_ids,
        "total_consumed": total_amount,
        "unit": FEED_TYPES[data.feed_type]["unit"]
    }


@app.get("/api/feeding/hives", summary="获取蜂箱列表")
async def get_hives(
    farm_id: Optional[str] = Query(None, description="蜂场ID"),
    db: Session = Depends(get_db)
):
    query = db.query(HiveInfo)
    if farm_id:
        query = query.filter(HiveInfo.farm_id == farm_id)
    
    hives = query.all()
    result = []
    for h in hives:
        farm = next((f for f in BEE_FARMS if f["id"] == h.farm_id), None)
        result.append({
            "id": h.id,
            "farm_id": h.farm_id,
            "farm_name": farm["name"] if farm else h.farm_id,
            "hive_number": h.hive_number,
            "location": h.location
        })
    
    return {"hives": result, "total": len(result)}


@app.get("/api/stocks", summary="获取物资库存列表")
async def get_material_stocks(db: Session = Depends(get_db)):
    now = datetime.now()
    month_start = datetime(now.year, now.month, 1)
    
    stocks = db.query(MaterialStock).all()
    result = []
    
    for s in stocks:
        feed_info = FEED_TYPES.get(s.feed_type, {})
        monthly_used = db.query(StockTransaction) \
            .filter(
                StockTransaction.feed_type == s.feed_type,
                StockTransaction.transaction_type == "feeding_consume",
                StockTransaction.created_at >= month_start
            ) \
            .all()
        
        monthly_usage = abs(sum(t.change_amount for t in monthly_used))
        
        result.append({
            "feed_type": s.feed_type,
            "feed_name": feed_info.get("name", s.feed_type),
            "current_stock": s.current_stock,
            "safety_stock": s.safety_stock,
            "unit": feed_info.get("unit", s.unit),
            "monthly_usage": round(monthly_usage, 1),
            "is_below_safety": s.is_below_safety(),
            "last_updated": s.last_updated.isoformat()
        })
    
    return {"stocks": result}


@app.post("/api/stocks/inbound", summary="物资入库")
async def stock_inbound(data: StockInbound, db: Session = Depends(get_db)):
    if data.feed_type not in FEED_TYPES:
        raise HTTPException(status_code=400, detail=f"无效的物资类型: {data.feed_type}")
    
    stock = _update_stock_and_alert(
        db, data.feed_type, data.amount,
        "inbound", notes=data.notes or "人工入库"
    )
    db.commit()
    
    feed_info = FEED_TYPES[data.feed_type]
    return {
        "status": "success",
        "feed_type": data.feed_type,
        "feed_name": feed_info["name"],
        "added_amount": data.amount,
        "unit": feed_info["unit"],
        "current_stock": stock.current_stock,
        "is_below_safety": stock.is_below_safety()
    }


@app.get("/api/stocks/transactions", summary="获取库存变动记录")
async def get_stock_transactions(
    feed_type: Optional[str] = Query(None),
    transaction_type: Optional[str] = Query(None),
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db)
):
    query = db.query(StockTransaction)
    if feed_type:
        query = query.filter(StockTransaction.feed_type == feed_type)
    if transaction_type:
        query = query.filter(StockTransaction.transaction_type == transaction_type)
    
    start_date = datetime.now() - timedelta(days=days)
    query = query.filter(StockTransaction.created_at >= start_date)
    
    transactions = query.order_by(StockTransaction.created_at.desc()).all()
    result = []
    
    for t in transactions:
        feed_info = FEED_TYPES.get(t.feed_type, {})
        result.append({
            "id": t.id,
            "feed_type": t.feed_type,
            "feed_name": feed_info.get("name", t.feed_type),
            "change_amount": t.change_amount,
            "unit": feed_info.get("unit", ""),
            "transaction_type": t.transaction_type,
            "notes": t.notes,
            "created_at": t.created_at.isoformat()
        })
    
    return {"transactions": result, "total": len(result)}


@app.get("/api/messages", summary="获取站内消息")
async def get_in_app_messages(
    unread_only: bool = Query(False),
    message_type: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(InAppMessage).filter(InAppMessage.recipient == "farm_owner")
    if unread_only:
        query = query.filter(InAppMessage.is_read == False)
    if message_type:
        query = query.filter(InAppMessage.message_type == message_type)
    
    messages = query.order_by(InAppMessage.created_at.desc()).limit(50).all()
    unread_count = db.query(InAppMessage).filter(
        InAppMessage.recipient == "farm_owner",
        InAppMessage.is_read == False
    ).count()
    
    return {
        "unread_count": unread_count,
        "messages": [{
            "id": m.id,
            "title": m.title,
            "content": m.content,
            "message_type": m.message_type,
            "is_read": m.is_read,
            "created_at": m.created_at.isoformat()
        } for m in messages]
    }


@app.put("/api/messages/{message_id}/read", summary="标记消息已读")
async def mark_message_read(message_id: int, db: Session = Depends(get_db)):
    message = db.query(InAppMessage).filter(InAppMessage.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="消息不存在")
    message.is_read = True
    db.commit()
    return {"status": "success"}


@app.post("/api/feeding/ratio-recommendation", summary="配比推荐")
async def get_ratio_recommendation(data: RatioRecommendationRequest):
    if data.solar_term not in SEASONS:
        raise HTTPException(status_code=400, detail=f"无效的节气: {data.solar_term}")
    if data.colony_strength not in BEE_STRENGTHS:
        raise HTTPException(status_code=400, detail=f"无效的群势等级: {data.colony_strength}")
    
    period = data.period or _get_period_by_date(datetime.now())
    
    ratio_rules = {
        "spring_breeding": {
            "weak": {
                "low_temp": "1:1.5",
                "medium_temp": "1:1",
                "high_temp": "1:0.8"
            },
            "medium": {
                "low_temp": "1:1.2",
                "medium_temp": "1:0.9",
                "high_temp": "1:0.7"
            },
            "strong": {
                "low_temp": "1:1",
                "medium_temp": "1:0.8",
                "high_temp": "1:0.6"
            }
        },
        "autumn_breeding": {
            "weak": {
                "low_temp": "1:1.2",
                "medium_temp": "1:1",
                "high_temp": "1:0.9"
            },
            "medium": {
                "low_temp": "1:1",
                "medium_temp": "1:0.8",
                "high_temp": "1:0.7"
            },
            "strong": {
                "low_temp": "1:0.9",
                "medium_temp": "1:0.7",
                "high_temp": "1:0.6"
            }
        },
        "wintering": {
            "weak": {
                "low_temp": "1:1",
                "medium_temp": "1:0.9",
                "high_temp": "1:0.8"
            },
            "medium": {
                "low_temp": "1:0.9",
                "medium_temp": "1:0.8",
                "high_temp": "1:0.7"
            },
            "strong": {
                "low_temp": "1:0.8",
                "medium_temp": "1:0.7",
                "high_temp": "1:0.6"
            }
        },
        "normal": {
            "weak": {
                "low_temp": "1:1.2",
                "medium_temp": "1:1",
                "high_temp": "1:0.9"
            },
            "medium": {
                "low_temp": "1:1",
                "medium_temp": "1:0.8",
                "high_temp": "1:0.7"
            },
            "strong": {
                "low_temp": "1:0.9",
                "medium_temp": "1:0.7",
                "high_temp": "1:0.6"
            }
        }
    }
    
    if data.temperature < 15:
        temp_level = "low_temp"
    elif data.temperature < 25:
        temp_level = "medium_temp"
    else:
        temp_level = "high_temp"
    
    recommended_ratio = ratio_rules.get(period, ratio_rules["normal"]) \
        .get(data.colony_strength, "medium") \
        .get(temp_level, "1:1")
    
    period_names = {
        "spring_breeding": "春繁期",
        "autumn_breeding": "秋繁期",
        "wintering": "越冬期",
        "normal": "常规期"
    }
    
    strength_names = {
        "weak": "弱群",
        "medium": "中等群",
        "strong": "强群"
    }
    
    temp_ranges = {
        "low_temp": "低温 (<15°C)",
        "medium_temp": "中温 (15-25°C)",
        "high_temp": "高温 (>25°C)"
    }
    
    explanation = f"""
当前时期: {period_names.get(period, '常规期')}
目标群势: {strength_names.get(data.colony_strength, '中等群')}
环境温度: {data.temperature}°C ({temp_ranges[temp_level]})
节气: {data.solar_term}

推荐糖水比例: 白糖:水 = {recommended_ratio}

饲喂建议:
- 春繁期: 适当提高糖水浓度，补充蛋白质饲料（花粉饼）
- 秋繁期: 保证饲料充足，促进培育适龄越冬蜂
- 越冬期: 使用高浓度糖浆，减少蜜蜂采水负担
- 弱群: 适当提高浓度，少量多次饲喂
- 强群: 可适当降低浓度，加大饲喂量
- 高温期: 适当降低浓度，增加喂水量
    """.strip()
    
    return {
        "recommended_ratio": recommended_ratio,
        "period": period,
        "period_name": period_names.get(period, "常规期"),
        "solar_term": data.solar_term,
        "temperature": data.temperature,
        "colony_strength": data.colony_strength,
        "strength_name": strength_names.get(data.colony_strength, "中等群"),
        "temp_level": temp_level,
        "explanation": explanation,
        "amount_suggestion": {
            "per_hive_kg": 0.5 if data.colony_strength == "weak" else (1.0 if data.colony_strength == "medium" else 1.5),
            "frequency_days": 3 if data.colony_strength == "weak" else (2 if data.colony_strength == "medium" else 2)
        }
    }


@app.get("/api/feeding/feed-types", summary="获取饲喂物类型列表")
async def get_feed_types():
    return {
        "feed_types": [
            {
                "code": code,
                "name": info["name"],
                "unit": info["unit"],
                "default_safety_stock": info["default_safety_stock"]
            }
            for code, info in FEED_TYPES.items()
        ],
        "periods": [
            {"code": "spring_breeding", "name": "春繁期"},
            {"code": "autumn_breeding", "name": "秋繁期"},
            {"code": "wintering", "name": "越冬期"},
            {"code": "normal", "name": "常规期"}
        ],
        "solar_terms": SEASONS,
        "bee_strengths": [
            {"code": "weak", "name": "弱群"},
            {"code": "medium", "name": "中等群"},
            {"code": "strong", "name": "强群"}
        ]
    }


@app.get("/api/weather/farms", summary="获取所有蜂场天气概览（含7天预报图标条）")
async def get_weather_farms_overview(db: Session = Depends(get_db)):
    now = datetime.now()
    cache_key = f"weather_farms_overview_{now.strftime('%Y%m%d%H')}"
    cached = _get_cached_weather(cache_key)
    if cached:
        return cached

    result_farms = []
    for farm in BEE_FARMS:
        hourly = generate_hourly_forecast(farm["id"], farm["lat"], farm["lng"], days=7)
        daily = generate_daily_summary(farm["id"], hourly)
        alerts = detect_extreme_weather(hourly)

        critical_count = sum(1 for a in alerts if a["severity"] == "critical")
        warning_count = sum(1 for a in alerts if a["severity"] == "warning")
        info_count = sum(1 for a in alerts if a["severity"] == "info")

        today = daily[0] if daily else None
        result_farms.append({
            **farm,
            "current": {
                "temperature": today["temp_avg"] if today else 0,
                "humidity": today["humidity_avg"] if today else 0,
                "weather_icon": today["weather_icon"] if today else "sun",
                "weather_desc": today["weather_desc"] if today else "晴",
                "temp_max": today["temp_max"] if today else 0,
                "temp_min": today["temp_min"] if today else 0,
            },
            "daily_forecast": daily,
            "alerts_summary": {
                "total": len(alerts),
                "critical": critical_count,
                "warning": warning_count,
                "info": info_count,
                "highest_severity": "critical" if critical_count > 0 else ("warning" if warning_count > 0 else ("info" if info_count > 0 else None)),
            }
        })

    result = {
        "timestamp": now.isoformat(),
        "farm_count": len(result_farms),
        "farms": result_farms,
        "alert_type_meta": ALERT_TYPE_META,
    }
    _set_cached_weather(cache_key, result)
    return result


@app.get("/api/weather/farm/{farm_id}", summary="获取单个蜂场详细天气数据")
async def get_weather_farm_detail(
    farm_id: str,
    days: int = Query(7, ge=1, le=14, description="预报天数"),
    db: Session = Depends(get_db)
):
    farm = next((f for f in BEE_FARMS if f["id"] == farm_id), None)
    if not farm:
        raise HTTPException(status_code=404, detail=f"蜂场不存在: {farm_id}")

    now = datetime.now()
    cache_key = f"weather_detail_{farm_id}_{days}_{now.strftime('%Y%m%d%H')}"
    cached = _get_cached_weather(cache_key)
    if cached:
        return cached

    hourly = generate_hourly_forecast(farm_id, farm["lat"], farm["lng"], days=days)
    daily = generate_daily_summary(farm_id, hourly)
    alerts = detect_extreme_weather(hourly)

    alerts_with_actions = []
    for alert in alerts:
        actions = generate_alert_actions(alert["alert_type"], alert["level"])
        alerts_with_actions.append({
            **alert,
            "actions": actions,
        })

    severity_order = {"critical": 0, "warning": 1, "info": 2}
    alerts_with_actions.sort(key=lambda x: (severity_order.get(x["severity"], 3), x["start_time"]))

    result = {
        "timestamp": now.isoformat(),
        "farm": farm,
        "hourly_forecast": hourly,
        "daily_forecast": daily,
        "alerts": alerts_with_actions,
        "alerts_summary": {
            "total": len(alerts),
            "critical": sum(1 for a in alerts if a["severity"] == "critical"),
            "warning": sum(1 for a in alerts if a["severity"] == "warning"),
            "info": sum(1 for a in alerts if a["severity"] == "info"),
        },
        "alert_type_meta": ALERT_TYPE_META,
    }
    _set_cached_weather(cache_key, result)
    return result


@app.get("/api/weather/farm/{farm_id}/alerts", summary="获取蜂场预警时间轴")
async def get_weather_alerts_timeline(
    farm_id: str,
    days: int = Query(7, ge=1, le=14),
    db: Session = Depends(get_db)
):
    farm = next((f for f in BEE_FARMS if f["id"] == farm_id), None)
    if not farm:
        raise HTTPException(status_code=404, detail=f"蜂场不存在: {farm_id}")

    now = datetime.now()
    cache_key = f"weather_alerts_{farm_id}_{days}_{now.strftime('%Y%m%d%H')}"
    cached = _get_cached_weather(cache_key)
    if cached:
        return cached

    hourly = generate_hourly_forecast(farm_id, farm["lat"], farm["lng"], days=days)
    alerts = detect_extreme_weather(hourly)

    timeline_start = now.replace(minute=0, second=0, microsecond=0)
    timeline_slots = []
    for h in range(days * 24):
        slot_time = timeline_start + timedelta(hours=h)
        slot_str = slot_time.isoformat()
        hourly_item = next((x for x in hourly if x["forecast_time"] == slot_str), None)

        slot_alerts = []
        if hourly_item:
            for alert in alerts:
                if alert["start_time"] <= slot_str <= alert["end_time"]:
                    slot_alerts.append({
                        "alert_type": alert["alert_type"],
                        "severity": alert["severity"],
                        "level": alert["level"],
                    })

        timeline_slots.append({
            "time": slot_str,
            "hour": slot_time.hour,
            "date": slot_time.strftime("%Y-%m-%d"),
            "temperature": hourly_item["temperature"] if hourly_item else None,
            "humidity": hourly_item["humidity"] if hourly_item else None,
            "wind_speed": hourly_item["wind_speed"] if hourly_item else None,
            "precipitation": hourly_item["precipitation"] if hourly_item else None,
            "weather_icon": hourly_item["weather_icon"] if hourly_item else None,
            "alerts": slot_alerts,
        })

    alerts_with_actions = []
    for alert in alerts:
        actions = generate_alert_actions(alert["alert_type"], alert["level"])
        completed_count = sum(1 for a in actions if a.get("is_completed"))
        alerts_with_actions.append({
            **alert,
            "actions": actions,
            "actions_total": len(actions),
            "actions_completed": completed_count,
        })

    result = {
        "timestamp": now.isoformat(),
        "farm": farm,
        "timeline": timeline_slots,
        "alerts": alerts_with_actions,
        "alert_type_meta": ALERT_TYPE_META,
    }
    _set_cached_weather(cache_key, result)
    return result


@app.put("/api/weather/alerts/{alert_id}/actions/{action_id}", summary="更新处置建议完成状态")
async def update_alert_action(
    alert_id: str,
    action_id: str,
    data: AlertActionUpdate,
    db: Session = Depends(get_db)
):
    cache_key_prefix = f"weather_"
    keys_to_remove = [k for k in _WEATHER_CACHE.keys() if k.startswith(cache_key_prefix)]
    for k in keys_to_remove:
        del _WEATHER_CACHE[k]

    return {
        "status": "success",
        "alert_id": alert_id,
        "action_id": action_id,
        "is_completed": data.is_completed,
        "completed_by": data.completed_by,
        "completed_at": datetime.now().isoformat(),
    }


@app.put("/api/weather/alerts/{alert_id}/acknowledge", summary="确认预警")
async def acknowledge_weather_alert(
    alert_id: str,
    data: WeatherAlertAck,
    db: Session = Depends(get_db)
):
    cache_key_prefix = f"weather_"
    keys_to_remove = [k for k in _WEATHER_CACHE.keys() if k.startswith(cache_key_prefix)]
    for k in keys_to_remove:
        del _WEATHER_CACHE[k]

    return {
        "status": "success",
        "alert_id": alert_id,
        "acknowledged": data.acknowledged,
        "acknowledged_by": data.acknowledged_by,
        "acknowledged_at": datetime.now().isoformat(),
    }


@app.get("/api/weather/alert-types", summary="获取预警类型元数据")
async def get_alert_type_metadata():
    return {
        "alert_types": ALERT_TYPE_META,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
