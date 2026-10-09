import React, { useState } from 'react';
import { X, Upload, Film, Check, AlertCircle, Loader2 } from 'lucide-react';
import { uploadVideoFile } from '../services/api';

export const UploadModal = ({ channelId = 'animal_human', onClose, onUploadSuccess }) => {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [targetChannel, setTargetChannel] = useState(channelId || 'animal_human');

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a video file (.mp4, .avi, .mov)');
      return;
    }
    setIsUploading(true);
    setError(null);
    try {
      const res = await uploadVideoFile(file);
      if (onUploadSuccess) {
        await onUploadSuccess(res, targetChannel);
      }
      onClose();
    } catch (err) {
      console.error('Upload failed:', err);
      setError('Failed to upload video. Please check connection and try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
        <div className="px-6 py-4 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Upload className="w-5 h-5 text-cyan-600" />
            <h3 className="text-base font-extrabold text-slate-900">Upload Test Video Footage</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          {/* Target Channel Selector */}
          <div className="space-y-1.5">
            <label className="text-slate-900 font-bold block">Play this video on channel:</label>
            <select
              value={targetChannel}
              onChange={(e) => setTargetChannel(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:border-cyan-600 focus:bg-white"
            >
              <option value="animal_human">🐾 Wildlife & Human Threat Surveillance</option>
              <option value="drowning">🏊 Water Rescue & Drowning Surveillance</option>
            </select>
          </div>

          <div className="border-2 border-dashed border-slate-300 hover:border-cyan-600 rounded-xl p-8 text-center transition cursor-pointer bg-slate-50/70 hover:bg-cyan-50/30">
            <input
              type="file"
              accept="video/mp4,video/avi,video/quicktime,video/x-matroska"
              onChange={handleFileChange}
              className="hidden"
              id="video-upload-input"
            />
            <label htmlFor="video-upload-input" className="cursor-pointer block space-y-2">
              <Film className="w-10 h-10 mx-auto text-cyan-600" />
              <div className="font-bold text-slate-900 text-sm">
                {file ? file.name : 'Click to select or drag video file'}
              </div>
              <p className="text-[11px] text-slate-600 font-medium">Supports MP4, AVI, MOV, MKV</p>
            </label>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition shadow-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-md shadow-cyan-600/20"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Uploading & Starting Stream...</span>
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" />
                <span>Upload & Start Stream</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
