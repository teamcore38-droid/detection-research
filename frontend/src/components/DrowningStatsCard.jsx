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
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-md p-5 sm:p-6 flex flex-col justify-between h-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center space-x-2">
          <Waves className="w-5 h-5 text-cyan-600" />
          <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
            Water Safety & Rescue Telemetry
          </h3>
        </div>
        <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full border ${
          isEmergency
            ? 'bg-red-100 text-red-800 border-red-300 animate-pulse'
            : 'bg-emerald-100 text-emerald-900 border-emerald-300'
        }`}>
          {isEmergency ? '🚨 CRITICAL DROWNING' : '✅ WATER SAFE'}
        </span>
      </div>

      {/* Emergency Status Banner */}
      <div className={`p-4 rounded-xl border flex items-center space-x-3.5 transition-all shadow-sm ${
        isEmergency
          ? 'bg-red-50 border-red-300 text-red-950 shadow-red-900/10'
          : 'bg-slate-50 border-slate-200 text-slate-900'
      }`}>
        <div className={`p-2.5 rounded-xl shadow ${isEmergency ? 'bg-red-600 text-white animate-bounce' : 'bg-cyan-600 text-white'}`}>
          {isEmergency ? <AlertOctagon className="w-6 h-6" /> : <LifeBuoy className="w-6 h-6" />}
        </div>
        <div>
          <div className="text-xs uppercase font-mono tracking-wider font-bold opacity-80 text-slate-700">
            Rescue Telemetry Status
          </div>
          <div className="text-sm font-extrabold mt-0.5 text-slate-900">
            {isEmergency
              ? 'DROWNING VICTIM DETECTED - DISPATCH LIFEGUARD!'
              : 'Swimmers in pool monitored normally.'}
          </div>
        </div>
      </div>

      {/* Counters Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-red-50/70 p-3.5 rounded-xl border border-red-200 shadow-sm flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-red-200/60 text-red-800 border border-red-300">
            <AlertOctagon className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-red-900 uppercase font-mono font-bold">Drowning Distress</div>
            <div className="text-2xl font-black text-red-700 font-mono">{drowningCount}</div>
          </div>
        </div>

        <div className="bg-cyan-50/70 p-3.5 rounded-xl border border-cyan-200 shadow-sm flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-cyan-200/60 text-cyan-800 border border-cyan-300">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-cyan-900 uppercase font-mono font-bold">Active Swimmers</div>
            <div className="text-2xl font-black text-cyan-800 font-mono">{swimmingCount}</div>
          </div>
        </div>
      </div>

      {/* Model Confidence Metric */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-slate-700 font-bold">Peak Detection Confidence:</span>
          <span className="font-extrabold text-slate-900 font-mono">
            {(maxConf * 100).toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden border border-slate-300">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isEmergency ? 'bg-red-600' : 'bg-cyan-600'
            }`}
            style={{ width: `${Math.min(100, maxConf * 100)}%` }}
          />
        </div>
      </div>

      {/* Submersion & Surface Telemetry Box */}
      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-2 text-xs font-mono">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-600 font-bold uppercase">Submersion Signature:</span>
          <span className={`font-bold ${isEmergency ? 'text-red-700 font-extrabold animate-pulse' : 'text-emerald-700'}`}>
            {isEmergency ? '⚠️ PROLONGED SUBMERSION DETECTED' : '✅ NORMAL SURFACE POSTURE'}
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-200">
          <span className="text-slate-600 font-bold uppercase">Dispatch Siren Trigger:</span>
          <span className={`font-bold ${isEmergency ? 'text-red-700 font-extrabold' : 'text-slate-700'}`}>
            {isEmergency ? '🚨 LIFEGUARD BUZZER ARMED' : 'STANDBY (NORMAL MONITORING)'}
          </span>
        </div>
      </div>

      {/* Automated Protocol */}
      <div className="pt-2 border-t border-slate-200 text-xs text-slate-700 font-medium">
        <strong className="text-slate-900 font-bold">Rescue System:</strong>{' '}
        {isEmergency
          ? 'Audio sirens active. Immediate rescue required at coordinates.'
          : 'All zones safe. AI tracking swimmer posture.'}
      </div>
    </div>
  );
};
