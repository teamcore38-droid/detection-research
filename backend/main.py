import os
import shutil
import time
import asyncio
from typing import Optional
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, Form, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from backend.config import (
    STATIC_DIR, 
    SNAPSHOTS_DIR, 
    UPLOADS_DIR, 
    DEFAULT_DROWNING_VIDEO,
    DEFAULT_ANIMAL_HUMAN_VIDEO,
    BASE_DIR
)
from backend.database.db import (
    init_db, 
    get_alerts, 
    get_alert_stats, 
    acknowledge_alert, 
    clear_all_alerts
)
from backend.services.alert_manager import alert_manager
from backend.services.sms_notifier import sms_notifier
from backend.services.video_stream import video_stream_service

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Initializing Surveillance Database...")
    init_db()
    alert_manager.set_event_loop(asyncio.get_running_loop())
    sms_notifier.start()
    # Auto-start default channels
    try:
        video_stream_service.start_channel("animal_human", source=DEFAULT_ANIMAL_HUMAN_VIDEO)
        video_stream_service.start_channel("drowning", source=DEFAULT_DROWNING_VIDEO)
    except Exception as e:
        print(f"Failed to auto-start channels: {e}")
    try:
        yield
    finally:
        # Shutdown
        print("Stopping all video streams...")
        for ch_id in list(video_stream_service.channels.keys()):
            video_stream_service.stop_channel(ch_id)
        await asyncio.to_thread(sms_notifier.close)
        alert_manager.set_event_loop(None)

