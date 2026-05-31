import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default api;

export const authAPI = {
  login: (username: string, password: string) => api.post('/auth/login', { username, password }),
  getProfile: () => api.get('/auth/profile'),
};

export const propertyAPI = {
  getProperties: (params: Record<string, unknown>) => api.get('/properties', { params }),
  getPropertyById: (id: string) => api.get(`/properties/${id}`),
  createProperty: (data: Record<string, unknown>) => api.post('/properties', data),
  updateProperty: (id: string, data: Record<string, unknown>) => api.put(`/properties/${id}`, data),
  deleteProperty: (id: string) => api.delete(`/properties/${id}`),
};

export const nvrAPI = {
  getNVRsByPropertyId: (propertyId: string) => api.get(`/properties/${propertyId}/nvrs`),
  createNVR: (propertyId: string, data: Record<string, unknown>) => api.post(`/properties/${propertyId}/nvrs`, data),
  getNVRById: (id: string) => api.get(`/nvrs/${id}`),
  updateNVR: (id: string, data: Record<string, unknown>) => api.put(`/nvrs/${id}`, data),
  deleteNVR: (id: string) => api.delete(`/nvrs/${id}`),
  testConnection: (id: string) => api.post(`/nvrs/${id}/test`),
  discover: (id: string) => api.post(`/nvrs/${id}/discover`),
  testByParams: (params: Record<string, unknown>) => api.post('/tools/nvr-test', params),
  discoverByParams: (params: Record<string, unknown>) => api.post('/tools/nvr-discover', params),
};

export const channelAPI = {
  getChannels: (params: Record<string, unknown>) => api.get('/channels', { params }),
  getChannelById: (id: string) => api.get(`/channels/${id}`),
  createChannel: (data: Record<string, unknown>) => api.post('/channels', data),
  updateChannel: (id: string, data: Record<string, unknown>) => api.put(`/channels/${id}`, data),
  deleteChannel: (id: string) => api.delete(`/channels/${id}`),
};

export const sessionAPI = {
  createSession: (data: Record<string, unknown>) => api.post('/sessions', data),
  endSession: (id: string) => api.delete(`/sessions/${id}`),
};

export const brandTemplateAPI = {
  getAll: () => api.get('/brand-templates'),
  create: (data: Record<string, unknown>) => api.post('/brand-templates', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/brand-templates/${id}`, data),
  delete: (id: string) => api.delete(`/brand-templates/${id}`),
}

export const userAPI = {
  getUsers: (params?: Record<string, unknown>) => api.get('/users', { params }),
  createUser: (data: { username: string; password: string; role: string; email?: string }) => api.post('/users', data),
  updateUser: (id: string, data: { role: string; email?: string; status: string; password?: string }) => api.put(`/users/${id}`, data),
  deleteUser: (id: string) => api.delete(`/users/${id}`),
}

export const auditAPI = {
  getLogs: (params?: Record<string, unknown>) => api.get('/audit-logs', { params }),
}

export const healthAPI = {
  getDetailed: () => api.get('/health/detailed'),
}

export const recordingAPI = {
  getRecordings: (channelId: string, start: string, end: string) =>
    api.get(`/channels/${channelId}/recordings`, { params: { start, end } }),
  createRecordingSession: (data: {
    channel_id: string
    protocol: string
    record_start: string
    record_end: string
  }) => api.post('/sessions/recording', data),
};
