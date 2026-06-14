import logging
import json
from datetime import datetime
from typing import Dict, List, Set
from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        self.all_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.all_connections.add(websocket)
        if client_id not in self.active_connections:
            self.active_connections[client_id] = set()
        self.active_connections[client_id].add(websocket)
        logger.info(f"WebSocket connected: client_id={client_id}, total={len(self.all_connections)}")

    def disconnect(self, websocket: WebSocket, client_id: str):
        self.all_connections.discard(websocket)
        if client_id in self.active_connections:
            self.active_connections[client_id].discard(websocket)
            if not self.active_connections[client_id]:
                del self.active_connections[client_id]
        logger.info(f"WebSocket disconnected: client_id={client_id}, total={len(self.all_connections)}")

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"Failed to send personal message: {e}")

    async def broadcast(self, message: dict):
        disconnected = set()
        for connection in self.all_connections:
            try:
                await connection.send_json(message)
            except WebSocketDisconnect:
                disconnected.add(connection)
            except Exception as e:
                logger.error(f"Failed to broadcast message: {e}")
                disconnected.add(connection)

        for conn in disconnected:
            for client_id, conns in self.active_connections.items():
                conns.discard(conn)
            self.all_connections.discard(conn)

        logger.info(f"Broadcasted hot update to {len(self.all_connections) - len(disconnected)} clients")

    async def broadcast_hot_update(self, language: str, namespace: str, key: str, value: str):
        message = {
            "type": "hot_update",
            "language": language,
            "namespace": namespace,
            "key": key,
            "value": value,
            "timestamp": datetime.utcnow().isoformat(),
        }
        await self.broadcast(message)

    def get_connection_count(self) -> int:
        return len(self.all_connections)

    def get_client_ids(self) -> List[str]:
        return list(self.active_connections.keys())


manager = ConnectionManager()
