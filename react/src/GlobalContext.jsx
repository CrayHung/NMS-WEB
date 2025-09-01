import React, { createContext, useContext, useState } from "react";

const GlobalContext = createContext(null);

// 假資料
const dData = [
  {
    deviceId: "1",
    deviceName: "server A",
    status: "online",
    type: "server",
    longitude: "120.885853",
    latitude: "24.001127",
    temperature: 25.5,
    humidity: 60.2,
    batteryLevel: 85,
    lastUpdated: "2024-08-12T10:30:00Z",
    alerts: [],
    position : { x: 0, y: 0 },
  },
  {
    deviceId: "2",
    deviceName: "gateway A",
    status: "warning",
    type: "gateway",
    longitude: "121.516959",
    latitude: "25.047817",
    temperature: 20.5,
    humidity: 50.2,
    batteryLevel: 30,
    lastUpdated: "2024-08-12T10:30:00Z",
    alerts: [
      { type: "warning", message: "設備warning", timestamp: "2024-08-12T10:00:00Z" },
      { type: "lowBattery", message: "電量低於 20%", timestamp: "2024-08-12T10:00:00Z" },
    ],
    position : { x: 0, y: 0 },
  },
  {
    deviceId: "3",
    deviceName: "gateway B",
    status: "offline",
    type: "gateway",
    longitude: "122.516959",
    latitude: "25.097817",
    temperature: 20.5,
    humidity: 50.2,
    batteryLevel: 30,
    lastUpdated: "2024-08-12T10:30:00Z",
    alerts: [
      { type: "offline", message: "設備offline", timestamp: "2024-08-12T10:00:00Z" },
      { type: "shutdown", message: "power shutdown", timestamp: "2024-08-12T10:00:00Z" },
    ],
    position : { x: 0, y: 0 },
  },{
    deviceId: "4",
    deviceName: "transponder A",
    status: "offline",
    type: "transponder",
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
    position : { x: 0, y: 0 },
  },{
    deviceId: "5",
    deviceName: "transponder B",
    status: "online",
    type: "transponder",
    longitude: "125.516959",
    latitude: "27.097817",
    temperature: 20.5,
    humidity: 50.2,
    batteryLevel: 30,
    lastUpdated: "2024-08-12T10:30:00Z",
    alerts: [],
    position : { x: 0, y: 0 },
  },{
    deviceId: "6",
    deviceName: "感測器 F",
    status: "offline",
    type: "amp",
    longitude: "126.516959",
    latitude: "28.097817",
    temperature: 20.5,
    humidity: 50.2,
    batteryLevel: 30,
    lastUpdated: "2024-08-12T10:30:00Z",
    alerts: [
      { type: "offline", message: "設備offline", timestamp: "2024-08-12T10:00:00Z" },
      { type: "lowBattery", message: "電量低於 20%", timestamp: "2024-08-12T10:00:00Z" },
    ],
    position : { x: 0, y: 0 },
  },
];

//source代表來源的node
//target代表目的的node (如沒連線目的,填跟連線來源相同的node)
const dEdges=[
  { id: '1', source: '1', target: '2', type: 'smoothstep', animated: true },
  { id: '2', source: '1', target: '3', type: 'smoothstep', animated: true },
  { id: '3', source: '2', target: '4', type: 'smoothstep', animated: true },
  { id: '4', source: '3', target: '5', type: 'smoothstep', animated: true },
  { id: '5', source: '5', target: '6', type: 'smoothstep', animated: true },

]

export const GlobalProvider = ({ children }) => {
  // 使用者狀態（可日後擴充 JWT）
  const [user, setUser] = useState({
    isLoggedIn: false,
    token: "",
    username: "",
    role: "",
  });






  const [deviceData, setDeviceData] = useState(dData);
  // const [deviceData, setDeviceData] = useState();
  const [error, setError] = useState();
  const [loading, setLoading] = useState();



  const [deviceLink, setDeviceLink] = useState(dEdges);
  const [globalSettings, setGlobalSettings] = useState({ theme: "light", language: "zh-TW" });


  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('http://61.216.140.11:9002/api/amplifier/devices'); 
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const jsonData = await response.json();
        setDeviceData(jsonData);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);





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

        deviceLink,
        setDeviceLink
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
};

export const useGlobalContext = () => useContext(GlobalContext);
