import React, { useEffect } from 'react';
import { ShieldAlert, BellOff, Volume2, AlertOctagon, Flame } from 'lucide-react';

export const EmergencyBuzzer = ({ alert, onStopBuzzer }) => {
  if (!alert) return null;

  // Keyboard shortcut listener: Space or Escape to silence buzzer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' || e.code === 'Escape') {
        e.preventDefault();
        onStopBuzzer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStopBuzzer]);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 animate-bounce-short">
      {/* Top Strobe Emergency Bar */}
      <div className="bg-gradient-to-r from-red-700 via-rose-600 to-red-700 text-white px-4 lg:px-8 py-3.5 shadow-2xl shadow-red-950/80 border-b-2 border-yellow-400 flex flex-col md:flex-row items-center justify-between gap-3 backdrop-blur-md">
        
        {/* Left Alarm Indicator */}
        <div className="flex items-center space-x-3.5">
          <div className="relative flex items-center justify-center p-2 rounded-xl bg-black/40 text-yellow-300 shadow-inner">
            <ShieldAlert className="w-7 h-7 animate-ping absolute opacity-50 text-red-300" />
            <ShieldAlert className="w-7 h-7 relative z-10 animate-bounce" />
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <span className="bg-black/60 text-yellow-300 text-[11px] font-mono font-black px-2 py-0.5 rounded tracking-widest border border-yellow-400/50 uppercase animate-pulse">
                🚨 CRITICAL BUZZER ACTIVE (BEEP-BEEP)
              </span>
              <span className="text-xs text-red-100 font-mono hidden sm:inline">
                {new Date(alert.timestamp).toLocaleTimeString()}
              </span>
            </div>
            
            <h2 className="text-base md:text-lg font-black tracking-wide text-white mt-0.5 drop-shadow-md">
              {alert.title}: <span className="font-semibold text-yellow-100 text-sm md:text-base">{alert.message}</span>
            </h2>
          </div>
        </div>

        {/* Right Action Button: Stop Buzzer */}
        <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
          <span className="hidden xl:inline text-[11px] font-mono text-red-200/80">
            Press <kbd className="px-1.5 py-0.5 bg-black/40 rounded border border-white/20 font-bold">SPACE</kbd> or <kbd className="px-1.5 py-0.5 bg-black/40 rounded border border-white/20 font-bold">ESC</kbd> to Stop
          </span>

          <button
            onClick={onStopBuzzer}
            className="flex items-center justify-center space-x-2 px-6 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black font-black text-sm shadow-xl shadow-black/40 transform hover:scale-105 active:scale-95 transition-all uppercase tracking-wider border-2 border-white"
          >
            <BellOff className="w-5 h-5 animate-pulse" />
            <span>STOP BUZZER</span>
          </button>
        </div>
      </div>
    </div>
  );
};
