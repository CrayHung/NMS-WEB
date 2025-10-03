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
// 你原本已有的其餘方法保持不動
export const amplifierAPI = {
  // 取得裝置清單
  getAllDevices: async () => {
    const { data } = await api.get("/amplifier/devices");
    return data;
  },

  // 取得基準光譜
  getRFPowerSpectrum: async (eui) => {
    const { data } = await api.get(`/amplifier/rf-power/${encodeURIComponent(eui)}/spectrum`);
    return data;
  },

  // 設定（一次只能送一個欄位）
  setDeviceSettings: async (eui, payload) => {
    const { data } = await api.post(`/amplifier/settings/${encodeURIComponent(eui)}`, payload);
    return data;
  },

  // 👇 這個是你按「Query RF Power」要用的端點
  queryRFPowerAll: async (eui) => {
    const { data } = await api.post(`/amplifier/query/${encodeURIComponent(eui)}/rf-power-all`);
    return data;
  },

  // （如果你之前有用過這個名字，保留做別名也行）
  queryRfPowerAll: async (eui) => {
    const { data } = await api.post(`/amplifier/query/${encodeURIComponent(eui)}/rf-power-all`);
    return data;
  },
};