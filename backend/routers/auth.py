import logging
from fastapi import APIRouter, Depends, Header
from typing import Optional

from services.auth_service import get_current_user, UserInfo

router = APIRouter(prefix="/api/auth", tags=["auth"])
logger = logging.getLogger(__name__)


@router.get("/me", response_model=UserInfo)
async def get_current_user_info(
    current_user: UserInfo = Depends(get_current_user),
):
    return current_user


@router.get("/roles")
async def get_available_roles():
    return {
        "roles": [
            {"role": "guest", "name": "访客", "permissions": ["read_public"]},
            {"role": "user", "name": "普通用户", "permissions": ["read_public", "read_protected"]},
            {"role": "admin", "name": "管理员", "permissions": ["read_public", "read_protected", "write", "manage"]},
        ]
    }


@router.get("/check-admin")
async def check_admin_permission(
    current_user: UserInfo = Depends(get_current_user),
):
    return {
        "is_admin": current_user.is_admin,
        "role": current_user.role,
        "has_permission": current_user.is_admin,
    }
