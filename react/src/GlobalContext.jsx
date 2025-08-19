import React, { createContext, useContext, useState } from "react";

const GlobalContext = createContext(null);

// 假資料
const dData = [
  {
    deviceId: "1",
    deviceName: "感測器 A",
    status: "online",
    longitude: "120.885853",
    latitude: "24.001127",
    temperature: 25.5,
    humidity: 60.2,
    batteryLevel: 85,
    lastUpdated: "2024-08-12T10:30:00Z",
    alerts: [{ type: "lowBattery", message: "電量低於 20%", timestamp: "2024-08-12T10:00:00Z" }],
  },
  {
    deviceId: "2",
    deviceName: "感測器 B",
    status: "warning",
    longitude: "121.516959",
    latitude: "25.047817",
    temperature: 20.5,
    humidity: 50.2,
    batteryLevel: 30,
    lastUpdated: "2024-08-12T10:30:00Z",
    alerts: [
      { type: "warning", message: "設備offline", timestamp: "2024-08-12T10:00:00Z" },
      { type: "lowBattery", message: "電量低於 20%", timestamp: "2024-08-12T10:00:00Z" },
    ],
  },
  {
    deviceId: "3",
    deviceName: "感測器 C",
    status: "offline",
    longitude: "122.516959",
    latitude: "25.097817",
    temperature: 20.5,
    humidity: 50.2,
    batteryLevel: 30,
    lastUpdated: "2024-08-12T10:30:00Z",
    alerts: [
      { type: "shutdown", message: "設備offline", timestamp: "2024-08-12T10:00:00Z" },
      { type: "lowBattery", message: "電量低於 20%", timestamp: "2024-08-12T10:00:00Z" },
    ],
  },{
    deviceId: "4",
    deviceName: "感測器 D",
    status: "offline",
    longitude: "124.516959",
    latitude: "26.097817",
    temperature: 20.5,
    humidity: 50.2,
    batteryLevel: 30,
    lastUpdated: "2024-08-12T10:30:00Z",
    alerts: [
      { type: "offline", message: "設備offline", timestamp: "2024-08-12T10:00:00Z" },
      { type: "lowBattery", message: "電量低於 20%", timestamp: "2024-08-12T10:00:00Z" },
    ],
  },
];

export const GlobalProvider = ({ children }) => {
  // 使用者狀態（可日後擴充 JWT）
  const [user, setUser] = useState({
    isLoggedIn: false,
    token: null,
    username: "",
    role: "",
  });

  const [deviceData, setDeviceData] = useState(dData);
  const [globalSettings, setGlobalSettings] = useState({ theme: "light", language: "zh-TW" });

  // 放在 Provider 內部，直接操作這裡的 setUser
  const login = (username, password) => {
    if (username === "admin" && password === "1234") {
      setUser({ isLoggedIn: true, token: "fake-jwt-token", username: "admin", role: "admin" });
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser({ isLoggedIn: false, token: null, username: "", role: "" });
  };



  // 地圖聚焦的全域狀態
  const [mapFocus, setMapFocus] = useState(null);
  /**
   * 讓地圖聚焦到某個設備，並打開其 Marker 資訊窗
   * @param {string} deviceId
   * @param {number} [zoom=15]
   */
  const focusDeviceOnMap = (deviceId, zoom = 15) => {
    const dev = (deviceData || []).find(d => String(d.deviceId) === String(deviceId));
    if (!dev) return;
    setMapFocus({
      id: String(dev.deviceId),
      lat: Number(dev.latitude),
      lng: Number(dev.longitude),
      zoom,
      ts: Date.now(), // 用時間戳避免同一設備連點時 React 覺得沒變化
    });
  };

  return (
    <GlobalContext.Provider
      value={{
        user,
        setUser,
        login,
        logout,
        deviceData,
        setDeviceData,
        globalSettings,
        setGlobalSettings,

        mapFocus,
        focusDeviceOnMap,
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
};

export const useGlobalContext = () => useContext(GlobalContext);