app = FastAPI(
    title="AI Surveillance & Threat Detection API",
    description="Backend API for Drowning Detection and Animal-Human Attack Warning System",
    version="1.0.0",
    lifespan=lifespan
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static directories
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# -----------------
# Stream Endpoints
# -----------------
def generate_mjpeg_frames(channel_id: str):
    while True:
        frame_bytes = video_stream_service.get_frame(channel_id)
        if frame_bytes is not None:
            yield (b"--frame\r\n"
                   b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n")
            time.sleep(0.025) # ~40 FPS cap to prevent network buffer overflow
        else:
            time.sleep(0.04)

@app.get("/api/stream/{channel_id}")
async def stream_feed(channel_id: str):
    if channel_id not in video_stream_service.channels:
        raise HTTPException(status_code=404, detail=f"Channel '{channel_id}' not found")
    
    video_stream_service.start_channel(channel_id)
    
    return StreamingResponse(
        generate_mjpeg_frames(channel_id),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

class StreamControlRequest(BaseModel):
    channel_id: str
    action: str # "start", "stop", "restart"
    source: Optional[str] = None # file path, "sample", "0", "1", or "http://..."

@app.post("/api/stream/control")
async def control_stream(req: StreamControlRequest):
    if req.channel_id not in video_stream_service.channels:
        raise HTTPException(status_code=404, detail="Channel not found")
    
    src = req.source
    src_str = str(src).strip() if src else ""
    
    if src == "sample" or not src_str:
        if req.channel_id == "drowning":
            src = DEFAULT_DROWNING_VIDEO
        else:
            src = DEFAULT_ANIMAL_HUMAN_VIDEO
    elif src_str.isdigit() or src_str.lower() in ["webcam", "0", "1", "2", "phone_usb"]:
        src = src_str
    elif src_str.startswith("http://") or src_str.startswith("https://") or src_str.startswith("rtsp://"):
        src = src_str
    else:
        src = os.path.normpath(src_str)
        
    print(f"Control stream for channel '{req.channel_id}': action={req.action}, source={src}")

    if req.action == "start":
        video_stream_service.start_channel(req.channel_id, source=src)
        video_stream_service.reset_channel(req.channel_id)
    elif req.action == "stop":
        video_stream_service.stop_channel(req.channel_id)
    elif req.action in ["restart", "reset"]:
        video_stream_service.stop_channel(req.channel_id)
        time.sleep(0.15)
        video_stream_service.start_channel(req.channel_id, source=src)
        video_stream_service.reset_channel(req.channel_id)
        
    return {"status": "success", "channel_id": req.channel_id, "action": req.action, "source": str(src)}

@app.post("/api/stream/{channel_id}/reset")
async def reset_stream(channel_id: str):
    if channel_id not in video_stream_service.channels:
        raise HTTPException(status_code=404, detail="Channel not found")
    video_stream_service.reset_channel(channel_id)
    return {"status": "success", "channel_id": channel_id, "action": "reset"}

@app.get("/api/stream/{channel_id}/stats")
async def get_stream_stats(channel_id: str):
    if channel_id not in video_stream_service.channels:
        raise HTTPException(status_code=404, detail="Channel not found")
    stats = video_stream_service.get_stats(channel_id)
    return {"status": "success", "channel_id": channel_id, "stats": stats}

# -----------------
# Video Upload & Management
# -----------------
@app.post("/api/upload")
async def upload_video(file: UploadFile = File(...)):
    filename = f"{int(time.time())}_{file.filename}"
    file_path = UPLOADS_DIR / filename
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    norm_path = os.path.normpath(str(file_path))
    return {
        "status": "success",
        "filename": filename,
        "path": norm_path,
        "url": f"/static/uploads/{filename}"
    }

@app.get("/api/videos")
async def list_available_videos():
    videos = []
    
    # 1. Default sample videos
    if os.path.exists(DEFAULT_ANIMAL_HUMAN_VIDEO):
        videos.append({
            "name": "📹 Default: Animal & Human Video",
            "path": os.path.normpath(DEFAULT_ANIMAL_HUMAN_VIDEO),
            "is_default": True,
            "channel_type": "ANIMAL_HUMAN"
        })
    if os.path.exists(DEFAULT_DROWNING_VIDEO):
        videos.append({
            "name": "🏊 Default: Drowning Rescue Video",
            "path": os.path.normpath(DEFAULT_DROWNING_VIDEO),
            "is_default": True,
            "channel_type": "DROWNING"
        })
        
    # 2. Uploaded videos
    for f in sorted(UPLOADS_DIR.glob("*.*"), key=os.path.getmtime, reverse=True):
        if f.suffix.lower() in [".mp4", ".avi", ".mov", ".mkv", ".webm"]:
            display_name = f.name
            if "_" in display_name and display_name.split("_")[0].isdigit():
                display_name = "_".join(display_name.split("_")[1:])
            videos.append({
                "name": f"📁 Uploaded: {display_name}",
                "path": os.path.normpath(str(f)),
                "is_default": False
            })
            
    return {"videos": videos}

# -----------------
# Alert APIs
# -----------------
@app.get("/api/alerts")
async def get_alerts_list(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    threat_level: Optional[str] = None,
    channel: Optional[str] = None
):
    alerts = get_alerts(limit=limit, offset=offset, threat_level=threat_level, channel=channel)
    return {"alerts": alerts}

@app.get("/api/alerts/stats")
async def get_alerts_statistics():
    stats = get_alert_stats()
    return stats

@app.post("/api/alerts/{alert_id}/acknowledge")
async def ack_alert(alert_id: int):
    acknowledge_alert(alert_id)
    return {"status": "success", "alert_id": alert_id}

@app.post("/api/alerts/clear")
async def clear_alerts():
    clear_all_alerts()
    return {"status": "success", "message": "All alerts cleared"}

# -----------------
# Settings API
# -----------------
@app.get("/api/notifications/sms/status")
async def get_sms_status():
    return sms_notifier.get_status()


class SettingsUpdateRequest(BaseModel):
    channel_id: Optional[str] = "all"
    drowning_confidence: Optional[float] = None
    animal_confidence: Optional[float] = None
    human_confidence: Optional[float] = None
    proximity_threshold: Optional[float] = None
    proximity_threshold_meters: Optional[float] = None

@app.post("/api/settings")
async def update_settings(req: SettingsUpdateRequest):
    if req.channel_id in video_stream_service.channels:
        ch = video_stream_service.channels[req.channel_id]
        ch.update_settings(
            conf1=req.drowning_confidence if ch.channel_type == "DROWNING" else req.animal_confidence,
            conf2=req.human_confidence,
            proximity=req.proximity_threshold,
            proximity_meters=req.proximity_threshold_meters
        )
    elif req.channel_id == "all":
        if "drowning" in video_stream_service.channels:
            video_stream_service.channels["drowning"].update_settings(
                conf1=req.drowning_confidence
            )
        if "animal_human" in video_stream_service.channels:
            video_stream_service.channels["animal_human"].update_settings(
                conf1=req.animal_confidence,
                conf2=req.human_confidence,
                proximity=req.proximity_threshold,
                proximity_meters=req.proximity_threshold_meters
            )
            
    return {"status": "success", "message": "Settings updated"}

# -----------------
# WebSocket Endpoint
# -----------------
@app.websocket("/ws/alerts")
async def websocket_alerts_endpoint(websocket: WebSocket):
    await alert_manager.register_websocket(websocket)
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        alert_manager.unregister_websocket(websocket)
    except Exception:
        alert_manager.unregister_websocket(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
