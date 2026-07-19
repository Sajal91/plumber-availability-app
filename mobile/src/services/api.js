import axios from 'axios';
import { API_BASE_URL } from '../config/config';
import { getToken } from './authStorage';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const sendOtp = (phoneNumber) =>
  api.post('/auth/send-otp', { phoneNumber });

export const verifyOtp = (phoneNumber, otp) =>
  api.post('/auth/verify-otp', { phoneNumber, otp });

export const getMe = () => api.get('/users/me');

export const getPlumbers = () => api.get('/users/plumbers');

export const updateStatus = (status) => api.put('/users/status', { status });

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
