import cv2
import time
import threading
import os
import numpy as np
from typing import Dict, Optional

from backend.config import DEFAULT_DROWNING_VIDEO, DEFAULT_ANIMAL_HUMAN_VIDEO
from backend.services.vision_drowning import DrowningDetector
from backend.services.vision_animal_human import AnimalHumanThreatDetector
from backend.services.alert_manager import alert_manager

class StreamChannel:
    def __init__(self, channel_id: str, channel_type: str, source: str):
        self.channel_id = channel_id
        self.channel_type = channel_type # "DROWNING" or "ANIMAL_HUMAN"
        self.source = str(source)
        
        self.is_running = False
        self.lock = threading.Lock()
        self.thread: Optional[threading.Thread] = None
        self.latest_encoded_frame: Optional[bytes] = None
        self.latest_stats: dict = {}
        
        # Detector instances (pre-initialize for instant inference)
        if self.channel_type == "DROWNING":
            self.drowning_detector = DrowningDetector()
            self.animal_human_detector = None
        else:
            self.drowning_detector = None
            self.animal_human_detector = AnimalHumanThreatDetector()
        
        # Settings
        self.conf_threshold_1 = 0.40
        self.conf_threshold_2 = 0.50
        self.proximity_threshold = 220

        # Background inference caching for ultra-smooth 30fps live video
        self.latest_raw_frame = None
        self.cached_annotated_frame = None
        self.cached_stats = {}
        self.inference_thread = None

    def start(self):
        if self.is_running:
            return
        self.is_running = True
        self.thread = threading.Thread(target=self._capture_loop, daemon=True)
        self.thread.start()

    def stop(self):
        self.is_running = False
        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=1.0)

    def set_source(self, new_source: str):
        with self.lock:
            self.source = str(new_source).strip()
            self.latest_encoded_frame = None
            self.latest_raw_frame = None

    def update_settings(self, conf1: float = None, conf2: float = None, proximity: float = None):
        if conf1 is not None:
            self.conf_threshold_1 = conf1
        if conf2 is not None:
            self.conf_threshold_2 = conf2
        if proximity is not None:
            self.proximity_threshold = proximity

    def _is_live_stream(self, src):
        src_str = str(src).lower().strip()
        if src_str in ["webcam", "camera_0", "camera 0", "0", "camera_1", "camera 1", "1", "camera_2", "2"]:
            return True
        if src_str.isdigit():
            return True
        if src_str.startswith("http://") or src_str.startswith("https://") or src_str.startswith("rtsp://"):
            return True
        return False

    def _open_capture(self):
        src = self.source
        src_str = str(src).lower().strip()
        
        # 1. Device index for webcam / USB DroidCam / DirectShow
        if src_str in ["webcam", "camera_0", "camera 0", "0"]:
            print(f"[{self.channel_id}] Opening Camera Index 0 with DirectShow...")
            cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
            cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            return cap
        elif src_str in ["camera_1", "camera 1", "1", "phone_usb"]:
            print(f"[{self.channel_id}] Opening Camera Index 1 with DirectShow...")
            cap = cv2.VideoCapture(1, cv2.CAP_DSHOW)
            if not cap.isOpened():
                print(f"[{self.channel_id}] Camera Index 1 not found, trying Camera 0...")
                cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
            cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            return cap
        elif src_str in ["camera_2", "camera 2", "2"]:
            cap = cv2.VideoCapture(2, cv2.CAP_DSHOW)
            cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            return cap
        elif src_str.isdigit():
            cap = cv2.VideoCapture(int(src_str), cv2.CAP_DSHOW)
            cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            return cap
            
        # 2. IP camera / Phone Wi-Fi Stream URL (e.g. http://192.168.x.x:4747/video)
        elif str(src).startswith("http://") or str(src).startswith("https://") or str(src).startswith("rtsp://"):
            print(f"[{self.channel_id}] Opening Network IP Stream: {src}")
            cap = cv2.VideoCapture(str(src).strip())
            try:
                cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            except Exception:
                pass
            return cap
            
        # 3. Local Video File
        else:
            file_path = os.path.normpath(str(src))
            if not os.path.exists(file_path):
                print(f"[{self.channel_id}] [Warning] Video file not found: {file_path}, falling back to default")
                file_path = DEFAULT_DROWNING_VIDEO if self.channel_type == "DROWNING" else DEFAULT_ANIMAL_HUMAN_VIDEO
                self.source = file_path
            print(f"[{self.channel_id}] Opening Local Video File: {file_path}")
            cap = cv2.VideoCapture(file_path)
            return cap

    def _capture_loop(self):
        print(f"Started video capture loop for '{self.channel_id}' (Source: {self.source})")
        cap = self._open_capture()

        if not cap.isOpened():
            print(f"Failed to open source {self.source} for channel {self.channel_id}")
            # Try fallback to default video
            fallback = DEFAULT_DROWNING_VIDEO if self.channel_type == "DROWNING" else DEFAULT_ANIMAL_HUMAN_VIDEO
            self.source = fallback
            cap = cv2.VideoCapture(fallback)
            if not cap.isOpened():
                self.is_running = False
                return

        fps = cap.get(cv2.CAP_PROP_FPS)
        frame_delay = 1.0 / (fps if fps and fps > 5 and fps < 60 else 25.0)

        current_active_source = self.source
        is_live = self._is_live_stream(self.source)

        while self.is_running:
            start_t = time.time()
            
            # Check if user switched source in UI
            if self.source != current_active_source:
                cap.release()
                cap = self._open_capture()
                current_active_source = self.source
                is_live = self._is_live_stream(self.source)
                if not cap.isOpened():
                    time.sleep(0.3)
                    continue

            ret, frame = cap.read()
            
            if not ret:
                # Video file reached end -> rewind loop smoothly
                if not is_live:
                    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    ret, frame = cap.read()
                    if not ret:
                        cap.release()
                        cap = self._open_capture()
                        ret, frame = cap.read()
                        if not ret:
                            time.sleep(0.05)
                            continue
                else:
                    # Live camera stream frame dropped -> wait brief instant
                    time.sleep(0.03)
                    continue

            # Resize HD frames slightly for blazing fast real-time inference on CPU
            h, w = frame.shape[:2]
            if w > 960:
                frame = cv2.resize(frame, (960, int(h * 960 / w)))

            annotated_frame = frame
            stats = {}

            try:
                if self.channel_type == "DROWNING":
                    annotated_frame, stats = self.drowning_detector.process_frame(
                        frame, conf_threshold=self.conf_threshold_1
                    )
                    
                    if stats.get("is_emergency"):
                        alert_manager.trigger_alert_sync(
                            channel="DROWNING_RESCUE",
                            alert_type="DROWNING_EMERGENCY",
                            threat_level="CRITICAL",
                            title="🚨 Drowning Incident Detected",
                            message=f"Drowning person detected with {stats['max_confidence']*100:.1f}% confidence!",
                            detected_classes=["drowning"],
                            confidence=stats["max_confidence"],
                            frame=annotated_frame
                        )
                else: # ANIMAL_HUMAN
                    annotated_frame, stats = self.animal_human_detector.process_frame(
                        frame, 
                        animal_conf=self.conf_threshold_1,
                        human_conf=self.conf_threshold_2,
                        proximity_thresh=self.proximity_threshold
                    )
                    
                    threat_level = stats.get("threat_level")
                    if threat_level == "CRITICAL":
                        alert_manager.trigger_alert_sync(
                            channel="ANIMAL_HUMAN_SECURITY",
                            alert_type="ANIMAL_ATTACK_RISK",
                            threat_level="CRITICAL",
                            title="🚨 Animal Attack / Proximity Alert",
                            message=f"Wild animal ({stats['detected_animals']}) dangerously close to human ({stats.get('min_distance')}px)!",
                            detected_classes=stats.get("detected_classes", []),
                            confidence=stats["max_confidence"],
                            distance_pixels=stats.get("min_distance"),
                            frame=annotated_frame
                        )
                    elif threat_level == "WARNING" and stats.get("detected_animals"):
                        alert_manager.trigger_alert_sync(
                            channel="ANIMAL_HUMAN_SECURITY",
                            alert_type="WILD_ANIMAL_WARNING",
                            threat_level="WARNING",
                            title="⚠️ Wild Animal Warning",
                            message=f"Wild animal detected: {', '.join(stats['detected_animals'])}",
                            detected_classes=stats.get("detected_classes", []),
                            confidence=stats["max_confidence"],
                            frame=annotated_frame
                        )
            except Exception as e:
                print(f"Inference error in channel {self.channel_id}: {e}")

            # Encode frame to JPEG
            ret_encode, buffer = cv2.imencode(".jpg", annotated_frame, [cv2.IMWRITE_JPEG_QUALITY, 75])
            if ret_encode:
                with self.lock:
                    self.latest_encoded_frame = buffer.tobytes()
                    self.latest_stats = stats

            # Rate limiting: For live camera streams, yield immediately without extra sleep
            if not is_live:
                elapsed = time.time() - start_t
                sleep_time = max(0.01, frame_delay - elapsed)
                time.sleep(sleep_time)
            else:
                time.sleep(0.005)

        cap.release()
        print(f"Stream loop stopped for channel {self.channel_id}")

