import random
import math
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from collections import defaultdict


WEATHER_CODE_MAP = {
    "sunny": {"code": "01", "desc": "晴", "icon": "sun"},
    "partly_cloudy": {"code": "02", "desc": "多云", "icon": "cloud-sun"},
    "cloudy": {"code": "03", "desc": "阴", "icon": "cloud"},
    "light_rain": {"code": "10", "desc": "小雨", "icon": "cloud-rain"},
    "moderate_rain": {"code": "11", "desc": "中雨", "icon": "cloud-rain"},
    "heavy_rain": {"code": "12", "desc": "大雨", "icon": "cloud-showers-heavy"},
    "storm": {"code": "13", "desc": "暴雨", "icon": "cloud-lightning"},
    "thunderstorm": {"code": "14", "desc": "雷阵雨", "icon": "cloud-lightning"},
    "light_snow": {"code": "20", "desc": "小雪", "icon": "snowflake"},
    "moderate_snow": {"code": "21", "desc": "中雪", "icon": "snowflake"},
    "heavy_snow": {"code": "22", "desc": "大雪", "icon": "snowflake"},
    "fog": {"code": "30", "desc": "雾", "icon": "cloud-fog"},
    "haze": {"code": "31", "desc": "霾", "icon": "cloud-fog"},
    "windy": {"code": "40", "desc": "大风", "icon": "wind"},
}


ALERT_TYPE_META = {
    "HEAT_WAVE": {
        "name": "持续高温",
        "icon": "thermometer-sun",
        "color": "red",
        "levels": {
            "mild": {"label": "轻度高温", "severity": "warning"},
            "moderate": {"label": "中度高温", "severity": "warning"},
            "severe": {"label": "严重高温", "severity": "critical"},
            "extreme": {"label": "极端高温", "severity": "critical"},
        }
    },
    "CONTINUOUS_RAIN": {
        "name": "连阴雨",
        "icon": "cloud-rain",
        "color": "blue",
        "levels": {
            "mild": {"label": "轻度连阴", "severity": "info"},
            "moderate": {"label": "中度连阴", "severity": "warning"},
            "severe": {"label": "严重连阴", "severity": "warning"},
            "extreme": {"label": "暴雨连阴", "severity": "critical"},
        }
    },
    "COLD_WAVE": {
        "name": "寒潮",
        "icon": "thermometer-snowflake",
        "color": "cyan",
        "levels": {
            "mild": {"label": "轻度寒潮", "severity": "warning"},
            "moderate": {"label": "中度寒潮", "severity": "warning"},
            "severe": {"label": "严重寒潮", "severity": "critical"},
            "extreme": {"label": "极端寒潮", "severity": "critical"},
        }
    },
    "STRONG_WIND": {
        "name": "大风",
        "icon": "wind",
        "color": "purple",
        "levels": {
            "mild": {"label": "轻度大风", "severity": "info"},
            "moderate": {"label": "中度大风", "severity": "warning"},
            "severe": {"label": "严重大风", "severity": "warning"},
            "extreme": {"label": "极端大风", "severity": "critical"},
        }
    },
}


