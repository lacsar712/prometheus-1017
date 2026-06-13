import logging
import time
import random
import os
import asyncio
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from collections import defaultdict

from fastapi import FastAPI, HTTPException, Request, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
import httpx

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@db:5432/prometheus_db")
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

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


def init_db():
    retries = 5
    while retries > 0:
        try:
            Base.metadata.create_all(bind=engine)
            logger.info("Database tables created successfully.")
            break
        except Exception as e:
            logger.error(f"Database connection failed: {e}. Retrying in 5 seconds...")
            retries -= 1
            time.sleep(5)


app = FastAPI(title="FastAPI Prometheus Demo - 蜂场监控大屏")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


instrumentator = Instrumentator(
    should_group_status_codes=False,
    should_ignore_untemplated=True,
    should_respect_env_var=True,
    excluded_handlers=[".*admin.*", "/metrics"],
    env_var_name="ENABLE_METRICS",
)
instrumentator.instrument(app).expose(app)

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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
