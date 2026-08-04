import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  let token: string | null = null;
  const url = config.url || '';

  if (url.includes('/user/') || url.startsWith('user/')) {
    token = localStorage.getItem('user_token');
  } else if (url.includes('/admin/') || url.startsWith('admin/')) {
    token = localStorage.getItem('admin_token');
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
