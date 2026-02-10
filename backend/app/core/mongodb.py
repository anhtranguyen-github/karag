import structlog
from pymongo import MongoClient
from motor.motor_asyncio import AsyncIOMotorClient
from backend.app.core.config import ai_settings

logger = structlog.get_logger(__name__)


class MongoDBManager:
    _instance = None
    _client = None
    _async_client = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(MongoDBManager, cls).__new__(cls)
        return cls._instance

    @property
    def client(self):
        if self._client is None:
            logger.info(
                "mongodb_connect_sync",
                uri=ai_settings.MONGO_URI.split("@")[-1],  # Log host only, no creds
            )
            self._client = MongoClient(ai_settings.MONGO_URI)
        return self._client

    @property
    def async_client(self):
        if self._async_client is None:
            logger.info(
                "mongodb_connect_async",
                uri=ai_settings.MONGO_URI.split("@")[-1],
            )
            self._async_client = AsyncIOMotorClient(ai_settings.MONGO_URI)
        return self._async_client

    def get_database(self):
        return self.client[ai_settings.MONGO_DB]

    def get_async_database(self):
        return self.async_client[ai_settings.MONGO_DB]


mongodb_manager = MongoDBManager()
