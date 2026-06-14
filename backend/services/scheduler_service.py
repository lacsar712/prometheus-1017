import logging
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from models.database import SessionLocal
from services.email_service import send_monthly_report, logger as email_logger

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler(timezone="Asia/Shanghai")

BEE_FARMS = [
    {"id": "farm_001", "name": "秦岭一号蜂场"},
    {"id": "farm_002", "name": "长白山蜜源基地"},
    {"id": "farm_003", "name": "云贵高原蜂场"},
    {"id": "farm_004", "name": "江南水乡蜂场"},
    {"id": "farm_005", "name": "黄土高原蜂场"},
    {"id": "farm_006", "name": "闽南荔枝蜜场"},
]

FARM_OWNER_EMAILS = {
    "farm_001": ["owner_farm001@apiary.local", "manager_farm001@apiary.local"],
    "farm_002": ["owner_farm002@apiary.local"],
    "farm_003": ["owner_farm003@apiary.local", "manager_farm003@apiary.local"],
    "farm_004": ["owner_farm004@apiary.local"],
    "farm_005": ["owner_farm005@apiary.local"],
    "farm_006": ["owner_farm006@apiary.local", "manager_farm006@apiary.local"],
}


def monthly_report_job():
    logger.info("Starting monthly report email job...")
    db = SessionLocal()
    try:
        for farm in BEE_FARMS:
            recipients = FARM_OWNER_EMAILS.get(farm["id"], [f"owner_{farm['id']}@apiary.local"])
            try:
                result = send_monthly_report(db, farm["id"], farm["name"], recipients)
                logger.info(f"Monthly report for {farm['name']}: {result['status']} (log_id={result.get('log_id')})")
            except Exception as e:
                logger.error(f"Failed to send monthly report for {farm['name']}: {e}")
    finally:
        db.close()
    logger.info("Monthly report email job completed.")


def start_scheduler():
    scheduler.add_job(
        monthly_report_job,
        trigger=CronTrigger(day=1, hour=0, minute=0, second=0, timezone="Asia/Shanghai"),
        id="monthly_report_job",
        name="Monthly Report Email Sender",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("APScheduler started. Monthly report job scheduled for 1st day 00:00.")


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown()
        logger.info("APScheduler stopped.")
