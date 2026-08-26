import React from 'react';
import { X, Download, ShieldAlert, Calendar, Clock, Crosshair } from 'lucide-react';

export const SnapshotModal = ({ alert, onClose }) => {
  if (!alert) return null;

  const imageUrl = alert.snapshot_filename
    ? `http://localhost:8000/static/snapshots/${alert.snapshot_filename}`
    : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0f1422] border border-slate-800 rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${
              alert.threat_level === 'CRITICAL' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
            }`}>
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{alert.title}</h3>
              <p className="text-xs text-slate-400 font-mono">
                {new Date(alert.timestamp).toLocaleString()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Snapshot Image Viewport */}
        <div className="relative bg-black flex items-center justify-center min-h-[350px] max-h-[500px] overflow-hidden">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="Incident Snapshot"
              className="max-h-[500px] w-full object-contain"
            />
          ) : (
            <div className="text-slate-500 text-sm">No Snapshot Captured</div>
          )}
        </div>

        {/* Incident Details Card */}
        <div className="p-6 bg-slate-950/60 border-t border-slate-800 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-500 block">Severity Level</span>
              <strong className={`font-mono font-bold ${
                alert.threat_level === 'CRITICAL' ? 'text-red-400' : 'text-amber-400'
              }`}>
                {alert.threat_level}
              </strong>
            </div>

            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-500 block">Confidence</span>
              <strong className="font-mono text-white">
                {(alert.confidence * 100).toFixed(1)}%
              </strong>
            </div>

            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-500 block">Threat Distance</span>
              <strong className="font-mono text-white">
                {alert.distance_pixels ? `${Math.round(alert.distance_pixels)} px` : 'N/A'}
              </strong>
            </div>

            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-500 block">Detected Classes</span>
              <strong className="text-cyan-400">
                {(alert.detected_classes || []).join(', ') || 'N/A'}
              </strong>
            </div>
          </div>

          <p className="text-xs text-slate-300 bg-slate-900/80 p-3 rounded-lg border border-slate-800">
            {alert.message}
          </p>

          <div className="flex justify-end pt-2">
            {imageUrl && (
              <a
                href={imageUrl}
                target="_blank"
                rel="noreferrer"
                download={`incident_${alert.id}.jpg`}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow transition"
              >
                <Download className="w-4 h-4" />
                <span>Download High-Res Snapshot</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
