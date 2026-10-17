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
    DEFAULT_PROXIMITY_METERS_THRESHOLD,
    DEFAULT_CRITICAL_EDGE_METERS_THRESHOLD,
    DEFAULT_WARNING_METERS_THRESHOLD,
    DEFAULT_HUMAN_REAL_HEIGHT_METERS,
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

def calculate_pairwise_spatial_metrics(animal: dict, human: dict, human_ref_height_m: float = DEFAULT_HUMAN_REAL_HEIGHT_METERS):
    """
    Calculates comprehensive spatial metrics between an animal and a human using their actual detected positions:
    1. Actual detected centers: (ax, ay) and (hx, hy)
    2. Centroid Euclidean distance in pixels: d_centroid_px = sqrt((ax - hx)^2 + (ay - hy)^2)
    3. Edge-to-Edge physical boundary clearance gap (closest points on bounding boxes):
       dx = max(0, max(hx1 - ax2, ax1 - hx2))
       dy = max(0, max(hy1 - ay2, ay1 - hy2))
       d_edge_px = sqrt(dx^2 + dy^2)
       (Direct physical contact occurs when d_edge_px == 0)
    4. Ground contact foot-point / base-point distance:
       abase = (ax, ay2)
       hbase = (hx, hy2)
       d_ground_px = sqrt((abase[0] - hbase[0])^2 + (abase[1] - hbase[1])^2)
    5. Perspective Depth Scaling:
       human_height_px = max(20, hy2 - hy1)
       scale_m_per_px = human_ref_height_m / human_height_px
    6. Metric distance conversion (meters):
       d_centroid_m = d_centroid_px * scale_m_per_px
       d_edge_m = d_edge_px * scale_m_per_px
       d_ground_m = d_ground_px * scale_m_per_px
    """
    ax1, ay1, ax2, ay2 = animal["bbox"]
    hx1, hy1, hx2, hy2 = human["bbox"]
    
    acx, acy = animal["center"]
    hcx, hcy = human["center"]
    
    # 1. Centroid distance (pixels)
    d_centroid_px = math.hypot(acx - hcx, acy - hcy)
    
    # 2. Edge-to-edge physical boundary clearance (pixels)
    dx = max(0, max(hx1 - ax2, ax1 - hx2))
    dy = max(0, max(hy1 - ay2, ay1 - hy2))
    d_edge_px = math.hypot(dx, dy)
    
    # 3. Ground contact foot-point distance (pixels)
    abase = (acx, ay2)
    hbase = (hcx, hy2)
    d_ground_px = math.hypot(abase[0] - hbase[0], abase[1] - hbase[1])
    
    # 4. Perspective depth scale (meters per pixel)
    human_height_px = max(20, hy2 - hy1)
    scale_m_per_px = human_ref_height_m / human_height_px
    
    # 5. Real-world metric distances (meters)
    d_centroid_m = d_centroid_px * scale_m_per_px
    d_edge_m = d_edge_px * scale_m_per_px
    d_ground_m = d_ground_px * scale_m_per_px
    
    return {
        "centroid_distance_px": round(d_centroid_px, 1),
        "centroid_distance_m": round(d_centroid_m, 2),
        "edge_distance_px": round(d_edge_px, 1),
        "edge_distance_m": round(d_edge_m, 2),
        "ground_distance_px": round(d_ground_px, 1),
        "ground_distance_m": round(d_ground_m, 2),
        "scale_m_per_px": round(scale_m_per_px, 5),
        "animal_pos": (acx, acy),
        "human_pos": (hcx, hcy),
        "animal_base": abase,
        "human_base": hbase
    }

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
        self.locked_class = cls_name
        self.highest_conf = conf
        self.best_class = cls_name
        self.contradiction_count = 0
        self.contradiction_class = None

    def update(self, bbox: list, cls_name: str, conf: float):
        self.bbox = bbox
        self.center = ((bbox[0] + bbox[2]) // 2, (bbox[1] + bbox[3]) // 2)
        self.current_conf = conf
        self.age += 1
        self.misses = 0

        # Once confidence reaches >= 80%, lock this animal's name
        if conf >= 0.80:
            if not self.is_locked:
                self.is_locked = True
                self.locked_class = cls_name
                self.highest_conf = conf
                self.best_class = cls_name
                self.contradiction_count = 0
            else:
                if cls_name == self.locked_class:
                    if conf > self.highest_conf:
                        self.highest_conf = conf
                    self.contradiction_count = 0
                else:
                    # A different class was detected with >= 80% confidence
                    if self.contradiction_class == cls_name:
                        self.contradiction_count += 1
                    else:
                        self.contradiction_class = cls_name
                        self.contradiction_count = 1
                    
                    # If 4 consecutive frames confirm this new class with >= 80% confidence, adaptively correct the lock
                    if self.contradiction_count >= 4:
                        self.locked_class = cls_name
                        self.highest_conf = conf
                        self.best_class = cls_name
                        self.contradiction_count = 0
        else:
            # If not yet locked at 80%, keep track of highest confidence observation
            if not self.is_locked:
                if conf > self.highest_conf:
                    self.highest_conf = conf
                    self.best_class = cls_name
            self.contradiction_count = max(0, self.contradiction_count - 1)

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
                elif (iou >= 0.15 and c_dist < diag * 0.60) and best_track_id is None:
                    best_track_id = track_id

            # Only match if spatial continuity is solid (IoU >= 0.20 or IoU >= 0.12 with proximity)
            if best_track_id is not None and (best_iou >= self.iou_threshold or best_iou >= 0.12):
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

    def reset_tracking(self):
        """Clears all animal tracks and resets ID counter."""
        if self.tracker:
            self.tracker.reset()

    def process_frame(self, frame: np.ndarray, 
                      animal_conf: float = DEFAULT_CONF_ANIMAL, 
                      human_conf: float = DEFAULT_CONF_HUMAN,
                      proximity_thresh: float = DEFAULT_PROXIMITY_PIXEL_THRESHOLD,
                      proximity_thresh_m: float = DEFAULT_PROXIMITY_METERS_THRESHOLD):
        """
        Runs Animal and Human detectors with temporal 80% class persistence tracking,
        computes real-world metric distance (meters), physical edge clearance gap,
        and centroid distance using actual detected positions of both subjects.
        """
        annotated = frame.copy()
        h, w, _ = frame.shape

        # 1. Inference for Animals
        animal_results = self.animal_model.predict(source=frame, conf=animal_conf, verbose=False)
        # 2. Inference for Humans
        human_results = self.human_model.predict(source=frame, conf=human_conf, verbose=False)

        raw_animal_detections = []
        raw_human_detections = []

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

                raw_human_detections.append({
                    "class": "Person",
                    "confidence": round(conf, 3),
                    "bbox": [x1, y1, x2, y2],
                    "center": (cx, cy)
                })

        # Filter out false positive human detections that directly overlap with animals (duplicate model artifacts)
        detected_humans = []
        for hum in raw_human_detections:
            is_duplicate = False
            for a in detected_animals:
                iou = calculate_iou(hum["bbox"], a["bbox"])
                c_dist = math.hypot(hum["center"][0] - a["center"][0], hum["center"][1] - a["center"][1])
                if iou > 0.55 and c_dist < 45:
                    is_duplicate = True
                    break
            if not is_duplicate:
                detected_humans.append(hum)

        # Determine Threat Level & Real-World Proximity
        closest_metrics = None
        closest_pair = None
        min_distance = None      # Centroid distance in pixels
        min_distance_m = None    # Centroid distance in real-world meters
        min_edge_m = None        # Physical edge-to-edge boundary clearance in meters
        min_edge_px = None       # Physical edge gap in pixels
        threat_level = "SAFE"
        status_text = "PERIMETER SECURE: NO THREAT"

        if detected_animals and detected_humans:
            # Pairwise spatial distance calculation using actual detected positions
            for a in detected_animals:
                for hum in detected_humans:
                    metrics = calculate_pairwise_spatial_metrics(a, hum)
                    
                    # Track closest pair based on physical proximity (boundary gap first, then centroid)
                    if closest_metrics is None or metrics["edge_distance_m"] < closest_metrics["edge_distance_m"]:
                        closest_metrics = metrics
                        closest_pair = (a, hum)

            if closest_metrics is not None:
                min_distance = closest_metrics["centroid_distance_px"]
                min_distance_m = closest_metrics["centroid_distance_m"]
                min_edge_m = closest_metrics["edge_distance_m"]
                min_edge_px = closest_metrics["edge_distance_px"]
                
                # Proximity breach condition (<= 3.5m or boundary gap <= 1.5m or pixel proximity)
                is_close = (
                    min_distance_m <= proximity_thresh_m or 
                    min_edge_m <= DEFAULT_CRITICAL_EDGE_METERS_THRESHOLD or 
                    min_distance <= proximity_thresh
                )
                
                animal_name = closest_pair[0]["class"]
                
                # Check animal threat classification
                if animal_name in HIGH_THREAT_ANIMALS:
                    if is_close:
                        threat_level = "CRITICAL"
                        status_text = f"🚨 CRITICAL: ATTACK RISK ({animal_name} - {min_distance_m}m / {int(min_distance)}px | Edge Gap: {min_edge_m}m)!"
                    else:
                        threat_level = "WARNING"
                        status_text = f"⚠️ CAUTION: Predatory Wildlife in Perimeter ({animal_name} - {min_distance_m}m / {int(min_distance)}px)"
                elif animal_name in MEDIUM_THREAT_ANIMALS:
                    if is_close:
                        threat_level = "WARNING"
                        status_text = f"⚠️ CAUTION: Large Wildlife Proximity ({animal_name} - {min_distance_m}m / {int(min_distance)}px)"
                    else:
                        threat_level = "LOW"
                        status_text = f"ℹ️ LOW THREAT: Animal in Vicinity ({animal_name} - {min_distance_m}m / {int(min_distance)}px)"
                else: # LOW_THREAT_ANIMALS: Cat, Cow, Deer, Donkey, Dog, Camel
                    threat_level = "LOW"
                    status_text = f"ℹ️ LOW THREAT: Domestic/Docile Animal Co-presence ({animal_name} - {min_distance_m}m / {int(min_distance)}px)"
        elif detected_animals:
            has_dangerous = any(a["class"] in HIGH_THREAT_ANIMALS for a in detected_animals)
            animal_names_str = ", ".join(list(set(a["class"] for a in detected_animals)))
            if has_dangerous:
                threat_level = "WARNING"
                status_text = f"⚠️ WARNING: Wild Animal Detected ({animal_names_str})"
            else:
                threat_level = "LOW"
                status_text = f"NORMAL: Low-Threat Animal Detected ({animal_names_str})"
        elif detected_humans:
            threat_level = "SAFE"
            status_text = f"NORMAL: Personnel on Site ({len(detected_humans)} detected)"

        # Draw Animals with Persistent Locked Labels
        for a in detected_animals:
            x1, y1, x2, y2 = a["bbox"]
            if a["threat_class"] == "HIGH":
                color = (0, 60, 255) # Red for high threat
            elif a["threat_class"] == "MEDIUM":
                color = (0, 215, 255) # Amber for medium threat
            else:
                color = (0, 200, 100) # Green for low threat (Cat, Cow, Deer, Donkey, Dog, Camel)
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

        # Draw Proximity Vector Line with actual detected coordinates and metric distance
        if closest_pair is not None and closest_metrics is not None:
            a, hum = closest_pair
            ax, ay = a["center"]
            hx, hy = hum["center"]
            if threat_level == "CRITICAL":
                line_color = (0, 0, 255) # Red
            elif threat_level == "WARNING":
                line_color = (0, 215, 255) # Amber
            else:
                line_color = (0, 220, 100) # Green for low threat
            
            # Vector line connecting actual detected positions
            cv2.line(annotated, (ax, ay), (hx, hy), line_color, 2 if threat_level == "WARNING" else (4 if threat_level == "CRITICAL" else 2))
            cv2.circle(annotated, (ax, ay), 6, line_color, -1)
            cv2.circle(annotated, (hx, hy), 6, line_color, -1)
            
            # Coordinate badges showing actual detected positions (proving animal center != 0 pixels)
            coord_scale = 0.38
            cv2.putText(annotated, f"A({ax},{ay})", (ax - 20, max(15, ay - 10)),
                        cv2.FONT_HERSHEY_SIMPLEX, coord_scale, (255, 255, 255), 1, cv2.LINE_AA)
            cv2.putText(annotated, f"H({hx},{hy})", (hx - 20, max(15, hy - 10)),
                        cv2.FONT_HERSHEY_SIMPLEX, coord_scale, (255, 255, 255), 1, cv2.LINE_AA)
            
            # Midpoint distance label with metric meters and physical edge gap
            mx, my = (ax + hx) // 2, (ay + hy) // 2
            dist_label = f"Dist: {min_distance_m:.1f}m ({int(min_distance)}px) | Edge: {min_edge_m:.1f}m"
            (tw, th), _ = cv2.getTextSize(dist_label, cv2.FONT_HERSHEY_SIMPLEX, 0.48, 1)
            cv2.rectangle(annotated, (mx - tw//2 - 6, my - 14), (mx + tw//2 + 6, my + 6), (15, 15, 20), -1)
            cv2.rectangle(annotated, (mx - tw//2 - 6, my - 14), (mx + tw//2 + 6, my + 6), line_color, 1)
            cv2.putText(annotated, dist_label, (mx - tw//2, my),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.48, (255, 255, 255), 1, cv2.LINE_AA)

        # Draw HUD Top Bar
        if threat_level == "CRITICAL":
            hud_bg = (0, 0, 180)
            hud_line = (0, 0, 255)
        elif threat_level == "WARNING":
            hud_bg = (0, 120, 180)
            hud_line = (0, 200, 255)
        elif threat_level == "LOW":
            hud_bg = (20, 70, 30) # Dark Green
            hud_line = (0, 200, 100)
        else:
            hud_bg = (30, 30, 30)
            hud_line = (70, 70, 70)

        cv2.rectangle(annotated, (0, 0), (w, 42), hud_bg, -1)
        cv2.line(annotated, (0, 42), (w, 42), hud_line, 2)
        
        cv2.putText(annotated, status_text, (15, 28), cv2.FONT_HERSHEY_DUPLEX, 0.60, (255, 255, 255), 2, cv2.LINE_AA)
        
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
            "distance_meters": round(min_distance_m, 2) if min_distance_m is not None else None,
            "edge_distance_meters": round(min_edge_m, 2) if min_edge_m is not None else None,
            "edge_distance_pixels": round(min_edge_px, 1) if min_edge_px is not None else None,
            "ground_distance_meters": round(closest_metrics["ground_distance_m"], 2) if closest_metrics is not None else None,
            "closest_pair": {
                "animal": closest_pair[0]["class"],
                "animal_pos": closest_pair[0]["center"],
                "human_pos": closest_pair[1]["center"]
            } if closest_pair is not None else None,
            "detected_animals": [a["class"] for a in detected_animals],
            "detected_classes": list(set([a["class"] for a in detected_animals] + (["Person"] if detected_humans else []))),
            "max_confidence": max([a["confidence"] for a in detected_animals] + [h["confidence"] for h in detected_humans] + [0.0])
        }

        return annotated, stats
