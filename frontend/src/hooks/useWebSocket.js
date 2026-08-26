import { useState, useEffect, useRef, useCallback } from 'react';

// Web Audio API Synth for Siren/Chime Alert
export const playAlertSound = (type = 'CRITICAL') => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (type === 'CRITICAL') {
      // High-pitch dual-tone emergency siren
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'sine';

      const now = ctx.currentTime;
      osc1.frequency.setValueAtTime(880, now);
      osc1.frequency.linearRampToValueAtTime(1200, now + 0.15);
      osc1.frequency.linearRampToValueAtTime(880, now + 0.3);
      osc1.frequency.linearRampToValueAtTime(1200, now + 0.45);

      osc2.frequency.setValueAtTime(440, now);
      osc2.frequency.linearRampToValueAtTime(600, now + 0.3);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.5);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.5);
      osc2.stop(now + 0.5);
    } else {
      // Warning double chime
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';

      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.15); // A5

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.4);
    }
  } catch (err) {
    console.warn('Audio playback error:', err);
  }
};

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
            if (isAudioEnabled) {
              playAlertSound(payload.data.threat_level);
            }
          }
        } catch (e) {
          console.error('Error parsing WebSocket alert message:', e);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        console.log('WebSocket disconnected. Reconnecting in 3s...');
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
  }, [onNewAlert, isAudioEnabled]);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [connect]);

  return { isConnected };
};
