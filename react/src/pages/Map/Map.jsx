import React, { useState } from "react";
import { useGlobalContext } from "../../GlobalContext";
import DeviceMap from "./DeviceMap";
import { FaWifi, FaBroadcastTower, FaPowerOff } from "react-icons/fa";

export default function Map() {
  const { deviceData } = useGlobalContext();
  const [searchText,setSearchText]=useState("");

  // checkbox 預設全開
  const [typeFilters, setTypeFilters] = useState({
    gateway: true,
    device: true, // transponder+amp 合併為 device
  });

  // 只顯示 offline
  const [showOfflineOnly, setShowOfflineOnly] = useState(false);

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
      {/* 左邊地圖（可拉伸至視窗高度） */}
      <div className="card map-card">

        <h3>device map</h3>
        <p>green＝online　yellow＝warning　red＝offline</p>
        <DeviceMap
          /* 不再傳固定 height，讓 CSS 控制高度 */
          typeFilters={typeFilters}
          showOfflineOnly={showOfflineOnly}

          searchText={searchText}
        />
      </div>

      {/* 右側篩選卡片（固定寬度，內容可滾動） */}
      <div className="card map-filter-card">
        <h3 style={{ marginBottom: 12 }}>show select type</h3>


        <div style={{ marginBottom: 8, display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="text"
            placeholder="Search deviceEui / gatewayEui / location"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid #ccc", width: 320 }}
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
          <span> offline device</span>
        </label>
      </div>
    </div>
  );
}
