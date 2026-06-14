import logging
from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, Header, Request
from pydantic import BaseModel

logger = logging.getLogger(__name__)

MOCK_USERS = {
    "admin_user": {
        "user_id": "admin_001",
        "username": "admin",
        "role": "admin",
        "name": "系统管理员",
    },
    "normal_user": {
        "user_id": "user_001",
        "username": "user",
        "role": "user",
        "name": "普通用户",
    },
    "guest": {
        "user_id": "guest_001",
        "username": "guest",
        "role": "guest",
        "name": "访客",
    },
}


class UserInfo(BaseModel):
    user_id: str
    username: str
    role: str
    name: str
    is_admin: bool


def get_current_user(
    x_user_role: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None),
) -> UserInfo:
    if x_user_role == "admin" or (x_user_id and x_user_id.startswith("admin_")):
        return UserInfo(
            user_id=x_user_id or "admin_001",
            username="admin",
            role="admin",
            name="系统管理员",
            is_admin=True,
        )
    elif x_user_role == "user" or (x_user_id and x_user_id.startswith("user_")):
        return UserInfo(
            user_id=x_user_id or "user_001",
            username="user",
            role="user",
            name="普通用户",
            is_admin=False,
        )

    return UserInfo(
        user_id=x_user_id or "guest_001",
        username="guest",
        role="guest",
        name="访客",
        is_admin=False,
    )


def require_admin(current_user: UserInfo = Depends(get_current_user)) -> UserInfo:
    if not current_user.is_admin:
        raise HTTPException(
            status_code=403,
            detail={
                "code": "FORBIDDEN",
                "message": "该操作需要管理员权限",
                "current_role": current_user.role,
            }
        )
    return current_user


def get_user_info_for_headers(headers: Dict[str, str]) -> UserInfo:
    x_user_role = headers.get("x-user-role")
    x_user_id = headers.get("x-user-id")
    return get_current_user(x_user_role=x_user_role, x_user_id=x_user_id)
