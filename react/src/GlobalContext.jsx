// 假資料
// const dData = [
//   {
//     deviceId: "1",
//     deviceName: "server A",
//     status: "online",
//     type: "server",
//     longitude: "120.885853",
//     latitude: "24.001127",
//     temperature: 25.5,
//     humidity: 60.2,
//     batteryLevel: 85,
//     lastUpdated: "2024-08-12T10:30:00Z",
//     alerts: [],
//     position : { x: 0, y: 0 },
//   },
//   {
//     deviceId: "2",
//     deviceName: "gateway A",
//     status: "warning",
//     type: "gateway",
//     longitude: "121.516959",
//     latitude: "25.047817",
//     temperature: 20.5,
//     humidity: 50.2,
//     batteryLevel: 30,
//     lastUpdated: "2024-08-12T10:30:00Z",
//     alerts: [
//       { type: "warning", message: "設備warning", timestamp: "2024-08-12T10:00:00Z" },
//       { type: "lowBattery", message: "電量低於 20%", timestamp: "2024-08-12T10:00:00Z" },
//     ],
//     position : { x: 0, y: 0 },
//   },
//   {
//     deviceId: "3",
//     deviceName: "gateway B",
//     status: "offline",
//     type: "gateway",
//     longitude: "122.516959",
//     latitude: "25.097817",
//     temperature: 20.5,
//     humidity: 50.2,
//     batteryLevel: 30,
//     lastUpdated: "2024-08-12T10:30:00Z",
//     alerts: [
//       { type: "offline", message: "設備offline", timestamp: "2024-08-12T10:00:00Z" },
//       { type: "shutdown", message: "power shutdown", timestamp: "2024-08-12T10:00:00Z" },
//     ],
//     position : { x: 0, y: 0 },
//   },{
//     deviceId: "4",
//     deviceName: "transponder A",
//     status: "offline",
//     type: "transponder",
//     longitude: "124.516959",
//     latitude: "26.097817",
//     temperature: 20.5,
//     humidity: 50.2,
//     batteryLevel: 30,
//     lastUpdated: "2024-08-12T10:30:00Z",
//     alerts: [
//       { type: "offline", message: "設備offline", timestamp: "2024-08-12T10:00:00Z" },
//       { type: "lowBattery", message: "電量低於 20%", timestamp: "2024-08-12T10:00:00Z" },
//     ],
//     position : { x: 0, y: 0 },
//   },{
//     deviceId: "5",
//     deviceName: "transponder B",
//     status: "online",
//     type: "transponder",
//     longitude: "125.516959",
//     latitude: "27.097817",
//     temperature: 20.5,
//     humidity: 50.2,
//     batteryLevel: 30,
//     lastUpdated: "2024-08-12T10:30:00Z",
//     alerts: [],
//     position : { x: 0, y: 0 },
//   },{
//     deviceId: "6",
//     deviceName: "感測器 F",
//     status: "offline",
//     type: "amp",
//     longitude: "126.516959",
//     latitude: "28.097817",
//     temperature: 20.5,
//     humidity: 50.2,
//     batteryLevel: 30,
//     lastUpdated: "2024-08-12T10:30:00Z",
//     alerts: [
//       { type: "offline", message: "設備offline", timestamp: "2024-08-12T10:00:00Z" },
//       { type: "lowBattery", message: "電量低於 20%", timestamp: "2024-08-12T10:00:00Z" },
//     ],
//     position : { x: 0, y: 0 },
//   },
// ];

//source代表來源的node
//target代表目的的node (如沒連線目的,填跟連線來源相同的node)
// const dEdges=[
//   { id: '1', source: '1', target: '2', type: 'smoothstep', animated: true },
//   { id: '2', source: '1', target: '3', type: 'smoothstep', animated: true },
//   { id: '3', source: '2', target: '4', type: 'smoothstep', animated: true },
//   { id: '4', source: '3', target: '5', type: 'smoothstep', animated: true },
//   { id: '5', source: '5', target: '6', type: 'smoothstep', animated: true },

// ]

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from "react";
import { mapApiToApp } from "./utils/mapApiToApp";
import { apiUrl, apiFetch } from './lib/api';

const GlobalContext = createContext(null);
export const useGlobalContext = () => useContext(GlobalContext);

