import React, { useState } from 'react';
import { 
  X, 
  Smartphone, 
  Wifi, 
  Cable, 
  Check, 
  AlertCircle, 
  Play, 
  HelpCircle,
  Camera
} from 'lucide-react';
import { controlStream } from '../services/api';

export const PhoneCameraModal = ({ channelId = 'animal_human', onClose, onConnected }) => {
  const [mode, setMode] = useState('wifi'); // Default to Wi-Fi IP Camera
  const [ipUrl, setIpUrl] = useState('http://10.134.93.16:8080/video'); // Pre-fill with detected phone IP
  const [cameraIndex, setCameraIndex] = useState('0');
  const [targetChannel, setTargetChannel] = useState(channelId);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      let sourceToUse = mode === 'wifi' ? ipUrl.trim() : cameraIndex;
      
      if (mode === 'wifi') {
        if (!sourceToUse.startsWith('http://') && !sourceToUse.startsWith('https://') && !sourceToUse.startsWith('rtsp://')) {
          sourceToUse = 'http://' + sourceToUse;
        }
        if (!sourceToUse.endsWith('/video') && !sourceToUse.endsWith('/mjpegfeed')) {
          sourceToUse = sourceToUse.replace(/\/$/, '') + '/video';
        }
      }

      await controlStream(targetChannel, 'start', sourceToUse);
      if (onConnected) {
        onConnected(sourceToUse, targetChannel);
      }
      onClose();
    } catch (err) {
      console.error('Failed to connect camera:', err);
      setError('Could not connect to the stream. Please verify your phone screen shows "Video connections: >0"');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-cyan-100 text-cyan-700 border border-cyan-300">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Connect Phone Camera (IP Webcam)</h3>
              <p className="text-[11px] text-slate-600 font-medium">Stream live phone video wirelessly directly into AI detection</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs text-slate-800">
          {/* Target Channel */}
          <div className="space-y-1.5">
            <label className="text-slate-900 font-bold block">Feed this camera into channel:</label>
            <select
              value={targetChannel}
              onChange={(e) => setTargetChannel(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-cyan-600 focus:bg-white font-bold"
            >
              <option value="animal_human">🐾 Wildlife & Human Threat Surveillance</option>
              <option value="drowning">🏊 Water Rescue & Drowning Surveillance</option>
            </select>
          </div>

          {/* Connection Method Tabs */}
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setMode('wifi')}
              className={`flex items-center justify-center space-x-2 py-2 rounded-lg font-bold transition ${
                mode === 'wifi'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <Wifi className="w-4 h-4" />
              <span>Phone Wi-Fi (IP Webcam)</span>
            </button>
            <button
              onClick={() => setMode('usb')}
              className={`flex items-center justify-center space-x-2 py-2 rounded-lg font-bold transition ${
                mode === 'usb'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Webcam / USB Cable</span>
            </button>
          </div>

          {/* METHOD 1: Wi-Fi IP Camera */}
          {mode === 'wifi' && (
            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="space-y-1">
                <label className="text-slate-900 font-bold block">Enter Phone Stream URL:</label>
                <input
                  type="text"
                  value={ipUrl}
                  onChange={(e) => setIpUrl(e.target.value)}
                  placeholder="http://10.134.93.16:8080/video"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-cyan-800 font-mono font-bold text-xs focus:outline-none focus:border-cyan-600 shadow-sm"
                />
              </div>

              {/* Instructions */}
              <div className="text-[11px] text-slate-700 space-y-1.5 pt-2 border-t border-slate-200">
                <div className="font-bold text-emerald-700 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>IP Webcam Connected on Phone (10.134.93.16):</span>
                </div>
                <p className="text-slate-600 font-medium">
                  Ensure <strong>IP Webcam</strong> is active on your phone with the camera on, then click <strong>"Connect Live Camera"</strong> below.
                </p>
              </div>
            </div>
          )}

          {/* METHOD 2: USB / Webcam Device */}
          {mode === 'usb' && (
            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="space-y-1">
                <label className="text-slate-900 font-bold block">Select Active Camera Device:</label>
                <select
                  value={cameraIndex}
                  onChange={(e) => setCameraIndex(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold text-xs focus:outline-none focus:border-cyan-600 shadow-sm"
                >
                  <option value="0">Camera 0 (Primary PC Webcam / Built-in Camera)</option>
                  <option value="1">Camera 1 (Secondary / Phone USB / DroidCam)</option>
                  <option value="2">Camera 2 (External USB Cam)</option>
                </select>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition shadow-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="flex items-center space-x-1.5 px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-extrabold transition shadow-md shadow-cyan-600/30"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isConnecting ? 'Connecting...' : 'Connect Live Camera'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
