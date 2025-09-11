import React, { useState } from "react";
import { useGlobalContext } from "../../GlobalContext";
import DeviceMap from "../../components/map/DeviceMap";
import { FaServer, FaWifi, FaBroadcastTower, FaBolt, FaPowerOff } from "react-icons/fa";


export default function Map() {
  const { deviceData } = useGlobalContext();

  // checkbox預設全開
  const [typeFilters, setTypeFilters] = useState({
    // server: true,
    gateway: true,
    // transponder: true,
    // amp: true,
    device: true  //transponder和amp整合為device
  });

  // 只顯示 offline
  const [showOfflineOnly, setShowOfflineOnly] = useState(false);

  // 切換類型 任何一個類型有變動 關閉 offlineOnly
  const toggleType = (key) => {
    setTypeFilters((prev) => ({ ...prev, [key]: !prev[key] }));
    setShowOfflineOnly(false);
  };

  // 只顯示offline打開時  四種類型自動取消
  const toggleOfflineOnly = () => {
    setShowOfflineOnly((prev) => {
      const next = !prev;
      if (next) {
        setTypeFilters({  gateway: false, device: false });
        // setTypeFilters({ server: false, gateway: false, device: false });
        // setTypeFilters({ server: false, gateway: false, transponder: false, amp: false });
      }
      return next;
    });
  };

  
  return (
    <div className="dashboard-grid" style={{ alignItems: "flex-start" }}>

      {/* 左邊地圖 */}
      <div className="card" style={{ flex: "1 1 auto", minWidth: 0 }}>
        <h3>device map</h3>
        <p style={{ marginTop: 4 }}>green＝online    red＝offline</p>

        {/* 把勾選狀態傳給地圖 */}
        {/* <DeviceMap
          height={480}
          typeFilters={typeFilters}
          showOfflineOnly={showOfflineOnly}
        /> */}
        <DeviceMap
          typeFilters={typeFilters}
          showOfflineOnly={showOfflineOnly}
        />
      </div>

      {/* 篩選卡片 */}
      <div className="card" style={{ width: 300 }}>
        <h3 style={{ marginBottom: 12 }}>show select type</h3>

        {/* <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, cursor: "pointer" }}>
          <FaServer />
          <input
            type="checkbox"
            checked={typeFilters.server}
            onChange={() => toggleType("server")}
            disabled={showOfflineOnly}
          />
          <span>server</span>
        </label> */}

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

        {/* <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, cursor: "pointer" }}>
          <FaBroadcastTower />
          <input
            type="checkbox"
            checked={typeFilters.transponder}
            onChange={() => toggleType("transponder")}
            disabled={showOfflineOnly}
          />
          <span>transponder</span>
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, cursor: "pointer" }}>
          <FaBolt />
          <input
            type="checkbox"
            checked={typeFilters.amp}
            onChange={() => toggleType("amp")}
            disabled={showOfflineOnly}
          />
          <span>amp</span>
        </label> */}

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
          <input
            type="checkbox"
            checked={showOfflineOnly}
            onChange={toggleOfflineOnly}
          />
          <span> offline device</span>
        </label>

       
      </div>
    </div>
  );
}
