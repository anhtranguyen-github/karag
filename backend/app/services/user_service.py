import uuid
from datetime import datetime
from typing import Optional, Dict
from backend.app.core.mongodb import mongodb_manager
from backend.app.core.auth import get_password_hash, verify_password
from backend.app.schemas.users import UserCreate


class UserService:
    @staticmethod
    async def get_by_email(email: str) -> Optional[Dict]:
        db = mongodb_manager.get_async_database()
        user = await db.users.find_one({"email": email})
        return user

    @staticmethod
    async def get_by_id(user_id: str) -> Optional[Dict]:
        db = mongodb_manager.get_async_database()
        user = await db.users.find_one({"id": user_id})
        return user

    @staticmethod
    async def create(obj_in: UserCreate) -> Dict:
        db = mongodb_manager.get_async_database()

        user_id = str(uuid.uuid4())
        timestamp = datetime.utcnow()

        user_in_db = {
            "id": user_id,
            "email": obj_in.email,
            "hashed_password": get_password_hash(obj_in.password),
            "full_name": obj_in.full_name,
            "is_active": True,
            "is_superuser": False,
            "created_at": timestamp,
            "updated_at": timestamp,
        }

        await db.users.insert_one(user_in_db)
        return user_in_db

    @staticmethod
    async def authenticate(email: str, password: str) -> Optional[Dict]:
        user = await UserService.get_by_email(email)
        if not user:
            return None
        if not verify_password(password, user["hashed_password"]):
            return None
        return user


user_service = UserService()
