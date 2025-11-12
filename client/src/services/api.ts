import axios from 'axios';

const API_BASE_URL = 'http://localhost:3002/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const healthCheck = () => api.get('/health');
export const getPeople = () => api.get('/people');
export const getPersonDetail = (id: string) => api.get(`/people/${id}`);
export const getAlerts = (status?: string) => api.get('/alerts', { params: { status } });
export const ackAlert = (id: number) => api.post(`/alerts/${id}/ack`);
export const declineAlert = (id: number) => api.post(`/alerts/${id}/decline`);
export const getRiskLevels = () => api.get('/risk-levels');

export default api;
