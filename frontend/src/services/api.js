import axios from 'axios';

const API_BASE = 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
});

export const getSmsStatus = async () => {
  const res = await api.get('/api/notifications/sms/status');
  return res.data;
};

export const getAlerts = async (params = {}) => {
  const res = await api.get('/api/alerts', { params });
  return res.data.alerts;
};

export const getAlertStats = async () => {
  const res = await api.get('/api/alerts/stats');
  return res.data;
};

export const acknowledgeAlert = async (alertId) => {
  const res = await api.post(`/api/alerts/${alertId}/acknowledge`);
  return res.data;
};

export const clearAllAlerts = async () => {
  const res = await api.post('/api/alerts/clear');
  return res.data;
};

export const controlStream = async (channelId, action, source = null) => {
  const res = await api.post('/api/stream/control', {
    channel_id: channelId,
    action,
    source,
  });
  return res.data;
};

export const getStreamStats = async (channelId) => {
  const res = await api.get(`/api/stream/${channelId}/stats`);
  return res.data.stats;
};

export const getAvailableVideos = async () => {
  const res = await api.get('/api/videos');
  return res.data.videos;
};

export const uploadVideoFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post('/api/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const updateSettings = async (settings) => {
  const res = await api.post('/api/settings', settings);
  return res.data;
};
