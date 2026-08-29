import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Square, 
  RotateCcw, 
  Camera, 
  Film, 
  Upload, 
  Smartphone,
  AlertTriangle, 
  CheckCircle2, 
  Eye,
  Maximize2
} from 'lucide-react';
import { controlStream } from '../services/api';

export const LivePlayer = ({ 
  channelId, 
  title, 
  badge, 
  badgeColor = "cyan",
  onOpenUpload,
  onOpenPhoneCamera,
  availableVideos = [],
  currentSource,
  onSourceChange,
  stats = {}
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [streamSource, setStreamSource] = useState(currentSource || 'sample');
  const [streamKey, setStreamKey] = useState(Date.now());

  // Normalize path helper for comparing Windows/Unix paths
  const norm = (p) => (p || '').replace(/\\/g, '/').toLowerCase();

  // Keep internal source synced with parent prop if provided
  useEffect(() => {
    if (currentSource && norm(currentSource) !== norm(streamSource)) {
      setStreamSource(currentSource);
      setStreamKey(Date.now());
      setIsPlaying(true);
    }
  }, [currentSource]);

  const streamUrl = `http://localhost:8000/api/stream/${channelId}?t=${streamKey}`;

  const handleSourceSelect = async (newSource) => {
    setStreamSource(newSource);
    if (onSourceChange) {
      onSourceChange(newSource);
    }
    try {
      await controlStream(channelId, 'start', newSource);
      setStreamKey(Date.now());
      setIsPlaying(true);
    } catch (err) {
      console.error('Failed to change source:', err);
    }
  };

  const handleTogglePlay = async () => {
    try {
      if (isPlaying) {
        await controlStream(channelId, 'stop');
        setIsPlaying(false);
      } else {
        await controlStream(channelId, 'start', streamSource);
        setStreamKey(Date.now());
        setIsPlaying(true);
      }
    } catch (err) {
      console.error('Failed to toggle stream:', err);
    }
  };

  const handleRestart = async () => {
    try {
      await controlStream(channelId, 'restart', streamSource);
      setStreamKey(Date.now());
      setIsPlaying(true);
    } catch (err) {
      console.error('Failed to restart stream:', err);
    }
  };

  // Find active video display name
  const currentVideoObj = availableVideos.find(v => norm(v.path) === norm(streamSource));
  const currentDisplayName = currentVideoObj 
    ? currentVideoObj.name 
    : (streamSource === 'webcam' || streamSource === '0' 
        ? '💻 Built-in / USB Camera 0' 
        : (streamSource === '1' 
            ? '📱 Phone Camera (USB / Camera 1)' 
            : (streamSource.startsWith('http') || streamSource.startsWith('rtsp') 
                ? `📱 Phone Live Stream (${streamSource})` 
                : (streamSource === 'sample' ? 'Default Demo Video' : 'Custom Video Feed'))));

  return (
    <div className="bg-[#0f1422] rounded-2xl border border-slate-800/90 shadow-xl overflow-hidden flex flex-col">
      {/* Video Header Bar */}
      <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center space-x-2.5">
          <div className="flex h-2.5 w-2.5 relative">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isPlaying ? 'bg-emerald-400' : 'bg-slate-500'}`}></span>
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isPlaying ? 'bg-emerald-500' : 'bg-slate-500'}`}></span>
          </div>
          <h2 className="text-sm font-bold text-white tracking-wide uppercase">{title}</h2>
          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border bg-${badgeColor}-500/10 text-${badgeColor}-400 border-${badgeColor}-500/30`}>
            {badge}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          <select
            value={streamSource}
            onChange={(e) => handleSourceSelect(e.target.value)}
            className="text-xs bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1 focus:outline-none focus:border-cyan-500 max-w-[200px] truncate"
          >
            <option value="sample">📹 Default Footage</option>
            <option value="0">💻 Built-in / Camera 0</option>
            <option value="1">📱 Phone USB / Camera 1</option>
            {availableVideos.map((v, idx) => (
              <option key={idx} value={v.path}>{v.name}</option>
            ))}
          </select>

          {/* Connect Phone Camera Button */}
          <button
            onClick={() => onOpenPhoneCamera(channelId)}
            title="Connect Phone Camera via Wi-Fi or USB Cable"
            className="flex items-center space-x-1 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Phone Camera</span>
          </button>

          {/* Upload Video Button */}
          <button
            onClick={() => onOpenUpload(channelId)}
            title="Upload Custom Video"
            className="flex items-center space-x-1 px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow transition"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Video</span>
          </button>
        </div>
      </div>

      {/* Video Viewport Container */}
      <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden group min-h-[300px]">
        {isPlaying ? (
          <img
            key={streamKey}
            src={streamUrl}
            alt="Surveillance Feed"
            className="w-full h-full object-contain"
            onError={() => {
              setTimeout(() => setStreamKey(Date.now()), 1500);
            }}
          />
        ) : (
          <div className="text-center p-8 text-slate-500">
            <Film className="w-12 h-12 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium">Video Feed Paused</p>
            <button
              onClick={handleTogglePlay}
              className="mt-3 px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold shadow transition"
            >
              Resume Stream
            </button>
          </div>
        )}

        {/* Live HUD Watermark / Overlay Badges */}
        <div className="absolute top-3 left-3 flex flex-col space-y-1 pointer-events-none">
          <span className="bg-black/70 backdrop-blur-sm text-cyan-400 text-[10px] font-mono px-2 py-0.5 rounded border border-cyan-500/20">
            YOLOv8 INFERENCE ACTIVE
          </span>
          {stats && stats.threat_level && (
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border shadow ${
              stats.threat_level === 'CRITICAL'
                ? 'bg-red-600/90 text-white border-red-400 animate-pulse'
                : stats.threat_level === 'WARNING'
                ? 'bg-amber-600/90 text-white border-amber-400'
                : 'bg-emerald-600/80 text-white border-emerald-400'
            }`}>
              THREAT: {stats.threat_level}
            </span>
          )}
        </div>

        {/* Quick playback control overlay */}
        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-md rounded-xl p-1.5 flex items-center space-x-1">
          <button
            onClick={handleTogglePlay}
            className="p-1.5 rounded-lg hover:bg-white/20 text-white transition"
            title={isPlaying ? "Pause Stream" : "Play Stream"}
          >
            {isPlaying ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleRestart}
            className="p-1.5 rounded-lg hover:bg-white/20 text-white transition"
            title="Restart Feed"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Video Footer Metadata & Quick Stats */}
      <div className="px-4 py-2.5 bg-slate-950/60 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center space-x-4 font-mono truncate">
          <span>FPS: <strong className="text-slate-200">~25</strong></span>
          <span className="truncate">Active Source: <strong className="text-cyan-400">{currentDisplayName}</strong></span>
        </div>
        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={handleRestart}
            className="flex items-center space-x-1 text-cyan-400 hover:text-cyan-300 font-semibold"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Loop</span>
          </button>
        </div>
      </div>
    </div>
  );
};
