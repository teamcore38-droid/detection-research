import os
import time
import cv2
import json
import asyncio
from datetime import datetime
from typing import List, Set
from fastapi import WebSocket

from backend.config import SNAPSHOTS_DIR
from backend.database.db import insert_alert

ALERT_DEBOUNCE_SECONDS = 8.0 # 8 seconds debounce to prevent spamming DB

class AlertManager:
    def __init__(self):
        self.active_websockets: Set[WebSocket] = set()
        self.last_alert_times = {} # key: alert_key -> timestamp

    async def register_websocket(self, websocket: WebSocket):
        await websocket.accept()
        self.active_websockets.add(websocket)

    def unregister_websocket(self, websocket: WebSocket):
        self.active_websockets.discard(websocket)

    async def broadcast_alert(self, alert_data: dict):
        if not self.active_websockets:
            return
        
        message = json.dumps({
            "type": "NEW_ALERT",
            "data": alert_data
        })
        
        dead_sockets = set()
        for ws in list(self.active_websockets):
            try:
                await ws.send_text(message)
            except Exception:
                dead_sockets.add(ws)
                
        for ws in dead_sockets:
            self.active_websockets.discard(ws)

    def trigger_alert_sync(self, channel: str, alert_type: str, threat_level: str,
                           title: str, message: str, detected_classes: list,
                           confidence: float, frame=None, distance_pixels: float = None,
                           distance_meters: float = None) -> dict:
        debounce_key = f"{channel}_{alert_type}_{threat_level}"
        now = time.time()
        
        last_time = self.last_alert_times.get(debounce_key, 0)
        if now - last_time < ALERT_DEBOUNCE_SECONDS:
            return None
            
        self.last_alert_times[debounce_key] = now
        
        # Save snapshot if frame is provided
        snapshot_filename = None
        if frame is not None:
            ts_str = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
            snapshot_filename = f"snap_{channel.lower()}_{ts_str}.jpg"
            save_path = str(SNAPSHOTS_DIR / snapshot_filename)
            try:
                cv2.imwrite(save_path, frame)
            except Exception as e:
                print(f"Error saving snapshot: {e}")
                snapshot_filename = None

        # Insert to DB
        alert_record = insert_alert(
            channel=channel,
            alert_type=alert_type,
            threat_level=threat_level,
            title=title,
            message=message,
            detected_classes=detected_classes,
            confidence=confidence,
            distance_pixels=distance_pixels,
            distance_meters=distance_meters,
            snapshot_filename=snapshot_filename
        )

        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.run_coroutine_threadsafe(self.broadcast_alert(alert_record), loop)
        except Exception:
            pass

        return alert_record

alert_manager = AlertManager()