class VideoStreamService:
    def __init__(self):
        self.channels: Dict[str, StreamChannel] = {}
        self._init_default_channels()

    def _init_default_channels(self):
        self.channels["drowning"] = StreamChannel(
            channel_id="drowning",
            channel_type="DROWNING",
            source=DEFAULT_DROWNING_VIDEO
        )
        self.channels["animal_human"] = StreamChannel(
            channel_id="animal_human",
            channel_type="ANIMAL_HUMAN",
            source=DEFAULT_ANIMAL_HUMAN_VIDEO
        )

    def start_channel(self, channel_id: str, source: str = None):
        if channel_id not in self.channels:
            raise ValueError(f"Unknown channel: {channel_id}")
        
        channel = self.channels[channel_id]
        if source:
            channel.set_source(source)
            
        if not channel.is_running:
            channel.start()

    def stop_channel(self, channel_id: str):
        if channel_id in self.channels:
            self.channels[channel_id].stop()

    def get_frame(self, channel_id: str) -> Optional[bytes]:
        if channel_id in self.channels:
            with self.channels[channel_id].lock:
                return self.channels[channel_id].latest_encoded_frame
        return None

    def get_stats(self, channel_id: str) -> dict:
        if channel_id in self.channels:
            with self.channels[channel_id].lock:
                return self.channels[channel_id].latest_stats
        return {}

video_stream_service = VideoStreamService()
