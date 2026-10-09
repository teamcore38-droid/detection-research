import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Activity, 
  Wifi, 
  WifiOff, 
  Volume2, 
  VolumeX, 
  LifeBuoy, 
  Compass, 
  Clock,
  Sliders,
  BellOff
} from 'lucide-react';

export const Header = ({ 
  isConnected, 
  isAudioEnabled, 
  setIsAudioEnabled, 
  isBuzzerActive,
  onStopBuzzer,
  stats, 
  activeTab, 
  setActiveTab,
  onOpenSettings,
}) => {
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('en-US', { hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="border-b border-slate-200/90 bg-white/95 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-8 py-3 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Logo & System Brand */}
        <div className="flex items-center space-x-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-700 text-white shadow-md shadow-cyan-600/30">
            <ShieldAlert className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
            </span>
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-slate-900 flex items-center gap-2">
              VISION SENTRY AI
              <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-cyan-50 text-cyan-800 border border-cyan-300">
                PRO v1.0
              </span>
            </h1>
            <p className="text-xs text-slate-600 font-medium">
              Autonomous Drowning & Animal-Human Threat Surveillance
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 flex-wrap">
          <button
            onClick={() => setActiveTab('animal_human')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'animal_human'
                ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Wildlife Threat Mode</span>
          </button>

          <button
            onClick={() => setActiveTab('drowning')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'drowning'
                ? 'bg-cyan-100 text-cyan-900 border border-cyan-300 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
            }`}
          >
            <LifeBuoy className="w-3.5 h-3.5" />
            <span>Water Rescue Mode</span>
          </button>

          <button
            onClick={() => setActiveTab('dual')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'dual'
                ? 'bg-purple-100 text-purple-900 border border-purple-300 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Dual Monitor Grid</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'logs'
                ? 'bg-white text-slate-900 border border-slate-300 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
            }`}
          >
            <span>Incident Archives</span>
            {stats && stats.critical > 0 && (
              <span className="bg-red-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
                {stats.critical}
              </span>
            )}
          </button>
        </div>

        {/* Right Status Controls */}
        <div className="flex items-center space-x-3 text-xs">
          {/* Active Buzzer Stop Control */}
          {isBuzzerActive && (
            <button
              onClick={onStopBuzzer}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-extrabold animate-pulse shadow-lg shadow-red-600/30 transition border-2 border-yellow-300"
              title="Click or press Space to silence buzzer"
            >
              <BellOff className="w-4 h-4" />
              <span>SILENCE BUZZER</span>
            </button>
          )}

          {/* Audio Siren Enable/Disable Toggle */}
          <button
            onClick={() => setIsAudioEnabled(!isAudioEnabled)}
            title={isAudioEnabled ? "Audio Sirens Enabled" : "Audio Muted"}
            className={`p-2 rounded-lg border transition-all ${
              isAudioEnabled
                ? 'bg-cyan-50 border-cyan-300 text-cyan-700 hover:bg-cyan-100 shadow-sm'
                : 'bg-slate-100 border-slate-300 text-slate-500 hover:text-slate-700'
            }`}
          >
            {isAudioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            title="Model & Sensitivity Settings"
            className="p-2 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 shadow-sm transition-all"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* WebSocket Status */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-300">
            {isConnected ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                <span className="text-[11px] font-mono text-emerald-800 font-bold">LIVE CONNECTED</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-rose-600" />
                <span className="text-[11px] font-mono text-rose-800 font-bold">OFFLINE</span>
              </>
            )}
          </div>

          {/* Clock */}
          <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 font-mono font-bold">
            <Clock className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-xs font-bold">{timeStr}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
