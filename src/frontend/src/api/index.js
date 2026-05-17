import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('swp_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me')
};

export const locationsAPI = {
  list: () => api.get('/locations'),
  get: (id) => api.get(`/locations/${id}`)
};

export const podsAPI = {
  list: (locationId) => api.get('/pods', { params: { locationId } }),
  get: (id) => api.get(`/pods/${id}`),
  getSlots: (podId, date) => api.get('/bookings/slots', { params: { podId, date } }),
  unlock: (id, token, pin) => api.post(`/pods/${id}/unlock`, { token, pin })
};

export const bookingsAPI = {
  create: (data) => api.post('/bookings', data),
  my: () => api.get('/bookings/my'),
  cancel: (id) => api.patch(`/bookings/${id}/cancel`)
};

export default api;