ACTION_TEMPLATES = {
    "HEAT_WAVE": {
        "mild": [
            {"text": "检查蜂箱遮阴设施，避免阳光直射", "category": "环境调控", "priority": "high"},
            {"text": "在蜂场周围增加喂水点，补充清洁水源", "category": "饮水管理", "priority": "high"},
            {"text": "适当扩大巢门，加强箱内通风", "category": "通风管理", "priority": "medium"},
        ],
        "moderate": [
            {"text": "搭建临时遮阳棚，对全场蜂箱进行遮阴", "category": "环境调控", "priority": "high"},
            {"text": "增加喂水量，每日检查饮水点2次以上", "category": "饮水管理", "priority": "high"},
            {"text": "巢门全开，揭开覆布一角加强通风", "category": "通风管理", "priority": "high"},
            {"text": "减少开箱检查次数，避免惊扰蜂群", "category": "日常管理", "priority": "medium"},
        ],
        "severe": [
            {"text": "紧急搭建全场遮阳设施，转移蜂群至阴凉处", "category": "环境调控", "priority": "critical"},
            {"text": "持续供水，每4小时检查并更换饮水", "category": "饮水管理", "priority": "critical"},
            {"text": "撤除箱内保温物，开大巢门至最大", "category": "通风管理", "priority": "high"},
            {"text": "对蜂箱周围地面洒水降温", "category": "环境调控", "priority": "high"},
            {"text": "暂停采蜜作业，避免外勤蜂高温出巢死亡", "category": "生产管理", "priority": "medium"},
        ],
        "extreme": [
            {"text": "立即将蜂群转移至有空调或降温设施的室内", "category": "应急措施", "priority": "critical"},
            {"text": "24小时持续监测箱内温度，超过36℃需紧急处理", "category": "应急措施", "priority": "critical"},
            {"text": "全场洒水降温，配合大功率风扇强制通风", "category": "环境调控", "priority": "critical"},
            {"text": "对弱群进行合并，增强蜂群自身调温能力", "category": "蜂群管理", "priority": "high"},
            {"text": "补充高浓度糖浆，减少蜜蜂外出采水风险", "category": "饲喂管理", "priority": "high"},
        ],
    },
    "CONTINUOUS_RAIN": {
        "mild": [
            {"text": "检查蜂箱防雨设施，修补破损箱盖", "category": "防雨措施", "priority": "high"},
            {"text": "确保箱底排水通畅，无积水浸泡", "category": "环境管理", "priority": "high"},
            {"text": "评估饲料储备，判断是否需要提前补饲", "category": "饲喂管理", "priority": "medium"},
        ],
        "moderate": [
            {"text": "加盖防雨布，确保所有蜂箱完全防雨", "category": "防雨措施", "priority": "high"},
            {"text": "垫高蜂箱，防止雨水倒灌", "category": "环境管理", "priority": "high"},
            {"text": "适量补充糖浆饲料，预防蜂群因雨断粮", "category": "饲喂管理", "priority": "high"},
            {"text": "减少开箱操作，保持蜂群安定", "category": "日常管理", "priority": "medium"},
        ],
        "severe": [
            {"text": "紧急加固防雨设施，转移低洼处蜂箱", "category": "应急措施", "priority": "critical"},
            {"text": "全场蜂箱垫高10cm以上，疏通排水沟", "category": "环境管理", "priority": "high"},
            {"text": "加大补饲力度，确保每箱饲料充足", "category": "饲喂管理", "priority": "high"},
            {"text": "检查箱内湿度，必要时更换吸湿覆布", "category": "湿度管理", "priority": "high"},
            {"text": "暂停所有外出作业，人员注意安全", "category": "生产管理", "priority": "medium"},
        ],
        "extreme": [
            {"text": "立即将蜂群转移至地势高燥的室内或避雨场所", "category": "应急措施", "priority": "critical"},
            {"text": "24小时监测蜂箱状况，防止漏水和浸泡", "category": "应急措施", "priority": "critical"},
            {"text": "连续补饲，防止蜂群因长期阴雨饥饿", "category": "饲喂管理", "priority": "critical"},
            {"text": "使用干燥剂控制箱内湿度，预防病害", "category": "湿度管理", "priority": "high"},
            {"text": "雨后及时检查，清理积水并晾晒蜂具", "category": "灾后处理", "priority": "high"},
        ],
    },
    "COLD_WAVE": {
        "mild": [
            {"text": "检查箱内饲料储备，确保越冬饲料充足", "category": "饲喂管理", "priority": "high"},
            {"text": "关闭部分巢门，缩小通风口", "category": "保温管理", "priority": "high"},
            {"text": "箱外加盖草帘或保温被", "category": "保温管理", "priority": "medium"},
        ],
        "moderate": [
            {"text": "全场蜂箱加强内外保温，填充保温材料", "category": "保温管理", "priority": "high"},
            {"text": "巢门缩小至仅容1-2只蜜蜂通过", "category": "保温管理", "priority": "high"},
            {"text": "补充优质高浓度糖浆，增强蜂群抗寒能力", "category": "饲喂管理", "priority": "high"},
            {"text": "合并弱群，减少越冬蜂群损失", "category": "蜂群管理", "priority": "medium"},
        ],
        "severe": [
            {"text": "紧急加固保温设施，必要时转移至室内越冬", "category": "应急措施", "priority": "critical"},
            {"text": "关闭巢门，仅留微小通气孔", "category": "保温管理", "priority": "critical"},
            {"text": "蜂场周围设置防风屏障，阻挡寒风", "category": "环境管理", "priority": "high"},
            {"text": "检查蜂王和蜂团状况，确保安全越冬", "category": "蜂群管理", "priority": "high"},
            {"text": "严禁开箱检查，避免散温冻死蜂群", "category": "日常管理", "priority": "high"},
        ],
        "extreme": [
            {"text": "立即将所有越冬蜂群转移至室内或保温大棚", "category": "应急措施", "priority": "critical"},
            {"text": "启动加温设备，保持室内温度在2-8℃", "category": "应急措施", "priority": "critical"},
            {"text": "24小时监控室内温湿度，防止过热或过冷", "category": "应急措施", "priority": "critical"},
            {"text": "确保饲料充足，低温期严禁开箱补饲", "category": "饲喂管理", "priority": "high"},
            {"text": "寒潮过后逐步恢复正常管理，检查蜂群损失", "category": "灾后处理", "priority": "high"},
        ],
    },
    "STRONG_WIND": {
        "mild": [
            {"text": "检查蜂箱稳固性，加固箱盖压条", "category": "安全措施", "priority": "high"},
            {"text": "缩小巢门，防止冷风直吹箱内", "category": "通风管理", "priority": "medium"},
            {"text": "清理蜂场周围易被风吹起的杂物", "category": "环境管理", "priority": "medium"},
        ],
        "moderate": [
            {"text": "全场蜂箱压重加固，防止被风吹倒", "category": "安全措施", "priority": "high"},
            {"text": "设置临时防风屏障，减弱风力影响", "category": "环境管理", "priority": "high"},
            {"text": "关闭大部分巢门，保持微弱通风", "category": "通风管理", "priority": "high"},
            {"text": "外勤蜂可能无法正常采集，注意补饲", "category": "饲喂管理", "priority": "medium"},
        ],
        "severe": [
            {"text": "紧急将蜂箱转移至背风处或室内", "category": "应急措施", "priority": "critical"},
            {"text": "蜂箱叠放压重，用绳索捆绑固定", "category": "安全措施", "priority": "critical"},
            {"text": "关闭巢门，防止蜜蜂被风吹失", "category": "通风管理", "priority": "high"},
            {"text": "检查蜂箱周围是否有被风吹倒的树木等危险", "category": "环境管理", "priority": "high"},
            {"text": "人员停止户外作业，注意人身安全", "category": "安全管理", "priority": "high"},
        ],
        "extreme": [
            {"text": "立即将所有蜂群转移至安全的室内场所", "category": "应急措施", "priority": "critical"},
            {"text": "完全关闭巢门，保持通风但防止蜜蜂飞出", "category": "应急措施", "priority": "critical"},
            {"text": "24小时监控蜂箱状况，防止发生意外", "category": "应急措施", "priority": "critical"},
            {"text": "大风过后检查蜂群损失，及时处理", "category": "灾后处理", "priority": "high"},
            {"text": "清理蜂场，修复被风吹毁的设施", "category": "灾后处理", "priority": "high"},
        ],
    },
}


