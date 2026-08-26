import { useState, useEffect, useRef, useCallback } from 'react';

// Web Audio API Continuous "Beep-Beep" Buzzer Synth
class BuzzerController {
  constructor() {
    this.ctx = null;
    this.timerId = null;
    this.isPlaying = false;
  }

  _getAudioContext() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  _playDoubleBeep() {
    try {
      const ctx = this._getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // Beep 1 (high urgent tone: 950 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'square';
      osc1.frequency.setValueAtTime(950, now);
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.12);

      // Beep 2 (higher urgent tone: 1150 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(1150, now + 0.16);
      gain2.gain.setValueAtTime(0.32, now + 0.16);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.16);
      osc2.stop(now + 0.28);
    } catch (e) {
      console.warn('Audio buzzer synth error:', e);
    }
  }

  playWarningChime() {
    try {
      const ctx = this._getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.15); // A5
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
    } catch (e) {
      console.warn('Warning chime error:', e);
    }
  }

  start() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this._playDoubleBeep();
    // Continuously repeat "beep-beep" every 800ms
    this.timerId = setInterval(() => {
      this._playDoubleBeep();
    }, 800);
  }

  stop() {
    this.isPlaying = false;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }
}

export const buzzer = new BuzzerController();

export const useAlertWebSocket = (onNewAlert, isAudioEnabled = true) => {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const connect = useCallback(() => {
    try {
      const wsUrl = 'ws://localhost:8000/ws/alerts';
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setIsConnected(true);
        console.log('Surveillance Alert WebSocket connected');
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'NEW_ALERT' && payload.data) {
            if (onNewAlert) {
              onNewAlert(payload.data);
            }
          }
        } catch (e) {
          console.error('Error parsing WebSocket alert message:', e);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = (err) => {
        console.warn('WebSocket error:', err);
        ws.close();
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('WebSocket connection error:', err);
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    }
  }, [onNewAlert]);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [connect]);

  return { isConnected };
};
