import React from 'react';
import { 
  LifeBuoy, 
  AlertOctagon, 
  CheckCircle, 
  Waves, 
  Activity, 
  UserCheck 
} from 'lucide-react';

export const DrowningStatsCard = ({ stats = {} }) => {
  const isEmergency = stats.is_emergency || false;
  const drowningCount = stats.drowning_count || 0;
  const swimmingCount = stats.swimming_count || 0;
  const maxConf = stats.max_confidence || 0;

  return (
    <div className="bg-[#0f1422] rounded-2xl border border-slate-800/90 shadow-xl p-5 flex flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <Waves className="w-5 h-5 text-cyan-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wide">
            Water Safety & Rescue Telemetry
          </h3>
        </div>
        <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full border ${
          isEmergency
            ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse'
            : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
        }`}>
          {isEmergency ? '🚨 CRITICAL DROWNING' : '✅ WATER SAFE'}
        </span>
      </div>

      {/* Emergency Status Banner */}
      <div className={`p-4 rounded-xl border flex items-center space-x-3.5 transition-all ${
        isEmergency
          ? 'bg-red-950/50 border-red-800 text-red-200 shadow-lg shadow-red-900/30'
          : 'bg-slate-900/60 border-slate-800 text-slate-300'
      }`}>
        <div className={`p-2.5 rounded-xl ${isEmergency ? 'bg-red-600 text-white animate-bounce' : 'bg-cyan-600 text-white'}`}>
          {isEmergency ? <AlertOctagon className="w-6 h-6" /> : <LifeBuoy className="w-6 h-6" />}
        </div>
        <div>
          <div className="text-xs uppercase font-mono tracking-wider opacity-75 font-semibold">
            Rescue Telemetry Status
          </div>
          <div className="text-sm font-bold mt-0.5">
            {isEmergency
              ? 'DROWNING VICTIM DETECTED - DISPATCH LIFEGUARD!'
              : 'Swimmers in pool monitored normally.'}
          </div>
        </div>
      </div>

      {/* Counters Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
            <AlertOctagon className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 uppercase font-mono">Drowning Distress</div>
            <div className="text-xl font-bold text-red-400 font-mono">{drowningCount}</div>
          </div>
        </div>

        <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 uppercase font-mono">Active Swimmers</div>
            <div className="text-xl font-bold text-cyan-400 font-mono">{swimmingCount}</div>
          </div>
        </div>
      </div>

      {/* Model Confidence Metric */}
      <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/70 space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-slate-400">Peak Detection Confidence:</span>
          <span className="font-bold text-white font-mono">
            {(maxConf * 100).toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isEmergency ? 'bg-red-500' : 'bg-cyan-500'
            }`}
            style={{ width: `${Math.min(100, maxConf * 100)}%` }}
          />
        </div>
      </div>

      {/* Automated Protocol */}
      <div className="pt-2 border-t border-slate-800/80 text-xs text-slate-400">
        <strong className="text-slate-300">Rescue System:</strong>{' '}
        {isEmergency
          ? 'Audio sirens active. Immediate rescue required at coordinates.'
          : 'All zones safe. AI tracking swimmer posture.'}
      </div>
    </div>
  );
};
