import axios from 'axios';
import { useAuthStore } from './src/store/useAuthStore';

// Get the base URL from the environment
let baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

// Automatically append /api/v1 if it's missing from the environment variable
if (baseURL && !baseURL.endsWith('/api/v1')) {
  baseURL = `${baseURL.replace(/\/$/, '')}/api/v1`;
}

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to attach the JWT token
api.interceptors.request.use((config) => {
  const authStorage = localStorage.getItem('auth-storage');
  if (authStorage) {
    const { state } = JSON.parse(authStorage);
    if (state?.token) {
      config.headers.Authorization = `Bearer ${state.token}`;
    }
  }
  return config;
});

// Add a response interceptor to handle 401 Unauthorized globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export default api;