import React, { useState } from 'react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  Camera, 
  Trash2, 
  Download, 
  Filter, 
  Check,
  Search,
  ExternalLink
} from 'lucide-react';
import { clearAllAlerts } from '../services/api';

export const IncidentLog = ({ alerts = [], onSelectAlert, onRefresh }) => {
  const [filterLevel, setFilterLevel] = useState('ALL');
  const [filterChannel, setFilterChannel] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAlerts = alerts.filter((a) => {
    if (filterLevel !== 'ALL' && a.threat_level !== filterLevel) return false;
    if (filterChannel !== 'ALL' && a.channel !== filterChannel) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        a.title.toLowerCase().includes(q) ||
        a.message.toLowerCase().includes(q) ||
        (a.detected_classes || []).some(c => c.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleClearHistory = async () => {
    if (window.confirm('Are you sure you want to clear all incident history?')) {
      try {
        await clearAllAlerts();
        if (onRefresh) onRefresh();
      } catch (err) {
        console.error('Failed to clear alerts:', err);
      }
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 tracking-wide flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-cyan-600" />
            Surveillance Incident & Evidence Logs
          </h2>
          <p className="text-xs text-slate-600 font-medium mt-0.5">
            Full chronological archive of detected emergencies, wildlife incursions, and drowning warnings.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleClearHistory}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-300 text-xs font-bold transition shadow-sm"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Logs</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search incident, species..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-500 font-medium focus:outline-none focus:border-cyan-600 focus:bg-white"
          />
        </div>

        {/* Threat Level Filter */}
        <select
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value)}
          className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-cyan-600 focus:bg-white"
        >
          <option value="ALL">All Severity Levels</option>
          <option value="CRITICAL">🔴 Critical Only</option>
          <option value="WARNING">🟡 Warning Only</option>
        </select>

        {/* Channel Filter */}
        <select
          value={filterChannel}
          onChange={(e) => setFilterChannel(e.target.value)}
          className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-cyan-600 focus:bg-white"
        >
          <option value="ALL">All Surveillance Channels</option>
          <option value="ANIMAL_HUMAN_SECURITY">Wildlife & Human Security</option>
          <option value="DROWNING_RESCUE">Drowning & Water Rescue</option>
        </select>
      </div>

      {/* Incident Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
        <table className="w-full text-left text-xs text-slate-800">
          <thead className="bg-slate-100 text-slate-700 uppercase font-mono font-bold text-[11px] border-b border-slate-200">
            <tr>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">Channel</th>
              <th className="px-4 py-3">Severity</th>
              <th className="px-4 py-3">Incident Description</th>
              <th className="px-4 py-3">Detections</th>
              <th className="px-4 py-3 text-center">Snapshot Evidence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {filteredAlerts.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center py-10 text-slate-500 font-medium">
                  No incident logs found matching the filter.
                </td>
              </tr>
            ) : (
              filteredAlerts.map((alert) => {
                const isCrit = alert.threat_level === 'CRITICAL';
                return (
                  <tr
                    key={alert.id}
                    onClick={() => onSelectAlert(alert)}
                    className="hover:bg-slate-50/90 transition cursor-pointer"
                  >
                    <td className="px-4 py-3 font-mono text-slate-600 font-bold whitespace-nowrap">
                      {new Date(alert.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">
                      {alert.channel === 'DROWNING_RESCUE' ? '🏊 Water Rescue' : '🐾 Wildlife Threat'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded font-mono font-extrabold text-[10px] ${
                        isCrit ? 'bg-red-100 text-red-800 border border-red-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}>
                        {alert.threat_level}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-950 text-sm">{alert.title}</div>
                      <div className="text-slate-600 text-[11px] font-medium">{alert.message}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {(alert.detected_classes || []).map((cls, idx) => (
                          <span key={idx} className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[10px] text-slate-800 font-bold">
                            {cls}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {alert.snapshot_filename ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectAlert(alert);
                          }}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-cyan-50 text-cyan-800 border border-cyan-300 hover:bg-cyan-100 transition text-[11px] font-bold shadow-sm"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>View Frame</span>
                        </button>
                      ) : (
                        <span className="text-slate-400 italic">No image</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
