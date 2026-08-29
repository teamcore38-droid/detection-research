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
        self.source = source
        
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
            self.source = new_source
            self.latest_encoded_frame = None

    def update_settings(self, conf1: float = None, conf2: float = None, proximity: float = None):
        if conf1 is not None:
            self.conf_threshold_1 = conf1
        if conf2 is not None:
            self.conf_threshold_2 = conf2
        if proximity is not None:
            self.proximity_threshold = proximity

    def _is_live_stream(self, src):
        if str(src).lower() in ["webcam", "camera_0", "camera 0", "0", "camera_1", "camera 1", "1", "camera_2", "2"]:
            return True
        if str(src).isdigit():
            return True
        if isinstance(src, str) and (src.startswith("http://") or src.startswith("https://") or src.startswith("rtsp://")):
            return True
        return False

    def _open_capture(self):
        src = self.source
        
        # 1. Check camera indices (USB webcam, DroidCam USB, built-in camera)
        if str(src).lower() in ["webcam", "camera_0", "camera 0", "0"]:
            src = 0
        elif str(src).lower() in ["camera_1", "camera 1", "1", "phone_usb"]:
            src = 1
        elif str(src).lower() in ["camera_2", "camera 2", "2"]:
            src = 2
        elif str(src).isdigit():
            src = int(src)
        # 2. Check IP camera / phone Wi-Fi stream URLs
        elif isinstance(src, str) and (src.startswith("http://") or src.startswith("https://") or src.startswith("rtsp://")):
            src = src.strip()
        # 3. Check if local video file exists, otherwise fallback to default
        elif not os.path.exists(str(src)):
            print(f"[Warning] Source not found: {src}, falling back to default")
            src = DEFAULT_DROWNING_VIDEO if self.channel_type == "DROWNING" else DEFAULT_ANIMAL_HUMAN_VIDEO
            self.source = src
            
        cap = cv2.VideoCapture(src)
        # Low buffer for live feeds to prevent lag
        if self._is_live_stream(self.source):
            try:
                cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            except Exception:
                pass
        return cap

    def _capture_loop(self):
        print(f"Starting stream loop for channel '{self.channel_id}' with source: {self.source}")
        cap = self._open_capture()

        if not cap.isOpened():
            print(f"Failed to open source {self.source} for channel {self.channel_id}")
            self.is_running = False
            return

        fps = cap.get(cv2.CAP_PROP_FPS)
        frame_delay = 1.0 / (fps if fps and fps > 5 and fps < 60 else 25.0)

        current_active_source = self.source
        is_live = self._is_live_stream(self.source)

        while self.is_running:
            start_t = time.time()
            
            # Check if source changed dynamically
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
                # If reading offline video file, loop back to start smoothly
                if not is_live:
                    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    ret, frame = cap.read()
                    if not ret:
                        cap.release()
                        cap = self._open_capture()
                        ret, frame = cap.read()
                        if not ret:
                            time.sleep(0.1)
                            continue
                else:
                    # For live phone/webcam stream, wait briefly before retrying
                    time.sleep(0.1)
                    continue

            # Process frame with vision model
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
            ret_encode, buffer = cv2.imencode(".jpg", annotated_frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
            if ret_encode:
                with self.lock:
                    self.latest_encoded_frame = buffer.tobytes()
                    self.latest_stats = stats

            # Rate limiting
            elapsed = time.time() - start_t
            sleep_time = max(0.015, frame_delay - elapsed)
            time.sleep(sleep_time)

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
        if source and source != channel.source:
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
