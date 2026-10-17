import React from 'react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Radar, 
  Target, 
  Users, 
  Footprints,
  Compass
} from 'lucide-react';

export const ThreatRadar = ({ stats = {} }) => {
  const threatLevel = stats.threat_level || 'SAFE';
  const minDistance = stats.min_distance !== undefined ? stats.min_distance : null;
  const distanceMeters = stats.distance_meters !== undefined ? stats.distance_meters : (minDistance !== null ? Number((minDistance * 0.0055).toFixed(2)) : null);
  const edgeDistanceMeters = stats.edge_distance_meters !== undefined ? stats.edge_distance_meters : null;
  const closestPair = stats.closest_pair || null;
  const detectedAnimals = stats.detected_animals || [];
  const animalsCount = stats.animals_count || 0;
  const humansCount = stats.humans_count || 0;
  const statusText = stats.status_text || 'PERIMETER SECURE: NO THREAT';

  const isCritical = threatLevel === 'CRITICAL';
  const isWarning = threatLevel === 'WARNING';
  const isLow = threatLevel === 'LOW';
  const isSafe = threatLevel === 'SAFE';

  // Real-world metric distance range calculation (0m to 8.0m mapped to percentage)
  const distPercent = distanceMeters !== null 
    ? Math.min(100, Math.max(8, (distanceMeters / 8.0) * 100)) 
    : (minDistance !== null ? Math.min(100, Math.max(10, (minDistance / 350) * 100)) : 100);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-md p-5 sm:p-6 flex flex-col justify-between h-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center space-x-2">
          <Radar className="w-5 h-5 text-amber-600 animate-spin-slow" />
          <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
            Threat & Proximity Radar
          </h3>
        </div>
        <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full border ${
          isCritical
            ? 'bg-red-100 text-red-800 border-red-300 animate-pulse'
            : isWarning
            ? 'bg-amber-100 text-amber-900 border-amber-300'
            : isLow
            ? 'bg-emerald-100 text-emerald-800 border-emerald-400'
            : 'bg-slate-100 text-slate-700 border-slate-300'
        }`}>
          {threatLevel}
        </span>
      </div>

      {/* Main Threat Status Banner */}
      <div className={`p-4 rounded-xl border flex items-center space-x-3.5 transition-all shadow-sm ${
        isCritical
          ? 'bg-red-50 border-red-300 text-red-950'
          : isWarning
          ? 'bg-amber-50 border-amber-300 text-amber-950'
          : isLow
          ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
          : 'bg-slate-50 border-slate-200 text-slate-900'
      }`}>
        <div className={`p-2.5 rounded-xl shadow ${
          isCritical ? 'bg-red-600 text-white' : isWarning ? 'bg-amber-600 text-white' : isLow ? 'bg-emerald-500 text-white' : 'bg-emerald-600 text-white'
        }`}>
          {isCritical ? <ShieldAlert className="w-6 h-6 animate-bounce" /> : isWarning ? <AlertTriangle className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
        </div>
        <div>
          <div className="text-xs uppercase font-mono tracking-wider font-bold opacity-80 text-slate-700">
            Current Security Assessment
          </div>
          <div className="text-sm font-extrabold mt-0.5 text-slate-900">
            {statusText}
          </div>
        </div>
      </div>

      {/* Visual Proximity Meter (Real-World Metric Distance in Meters) */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-slate-700 font-bold flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-cyan-600" />
            Human-Animal Separation:
          </span>
          <span className="font-extrabold text-slate-900 text-sm">
            {distanceMeters !== null 
              ? `${distanceMeters.toFixed(2)} m (${(distanceMeters * 3.28084).toFixed(1)} ft | ${Math.round(minDistance)} px)` 
              : 'N/A (No pair in frame)'}
          </span>
        </div>

        {/* Distance Bar in Meters */}
        <div className="w-full bg-slate-200 h-3.5 rounded-full overflow-hidden p-0.5 border border-slate-300 relative">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              distanceMeters === null
                ? 'w-full bg-slate-400'
                : distanceMeters <= 3.5 || (edgeDistanceMeters !== null && edgeDistanceMeters <= 1.5)
                ? 'bg-gradient-to-r from-red-600 to-rose-500 animate-pulse'
                : distanceMeters <= 6.0
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500'
                : 'bg-gradient-to-r from-emerald-500 to-cyan-600'
            }`}
            style={{ width: `${distPercent}%` }}
          />
        </div>

        {/* Metric Scale Guide */}
        <div className="flex justify-between text-[11px] font-mono">
          <span className="text-red-700 font-bold">🚨 0.0m (Impact Contact)</span>
          <span className="text-amber-800 font-bold">⚠️ 3.5m (Danger Limit)</span>
          <span className="text-emerald-800 font-bold">✅ 8.0m+ (Safe Buffer)</span>
        </div>

        {/* Physical Edge Gap & Actual Detected Positions Badge */}
        {distanceMeters !== null && (
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-[11px] font-mono">
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm">
              <span className="text-slate-600 block text-[10px] uppercase font-bold">Perimeter Clearance (Edge Gap)</span>
              <span className={`font-black text-xs ${
                edgeDistanceMeters !== null && edgeDistanceMeters <= 1.5 ? 'text-red-600' : 'text-emerald-700'
              }`}>
                {edgeDistanceMeters !== null ? `${edgeDistanceMeters.toFixed(2)} m` : 'Calculating...'}
              </span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm">
              <span className="text-slate-600 block text-[10px] uppercase font-bold">Detected Positions (X, Y)</span>
              <span className="text-cyan-800 font-bold text-[10px] truncate block">
                {closestPair 
                  ? `A(${closestPair.animal_pos[0]}, ${closestPair.animal_pos[1]}) ↔ H(${closestPair.human_pos[0]}, ${closestPair.human_pos[1]})` 
                  : 'Tracked in Image Plane'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Detections Counts Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200 shadow-sm flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-amber-200/60 text-amber-800 border border-amber-300">
            <Footprints className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-amber-900 uppercase font-mono font-bold">Wild Animals</div>
            <div className="text-2xl font-black text-amber-950 font-mono">{animalsCount}</div>
          </div>
        </div>

        <div className="bg-cyan-50/70 p-3.5 rounded-xl border border-cyan-200 shadow-sm flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-cyan-200/60 text-cyan-800 border border-cyan-300">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-cyan-900 uppercase font-mono font-bold">Humans On-Site</div>
            <div className="text-2xl font-black text-cyan-950 font-mono">{humansCount}</div>
          </div>
        </div>
      </div>

      {/* Identified Species Tags */}
      <div className="space-y-1.5">
        <div className="text-[11px] text-slate-800 uppercase font-mono font-bold">
          Identified Species in Perimeter:
        </div>
        <div className="flex flex-wrap gap-1.5">
          {detectedAnimals.length > 0 ? (
            detectedAnimals.map((animal, idx) => (
              <span
                key={idx}
                className="text-xs bg-amber-100 text-amber-950 border border-amber-300 px-2.5 py-1 rounded-lg font-bold shadow-sm"
              >
                🐾 {animal}
              </span>
            ))
          ) : (
            <span className="text-xs text-slate-500 italic font-medium">No wild animals currently detected</span>
          )}
        </div>
      </div>

      {/* Action Advisory */}
      <div className="pt-2 border-t border-slate-200 text-xs text-slate-700 font-medium">
        <strong className="text-slate-900 font-bold">Automated Protocol:</strong>{' '}
        {isCritical
          ? 'Dispatch immediate loudspeaker warning & security intervention team.'
          : isWarning
          ? 'Maintain camera tracking and observe perimeter fence.'
          : isLow
          ? 'Animal co-presence is non-threatening. Standard monitoring active.'
          : 'Standard surveillance monitoring active.'}
      </div>
    </div>
  );
};
