import structlog
from backend.app.core.config import karag_settings
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient

logger = structlog.get_logger(__name__)


class MongoDBManager:
    _instance = None
    _client = None
    _async_client = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    @property
    def client(self):
        if self._client is None:
            logger.info(
                "mongodb_connect_sync",
                uri=karag_settings.MONGO_URI.split("@")[-1],  # Log host only, no creds
            )
            self._client = MongoClient(karag_settings.MONGO_URI)
        return self._client

    @property
    def async_client(self):
        if self._async_client is None:
            logger.info(
                "mongodb_connect_async",
                uri=karag_settings.MONGO_URI.split("@")[-1],
            )
            self._async_client = AsyncIOMotorClient(karag_settings.MONGO_URI)
        return self._async_client

    def get_database(self):
        return self.client[karag_settings.MONGO_DB]

    def get_async_database(self):
        return self.async_client[karag_settings.MONGO_DB]


mongodb_manager = MongoDBManager()