def _seeded_random(seed_str: str) -> random.Random:
    return random.Random(hash(seed_str) & 0xffffffff)


def _get_seasonal_temp_range(lat: float, month: int) -> Tuple[float, float]:
    if month in (12, 1, 2):
        base_min, base_max = -15, 5
    elif month in (3, 4, 5):
        base_min, base_max = 5, 25
    elif month in (6, 7, 8):
        base_min, base_max = 18, 38
    else:
        base_min, base_max = 8, 28
    lat_factor = max(0, (lat - 20) / 30) * 8
    return (base_min - lat_factor, base_max - lat_factor)


def _get_hourly_temp(base_min: float, base_max: float, hour: int, day_variance: float) -> float:
    temp_amplitude = (base_max - base_min) / 2
    temp_mid = (base_max + base_min) / 2
    hour_offset = (hour - 14) * (math.pi / 12)
    hourly = temp_mid - temp_amplitude * math.cos(hour_offset)
    return round(hourly + day_variance, 1)


def _determine_weather(hourly_temp: float, hourly_humidity: float, precipitation: float, wind_speed: float) -> Dict[str, str]:
    if precipitation >= 20:
        if hourly_temp <= 0:
            return WEATHER_CODE_MAP["heavy_snow"]
        return WEATHER_CODE_MAP["storm"]
    elif precipitation >= 5:
        if hourly_temp <= 0:
            return WEATHER_CODE_MAP["moderate_snow"]
        return WEATHER_CODE_MAP["heavy_rain"]
    elif precipitation >= 1:
        if hourly_temp <= 0:
            return WEATHER_CODE_MAP["light_snow"]
        return WEATHER_CODE_MAP["moderate_rain"]
    elif precipitation >= 0.1:
        return WEATHER_CODE_MAP["light_rain"]
    elif wind_speed >= 10.8:
        return WEATHER_CODE_MAP["windy"]
    elif hourly_humidity >= 90:
        return WEATHER_CODE_MAP["fog"]
    elif hourly_humidity >= 80:
        return WEATHER_CODE_MAP["haze"]
    elif hourly_humidity >= 60:
        return WEATHER_CODE_MAP["partly_cloudy"]
    else:
        return WEATHER_CODE_MAP["sunny"]


