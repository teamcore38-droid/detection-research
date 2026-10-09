import React from 'react';
import { 
  Calculator, 
  Ruler, 
  Cpu, 
  Waves, 
  ShieldAlert, 
  Activity,
  Layers
} from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-white border-t border-slate-200 mt-8 py-6 px-4 lg:px-8 text-xs text-slate-700 shadow-sm">
      <div className="max-w-[1700px] mx-auto space-y-5">
        {/* Core Logic & Calculation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Column 1: System & Pipeline */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
              <Cpu className="w-4 h-4 text-cyan-600" />
              <h4>Vision Pipeline & Inference</h4>
            </div>
            <ul className="space-y-1.5 text-slate-600 font-medium text-[11px] leading-relaxed">
              <li>
                <strong className="text-slate-800">YOLOv8 Real-Time:</strong> Dual-channel object detection pipeline running at ~25–30 FPS.
              </li>
              <li>
                <strong className="text-slate-800">Tracking Engine:</strong> Centroid tracking with temporal bounding box smoothing across frames.
              </li>
              <li>
                <strong className="text-slate-800">WebSocket Telemetry:</strong> Low-latency streaming of telemetry, alarms, and coordinates.
              </li>
            </ul>
          </div>

          {/* Column 2: Distance Formulation & Calibration */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
              <Ruler className="w-4 h-4 text-amber-600" />
              <h4>Distance & Metric Calculations</h4>
            </div>
            <ul className="space-y-1.5 text-slate-600 font-medium text-[11px] leading-relaxed">
              <li>
                <strong className="text-slate-800">Euclidean Center:</strong>{' '}
                <code className="bg-slate-100 text-cyan-800 px-1 py-0.5 rounded font-mono font-bold">
                  d = √(Δx² + Δy²) × s
                </code>
              </li>
              <li>
                <strong className="text-slate-800">Perimeter Clearance:</strong> Orthogonal bounding-box edge gap buffer between pairs.
              </li>
              <li>
                <strong className="text-slate-800">Scale Calibration:</strong> Ground-plane factor{' '}
                <code className="bg-slate-100 text-slate-900 px-1 py-0.5 rounded font-mono font-bold">
                  1 px ≈ 0.0055 m
                </code>{' '}
                (1 m ≈ 182 px).
              </li>
            </ul>
          </div>

          {/* Column 3: Threat Classification Logic */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
              <ShieldAlert className="w-4 h-4 text-red-600" />
              <h4>Threat Classification Logic</h4>
            </div>
            <ul className="space-y-1.5 text-slate-600 font-medium text-[11px] leading-relaxed">
              <li>
                <span className="inline-block w-2 h-2 rounded-full bg-red-600 mr-1.5"></span>
                <strong className="text-red-900 font-bold">CRITICAL (&lt; 3.5m / Edge &lt; 1.5m):</strong> Triggers audible strobe buzzer and instant snapshot evidence.
              </li>
              <li>
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-1.5"></span>
                <strong className="text-amber-900 font-bold">WARNING (3.5m – 6.0m):</strong> Proximity alert chime and continuous tracking HUD.
              </li>
              <li>
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-600 mr-1.5"></span>
                <strong className="text-emerald-900 font-bold">SAFE (&gt; 6.0m):</strong> Perimeter clear, standard background surveillance.
              </li>
            </ul>
          </div>

          {/* Column 4: Drowning & Rescue Logic */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
              <Waves className="w-4 h-4 text-cyan-600" />
              <h4>Drowning & Rescue Telemetry</h4>
            </div>
            <ul className="space-y-1.5 text-slate-600 font-medium text-[11px] leading-relaxed">
              <li>
                <strong className="text-slate-800">Distress Signature:</strong> Swimmer posture recognition and vertical thrashing classification.
              </li>
              <li>
                <strong className="text-slate-800">Temporal Verification:</strong> Distress persistence threshold requiring ≥ 15 consecutive frames.
              </li>
              <li>
                <strong className="text-slate-800">Automated Siren:</strong> Emergency broadcast protocol with location and evidence logging.
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500 font-medium">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-700">Vision Sentry AI</span>
            <span>•</span>
            <span>Autonomous Surveillance & Emergency Detection System</span>
          </div>
          <div className="flex items-center space-x-3 font-mono text-[10px]">
            <span>Calibrated Ground-Plane Metric Formulation</span>
            <span>•</span>
            <span className="text-cyan-700 font-bold">Latency: ~33ms (30 FPS)</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
