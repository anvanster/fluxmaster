export const API_BASE = '/api';
export const WS_URL = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;

export const ROUTES = {
  CHAT: '/',
  DASHBOARD: '/dashboard',
  ADMIN: '/admin',
} as const;
