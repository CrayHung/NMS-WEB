import React, { useState, useEffect } from "react";
import { useGlobalContext } from "../../GlobalContext";
import DeviceMap from "./DeviceMap";
import { FaWifi, FaBroadcastTower, FaPowerOff } from "react-icons/fa";
import { apiFetch } from '../../lib/api'

export default function Map() {
  // const { deviceData } = useGlobalContext();
  const [searchText, setSearchText] = useState("");
  // checkbox 預設全開
  const [typeFilters, setTypeFilters] = useState({
    gateway: true,
    device: true, // transponder+amp 合併為 device
  });

  const [deviceData, setDeviceData] = useState([]);


  // 只顯示 offline
  const [showOfflineOnly, setShowOfflineOnly] = useState(false);


  useEffect(() => {
    // Load device list
    const loadDevices = async () => {
      const ac = new AbortController();
      try {

        const response = await apiFetch('/amplifier/devices', { method: 'GET', signal: ac.signal });

        //   const response = await amplifierAPI.getAllDevices()
        if (!response.ok) {
          const t = await response.text().catch(() => "");
          throw new Error(`GET /amplifier/devices/ fail`);
        }
        const data = await response.json();
        console.log("data.length : " + data.length);

        setDeviceData(data.devices || [])

      } catch (error) {
        console.error('Failed to load devices:', error)
        setMessage({ type: 'danger', text: 'Failed to load device list' })
      }
    }

    loadDevices()


  }, [])




  // Device 統計
  const deviceTotal = deviceData.length;
  const deviceOnline = deviceData.filter((d) => d.onlineStatus).length;
  const deviceOffline = deviceTotal - deviceOnline;


  // Gateway 統計 (用物件去重)
  const gatewayObj = {};

  deviceData.forEach((d) => {
    if (d.gateway?.gatewayEui) {
      gatewayObj[d.gateway.gatewayEui] = d.gateway; // 直接以 gatewayEui 當 key
    }
  });

  // 轉成唯一陣列
  const uniqueGateways = Object.values(gatewayObj);

  const gatewayTotal = uniqueGateways.length;
  const gatewayOnline = uniqueGateways.filter((g) => g.onlineStatus).length;
  const gatewayOffline = gatewayTotal - gatewayOnline;




  // 切換類型（關閉 offlineOnly）
  const toggleType = (key) => {
    setTypeFilters((prev) => ({ ...prev, [key]: !prev[key] }));
    setShowOfflineOnly(false);
  };

  // 只顯示 offline 打開時，類型自動取消
  const toggleOfflineOnly = () => {
    setShowOfflineOnly((prev) => {
      const next = !prev;
      if (next) setTypeFilters({ gateway: false, device: false });
      return next;
    });
  };




  return (
    <div className="dashboard-grid" style={{ alignItems: "stretch" }}>
      {/* 左邊地圖 */}
      <div className="card map-card">
        <h3>device map</h3>
        <p>green＝online　yellow＝warning　red＝offline</p>
        <DeviceMap
          typeFilters={typeFilters}
          showOfflineOnly={showOfflineOnly}
          searchText={searchText}
        />
      </div>

      {/* 右側上下卡片 */}
      <div style={{ display: "flex", flexDirection: "column", gap: "2px", width: 360 }}>
        {/* 篩選卡片 */}
        <div className="card map-filter-card">
          <h3 style={{ marginBottom: 12 }}>show select type</h3>

          <div style={{ marginBottom: 8, display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="text"
              placeholder="Search by deviceName / deviceEui / gatewayEui / location"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{
                padding: "8px 10px",
                borderRadius: 6,
                border: "1px solid #ccc",
                width: "100%",
              }}
            />
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, cursor: "pointer" }}>
            <FaWifi />
            <input
              type="checkbox"
              checked={typeFilters.gateway}
              onChange={() => toggleType("gateway")}
              disabled={showOfflineOnly}
            />
            <span>gateway</span>
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, cursor: "pointer" }}>
            <FaBroadcastTower />
            <input
              type="checkbox"
              checked={typeFilters.device}
              onChange={() => toggleType("device")}
              disabled={showOfflineOnly}
            />
            <span>device</span>
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <FaPowerOff />
            <input type="checkbox" checked={showOfflineOnly} onChange={toggleOfflineOnly} />
            <span> offline devices</span>
          </label>
        </div>



{/* Gateway 統計卡片 */}
<div className="card map-filter-card">
  <div className="stat-header">
    <div className="stat-icon">
      <FaWifi />
    </div>
    <h3 className="stat-title">Gateway</h3>
  </div>
  <div className="stat-grid">
    <div className="stat-box">
      <div className="stat-label">Total</div>
      <div className="stat-value">{gatewayTotal}</div>
    </div>
    <div className="stat-box">
      <div className="stat-label online">Online</div>
      <div className="stat-value online">{gatewayOnline}</div>
    </div>
    <div className="stat-box">
      <div className="stat-label offline">Offline</div>
      <div className="stat-value offline">{gatewayOffline}</div>
    </div>
  </div>
</div>

{/* Device 統計卡片 */}
<div className="card map-filter-card">
  <div className="stat-header">
    <div className="stat-icon">
      <FaBroadcastTower />
    </div>
    <h3 className="stat-title">Device</h3>
  </div>
  <div className="stat-grid">
    <div className="stat-box">
      <div className="stat-label">Total</div>
      <div className="stat-value">{deviceTotal}</div>
    </div>
    <div className="stat-box">
      <div className="stat-label online">Online</div>
      <div className="stat-value online">{deviceOnline}</div>
    </div>
    <div className="stat-box">
      <div className="stat-label offline">Offline</div>
      <div className="stat-value offline">{deviceOffline}</div>
    </div>
  </div>
</div>




      </div>
    </div>
  );
}