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
  ExternalLink
} from 'lucide-react';
import { controlStream } from '../services/api';

export const PhoneCameraModal = ({ channelId = 'animal_human', onClose, onConnected }) => {
  const [mode, setMode] = useState('wifi'); // 'wifi' or 'usb'
  const [ipUrl, setIpUrl] = useState('http://192.168.1.50:8080/video');
  const [cameraIndex, setCameraIndex] = useState('1');
  const [targetChannel, setTargetChannel] = useState(channelId);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const sourceToUse = mode === 'wifi' ? ipUrl.trim() : cameraIndex;
      if (mode === 'wifi' && !sourceToUse.startsWith('http://') && !sourceToUse.startsWith('https://') && !sourceToUse.startsWith('rtsp://')) {
        setError('Please enter a valid stream URL starting with http://, https://, or rtsp://');
        setIsConnecting(false);
        return;
      }

      await controlStream(targetChannel, 'start', sourceToUse);
      if (onConnected) {
        onConnected(sourceToUse, targetChannel);
      }
      onClose();
    } catch (err) {
      console.error('Failed to connect camera:', err);
      setError('Could not connect to the stream. Please check your phone connection.');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0f1422] border border-slate-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Connect Phone Camera</h3>
              <p className="text-[11px] text-slate-400">Stream live phone video directly into the AI detection engine</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs text-slate-300">
          {/* Target Channel */}
          <div className="space-y-1.5">
            <label className="text-slate-200 font-semibold block">Feed this camera into channel:</label>
            <select
              value={targetChannel}
              onChange={(e) => setTargetChannel(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-medium"
            >
              <option value="animal_human">🐾 Wildlife & Human Threat Surveillance</option>
              <option value="drowning">🏊 Water Rescue & Drowning Surveillance</option>
            </select>
          </div>

          {/* Connection Method Tabs */}
          <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setMode('wifi')}
              className={`flex items-center justify-center space-x-2 py-2 rounded-lg font-semibold transition ${
                mode === 'wifi'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Wifi className="w-4 h-4" />
              <span>Wi-Fi (IP Camera)</span>
            </button>
            <button
              onClick={() => setMode('usb')}
              className={`flex items-center justify-center space-x-2 py-2 rounded-lg font-semibold transition ${
                mode === 'usb'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Cable className="w-4 h-4" />
              <span>USB Cable (Direct)</span>
            </button>
          </div>

          {/* METHOD 1: Wi-Fi IP Camera */}
          {mode === 'wifi' && (
            <div className="space-y-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
              <div className="space-y-1">
                <label className="text-slate-200 font-bold block">Phone Stream URL (HTTP / RTSP):</label>
                <input
                  type="text"
                  value={ipUrl}
                  onChange={(e) => setIpUrl(e.target.value)}
                  placeholder="e.g. http://192.168.1.50:8080/video"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-cyan-300 font-mono text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Instructions */}
              <div className="text-[11px] text-slate-400 space-y-1.5 pt-1 border-t border-slate-800">
                <div className="font-semibold text-slate-300 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                  <span>How to get this URL:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-slate-400">
                  <li>Install <strong>"IP Webcam"</strong> (Android) or <strong>"IP Camera Lite" / "DroidCam"</strong> (iPhone/Android).</li>
                  <li>Connect your phone and PC to the <strong>same Wi-Fi network</strong>.</li>
                  <li>Open the app and tap <strong>"Start Server"</strong>.</li>
                  <li>Copy the IP address shown on the phone screen (e.g. <code>http://192.168.x.x:8080/video</code>).</li>
                </ol>
              </div>
            </div>
          )}

          {/* METHOD 2: USB Cable */}
          {mode === 'usb' && (
            <div className="space-y-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
              <div className="space-y-1">
                <label className="text-slate-200 font-bold block">Select USB Camera Device:</label>
                <select
                  value={cameraIndex}
                  onChange={(e) => setCameraIndex(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-cyan-300 font-mono text-xs focus:outline-none focus:border-cyan-500"
                >
                  <option value="1">Camera 1 (Secondary / Phone USB / DroidCam)</option>
                  <option value="0">Camera 0 (Default / Built-in Webcam)</option>
                  <option value="2">Camera 2 (External USB 2)</option>
                </select>
              </div>

              {/* Instructions */}
              <div className="text-[11px] text-slate-400 space-y-1.5 pt-1 border-t border-slate-800">
                <div className="font-semibold text-slate-300 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                  <span>How to connect via USB Cable:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-slate-400">
                  <li>Install <strong>DroidCam</strong> or <strong>Iriun 4K Webcam</strong> on both your PC and Phone.</li>
                  <li>Plug in your phone with a USB cable (with USB debugging enabled if prompted).</li>
                  <li>Start DroidCam/Iriun on PC $ightarrow$ your phone becomes <strong>Camera 1</strong> with ultra-low latency!</li>
                </ol>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-950/50 border border-red-800 rounded-lg text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
          >
            Cancel
          </button>
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="flex items-center space-x-1.5 px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition shadow-md shadow-cyan-600/30"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isConnecting ? 'Connecting...' : 'Connect & Start Live AI Detection'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
