import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token expiry or other global errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token expired or invalid, redirect to login
      console.error("Unauthorized, redirecting to login...");
      // TODO: Implement actual redirect logic
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// Example API calls (these will be moved to specific service files later)

export const authAPI = {
  login: (username, password) => api.post('/auth/login', { username, password }),
  getProfile: () => api.get('/auth/profile'),
};

export const propertyAPI = {
  getProperties: (params) => api.get('/properties', { params }),
  getPropertyById: (id) => api.get(`/properties/${id}`),
  createProperty: (data) => api.post('/properties', data),
  updateProperty: (id, data) => api.put(`/properties/${id}`, data),
  deleteProperty: (id) => api.delete(`/properties/${id}`),
};

export const nvrAPI = {
  getNVRsByPropertyId: (propertyId) => api.get(`/properties/${propertyId}/nvrs`),
  createNVR: (propertyId, data) => api.post(`/properties/${propertyId}/nvrs`, data),
  getNVRById: (id) => api.get(`/nvrs/${id}`),
  updateNVR: (id, data) => api.put(`/nvrs/${id}`, data),
  deleteNVR: (id) => api.delete(`/nvrs/${id}`),
};

export const channelAPI = {
  getChannels: (params) => api.get('/channels', { params }),
  getChannelById: (id) => api.get(`/channels/${id}`),
  createChannel: (data) => api.post('/channels', data),
  updateChannel: (id, data) => api.put(`/channels/${id}`, data),
  deleteChannel: (id) => api.delete(`/channels/${id}`),
};

export const sessionAPI = {
  createSession: (data) => api.post('/sessions', data),
  endSession: (id) => api.delete(`/sessions/${id}`),
};