def generate_hourly_forecast(farm_id: str, lat: float, lng: float, days: int = 7) -> List[Dict[str, Any]]:
    now = datetime.now()
    now = now.replace(minute=0, second=0, microsecond=0)
    rnd = _seeded_random(f"weather_{farm_id}_{now.strftime('%Y%m%d%H')}")

    forecasts = []
    base_min, base_max = _get_seasonal_temp_range(lat, now.month)

    for day_offset in range(days):
        day_date = now + timedelta(days=day_offset)
        day_variance = rnd.uniform(-3, 3)
        day_temp_min = base_min + rnd.uniform(-2, 2)
        day_temp_max = base_max + rnd.uniform(-2, 2)

        rain_chance = rnd.random()
        is_rainy_day = rain_chance < 0.35
        rain_hours = rnd.randint(2, 10) if is_rainy_day else 0
        rain_start = rnd.randint(0, 24 - rain_hours) if rain_hours > 0 else -1

        wind_pattern = rnd.random()
        windy_hours = set()
        if wind_pattern < 0.2:
            windy_start = rnd.randint(6, 18)
            windy_duration = rnd.randint(3, 8)
            windy_hours = set(range(windy_start, windy_start + windy_duration))

        for hour in range(24):
            forecast_time = day_date.replace(hour=hour)
            hourly_temp = _get_hourly_temp(day_temp_min + day_variance, day_temp_max + day_variance, hour, rnd.uniform(-1, 1))
            hourly_humidity = round(rnd.uniform(30, 90) + (10 if is_rainy_day and rain_start <= hour < rain_start + rain_hours else 0), 1)
            hourly_humidity = min(100, max(20, hourly_humidity))

            if is_rainy_day and rain_start <= hour < rain_start + rain_hours:
                hourly_precip = round(rnd.uniform(0.5, 15), 1)
            else:
                hourly_precip = 0.0

            if hour in windy_hours:
                wind_base = rnd.uniform(8, 18)
            elif 6 <= hour <= 18:
                wind_base = rnd.uniform(1, 5)
            else:
                wind_base = rnd.uniform(0.5, 3)
            hourly_wind = round(wind_base + rnd.uniform(-1, 1), 1)
            hourly_wind = max(0, hourly_wind)

            weather_info = _determine_weather(hourly_temp, hourly_humidity, hourly_precip, hourly_wind)
            wind_directions = ["北风", "东北风", "东风", "东南风", "南风", "西南风", "西风", "西北风"]

            forecasts.append({
                "farm_id": farm_id,
                "forecast_time": forecast_time.isoformat(),
                "forecast_date": day_date.strftime("%Y-%m-%d"),
                "hour": hour,
                "temperature": hourly_temp,
                "humidity": hourly_humidity,
                "wind_speed": hourly_wind,
                "wind_direction": wind_directions[rnd.randint(0, 7)],
                "precipitation": hourly_precip,
                "weather_code": weather_info["code"],
                "weather_desc": weather_info["desc"],
                "weather_icon": weather_info["icon"],
                "pressure": round(rnd.uniform(990, 1020), 1),
                "visibility": round(rnd.uniform(5, 30), 1),
                "uv_index": round(max(0, (hourly_temp - 15) * 0.3 + rnd.uniform(0, 2)), 1),
            })

    return forecasts


