import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { LivePlayer } from './components/LivePlayer';
import { ThreatRadar } from './components/ThreatRadar';
import { DrowningStatsCard } from './components/DrowningStatsCard';
import { AlertCenter } from './components/AlertCenter';
import { IncidentLog } from './components/IncidentLog';
import { SnapshotModal } from './components/SnapshotModal';
import { SettingsModal } from './components/SettingsModal';
import { UploadModal } from './components/UploadModal';
import { EmergencyBuzzer } from './components/EmergencyBuzzer';
import { useAlertWebSocket, buzzer } from './hooks/useWebSocket';
import { getAlerts, getAlertStats, getAvailableVideos, getStreamStats, controlStream } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('animal_human'); // 'animal_human' | 'drowning' | 'dual' | 'logs'
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isBuzzerActive, setIsBuzzerActive] = useState(false);
  const [activeBuzzerAlert, setActiveBuzzerAlert] = useState(null);

  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState({ total: 0, critical: 0, warning: 0, drowning_incidents: 0, animal_threat_incidents: 0 });
  const [selectedSnapshotAlert, setSelectedSnapshotAlert] = useState(null);
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [uploadChannel, setUploadChannel] = useState(null);
  const [availableVideos, setAvailableVideos] = useState([]);

  // Active video source state for each channel
  const [channelSources, setChannelSources] = useState({
    animal_human: 'sample',
    drowning: 'sample',
  });

  const [animalHumanStats, setAnimalHumanStats] = useState({});
  const [drowningStats, setDrowningStats] = useState({});

  // Stop / Silence Buzzer manually
  const handleStopBuzzer = useCallback(() => {
    buzzer.stop();
    setIsBuzzerActive(false);
    setActiveBuzzerAlert(null);
  }, []);

  // Fetch initial data
  const fetchData = useCallback(async () => {
    try {
      const [alertsData, statsData, videosData] = await Promise.all([
        getAlerts({ limit: 50 }),
        getAlertStats(),
        getAvailableVideos(),
      ]);
      setAlerts(alertsData || []);
      setStats(statsData || {});
      setAvailableVideos(videosData || []);
    } catch (err) {
      console.warn('Data fetch error:', err);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Polling stream telemetry for HUD cards
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        if (activeTab === 'animal_human' || activeTab === 'dual') {
          const s = await getStreamStats('animal_human');
          if (s) setAnimalHumanStats(s);
        }
        if (activeTab === 'drowning' || activeTab === 'dual') {
          const s = await getStreamStats('drowning');
          if (s) setDrowningStats(s);
        }
      } catch (err) {
        // silent catch
      }
    }, 800);
    return () => clearInterval(interval);
  }, [activeTab]);

  // Handle incoming real-time WebSocket alert
  const handleNewAlert = useCallback((newAlert) => {
    setAlerts((prev) => [newAlert, ...prev]);
    setStats((prev) => ({
      ...prev,
      total: (prev.total || 0) + 1,
      critical: newAlert.threat_level === 'CRITICAL' ? (prev.critical || 0) + 1 : (prev.critical || 0),
      warning: newAlert.threat_level === 'WARNING' ? (prev.warning || 0) + 1 : (prev.warning || 0),
    }));

    if (newAlert.threat_level === 'CRITICAL') {
      setActiveBuzzerAlert(newAlert);
      setIsBuzzerActive(true);
      if (isAudioEnabled) {
        buzzer.start(); // Continuously plays "beep-beep" until user clicks stop
      }
    } else if (newAlert.threat_level === 'WARNING' && isAudioEnabled && !isBuzzerActive) {
      buzzer.playWarningChime();
    }
  }, [isAudioEnabled, isBuzzerActive]);

  const { isConnected } = useAlertWebSocket(handleNewAlert, isAudioEnabled);

  // If audio is globally muted while buzzer is sounding, stop the buzzer
  useEffect(() => {
    if (!isAudioEnabled && isBuzzerActive) {
      buzzer.stop();
    } else if (isAudioEnabled && isBuzzerActive) {
      buzzer.start();
    }
  }, [isAudioEnabled, isBuzzerActive]);

  // Handle video upload success
  const handleUploadSuccess = async (uploadRes, targetCh) => {
    const ch = targetCh || (activeTab === 'drowning' ? 'drowning' : 'animal_human');
    const filePath = uploadRes.path;

    try {
      await controlStream(ch, 'start', filePath);
    } catch (e) {
      console.error('Failed to start stream with uploaded video:', e);
    }

    await fetchData();

    setChannelSources((prev) => ({
      ...prev,
      [ch]: filePath,
    }));
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#070a11] text-slate-100 relative">
      {/* Emergency Buzzer Banner (Active when critical signal appears) */}
      {isBuzzerActive && activeBuzzerAlert && (
        <EmergencyBuzzer
          alert={activeBuzzerAlert}
          onStopBuzzer={handleStopBuzzer}
        />
      )}

      {/* Top Header */}
      <Header
        isConnected={isConnected}
        isAudioEnabled={isAudioEnabled}
        setIsAudioEnabled={setIsAudioEnabled}
        isBuzzerActive={isBuzzerActive}
        onStopBuzzer={handleStopBuzzer}
        stats={stats}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Content Area */}
      <main className={`flex-1 p-4 lg:p-8 max-w-[1700px] w-full mx-auto space-y-6 transition-all ${
        isBuzzerActive ? 'mt-14' : ''
      }`}>
        {/* VIEW 1: Wildlife Threat Surveillance */}
        {activeTab === 'animal_human' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <LivePlayer
                channelId="animal_human"
                title="Perimeter Wildlife & Human Threat Surveillance Feed"
                badge="Active Channel 2"
                badgeColor="amber"
                availableVideos={availableVideos}
                currentSource={channelSources.animal_human}
                onSourceChange={(src) => setChannelSources(prev => ({ ...prev, animal_human: src }))}
                onOpenUpload={(ch) => setUploadChannel(ch || 'animal_human')}
                stats={animalHumanStats}
              />
            </div>
            <div className="space-y-6">
              <ThreatRadar stats={animalHumanStats} />
              <AlertCenter
                alerts={alerts.filter(a => a.channel === 'ANIMAL_HUMAN_SECURITY')}
                onSelectAlert={(a) => setSelectedSnapshotAlert(a)}
                onAlertAck={(id) => fetchData()}
                isBuzzerActive={isBuzzerActive}
                onStopBuzzer={handleStopBuzzer}
              />
            </div>
          </div>
        )}

        {/* VIEW 2: Water Safety & Drowning Surveillance */}
        {activeTab === 'drowning' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <LivePlayer
                channelId="drowning"
                title="Water Rescue & Drowning Detection CCTV Feed"
                badge="Active Channel 1"
                badgeColor="cyan"
                availableVideos={availableVideos}
                currentSource={channelSources.drowning}
                onSourceChange={(src) => setChannelSources(prev => ({ ...prev, drowning: src }))}
                onOpenUpload={(ch) => setUploadChannel(ch || 'drowning')}
                stats={drowningStats}
              />
            </div>
            <div className="space-y-6">
              <DrowningStatsCard stats={drowningStats} />
              <AlertCenter
                alerts={alerts.filter(a => a.channel === 'DROWNING_RESCUE')}
                onSelectAlert={(a) => setSelectedSnapshotAlert(a)}
                onAlertAck={(id) => fetchData()}
                isBuzzerActive={isBuzzerActive}
                onStopBuzzer={handleStopBuzzer}
              />
            </div>
          </div>
        )}

        {/* VIEW 3: Dual Split Monitor Grid */}
        {activeTab === 'dual' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <LivePlayer
                channelId="animal_human"
                title="Perimeter Wildlife & Human Security"
                badge="Wildlife Mode"
                badgeColor="amber"
                availableVideos={availableVideos}
                currentSource={channelSources.animal_human}
                onSourceChange={(src) => setChannelSources(prev => ({ ...prev, animal_human: src }))}
                onOpenUpload={(ch) => setUploadChannel(ch || 'animal_human')}
                stats={animalHumanStats}
              />
              <LivePlayer
                channelId="drowning"
                title="Water Rescue & Drowning Surveillance"
                badge="Water Rescue Mode"
                badgeColor="cyan"
                availableVideos={availableVideos}
                currentSource={channelSources.drowning}
                onSourceChange={(src) => setChannelSources(prev => ({ ...prev, drowning: src }))}
                onOpenUpload={(ch) => setUploadChannel(ch || 'drowning')}
                stats={drowningStats}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <ThreatRadar stats={animalHumanStats} />
              <DrowningStatsCard stats={drowningStats} />
              <AlertCenter
                alerts={alerts}
                onSelectAlert={(a) => setSelectedSnapshotAlert(a)}
                onAlertAck={(id) => fetchData()}
                isBuzzerActive={isBuzzerActive}
                onStopBuzzer={handleStopBuzzer}
              />
            </div>
          </div>
        )}

        {/* VIEW 4: Incident Log Archive */}
        {activeTab === 'logs' && (
          <IncidentLog
            alerts={alerts}
            onSelectAlert={(a) => setSelectedSnapshotAlert(a)}
            onRefresh={fetchData}
          />
        )}
      </main>

      {/* Snapshot Inspector Modal */}
      {selectedSnapshotAlert && (
        <SnapshotModal
          alert={selectedSnapshotAlert}
          onClose={() => setSelectedSnapshotAlert(null)}
        />
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal
          onClose={() => setIsSettingsOpen(false)}
          onSaved={fetchData}
        />
      )}

      {/* Video Upload Modal */}
      {uploadChannel && (
        <UploadModal
          channelId={uploadChannel}
          onClose={() => setUploadChannel(null)}
          onUploadSuccess={handleUploadSuccess}
        />
      )}
    </div>
  );
}
