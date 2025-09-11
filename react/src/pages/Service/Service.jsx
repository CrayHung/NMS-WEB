import React, { useState,useEffect } from "react";
import Events from "./pages/Events";
import History from "./pages/History";
import Download from "./pages/Download";
import Firmware from "./pages/Firmware";
import Notification from "./pages/Notification";
import DeviceHistory from "./pages/DeviceHistory"
import { useGlobalContext } from "../../GlobalContext";
import { apiFetch,apiUrl } from '../../lib/api';

export default function Service() {
  const { user, deviceData, setDeviceData, deviceLink, setDeviceLink } = useGlobalContext();

  const [data, setData] = useState([]);
  useEffect(() => {



    const fetchData = async () => {
      try {

        const res = await apiFetch(`/amplifier/devices`, { method: "GET" });
        // const res = await fetch(API_BASE, {
        //   method: "GET",
        // });
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          throw new Error(`GET status failed (${res.status}): ${t || res.statusText}`);
        }
        const data = await res.json();
        setData(data);
      } catch (err) {
        console.error(err);
        alert(`error`);
      } finally {
        
      }
    }

    fetchData();
  }, []);

  const [active, setActive] = useState("Events");
  // 左側清單
  const items = [ "Device History" , "Notification","History", "Events",  "Download", "Firmware update" ];
  
  // 右側元件
  const renderContent = () => {
    switch (active) {
      case "Device History":
        return <DeviceHistory />;

      case "Notification":
        return <Notification />;
      case "History":
        return <History />;
        case "Events":
          return <Events />;
      case "Download":
        return <Download />;
      case "Firmware update":
        return <Firmware />;


      default:
        return null;
    }
  };

  return (
    <div
    className="dashboard-grid"
    style={{
      display: "grid",
      gridTemplateColumns: "200px minmax(0, 1fr)",
      gap: 16,
      alignItems: "start",
      maxWidth: "100vw",     // 不超出螢幕寬
      boxSizing: "border-box",
    }}
  >
      {/* 左側控制bar */}
      <div className="card" style={{ width: 200, padding: 0 }}>
        {items.map((label) => {
          const isActive = active === label;
          return (
            <div
              key={label}
              onClick={() => setActive(label)}
              style={{
                padding: "12px 16px",
                cursor: "pointer",
                userSelect: "none",
                borderBottom: "1px solid #eee",
                background: isActive ? "#f5f5f5" : "transparent",
                fontWeight: isActive ? 600 : 400,
              }}
            >
              {label}
            </div>
          );
        })}
      </div>
  
      {/* 右側顯示區（只在右半邊渲染，包括 Notification） */}
      <div  className="card" style={{ minWidth: 0, maxWidth: "100%", overflowX: "auto" }}>
        {renderContent()}
      </div>
    </div>
  );
  
}
