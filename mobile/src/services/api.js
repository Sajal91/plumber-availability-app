import axios from 'axios';
import { API_BASE_URL } from '../config/config';
import { getToken } from './authStorage';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to protected requests
api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const register = (name, phoneNumber, password) =>
  api.post('/auth/register', { name, phoneNumber, password });

export const login = (phoneNumber, password) =>
  api.post('/auth/login', { phoneNumber, password });

export const getAllUsers = () => api.get('/users/all');

export const updateStatus = (status) => api.put('/users/status', { status });

/**
 * Extract a user-friendly error message from an API error response.
 */
export const getErrorMessage = (error) => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.response?.data?.errors?.length) {
    return error.response.data.errors.map((e) => e.message).join(', ');
  }
  if (error.message === 'Network Error') {
    return 'Cannot reach server. Check your API URL and network connection.';
  }
  return 'Something went wrong. Please try again.';
};

export default api;