export const GlobalProvider = ({ children }) => {
  // 使用者
  const [user, setUser] = useState({
    isLoggedIn: false,
    token: "",
    username: "",
    role: "",
  });

  // 原始 API 資料（完整保留）
  const [rawData, setRawData] = useState(null);
  //當只有新增gateway而底下沒有device時,要透過setRawGateways
  const [rawGateways, setRawGateways] = useState([]);

  const [deviceData, setDeviceData] = useState([]);   // nodes
  const [deviceLink, setDeviceLink] = useState([]);   // edges

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const [selectedDevice, setSelectedDevice] = useState(null);





  const currentCtrlRef = useRef < AbortController | null > (null);

  // 單次抓資料（與現有的 loadData 幾乎相同，只是把 ctrl 換成 ref 管理）
  const loadData = useCallback(async () => {
    // 若上一輪尚未結束就中止
    if (currentCtrlRef.current) currentCtrlRef.current.abort();
    const ctrl = new AbortController();
    currentCtrlRef.current = ctrl;

    try {
      setLoading(true);
      setError(null);

      const res = await apiFetch('/amplifier/devices', { signal: ctrl.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      setRawData(json);

      const { nodes, links } = mapApiToApp(json, deviceData, deviceLink);
      setDeviceData(nodes);
      setDeviceLink(links);
    } catch (e) {
      if ((e)?.name !== 'AbortError') setError(e);
    } finally {
      setLoading(false);
      // 本輪完成後清空 controller
      if (currentCtrlRef.current === ctrl) currentCtrlRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiFetch, mapApiToApp, deviceData, deviceLink]); // or用 refs 來避免依賴也可



  
  // 30 秒輪詢（setInterval 版本）：先跑一次，之後每 30 秒跑一次
  useEffect(() => {
    // 先抓一次
    loadData();

    const interval = setInterval(() => {
      // console.log("[GlobalContext] 資料更新於", new Date().toLocaleString());
      loadData();
    }, 30000);

    return () => {
      clearInterval(interval);
      // 卸載時中止未完成請求
      if (currentCtrlRef.current) currentCtrlRef.current.abort();
    };
  }, [loadData]);






  useEffect(() => {
    const ctrl = new AbortController();
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        // const res = await fetch("http://61.216.140.11:9002/api/amplifier/devices", {
        //   signal: ctrl.signal,
        // });
        const res = await apiFetch('/amplifier/devices', { signal: ctrl.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();

        setRawData(json);

        const { nodes, links } = mapApiToApp(json, deviceData, deviceLink);
        setDeviceData(nodes);
        setDeviceLink(links);
      } catch (e) {
        if (e.name !== "AbortError") setError(e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
    return () => ctrl.abort();
  }, []);

  useEffect(() => {
    // console.log("deviceData : ", JSON.stringify(deviceData, null, 2))
  }, [])

  // 原始資料的索引（讓元件可由 deviceId 快速回查 raw）
  const rawDeviceById = useMemo(() => {
    const map = new Map();
    const arr = Array.isArray(rawData?.devices) ? rawData.devices : [];
    for (const d of arr) map.set(String(d.deviceEui), d);
    return map;
  }, [rawData]);

  const rawGatewayById = useMemo(() => {
    const map = new Map();
    const arr = Array.isArray(rawData?.devices) ? rawData.devices : [];
    for (const d of arr) {
      const gw = d.gateway;
      if (gw?.gatewayEui) map.set(String(gw.gatewayEui), gw);
    }
    return map;
  }, [rawData]);


  // 從id取回原始的rawData
  const getRawDevice = useCallback(
    (id) => rawDeviceById.get(String(id)) ?? null,
    [rawDeviceById]
  );
  const getRawGateway = useCallback(
    (id) => rawGatewayById.get(String(id)) ?? null,
    [rawGatewayById]
  );

  // 地圖聚焦
  const [mapFocus, setMapFocus] = useState(null);
  // const focusDeviceOnMap = (deviceId, zoom = 15) => {
  const focusDeviceOnMap = (deviceId, zoom = 15, openInfo = true) => {
    const dev = (deviceData || []).find((d) => String(d.deviceId) === String(deviceId));
    if (!dev) return;
    setMapFocus({
      id: String(dev.deviceId),
      lat: Number(dev.latitude),
      lng: Number(dev.longitude),
      zoom,
      openInfo,
      ts: Date.now(),
    });
  };

  // auth
  const login = (username, password) => {
    if (username === "admin" && password === "1234") {
      setUser({ isLoggedIn: true, token: "fake-jwt-token", username: "admin", role: "admin" });
      return true;
    }
    return false;
  };
  const logout = () => setUser({ isLoggedIn: false, token: null, username: "", role: "" });



  // ---- 共享告警狀態（新增） ----
  const [alerts, setAlerts] = useState([]); // 全專案共用
  const addAlert = useCallback(
    (alert) => setAlerts((prev) => [alert, ...prev].slice(0, 20)),
    []
  );
  const acknowledgeAlert = useCallback(
    (id) => setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a))),
    []
  );
  const markAllAlertsRead = useCallback(
    () => setAlerts((prev) => prev.map((a) => ({ ...a, acknowledged: true }))),
    []
  );
  const clearAcknowledgedAlerts = useCallback(
    () => setAlerts((prev) => prev.filter((a) => !a.acknowledged)),
    []
  );
  const clearAllAlerts = useCallback(() => setAlerts([]), []);




  return (
    <GlobalContext.Provider
      value={{
        // 原始資料
        rawData,
        setRawData,
        rawDeviceById,
        rawGatewayById,
        getRawDevice,
        getRawGateway,

        // 內部統一格式舊UI用
        deviceData,
        setDeviceData,
        deviceLink,
        setDeviceLink,

        // 其他
        user, setUser, login, logout,
        loading, error,
        mapFocus, focusDeviceOnMap,
        globalSettings: { theme: "light", language: "zh-TW" },

        //共享告警 API
        alerts, addAlert, acknowledgeAlert, markAllAlertsRead, clearAcknowledgedAlerts, clearAllAlerts,

        loadData,

        selectedDevice,
        setSelectedDevice,
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
};
