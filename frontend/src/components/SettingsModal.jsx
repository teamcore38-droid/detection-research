import React, { useState } from 'react';
import { X, Sliders, Save, Check } from 'lucide-react';
import { updateSettings } from '../services/api';

export const SettingsModal = ({ onClose, onSaved }) => {
  const [drowningConf, setDrowningConf] = useState(40);
  const [animalConf, setAnimalConf] = useState(50);
  const [humanConf, setHumanConf] = useState(50);
  const [proximityDist, setProximityDist] = useState(220);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings({
        channel_id: 'all',
        drowning_confidence: drowningConf / 100,
        animal_confidence: animalConf / 100,
        human_confidence: humanConf / 100,
        proximity_threshold: proximityDist,
      });
      setSavedSuccess(true);
      if (onSaved) onSaved();
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Failed to update settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0f1422] border border-slate-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl">
        <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">AI Vision & Detection Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 text-xs text-slate-300">
          {/* Drowning Confidence */}
          <div className="space-y-2">
            <div className="flex justify-between font-mono">
              <label className="text-slate-200 font-semibold">Drowning Detection Confidence:</label>
              <span className="text-cyan-400 font-bold">{drowningConf}%</span>
            </div>
            <input
              type="range"
              min="20"
              max="90"
              step="5"
              value={drowningConf}
              onChange={(e) => setDrowningConf(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500">Minimum threshold for flagging drowning distress.</p>
          </div>

          {/* Animal Confidence */}
          <div className="space-y-2">
            <div className="flex justify-between font-mono">
              <label className="text-slate-200 font-semibold">Animal Detection Confidence:</label>
              <span className="text-amber-400 font-bold">{animalConf}%</span>
            </div>
            <input
              type="range"
              min="20"
              max="90"
              step="5"
              value={animalConf}
              onChange={(e) => setAnimalConf(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500">Confidence for classifying bears, leopards, elephants, etc.</p>
          </div>

          {/* Human Confidence */}
          <div className="space-y-2">
            <div className="flex justify-between font-mono">
              <label className="text-slate-200 font-semibold">Human Detection Confidence:</label>
              <span className="text-blue-400 font-bold">{humanConf}%</span>
            </div>
            <input
              type="range"
              min="20"
              max="90"
              step="5"
              value={humanConf}
              onChange={(e) => setHumanConf(Number(e.target.value))}
              className="w-full accent-blue-500 cursor-pointer"
            />
          </div>

          {/* Proximity Distance Threshold */}
          <div className="space-y-2">
            <div className="flex justify-between font-mono">
              <label className="text-slate-200 font-semibold">Animal-Human Attack Proximity Limit:</label>
              <span className="text-red-400 font-bold">{proximityDist} px</span>
            </div>
            <input
              type="range"
              min="80"
              max="400"
              step="10"
              value={proximityDist}
              onChange={(e) => setProximityDist(Number(e.target.value))}
              className="w-full accent-red-500 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500">Distance under which animal-human presence triggers CRITICAL alert.</p>
          </div>
        </div>

        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition shadow-md shadow-cyan-600/20"
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Updating...' : 'Apply Settings'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
