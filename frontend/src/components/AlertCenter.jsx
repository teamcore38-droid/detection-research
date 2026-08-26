import React from 'react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  Check, 
  Trash2, 
  ExternalLink,
  Clock,
  Camera
} from 'lucide-react';
import { acknowledgeAlert } from '../services/api';

export const AlertCenter = ({ alerts = [], onSelectAlert, onAlertAck }) => {
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
    <div className="bg-[#0f1422] rounded-2xl border border-slate-800/90 shadow-xl flex flex-col h-full">
      <div className="px-4 py-3.5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wide">
            Real-Time Alert Feed
          </h3>
        </div>
        <span className="text-xs font-mono text-slate-400">
          {alerts.length} events logged
        </span>
      </div>

      <div className="p-3 overflow-y-auto space-y-2.5 max-h-[460px] flex-1">
        {alerts.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs">
            <Check className="w-8 h-8 mx-auto mb-2 opacity-40 text-emerald-400" />
            No security or drowning incidents recorded.
          </div>
        ) : (
          alerts.slice(0, 15).map((alert) => {
            const isCritical = alert.threat_level === 'CRITICAL';
            return (
              <div
                key={alert.id}
                onClick={() => onSelectAlert(alert)}
                className={`p-3 rounded-xl border transition-all cursor-pointer hover:scale-[1.01] ${
                  isCritical
                    ? 'bg-red-950/40 border-red-800/80 hover:bg-red-950/60'
                    : 'bg-amber-950/30 border-amber-800/60 hover:bg-amber-950/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    {isCritical ? (
                      <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 animate-pulse" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    )}
                    <span className="text-xs font-bold text-white">
                      {alert.title}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 shrink-0">
                    {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>

                <p className="text-xs text-slate-300 mt-1 line-clamp-2">
                  {alert.message}
                </p>

                <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
                  <div className="flex items-center space-x-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                      isCritical ? 'bg-red-500/30 text-red-300' : 'bg-amber-500/30 text-amber-300'
                    }`}>
                      {alert.threat_level}
                    </span>
                    {alert.snapshot_filename && (
                      <span className="flex items-center space-x-1 text-slate-400">
                        <Camera className="w-3 h-3" />
                        <span>Snapshot</span>
                      </span>
                    )}
                  </div>

                  {!alert.is_acknowledged && (
                    <button
                      onClick={(e) => handleAck(e, alert.id)}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition font-medium"
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
