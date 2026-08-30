import cv2
import math
import numpy as np
from ultralytics import YOLO
from backend.config import (
    ANIMAL_MODEL_PATH, 
    HUMAN_MODEL_PATH, 
    DEFAULT_CONF_ANIMAL, 
    DEFAULT_CONF_HUMAN,
    DEFAULT_PROXIMITY_PIXEL_THRESHOLD,
    HIGH_THREAT_ANIMALS,
    MEDIUM_THREAT_ANIMALS
)

def calculate_iou(box1, box2):
    """Calculates Intersection over Union (IoU) between two bounding boxes [x1, y1, x2, y2]."""
    xA = max(box1[0], box2[0])
    yA = max(box1[1], box2[1])
    xB = min(box1[2], box2[2])
    yB = min(box1[3], box2[3])

    interArea = max(0, xB - xA) * max(0, yB - yA)
    boxAArea = max(1, (box1[2] - box1[0]) * (box1[3] - box1[1]))
    boxBArea = max(1, (box2[2] - box2[0]) * (box2[3] - box2[1]))

    iou = interArea / float(boxAArea + boxBArea - interArea)
    return iou

class TrackedAnimal:
    def __init__(self, track_id: int, bbox: list, cls_name: str, conf: float):
        self.track_id = track_id
        self.bbox = bbox
        self.center = ((bbox[0] + bbox[2]) // 2, (bbox[1] + bbox[3]) // 2)
        self.current_conf = conf
        self.age = 1
        self.misses = 0
        
        # 80% Persistence Rule: Lock class identity when accuracy/confidence >= 80% (0.80)
        self.is_locked = (conf >= 0.80)
        self.locked_class = cls_name if self.is_locked else cls_name
        self.highest_conf = conf
        self.best_class = cls_name

    def update(self, bbox: list, cls_name: str, conf: float):
        self.bbox = bbox
        self.center = ((bbox[0] + bbox[2]) // 2, (bbox[1] + bbox[3]) // 2)
        self.current_conf = conf
        self.age += 1
        self.misses = 0

        # Once confidence reaches >= 80%, lock this animal's name permanently
        if conf >= 0.80:
            if not self.is_locked:
                self.is_locked = True
                self.locked_class = cls_name
                self.highest_conf = conf
            else:
                if conf > self.highest_conf and cls_name == self.locked_class:
                    self.highest_conf = conf
        else:
            # If not yet locked at 80%, keep track of the highest confidence observation
            if not self.is_locked:
                if conf > self.highest_conf:
                    self.highest_conf = conf
                    self.best_class = cls_name

    def get_identity(self):
        """Returns the stable class name, display confidence, and locked status."""
        if self.is_locked:
            return self.locked_class, max(self.highest_conf, self.current_conf), True
        return self.best_class, max(self.highest_conf, self.current_conf), False

class AnimalTrackerManager:
    def __init__(self, iou_threshold: float = 0.20, max_misses: int = 15):
        self.tracks = {}
        self.next_id = 1
        self.iou_threshold = iou_threshold
        self.max_misses = max_misses

    def reset(self):
        self.tracks.clear()
        self.next_id = 1

    def update_tracks(self, detections: list):
        matched_tracks = set()
        matched_detections = set()

        # Spatial-temporal IoU and Centroid matching
        for det_idx, det in enumerate(detections):
            best_iou = 0.0
            best_track_id = None
            
            for track_id, track in self.tracks.items():
                if track_id in matched_tracks:
                    continue
                iou = calculate_iou(track.bbox, det["bbox"])
                c_dist = math.hypot(track.center[0] - det["center"][0], track.center[1] - det["center"][1])
                diag = math.hypot(det["bbox"][2] - det["bbox"][0], det["bbox"][3] - det["bbox"][1])
                
                if iou > best_iou:
                    best_iou = iou
                    best_track_id = track_id
                elif (c_dist < diag * 0.75 and best_track_id is None) or iou > 0.10:
                    best_track_id = track_id

            if best_track_id is not None and (best_iou >= self.iou_threshold or best_iou > 0.08):
                self.tracks[best_track_id].update(det["bbox"], det["class"], det["confidence"])
                matched_tracks.add(best_track_id)
                matched_detections.add(det_idx)

        # Register new tracks
        for det_idx, det in enumerate(detections):
            if det_idx not in matched_detections:
                new_track = TrackedAnimal(self.next_id, det["bbox"], det["class"], det["confidence"])
                self.tracks[self.next_id] = new_track
                matched_tracks.add(self.next_id)
                self.next_id += 1

        # Purge stale tracks that left the frame
        dead_ids = []
        for track_id, track in self.tracks.items():
            if track_id not in matched_tracks:
                track.misses += 1
                if track.misses > self.max_misses:
                    dead_ids.append(track_id)
        for tid in dead_ids:
            del self.tracks[tid]

        # Construct smoothed persistent results
        results = []
        for track_id, track in self.tracks.items():
            if track.misses == 0:
                cls_name, conf, is_locked = track.get_identity()
                is_high_threat = cls_name in HIGH_THREAT_ANIMALS
                is_med_threat = cls_name in MEDIUM_THREAT_ANIMALS
                
                results.append({
                    "track_id": track_id,
                    "class": cls_name,
                    "confidence": round(conf, 3),
                    "bbox": track.bbox,
                    "center": track.center,
                    "is_locked": is_locked,
                    "threat_class": "HIGH" if is_high_threat else ("MEDIUM" if is_med_threat else "LOW")
                })
        return results

class AnimalHumanThreatDetector:
    def __init__(self, animal_model_path: str = ANIMAL_MODEL_PATH, human_model_path: str = HUMAN_MODEL_PATH):
        print(f"Loading Animal Detection Model: {animal_model_path}")
        self.animal_model = YOLO(animal_model_path)
        print(f"Loading Human Detection Model: {human_model_path}")
        self.human_model = YOLO(human_model_path)
        
        self.animal_names = self.animal_model.names
        self.human_names = self.human_model.names
        self.tracker = AnimalTrackerManager()

    def process_frame(self, frame: np.ndarray, 
                      animal_conf: float = DEFAULT_CONF_ANIMAL, 
                      human_conf: float = DEFAULT_CONF_HUMAN,
                      proximity_thresh: float = DEFAULT_PROXIMITY_PIXEL_THRESHOLD):
        """
        Runs Animal and Human detectors with temporal 80% class persistence tracking,
        computes proximity, evaluates threat level, and renders HUD.
        """
        annotated = frame.copy()
        h, w, _ = frame.shape

        # 1. Inference for Animals
        animal_results = self.animal_model.predict(source=frame, conf=animal_conf, verbose=False)
        # 2. Inference for Humans
        human_results = self.human_model.predict(source=frame, conf=human_conf, verbose=False)

        raw_animal_detections = []
        detected_humans = []

        # Process Raw Animal Detections
        for r in animal_results:
            for box in r.boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                conf = float(box.conf[0])
                cls_id = int(box.cls[0])
                name = self.animal_names.get(cls_id, f"Animal_{cls_id}")
                
                x1, y1 = max(0, x1), max(0, y1)
                x2, y2 = min(w, x2), min(h, y2)
                cx = (x1 + x2) // 2
                cy = (y1 + y2) // 2
                
                raw_animal_detections.append({
                    "class": name,
                    "confidence": round(conf, 3),
                    "bbox": [x1, y1, x2, y2],
                    "center": (cx, cy)
                })

        # Apply Temporal Class-Persistence Tracking (80% confidence lock)
        detected_animals = self.tracker.update_tracks(raw_animal_detections)

        # Process Human Detections
        for r in human_results:
            for box in r.boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                conf = float(box.conf[0])
                
                x1, y1 = max(0, x1), max(0, y1)
                x2, y2 = min(w, x2), min(h, y2)
                cx = (x1 + x2) // 2
                cy = (y1 + y2) // 2

                detected_humans.append({
                    "class": "Person",
                    "confidence": round(conf, 3),
                    "bbox": [x1, y1, x2, y2],
                    "center": (cx, cy)
                })

        # Determine Threat Level & Proximity
        min_distance = None
        closest_pair = None
        threat_level = "SAFE"
        status_text = "PERIMETER SECURE: NO THREAT"

        if detected_animals and detected_humans:
            for a in detected_animals:
                for hum in detected_humans:
                    ax, ay = a["center"]
                    hx, hy = hum["center"]
                    dist = math.hypot(ax - hx, ay - hy)
                    
                    if min_distance is None or dist < min_distance:
                        min_distance = dist
                        closest_pair = (a, hum)

            if min_distance is not None and min_distance <= proximity_thresh:
                threat_level = "CRITICAL"
                status_text = f"🚨 CRITICAL: POTENTIAL ATTACK / ANIMAL-HUMAN RISK ({closest_pair[0]['class']} - {int(min_distance)}px)!"
            else:
                threat_level = "WARNING"
                status_text = f"⚠️ CAUTION: Animal and Human in Vicinity ({closest_pair[0]['class']} - {int(min_distance)}px)"
        elif detected_animals:
            threat_level = "WARNING"
            animal_names_str = ", ".join(list(set(a["class"] for a in detected_animals)))
            status_text = f"⚠️ WARNING: Wild Animal Detected ({animal_names_str})"
        elif detected_humans:
            threat_level = "SAFE"
            status_text = f"NORMAL: Personnel on Site ({len(detected_humans)} detected)"

        # Draw Animals with Persistent Locked Labels
        for a in detected_animals:
            x1, y1, x2, y2 = a["bbox"]
            color = (0, 60, 255) if a["threat_class"] == "HIGH" else (0, 215, 255)
            cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)
            
            lock_symbol = " [LOCKED]" if a.get("is_locked") else ""
            label_text = f"🐾 {a['class']} ({a['confidence']*100:.0f}%){lock_symbol}"
            (tw, th), _ = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
            cv2.rectangle(annotated, (x1, max(0, y1 - 22)), (x1 + tw + 8, y1), color, -1)
            cv2.putText(annotated, label_text, (x1 + 4, y1 - 6),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1, cv2.LINE_AA)

        # Draw Humans
        for hum in detected_humans:
            x1, y1, x2, y2 = hum["bbox"]
            color = (255, 180, 0)
            cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)
            
            label_text = f"👤 Person ({hum['confidence']*100:.0f}%)"
            (tw, th), _ = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
            cv2.rectangle(annotated, (x1, max(0, y1 - 22)), (x1 + tw + 6, y1), (50, 50, 50), -1)
            cv2.putText(annotated, label_text, (x1 + 3, y1 - 6),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1, cv2.LINE_AA)

        # Draw Proximity Vector Line
        if closest_pair is not None:
            a, hum = closest_pair
            ax, ay = a["center"]
            hx, hy = hum["center"]
            line_color = (0, 0, 255) if threat_level == "CRITICAL" else (0, 215, 255)
            
            cv2.line(annotated, (ax, ay), (hx, hy), line_color, 2 if threat_level == "WARNING" else 4)
            cv2.circle(annotated, (ax, ay), 5, line_color, -1)
            cv2.circle(annotated, (hx, hy), 5, line_color, -1)
            
            mx, my = (ax + hx) // 2, (ay + hy) // 2
            dist_label = f"Dist: {int(min_distance)}px"
            (tw, th), _ = cv2.getTextSize(dist_label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
            cv2.rectangle(annotated, (mx - tw//2 - 4, my - 12), (mx + tw//2 + 4, my + 6), (20, 20, 20), -1)
            cv2.putText(annotated, dist_label, (mx - tw//2, my), cv2.FONT_HERSHEY_SIMPLEX, 0.5, line_color, 1, cv2.LINE_AA)

        # Draw HUD Top Bar
        hud_bg = (0, 0, 180) if threat_level == "CRITICAL" else ((0, 120, 180) if threat_level == "WARNING" else (30, 30, 30))
        cv2.rectangle(annotated, (0, 0), (w, 42), hud_bg, -1)
        cv2.line(annotated, (0, 42), (w, 42), (0, 0, 255) if threat_level == "CRITICAL" else (0, 200, 255), 2)
        
        cv2.putText(annotated, status_text, (15, 28), cv2.FONT_HERSHEY_DUPLEX, 0.65, (255, 255, 255), 2, cv2.LINE_AA)
        
        counts_str = f"Animals: {len(detected_animals)} | Humans: {len(detected_humans)}"
        cv2.putText(annotated, counts_str, (w - 280, 27), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (240, 240, 240), 1, cv2.LINE_AA)

        if threat_level == "CRITICAL":
            cv2.rectangle(annotated, (0, 0), (w - 1, h - 1), (0, 0, 255), 6)

        stats = {
            "channel": "ANIMAL_HUMAN_SECURITY",
            "threat_level": threat_level,
            "status_text": status_text,
            "animals_count": len(detected_animals),
            "humans_count": len(detected_humans),
            "min_distance": round(min_distance, 1) if min_distance is not None else None,
            "detected_animals": [a["class"] for a in detected_animals],
            "detected_classes": list(set([a["class"] for a in detected_animals] + (["Person"] if detected_humans else []))),
            "max_confidence": max([a["confidence"] for a in detected_animals] + [h["confidence"] for h in detected_humans] + [0.0])
        }

        return annotated, stats
