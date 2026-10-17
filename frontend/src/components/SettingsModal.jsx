import React, { useEffect, useState } from 'react';
import { X, Sliders, Save, Check } from 'lucide-react';
import { getSmsStatus, updateSettings } from '../services/api';

export const SettingsModal = ({ onClose, onSaved }) => {
  const [drowningConf, setDrowningConf] = useState(40);
  const [animalConf, setAnimalConf] = useState(50);
  const [humanConf, setHumanConf] = useState(50);
  const [proximityMeters, setProximityMeters] = useState(3.5);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [smsStatus, setSmsStatus] = useState(null);
  const [smsError, setSmsError] = useState(false);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const status = await getSmsStatus();
        if (active) {
          setSmsStatus(status);
          setSmsError(false);
        }
      } catch {
        if (active) setSmsError(true);
      }
    };
    refresh();
    const timer = setInterval(refresh, 5000);
    return () => { active = false; clearInterval(timer); };
  }, []);

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
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
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
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2" aria-live="polite">
            <h4 className="font-extrabold text-slate-900">SMS emergency notifications</h4>
            {smsError ? (
              <p className="text-red-700">Unable to check SMS status. Check the backend connection.</p>
            ) : !smsStatus ? (
              <p>Checking SMS status...</p>
            ) : (
              <>
                <p className={smsStatus.running && !smsStatus.limit_reached ? 'text-emerald-700 font-bold' : 'text-amber-800 font-bold'}>
                  {!smsStatus.enabled ? 'SMS is disabled' : !smsStatus.configured ? 'SMS setup is incomplete' : smsStatus.limit_reached ? 'Sample SMS limit reached' : smsStatus.running ? 'Ready for critical alerts' : 'SMS worker is offline'}
                </p>
                <p>Provider: {smsStatus.provider}</p>
                <p>Recipients: {smsStatus.recipients.join(', ') || 'None configured'}</p>
                <p>Critical animal-human and drowning alerts. Repeat interval: {Math.round(smsStatus.cooldown_seconds / 60 * 10) / 10} minutes.</p>
                {smsStatus.message_limit > 0 && <p>Automatic sample limit: {smsStatus.scheduled_count} / {smsStatus.message_limit} submissions this backend run.</p>}
                {!smsStatus.running && <p>Add your {smsStatus.provider} credentials and enable SMS in the server's .env file, then restart the backend.</p>}
                {smsStatus.enabled && smsStatus.configuration_errors.map((error) => <p key={error} className="text-red-700">{error}</p>)}
                {smsStatus.recent_submissions.length > 0 && (
                  <div className="pt-2 border-t border-slate-200 space-y-1">
                    {smsStatus.recent_submissions.map((item) => (
                      <p key={`${item.channel}-${item.type}-${item.recipient}`} className={item.status === 'error' ? 'text-red-700' : 'text-slate-600'}>
                        {item.recipient}: {item.type === 'DROWNING_EMERGENCY' ? 'Drowning' : 'Animal-human'} — {item.error || `${smsStatus.provider}: ${item.status}`}
                      </p>
                    ))}
                    <p>Submission status only. Check the provider's message history and the recipient's phone.</p>
                  </div>
                )}
              </>
            )}
          </div>

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
