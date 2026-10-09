import React, { useState } from 'react';
import { X, Sliders, Save, Check } from 'lucide-react';
import { updateSettings } from '../services/api';

export const SettingsModal = ({ onClose, onSaved }) => {
  const [drowningConf, setDrowningConf] = useState(40);
  const [animalConf, setAnimalConf] = useState(50);
  const [humanConf, setHumanConf] = useState(50);
  const [proximityMeters, setProximityMeters] = useState(3.5);
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
        proximity_threshold: Math.round(proximityMeters * 62),
        proximity_threshold_meters: proximityMeters,
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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl">
        <div className="px-6 py-4 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Sliders className="w-5 h-5 text-cyan-600" />
            <h3 className="text-base font-extrabold text-slate-900">AI Vision & Detection Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 text-xs text-slate-700">
          {/* Drowning Confidence */}
          <div className="space-y-2">
            <div className="flex justify-between font-mono">
              <label className="text-slate-900 font-bold">Drowning Detection Confidence:</label>
              <span className="text-cyan-700 font-extrabold">{drowningConf}%</span>
            </div>
            <input
              type="range"
              min="20"
              max="90"
              step="5"
              value={drowningConf}
              onChange={(e) => setDrowningConf(Number(e.target.value))}
              className="w-full accent-cyan-600 cursor-pointer"
            />
            <p className="text-[11px] text-slate-600 font-medium">Minimum threshold for flagging drowning distress.</p>
          </div>

          {/* Animal Confidence */}
          <div className="space-y-2">
            <div className="flex justify-between font-mono">
              <label className="text-slate-900 font-bold">Animal Detection Confidence:</label>
              <span className="text-amber-700 font-extrabold">{animalConf}%</span>
            </div>
            <input
              type="range"
              min="20"
              max="90"
              step="5"
              value={animalConf}
              onChange={(e) => setAnimalConf(Number(e.target.value))}
              className="w-full accent-amber-600 cursor-pointer"
            />
            <p className="text-[11px] text-slate-600 font-medium">Confidence for classifying bears, leopards, elephants, etc.</p>
          </div>

          {/* Human Confidence */}
          <div className="space-y-2">
            <div className="flex justify-between font-mono">
              <label className="text-slate-900 font-bold">Human Detection Confidence:</label>
              <span className="text-blue-700 font-extrabold">{humanConf}%</span>
            </div>
            <input
              type="range"
              min="20"
              max="90"
              step="5"
              value={humanConf}
              onChange={(e) => setHumanConf(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          {/* Proximity Distance Threshold in Real-World Meters */}
          <div className="space-y-2">
            <div className="flex justify-between font-mono">
              <label className="text-slate-900 font-bold">Critical Threat Proximity Limit:</label>
              <span className="text-red-700 font-extrabold">{proximityMeters.toFixed(1)} m (~{Math.round(proximityMeters * 62)} px)</span>
            </div>
            <input
              type="range"
              min="1.0"
              max="8.0"
              step="0.5"
              value={proximityMeters}
              onChange={(e) => setProximityMeters(Number(e.target.value))}
              className="w-full accent-red-600 cursor-pointer"
            />
            <p className="text-[11px] text-slate-600 font-medium">Real-world physical distance under which animal-human presence triggers CRITICAL alarm.</p>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition shadow-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition shadow-md shadow-cyan-600/20"
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
