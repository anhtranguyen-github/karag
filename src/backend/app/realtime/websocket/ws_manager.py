from __future__ import annotations

from typing import Dict, Set
import logging
import asyncio

from starlette.websockets import WebSocket

logger = logging.getLogger(__name__)


class WebsocketManager:
    def __init__(self) -> None:
        # mapping upload_id -> set of WebSocket connections
        self._connections: Dict[str, Set[WebSocket]] = {}
        self._lock = asyncio.Lock()

    async def register(self, upload_id: str, websocket: WebSocket) -> None:
        async with self._lock:
            self._connections.setdefault(upload_id, set()).add(websocket)
        logger.debug("ws_register upload_id=%s conn_count=%d", upload_id, len(self._connections.get(upload_id, [])))

    async def unregister(self, upload_id: str, websocket: WebSocket) -> None:
        async with self._lock:
            conns = self._connections.get(upload_id)
            if not conns:
                return
            conns.discard(websocket)
            if not conns:
                self._connections.pop(upload_id, None)
        logger.debug("ws_unregister upload_id=%s remaining=%d", upload_id, len(self._connections.get(upload_id, [])))

    async def notify(self, upload_id: str, message: str) -> None:
        # send a text message to all listeners for upload_id
        async with self._lock:
            conns = list(self._connections.get(upload_id, []))
        logger.debug("ws_notify upload_id=%s message=%s recipients=%d", upload_id, message, len(conns))

        for ws in conns:
            try:
                await ws.send_text(message)
            except Exception:
                # best-effort notify; ignore failures per-connection
                logger.exception("ws_notify failed for upload_id=%s", upload_id)
