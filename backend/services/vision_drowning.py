import cv2
import numpy as np
from ultralytics import YOLO
from backend.config import DROWNING_MODEL_PATH, DEFAULT_CONF_DROWNING

class DrowningDetector:
    def __init__(self, model_path: str = DROWNING_MODEL_PATH):
        print(f"Loading Drowning Detection Model: {model_path}")
        self.model = YOLO(model_path)
        self.class_names = self.model.names # {0: 'drowning', 1: 'swimming'}
        self.drowning_history = [] # For temporal smoothing

    def reset(self):
        """Clears temporal smoothing history on stream change or loop restart."""
        self.drowning_history.clear()

    def process_frame(self, frame: np.ndarray, conf_threshold: float = DEFAULT_CONF_DROWNING):
        """
        Runs drowning model on frame and renders HUD and bounding boxes.
        Returns:
            annotated_frame (np.ndarray),
            stats (dict)
        """
        results = self.model.predict(source=frame, conf=conf_threshold, verbose=False)
        annotated = frame.copy()
        
        h, w, _ = frame.shape
        drowning_count = 0
        swimming_count = 0
        detections = []
        max_drowning_conf = 0.0

        for r in results:
            for box in r.boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                conf = float(box.conf[0])
                cls_id = int(box.cls[0])
                label_raw = self.class_names.get(cls_id, str(cls_id)).lower()

                # Ensure within image bounds
                x1, y1 = max(0, x1), max(0, y1)
                x2, y2 = min(w, x2), min(h, y2)

                if "drown" in label_raw:
                    drowning_count += 1
                    if conf > max_drowning_conf:
                        max_drowning_conf = conf
                    
                    # High-visibility RED box for drowning
                    color = (0, 0, 240) # BGR Red
                    cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 3)
                    
                    # Red glowing corner accents
                    accent_len = min(20, (x2 - x1) // 3, (y2 - y1) // 3)
                    cv2.line(annotated, (x1, y1), (x1 + accent_len, y1), (0, 255, 255), 4)
                    cv2.line(annotated, (x1, y1), (x1, y1 + accent_len), (0, 255, 255), 4)
                    cv2.line(annotated, (x2, y2), (x2 - accent_len, y2), (0, 255, 255), 4)
                    cv2.line(annotated, (x2, y2), (x2, y2 - accent_len), (0, 255, 255), 4)

                    label_text = f"🚨 DROWNING: {conf*100:.1f}%"
                    # Background tag
                    (tw, th), _ = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_DUPLEX, 0.6, 1)
                    cv2.rectangle(annotated, (x1, max(0, y1 - 25)), (x1 + tw + 10, y1), color, -1)
                    cv2.putText(annotated, label_text, (x1 + 5, y1 - 7),
                                cv2.FONT_HERSHEY_DUPLEX, 0.6, (255, 255, 255), 1, cv2.LINE_AA)
                    
                    detections.append({
                        "class": "drowning",
                        "confidence": round(conf, 3),
                        "bbox": [x1, y1, x2, y2]
                    })
                else:
                    swimming_count += 1
                    # Cyan/Teal box for swimming
                    color = (255, 200, 0) # BGR Cyan/Blue
                    cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)
                    
                    label_text = f"Swimming: {conf*100:.1f}%"
                    (tw, th), _ = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
                    cv2.rectangle(annotated, (x1, max(0, y1 - 20)), (x1 + tw + 8, y1), (50, 50, 50), -1)
                    cv2.putText(annotated, label_text, (x1 + 4, y1 - 5),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1, cv2.LINE_AA)
                                
                    detections.append({
                        "class": "swimming",
                        "confidence": round(conf, 3),
                        "bbox": [x1, y1, x2, y2]
                    })

        # Temporal smoothing for drowning emergency
        self.drowning_history.append(1 if drowning_count > 0 else 0)
        if len(self.drowning_history) > 10:
            self.drowning_history.pop(0)

        is_emergency = drowning_count > 0 or sum(self.drowning_history) >= 2
        threat_level = "CRITICAL" if is_emergency else ("INFO" if swimming_count > 0 else "SAFE")

        # Draw HUD Top Bar
        hud_bg_color = (20, 20, 160) if is_emergency else (30, 30, 30)
        cv2.rectangle(annotated, (0, 0), (w, 42), hud_bg_color, -1)
        cv2.line(annotated, (0, 42), (w, 42), (0, 0, 255) if is_emergency else (80, 80, 80), 2)

        # Status text
        status_str = "🚨 CRITICAL: DROWNING EVENT DETECTED!" if is_emergency else "WATER RESCUE SURVEILLANCE - NORMAL"
        status_color = (255, 255, 255) if is_emergency else (0, 255, 200)
        cv2.putText(annotated, status_str, (15, 28), cv2.FONT_HERSHEY_DUPLEX, 0.7, status_color, 2, cv2.LINE_AA)

        # Stats tags
        stats_text = f"Drowning: {drowning_count}  |  Swimming: {swimming_count}"
        cv2.putText(annotated, stats_text, (w - 320, 27), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (240, 240, 240), 1, cv2.LINE_AA)

        # Pulsing emergency border on frame if emergency
        if is_emergency:
            cv2.rectangle(annotated, (0, 0), (w - 1, h - 1), (0, 0, 255), 6)

        stats = {
            "channel": "DROWNING_RESCUE",
            "threat_level": threat_level,
            "is_emergency": is_emergency,
            "drowning_count": drowning_count,
            "swimming_count": swimming_count,
            "max_confidence": max_drowning_conf if drowning_count > 0 else (detections[0]["confidence"] if detections else 0.0),
            "detections": detections
        }

        return annotated, stats
