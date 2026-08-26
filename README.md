# 🛡️ AI Vision Surveillance & Threat Alert System

An autonomous, real-time Computer Vision surveillance and alert system built with **FastAPI** (Backend) and **React + Vite + Tailwind CSS** (Frontend), powered by deep learning **YOLOv8** models.

---

## 🌟 Key Features

### 1. 🏊 Water Rescue & Drowning Surveillance
- **Model:** `drowning _best.pt`
- **Classes:** `0: drowning`, `1: swimming`
- **Capabilities:**
  - Real-time bounding box annotations with styled high-visibility alerts.
  - Detects active swimmers vs victims in drowning distress.
  - Temporal smoothing to prevent momentary false triggers.
  - Automatic emergency siren and snapshot evidence logging on drowning detection.

### 2. 🐾 Wildlife Perimeter & Animal-Human Threat Detection
- **Models:** `Animaldetect.pt` (12 animal classes) + `Human.pt` (`person`)
- **Animal Classes:** `Bear`, `Buffalo`, `Camel`, `Cat`, `Cow`, `Deer`, `Dog`, `Donkey`, `Elephant`, `Leopard`, `Lion`, `Tiger`
- **Threat & Attack Early Warning Logic:**
  - **Status 1 (Wild Animal Alone):** Generates **`WARNING: Wild Animal Detected`** (Yellow Alert).
  - **Status 2 (Animal + Human in Shared Vicinity):** Calculates Euclidean proximity distance between person and animal bounding boxes.
  - **Status 3 (Close Proximity Attack Danger):** When distance $\le$ threshold (e.g. 220px), escalates to **`🚨 CRITICAL: POTENTIAL ANIMAL ATTACK / PROXIMITY RISK`** (Flashing Red Alert, emergency sound, snapshot capture).

### 3. 🖥️ Interactive Web Command Center (React)
- **Multi-Channel Feeds:** Switch between *Wildlife Threat Mode*, *Water Rescue Mode*, or *Dual Monitor Split Grid*.
- **Live Video Streaming:** Low-latency MJPEG stream rendered directly in browser.
- **Threat Radar & Telemetry:** Real-time distance meter, species badges, personnel count, and automated protocol recommendations.
- **Incident & Evidence Archive:** Searchable/filterable historical alert logs with high-resolution frame snapshot modal viewer.
- **Custom Video & Webcam Support:** Run demo video footage, upload custom video files (`.mp4`, `.avi`, `.mov`), or switch to live USB webcam.
- **Model Sensitivity Controls:** Real-time adjustable sliders for confidence thresholds and proximity warning distance.
- **Real-Time Push Notifications:** WebSocket connection (`ws://localhost:8000/ws/alerts`) with emergency audio chime and visual banners.

---

## 🚀 Quick Start & How to Run

### Option 1: One-Click Launcher (Windows)
Double-click:
```bash
start_all.bat
```
This will automatically launch the **FastAPI Backend** and the **React Dashboard** in separate terminal windows.

---

### Option 2: Manual Terminal Commands

#### Step 1: Start Backend API (FastAPI)
```bash
cd "d:\Research Nuzri"
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```
- **Backend API:** `http://localhost:8000`
- **Interactive Swagger Docs:** `http://localhost:8000/docs`

#### Step 2: Start Frontend Dashboard (React)
```bash
cd "d:\Research Nuzrirontend"
npm run dev
```
- **Frontend Dashboard:** `http://localhost:5173`

---

## 📁 Project Architecture

```
d:/Research Nuzri/
├── Animaldetect.pt                     # YOLOv8 Animal Detection Model (12 classes)
├── Human.pt                            # YOLOv8 Human Detection Model
├── drowning _best.pt                   # YOLOv8 Drowning & Swimming Model
├── animal human detextion video.mp4    # Sample CCTV benchmark video
│
├── backend/                            # FastAPI Backend Service
│   ├── main.py                         # FastAPI App & REST/WebSocket routes
│   ├── config.py                       # Paths, default thresholds, & settings
│   ├── database/
│   │   └── db.py                       # SQLite database for incidents & stats
│   ├── services/
│   │   ├── alert_manager.py            # Alert debounce, snapshots, WebSocket broadcast
│   │   ├── vision_drowning.py          # Drowning detector & HUD overlay
│   │   ├── vision_animal_human.py      # Animal & Human proximity threat engine
│   │   └── video_stream.py             # Video loop & OpenCV stream manager
│   ├── static/
│   │   ├── snapshots/                  # Incident snapshot image captures
│   │   └── uploads/                    # User-uploaded test video files
│   └── requirements.txt                # Python backend dependencies
│
├── frontend/                           # React + Vite + Tailwind CSS Dashboard
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.jsx              # Status bar, time, audio toggle
│   │   │   ├── LivePlayer.jsx          # Live video feed player & controls
│   │   │   ├── ThreatRadar.jsx         # Animal-Human proximity radar & gauge
│   │   │   ├── DrowningStatsCard.jsx   # Water rescue telemetry card
│   │   │   ├── AlertCenter.jsx         # Real-time alert notifications list
│   │   │   ├── IncidentLog.jsx         # Historical incident table & search
│   │   │   ├── SnapshotModal.jsx       # Modal to view high-res snapshot evidence
│   │   │   ├── SettingsModal.jsx       # Confidence & proximity slider controls
│   │   │   └── UploadModal.jsx         # Drag-and-drop video file uploader
│   │   ├── hooks/
│   │   │   └── useWebSocket.js         # WebSocket client & audio alarm synth
│   │   ├── services/
│   │   │   └── api.js                  # Axios REST API client
│   │   ├── App.jsx                     # Master dashboard layout & tabs
│   │   └── index.css                   # Custom styles & dark cyber theme
│   └── package.json
│
├── run_backend.bat                     # Backend launcher
├── run_frontend.bat                    # Frontend launcher
├── start_all.bat                       # One-click full-stack launcher
└── README.md                           # Documentation
```

---

## 📡 Key REST & WebSocket APIs

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `GET /api/stream/{channel_id}` | `GET` | MJPEG video stream (`drowning` or `animal_human`) |
| `POST /api/stream/control` | `POST` | Control stream (`start`, `stop`, `restart`, switch source) |
| `GET /api/stream/{channel_id}/stats` | `GET` | Get real-time detection telemetry for channel |
| `GET /api/alerts` | `GET` | Retrieve incident logs with pagination & filters |
| `GET /api/alerts/stats` | `GET` | Aggregated statistics (critical count, warnings, etc.) |
| `POST /api/upload` | `POST` | Upload custom test video file |
| `GET /api/videos` | `GET` | List available sample and uploaded videos |
| `POST /api/settings` | `POST` | Update detection confidence & distance thresholds |
| `WS /ws/alerts` | `WebSocket` | Real-time push stream for instant incident notifications |
