# 🛡️ AI Vision Surveillance & Threat Alert System

An autonomous, real-time Computer Vision surveillance, rescue, and early-warning alert system built with **FastAPI** (Backend) and **React + Vite + Tailwind CSS** (Frontend), powered by deep learning **YOLOv8** models.

---

## 📋 Table of Contents
1. [System Features & AI Models](#-system-features--ai-models)
2. [Prerequisites & Software Downloads](#-prerequisites--software-downloads)
3. [Required Libraries & Dependencies](#-required-libraries--dependencies)
4. [Step-by-Step Local Installation Guide](#-step-by-step-local-installation-guide)
5. [Running the Application](#-running-the-application)
6. [How to Use the Dashboard](#-how-to-use-the-dashboard)
7. [Project Directory Structure](#-project-directory-structure)
8. [REST & WebSocket API Reference](#-rest--websocket-api-reference)
9. [Troubleshooting & FAQs](#-troubleshooting--faqs)

---

## 🌟 System Features & AI Models

### 1. 🏊 Water Rescue & Drowning Surveillance
- **Model:** `drowning _best.pt` (YOLOv8)
- **Classes:** `0: drowning`, `1: swimming`
- **Capabilities:**
  - Real-time bounding box annotations (**High-Vis RED** for Drowning, **Cyan** for Swimming).
  - Multi-frame temporal smoothing to verify genuine drowning distress and prevent false triggers.
  - Generates instant emergency logs with timestamp and captured high-resolution snapshot frames.

### 2. 🐾 Wildlife Perimeter & Animal-Human Threat Detection
- **Models:** `Animaldetect.pt` (12 Animal classes) + `Human.pt` (Person class)
- **Animal Classes (12):** `Bear`, `Buffalo`, `Camel`, `Cat`, `Cow`, `Deer`, `Dog`, `Donkey`, `Elephant`, `Leopard`, `Lion`, `Tiger`
- **Rigorous Spatial-Metric Threat Engine:**
  - **Actual Position Tracking:** Evaluates separation using the actual detected coordinates of both the animal $(C_{animal})$ and human $(C_{human})$ bounding boxes in the 2D camera plane (neither entity is treated as 0 pixels / origin).
  - **Edge-to-Edge Boundary Clearance ($d_{edge}$):** Measures the physical clearance between outer bounding box perimeters ($\Delta x, \Delta y$). Direct physical contact occurs at $d_{edge} = 0.0\text{ m}$.
  - **Perspective Metric Distance (Meters):** Dynamically scales pixel distance to real-world meters ($m$) via camera perspective geometry using the anatomical human height reference ($H_{human} = 1.70\text{ m}$):
    $$\text{Scale } S = \frac{1.70\text{ m}}{h_{human\_px}} \quad \Longrightarrow \quad d_{meters} = d_{px} \times S$$
  - **Status 1 (Wild Animal Alone):** Generates **`⚠️ WARNING: Wild Animal Detected`** (Amber Alert).
  - **Status 2 (Animal + Human in Shared Vicinity):** Dynamically measures distance in meters and feet (e.g. `4.2m / 13.8ft`).
  - **Status 3 (Close Proximity Attack Danger):** When real-world distance $\le 3.5\text{ m}$ or physical edge gap $\le 1.5\text{ m}$, escalates to **`🚨 CRITICAL: POTENTIAL ANIMAL ATTACK / PROXIMITY RISK`** (Flashing Red Alert, emergency buzzer, frame snapshot).

### 3. 🚨 Continuous Emergency Buzzer Alarm ("Beep-Beep")
- Continuous rhythmic **"Beep-Beep... Beep-Beep"** emergency siren from the speaker via Web Audio API whenever a Critical signal is triggered.
- **Manual Silence Control:** Keeps sounding continuously until the user manually stops it via:
  - Clicking **"STOP BUZZER"** on the pulsing top emergency banner.
  - Pressing **`SPACEBAR`** or **`ESCAPE`** on the keyboard.
  - Clicking **"SILENCE BUZZER"** in the top navigation bar or alert feed.

---

## 💻 Prerequisites & Software Downloads

Before running the system locally, ensure the following software is installed on your computer:

| Software | Required Version | Download Link | Purpose |
| :--- | :--- | :--- | :--- |
| **Python** | `3.10`, `3.11`, or `3.12` | [python.org/downloads](https://www.python.org/downloads/) | Runs the FastAPI backend, PyTorch, and YOLO models. *(Make sure to check "Add Python to PATH" during installation)* |
| **Node.js & npm** | `v18.x`, `v20.x`, or `v22.x` (LTS) | [nodejs.org](https://nodejs.org/) | Compiles and serves the React dashboard. |
| **Git** | Latest | [git-scm.com](https://git-scm.com/) | Version control and cloning the repository. |
| **NVIDIA CUDA (Optional)** | `CUDA 11.8` or `12.x` | [developer.nvidia.com/cuda-downloads](https://developer.nvidia.com/cuda-downloads) | *Optional:* For GPU-accelerated real-time YOLO inference. |

---

## 📦 Required Libraries & Dependencies

### A. Python Backend Libraries
These libraries are listed in `backend/requirements.txt`:

| Package | Version | Description |
| :--- | :--- | :--- |
| **`ultralytics`** | `>=8.0.0` | YOLOv8 computer vision and object detection framework. |
| **`torch` & `torchvision`** | `>=2.0.0` | Deep learning engine powering the model weights. |
| **`fastapi`** | `>=0.110.0` | Asynchronous web framework for REST APIs and streaming. |
| **`uvicorn`** | `>=0.28.0` | High-performance ASGI server for hosting FastAPI. |
| **`opencv-python`** | `>=4.8.0` | Video decoding, frame capture, annotations, and JPEG encoding. |
| **`websockets`** | `>=12.0` | Full-duplex real-time alert event broadcasting. |
| **`pydantic`** | `>=2.0.0` | Data validation and API request schemas. |
| **`python-multipart`** | `>=0.0.9` | Multipart form support for video file uploads. |

### B. JavaScript / React Frontend Libraries
These packages are listed in `frontend/package.json`:

| Package | Version | Description |
| :--- | :--- | :--- |
| **`react` & `react-dom`** | `^18.3.1` | Core React framework. |
| **`vite`** | `^5.1.4` | Next-generation frontend build tool and dev server. |
| **`tailwindcss`** | `^3.4.1` | Utility-first CSS framework for modern dark-mode UI. |
| **`lucide-react`** | `^0.344.0` | Modern iconography for surveillance controls. |
| **`axios`** | `^1.6.7` | HTTP client for REST API communication. |

---

## 🛠️ Step-by-Step Local Installation Guide

### Step 1: Clone the Repository
Open Command Prompt, PowerShell, or Terminal and clone the project:
```bash
git clone https://github.com/teamcore38-droid/detection-research.git
cd detection-research
```

---

### Step 2: Set Up Python Backend Environment

#### Option A: Using Python `venv` (Standard)
```bash
# 1. Create a virtual environment
python -m venv venv

# 2. Activate the virtual environment:
# On Windows:
venv\Scriptsctivate
# On Linux / macOS:
source venv/bin/activate

# 3. Upgrade pip
python -m pip install --upgrade pip

# 4. Install backend dependencies
pip install -r backend/requirements.txt
```

#### Option B: Using Conda / Miniconda
```bash
# 1. Create and activate a conda environment
conda create -n vision-sentry python=3.11 -y
conda activate vision-sentry

# 2. Install dependencies
pip install -r backend/requirements.txt
```

> **Note on PyTorch with GPU (CUDA):**
> If you have an NVIDIA graphics card, install CUDA-enabled PyTorch for faster inference:
> ```bash
> pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
> ```

---

### Step 3: Install Frontend Dependencies
In the same project directory, navigate into the `frontend` folder and install npm packages:
```bash
cd frontend
npm install
cd ..
```

---

## 🚀 Running the Application

### Option 1: Single-Click Launcher (Windows)
Simply double-click the included batch file in the root folder:
```bash
start_all.bat
```
*This opens two terminal windows to run both the FastAPI backend and React frontend concurrently.*

---

### Option 2: Run via Terminal (Windows, macOS, Linux)

#### 1. Start the Backend Server (Terminal 1)
```bash
# From the project root directory:
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```
- **Backend URL:** `http://localhost:8000`
- **Interactive Swagger Docs:** `http://localhost:8000/docs`

#### 2. Start the Frontend Dashboard (Terminal 2)
```bash
# In a second terminal window:
cd frontend
npm run dev
```
- **Frontend Dashboard:** `http://localhost:5173`

Open **`http://localhost:5173`** in Google Chrome, Microsoft Edge, or Firefox.

---

## 🖥️ How to Use the Dashboard

1. **Surveillance Modes**:
   - **Wildlife Threat Mode:** Live camera monitoring animals and humans. Identifies species, measures distance, and alerts on attack danger.
   - **Water Rescue Mode:** CCTV monitoring swimmers and triggers emergency rescue alarms for drowning distress.
   - **Dual Monitor Grid:** View and monitor both feeds side-by-side.
   - **Incident Archives:** Search and review past emergencies with snapshot evidence.

2. **Custom Video Upload & Live Switching**:
   - Click the **"Upload Video"** button on the video player.
   - Select any video file (`.mp4`, `.avi`, `.mov`) $ightarrow$ click **"Upload & Start Stream"**.
   - The video will immediately start streaming with live bounding box detections.

3. **Webcam Support**:
   - In the video source dropdown, switch to **"🎥 Live Webcam"** to run real-time detection on your USB/built-in camera.

4. **Emergency Buzzer & Alarm Controls**:
   - When a Critical signal is triggered, the speaker sounds a continuous **"beep-beep"** buzzer.
   - Click **"STOP BUZZER"** on the top banner or press **`SPACEBAR`** / **`ESC`** to silence it.

5. **Detection Sensitivity Sliders**:
   - Click the **Sliders icon** (Settings) in the top-right header to adjust confidence thresholds (0.2 - 0.9) and danger proximity distance (80px - 400px).

---

## 📁 Project Directory Structure

```
detection-research/
├── Animaldetect.pt                     # YOLOv8 Model (12 Animal classes)
├── Human.pt                            # YOLOv8 Model (Person detection)
├── drowning _best.pt                   # YOLOv8 Model (Drowning vs Swimming)
├── drowning sample.mp4                 # Water rescue benchmark test video
├── animal human detextion video.mp4    # Wildlife & human benchmark test video
│
├── backend/                            # FastAPI Backend Application
│   ├── main.py                         # REST APIs, MJPEG generator & WebSocket
│   ├── config.py                       # Paths, default thresholds & configurations
│   ├── database/
│   │   ├── __init__.py
│   │   └── db.py                       # SQLite database layer for incident storage
│   ├── services/
│   │   ├── __init__.py
│   │   ├── alert_manager.py            # Alert debounce, snapshots & WS broadcast
│   │   ├── vision_drowning.py          # Drowning detector & HUD overlay
│   │   ├── vision_animal_human.py      # Animal & Human proximity threat engine
│   │   └── video_stream.py             # OpenCV video loop & stream manager
│   ├── static/
│   │   ├── snapshots/                  # Incident snapshot image captures
│   │   └── uploads/                    # User-uploaded test video files
│   └── requirements.txt                # Python backend dependencies
│
├── frontend/                           # React + Vite + Tailwind CSS Dashboard
│   ├── package.json                    # Node dependencies
│   ├── vite.config.js                  # Vite server & proxy configuration
│   ├── tailwind.config.js              # Tailwind theme configuration
│   ├── index.html                      # HTML entrypoint
│   └── src/
│       ├── App.jsx                     # Master layout & channel router
│       ├── main.jsx                    # React DOM root
│       ├── index.css                   # Global styles & animations
│       ├── hooks/
│       │   └── useWebSocket.js         # WebSocket client & Web Audio buzzer synth
│       ├── services/
│       │   └── api.js                  # Axios client for REST API endpoints
│       └── components/
│           ├── Header.jsx              # Status bar, audio toggle & clock
│           ├── EmergencyBuzzer.jsx     # Emergency buzzer banner & stop button
│           ├── LivePlayer.jsx          # Live video stream player & source selector
│           ├── ThreatRadar.jsx         # Animal-Human proximity radar & threat gauge
│           ├── DrowningStatsCard.jsx   # Water rescue telemetry card
│           ├── AlertCenter.jsx         # Real-time sliding incident notification feed
│           ├── IncidentLog.jsx         # Searchable incident archive table
│           ├── SnapshotModal.jsx       # Modal to view high-res snapshot evidence
│           ├── SettingsModal.jsx       # Confidence & proximity threshold sliders
│           └── UploadModal.jsx         # Drag-and-drop video file uploader
│
├── run_backend.bat                     # Windows Backend launcher
├── run_frontend.bat                    # Windows Frontend launcher
├── start_all.bat                       # One-click full-stack launcher
└── README.md                           # Documentation
```

---

## 📡 REST & WebSocket API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `GET /api/stream/{channel_id}` | `GET` | MJPEG video stream (`drowning` or `animal_human`). |
| `POST /api/stream/control` | `POST` | Control stream (`start`, `stop`, `restart`, switch source). |
| `GET /api/stream/{channel_id}/stats` | `GET` | Real-time telemetry (detected counts, distance, threat level). |
| `GET /api/alerts` | `GET` | Retrieve incident logs with pagination and filters. |
| `GET /api/alerts/stats` | `GET` | Summary stats (total, critical count, warnings, etc.). |
| `POST /api/alerts/{id}/acknowledge` | `POST` | Mark an alert incident as acknowledged. |
| `POST /api/alerts/clear` | `POST` | Clear all historical alerts from the database. |
| `POST /api/upload` | `POST` | Upload custom test video file. |
| `GET /api/videos` | `GET` | List available sample and uploaded videos. |
| `POST /api/settings` | `POST` | Update detection confidence & distance thresholds dynamically. |
| `WS /ws/alerts` | `WebSocket` | Real-time push stream for instant incident notifications. |

---

## ❓ Troubleshooting & FAQs

### 1. `ModuleNotFoundError: No module named 'ultralytics'`
- **Fix:** Make sure you activated the correct Python virtual environment where you ran `pip install -r backend/requirements.txt`.
- Run: `python -m pip install ultralytics`

### 2. `ERR_CONNECTION_REFUSED :8000` in Browser Console
- **Fix:** The FastAPI backend is not running. Start the backend in a terminal:
  ```bash
  python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
  ```

### 3. No Audio / Buzzer Sound When Critical Signal Appears
- **Fix:** Modern browsers block audio autoplay until the user interacts with the page. Click anywhere on the dashboard or toggle the audio icon in the header once to enable sound permissions.

### 4. Port 8000 or 5173 Already in Use
- **Fix (Windows):** Open Command Prompt and run:
  ```cmd
  netstat -ano | findstr :8000
  taskkill /PID <PID_NUMBER> /F
  ```
- **Fix (Linux/Mac):**
  ```bash
  lsof -ti:8000 | xargs kill -9
  ```
