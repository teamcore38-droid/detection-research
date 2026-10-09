import React from 'react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  Check, 
  Camera,
  BellOff
} from 'lucide-react';
import { acknowledgeAlert } from '../services/api';

export const AlertCenter = ({ alerts = [], onSelectAlert, onAlertAck, isBuzzerActive, onStopBuzzer, fullWidth = false }) => {
  const handleAck = async (e, id) => {
    e.stopPropagation();
    try {
      await acknowledgeAlert(id);
      if (onAlertAck) onAlertAck(id);
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-md flex flex-col">
      <div className="px-4 py-3.5 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 text-cyan-600" />
          <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
            Real-Time Alert Feed
          </h3>
        </div>
        <span className="text-xs font-mono font-bold text-slate-600">
          {alerts.length} events logged
        </span>
      </div>

      {isBuzzerActive && (
        <div className="mx-3 mt-3 p-2.5 rounded-xl bg-red-600 text-white flex items-center justify-between text-xs font-bold animate-pulse border-2 border-yellow-300 shadow-md">
          <div className="flex items-center space-x-1.5">
            <ShieldAlert className="w-4 h-4" />
            <span>BUZZER SOUNDING</span>
          </div>
          <button
            onClick={onStopBuzzer}
            className="px-2.5 py-1 rounded bg-yellow-400 hover:bg-yellow-300 text-black font-black text-[11px] transition shadow"
          >
            SILENCE
          </button>
        </div>
      )}

      <div className={`p-3.5 overflow-y-auto max-h-[380px] flex-1 ${
        fullWidth ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 space-y-0' : 'space-y-2.5'
      }`}>
        {alerts.length === 0 ? (
          <div className={`${fullWidth ? 'col-span-full' : ''} text-center py-10 text-slate-600 font-semibold text-xs`}>
            <Check className="w-8 h-8 mx-auto mb-2 opacity-50 text-emerald-600" />
            No security or drowning incidents recorded.
          </div>
        ) : (
          alerts.slice(0, 15).map((alert) => {
            const isCritical = alert.threat_level === 'CRITICAL';
            return (
              <div
                key={alert.id}
                onClick={() => onSelectAlert(alert)}
                className={`p-3 rounded-xl border transition-all cursor-pointer hover:scale-[1.01] shadow-sm ${
                  isCritical
                    ? 'bg-red-50/90 border-red-200 hover:bg-red-100'
                    : 'bg-amber-50/90 border-amber-200 hover:bg-amber-100'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    {isCritical ? (
                      <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 animate-pulse" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                    )}
                    <span className={`text-xs font-extrabold ${isCritical ? 'text-red-950' : 'text-amber-950'}`}>
                      {alert.title}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-600 shrink-0">
                    {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>

                <p className="text-xs text-slate-700 font-medium mt-1 line-clamp-2">
                  {alert.message}
                </p>

                <div className="mt-2.5 pt-2 border-t border-slate-200 flex items-center justify-between text-[11px]">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      isCritical ? 'bg-red-100 text-red-800 border border-red-300' : 'bg-amber-100 text-amber-900 border border-amber-300'
                    }`}>
                      {alert.threat_level}
                    </span>
                    {alert.snapshot_filename && (
                      <span className="flex items-center space-x-1 text-slate-600 font-semibold">
                        <Camera className="w-3 h-3" />
                        <span>Snapshot</span>
                      </span>
                    )}
                  </div>

                  {!alert.is_acknowledged && (
                    <button
                      onClick={(e) => handleAck(e, alert.id)}
                      className="px-2.5 py-0.5 rounded bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 transition font-bold shadow-sm"
                    >
                      Acknowledge
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
