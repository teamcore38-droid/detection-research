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
    <header className="border-b border-slate-800/80 bg-[#0c111d]/90 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-8 py-3">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Logo & System Brand */}
        <div className="flex items-center space-x-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20">
            <ShieldAlert className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
            </span>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              VISION SENTRY AI
              <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60">
                PRO v1.0
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Autonomous Drowning & Animal-Human Threat Surveillance
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center bg-slate-900/80 p-1 rounded-xl border border-slate-800 flex-wrap">
          <button
            onClick={() => setActiveTab('animal_human')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'animal_human'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Wildlife Threat Mode</span>
          </button>

          <button
            onClick={() => setActiveTab('drowning')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'drowning'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <LifeBuoy className="w-3.5 h-3.5" />
            <span>Water Rescue Mode</span>
          </button>

          <button
            onClick={() => setActiveTab('dual')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'dual'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Dual Monitor Grid</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'logs'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <span>Incident Archives</span>
            {stats && stats.critical > 0 && (
              <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono">
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
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold animate-pulse shadow-lg shadow-red-600/50 transition border border-yellow-300"
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
                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20'
                : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-400'
            }`}
          >
            {isAudioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            title="Model & Sensitivity Settings"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-all"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* WebSocket Status */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
            {isConnected ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span className="text-[11px] font-mono text-emerald-400 font-semibold">LIVE CONNECTED</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-[11px] font-mono text-rose-400 font-semibold">OFFLINE</span>
              </>
            )}
          </div>

          {/* Clock */}
          <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 font-mono">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-semibold">{timeStr}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
