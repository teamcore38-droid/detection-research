import os
from pathlib import Path

# Base directories
BASE_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = Path(__file__).resolve().parent
STATIC_DIR = BACKEND_DIR / 'static'
SNAPSHOTS_DIR = STATIC_DIR / 'snapshots'
UPLOADS_DIR = STATIC_DIR / 'uploads'
DB_PATH = BACKEND_DIR / 'database' / 'surveillance.db'

# Create directories if they do not exist
SNAPSHOTS_DIR.mkdir(parents=True, exist_ok=True)
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
(BACKEND_DIR / 'database').mkdir(parents=True, exist_ok=True)

# Model Weights Paths
DROWNING_MODEL_PATH = str(BASE_DIR / 'drowning _best.pt')
ANIMAL_MODEL_PATH = str(BASE_DIR / 'Animaldetect.pt')
HUMAN_MODEL_PATH = str(BASE_DIR / 'Human.pt')

# Default Sample Video Paths
DEFAULT_DROWNING_VIDEO = str(BASE_DIR / 'drowning sample.mp4')
DEFAULT_ANIMAL_HUMAN_VIDEO = str(BASE_DIR / 'animal human detextion video.mp4')

# Detection & Alert Thresholds
DEFAULT_CONF_DROWNING = 0.40
DEFAULT_CONF_ANIMAL = 0.50
DEFAULT_CONF_HUMAN = 0.50

# Attack / Threat Proximity Threshold (in pixels)
DEFAULT_PROXIMITY_PIXEL_THRESHOLD = 220

# Temporal debounce for alerts (seconds)
ALERT_DEBOUNCE_SECONDS = 3.0

# Dangerous animal classes that escalate threat when humans are nearby
HIGH_THREAT_ANIMALS = {'Bear', 'Leopard', 'Lion', 'Tiger', 'Elephant'}
MEDIUM_THREAT_ANIMALS = {'Buffalo', 'Cow', 'Dog', 'Camel', 'Donkey', 'Deer'}
LOW_THREAT_ANIMALS = {'Cat'}
