// src/lib/api.js
export const API_BASE = (import.meta.env.VITE_API_BASE ?? '/api').replace(/\/+$/, '');
export const TG_BASE  = (import.meta.env.VITE_TG_BASE  ?? '/tg').replace(/\/+$/, '');
export const WS_BASE  = (import.meta.env.VITE_WS_BASE  ?? '/ws').replace(/\/+$/, '');



export const apiUrl = (path) => `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
export const tgUrl  = (path) => `${TG_BASE}${path.startsWith('/') ? path : `/${path}`}`;
export const apiFetch = (input, init) => fetch(apiUrl(input), init);

if (import.meta.env.DEV) {
  console.debug('[BASES]', { API_BASE, TG_BASE, WS_BASE });
}