def generate_daily_summary(farm_id: str, hourly_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    daily_map = defaultdict(list)
    for h in hourly_data:
        daily_map[h["forecast_date"]].append(h)

    daily_summaries = []
    for date in sorted(daily_map.keys()):
        hours = daily_map[date]
        temps = [h["temperature"] for h in hours]
        humids = [h["humidity"] for h in hours]
        winds = [h["wind_speed"] for h in hours]
        precips = [h["precipitation"] for h in hours]

        midday_hour = next((h for h in hours if h["hour"] == 12), hours[0])
        daily_summaries.append({
            "farm_id": farm_id,
            "date": date,
            "temp_max": round(max(temps), 1),
            "temp_min": round(min(temps), 1),
            "temp_avg": round(sum(temps) / len(temps), 1),
            "humidity_avg": round(sum(humids) / len(humids), 1),
            "wind_max": round(max(winds), 1),
            "wind_avg": round(sum(winds) / len(winds), 1),
            "precipitation_total": round(sum(precips), 1),
            "precipitation_hours": sum(1 for p in precips if p > 0.1),
            "weather_icon": midday_hour["weather_icon"],
            "weather_desc": midday_hour["weather_desc"],
            "weather_code": midday_hour["weather_code"],
        })

    return daily_summaries


def _detect_heat_wave(hourly_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    alerts = []
    i = 0
    n = len(hourly_data)

    while i < n:
        if hourly_data[i]["temperature"] >= 30:
            start_idx = i
            peak_temp = hourly_data[i]["temperature"]
            peak_idx = i
            consecutive_hours = 0

            while i < n and hourly_data[i]["temperature"] >= 30:
                if hourly_data[i]["temperature"] > peak_temp:
                    peak_temp = hourly_data[i]["temperature"]
                    peak_idx = i
                consecutive_hours += 1
                i += 1

            if consecutive_hours >= 3:
                if peak_temp >= 40 or consecutive_hours >= 24:
                    level = "extreme"
                elif peak_temp >= 37 or consecutive_hours >= 12:
                    level = "severe"
                elif peak_temp >= 34 or consecutive_hours >= 6:
                    level = "moderate"
                else:
                    level = "mild"

                meta = ALERT_TYPE_META["HEAT_WAVE"]
                alerts.append({
                    "alert_type": "HEAT_WAVE",
                    "alert_name": meta["name"],
                    "alert_icon": meta["icon"],
                    "alert_color": meta["color"],
                    "level": level,
                    "level_label": meta["levels"][level]["label"],
                    "severity": meta["levels"][level]["severity"],
                    "start_time": hourly_data[start_idx]["forecast_time"],
                    "end_time": hourly_data[start_idx + consecutive_hours - 1]["forecast_time"],
                    "duration_hours": consecutive_hours,
                    "peak_value": peak_temp,
                    "peak_time": hourly_data[peak_idx]["forecast_time"],
                    "affected_hours": consecutive_hours,
                    "title": f"{meta['name']}预警 · {meta['levels'][level]['label']}",
                    "description": f"预计{hourly_data[start_idx]['forecast_time'][5:16]}起持续{consecutive_hours}小时气温≥30℃，最高气温达{peak_temp}℃。"
                                   f"{'将严重影响幼虫发育，外勤蜂出巢死亡率极高。' if level in ('severe', 'extreme') else '会影响蜂群正常采集活动，需注意降温。'}",
                })
        else:
            i += 1

    return alerts


def _detect_continuous_rain(hourly_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    alerts = []
    i = 0
    n = len(hourly_data)

    while i < n:
        if hourly_data[i]["precipitation"] >= 0.1:
            start_idx = i
            total_precip = 0
            max_hourly = 0
            consecutive_hours = 0
            max_idx = i

            while i < n and hourly_data[i]["precipitation"] >= 0.1:
                precip = hourly_data[i]["precipitation"]
                total_precip += precip
                if precip > max_hourly:
                    max_hourly = precip
                    max_idx = i
                consecutive_hours += 1
                i += 1

            if consecutive_hours >= 6:
                if max_hourly >= 20 or total_precip >= 100 or consecutive_hours >= 48:
                    level = "extreme"
                elif max_hourly >= 10 or total_precip >= 50 or consecutive_hours >= 24:
                    level = "severe"
                elif max_hourly >= 3 or total_precip >= 20 or consecutive_hours >= 12:
                    level = "moderate"
                else:
                    level = "mild"

                meta = ALERT_TYPE_META["CONTINUOUS_RAIN"]
                alerts.append({
                    "alert_type": "CONTINUOUS_RAIN",
                    "alert_name": meta["name"],
                    "alert_icon": meta["icon"],
                    "alert_color": meta["color"],
                    "level": level,
                    "level_label": meta["levels"][level]["label"],
                    "severity": meta["levels"][level]["severity"],
                    "start_time": hourly_data[start_idx]["forecast_time"],
                    "end_time": hourly_data[start_idx + consecutive_hours - 1]["forecast_time"],
                    "duration_hours": consecutive_hours,
                    "peak_value": round(total_precip, 1),
                    "peak_time": hourly_data[max_idx]["forecast_time"],
                    "affected_hours": consecutive_hours,
                    "title": f"{meta['name']}预警 · {meta['levels'][level]['label']}",
                    "description": f"预计{hourly_data[start_idx]['forecast_time'][5:16]}起连续{consecutive_hours}小时有雨，累计降水量{round(total_precip, 1)}mm，"
                                   f"最大小时降水{round(max_hourly, 1)}mm。"
                                   f"{'蜂群将无法外出采集，需提前补饲防止断粮。' if level in ('severe', 'extreme') else '会中断蜂群采集活动，注意防雨。'}",
                })
        else:
            i += 1

    return alerts


def _detect_cold_wave(hourly_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    alerts = []
    i = 0
    n = len(hourly_data)

    while i < n:
        if hourly_data[i]["temperature"] <= 5:
            start_idx = i
            min_temp = hourly_data[i]["temperature"]
            min_idx = i
            consecutive_hours = 0

            while i < n and hourly_data[i]["temperature"] <= 5:
                if hourly_data[i]["temperature"] < min_temp:
                    min_temp = hourly_data[i]["temperature"]
                    min_idx = i
                consecutive_hours += 1
                i += 1

            if consecutive_hours >= 6:
                if min_temp <= -20 or consecutive_hours >= 48:
                    level = "extreme"
                elif min_temp <= -10 or consecutive_hours >= 24:
                    level = "severe"
                elif min_temp <= 0 or consecutive_hours >= 12:
                    level = "moderate"
                else:
                    level = "mild"

                meta = ALERT_TYPE_META["COLD_WAVE"]
                alerts.append({
                    "alert_type": "COLD_WAVE",
                    "alert_name": meta["name"],
                    "alert_icon": meta["icon"],
                    "alert_color": meta["color"],
                    "level": level,
                    "level_label": meta["levels"][level]["label"],
                    "severity": meta["levels"][level]["severity"],
                    "start_time": hourly_data[start_idx]["forecast_time"],
                    "end_time": hourly_data[start_idx + consecutive_hours - 1]["forecast_time"],
                    "duration_hours": consecutive_hours,
                    "peak_value": min_temp,
                    "peak_time": hourly_data[min_idx]["forecast_time"],
                    "affected_hours": consecutive_hours,
                    "title": f"{meta['name']}预警 · {meta['levels'][level]['label']}",
                    "description": f"预计{hourly_data[start_idx]['forecast_time'][5:16]}起持续{consecutive_hours}小时气温≤5℃，最低气温达{min_temp}℃。"
                                   f"{'越冬蜂群面临冻亡风险，需紧急加强保温。' if level in ('severe', 'extreme') else '气温较低，需注意蜂群保温。'}",
                })
        else:
            i += 1

    return alerts


def _detect_strong_wind(hourly_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    alerts = []
    i = 0
    n = len(hourly_data)

    while i < n:
        if hourly_data[i]["wind_speed"] >= 5.5:
            start_idx = i
            max_wind = hourly_data[i]["wind_speed"]
            max_idx = i
            consecutive_hours = 0

            while i < n and hourly_data[i]["wind_speed"] >= 5.5:
                if hourly_data[i]["wind_speed"] > max_wind:
                    max_wind = hourly_data[i]["wind_speed"]
                    max_idx = i
                consecutive_hours += 1
                i += 1

            if consecutive_hours >= 3:
                if max_wind >= 20.7 or consecutive_hours >= 24:
                    level = "extreme"
                elif max_wind >= 13.9 or consecutive_hours >= 12:
                    level = "severe"
                elif max_wind >= 8.0 or consecutive_hours >= 6:
                    level = "moderate"
                else:
                    level = "mild"

                meta = ALERT_TYPE_META["STRONG_WIND"]
                alerts.append({
                    "alert_type": "STRONG_WIND",
                    "alert_name": meta["name"],
                    "alert_icon": meta["icon"],
                    "alert_color": meta["color"],
                    "level": level,
                    "level_label": meta["levels"][level]["label"],
                    "severity": meta["levels"][level]["severity"],
                    "start_time": hourly_data[start_idx]["forecast_time"],
                    "end_time": hourly_data[start_idx + consecutive_hours - 1]["forecast_time"],
                    "duration_hours": consecutive_hours,
                    "peak_value": round(max_wind, 1),
                    "peak_time": hourly_data[max_idx]["forecast_time"],
                    "affected_hours": consecutive_hours,
                    "title": f"{meta['name']}预警 · {meta['levels'][level]['label']}",
                    "description": f"预计{hourly_data[start_idx]['forecast_time'][5:16]}起持续{consecutive_hours}小时风力≥{5.5}m/s，最大风速达{round(max_wind, 1)}m/s。"
                                   f"{'外勤蜂无法正常飞行，可能被吹失，需关闭巢门。' if level in ('severe', 'extreme') else '大风影响外勤蜂采集，需注意加固蜂箱。'}",
                })
        else:
            i += 1

    return alerts


def detect_extreme_weather(hourly_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    all_alerts = []
    all_alerts.extend(_detect_heat_wave(hourly_data))
    all_alerts.extend(_detect_continuous_rain(hourly_data))
    all_alerts.extend(_detect_cold_wave(hourly_data))
    all_alerts.extend(_detect_strong_wind(hourly_data))

    severity_order = {"critical": 0, "warning": 1, "info": 2}
    all_alerts.sort(key=lambda x: (severity_order.get(x["severity"], 3), x["start_time"]))

    return all_alerts


def generate_alert_actions(alert_type: str, level: str) -> List[Dict[str, Any]]:
    templates = ACTION_TEMPLATES.get(alert_type, {})
    actions = templates.get(level, templates.get("moderate", []))
    result = []
    for idx, action in enumerate(actions):
        result.append({
            "id": f"{alert_type}_{level}_{idx}",
            "action_order": idx + 1,
            "action_text": action["text"],
            "action_category": action["category"],
            "priority": action["priority"],
            "is_completed": False,
        })
    return result
