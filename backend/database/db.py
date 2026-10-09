import sqlite3
import json
from datetime import datetime
from backend.config import DB_PATH

def get_connection():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            channel TEXT NOT NULL,
            type TEXT NOT NULL,
            threat_level TEXT NOT NULL,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            detected_classes TEXT NOT NULL,
            confidence REAL NOT NULL,
            distance_pixels REAL,
            distance_meters REAL,
            snapshot_filename TEXT,
            is_acknowledged INTEGER DEFAULT 0
        )
    """)
    # Check if distance_meters column exists for existing DB files
    cursor.execute("PRAGMA table_info(alerts)")
    columns = [col[1] for col in cursor.fetchall()]
    if "distance_meters" not in columns:
        cursor.execute("ALTER TABLE alerts ADD COLUMN distance_meters REAL")
    conn.commit()
    conn.close()

def insert_alert(channel: str, alert_type: str, threat_level: str, title: str, 
                 message: str, detected_classes: list, confidence: float, 
                 distance_pixels: float = None, distance_meters: float = None,
                 snapshot_filename: str = None) -> dict:
    conn = get_connection()
    cursor = conn.cursor()
    now_str = datetime.now().isoformat()
    classes_json = json.dumps(detected_classes)
    
    cursor.execute("""
        INSERT INTO alerts (timestamp, channel, type, threat_level, title, message, 
                            detected_classes, confidence, distance_pixels, distance_meters, snapshot_filename)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (now_str, channel, alert_type, threat_level, title, message, 
          classes_json, float(confidence), distance_pixels, distance_meters, snapshot_filename))
    
    alert_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return {
        "id": alert_id,
        "timestamp": now_str,
        "channel": channel,
        "type": alert_type,
        "threat_level": threat_level,
        "title": title,
        "message": message,
        "detected_classes": detected_classes,
        "confidence": confidence,
        "distance_pixels": distance_pixels,
        "distance_meters": distance_meters,
        "snapshot_filename": snapshot_filename,
        "is_acknowledged": False
    }

def get_alerts(limit: int = 50, offset: int = 0, threat_level: str = None, channel: str = None):
    conn = get_connection()
    cursor = conn.cursor()
    
    query = "SELECT * FROM alerts WHERE 1=1"
    params = []
    
    if threat_level and threat_level.upper() != 'ALL':
        query += " AND threat_level = ?"
        params.append(threat_level.upper())
        
    if channel and channel.upper() != 'ALL':
        query += " AND channel = ?"
        params.append(channel.upper())
        
    query += " ORDER BY id DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    
    results = []
    for r in rows:
        d = dict(r)
        try:
            d['detected_classes'] = json.loads(d['detected_classes'])
        except Exception:
            d['detected_classes'] = []
        d['is_acknowledged'] = bool(d['is_acknowledged'])
        results.append(d)
        
    conn.close()
    return results

def get_alert_stats():
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) FROM alerts")
    total = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM alerts WHERE threat_level = 'CRITICAL'")
    critical = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM alerts WHERE threat_level = 'WARNING'")
    warning = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM alerts WHERE channel = 'DROWNING_RESCUE'")
    drowning = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM alerts WHERE channel = 'ANIMAL_HUMAN_SECURITY'")
    animal_human = cursor.fetchone()[0]
    
    conn.close()
    return {
        "total": total,
        "critical": critical,
        "warning": warning,
        "drowning_incidents": drowning,
        "animal_threat_incidents": animal_human
    }

def acknowledge_alert(alert_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE alerts SET is_acknowledged = 1 WHERE id = ?", (alert_id,))
    conn.commit()
    conn.close()

def clear_all_alerts():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM alerts")
    conn.commit()
    conn.close()
