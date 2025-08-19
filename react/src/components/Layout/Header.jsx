// src/components/Layout/Header.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGlobalContext } from "../../GlobalContext";
import { FaSignInAlt, FaSignOutAlt, FaGlobe, FaBell } from "react-icons/fa";

export default function Header({ currentPage }) {
  const { user, deviceData, logout,focusDeviceOnMap  } = useGlobalContext();
  const [showAlerts, setShowAlerts] = useState(false);
  const navigate = useNavigate();

  const allAlerts = (deviceData || []).flatMap((device) =>
    (device.alerts || []).map((alert) => ({ 
      ...alert, 
      deviceId: device.deviceId,
      deviceName: device.deviceName, 
    }))
  );

  const handleAuthToggle = () => {
    if (user?.isLoggedIn) {
      logout();
      navigate("/"); // 回登入頁
    } else {
      navigate("/"); // 去登入頁
    }
  };

  return (
    <header className="header" style={{ position: "relative" }}>
      <h2 className="header-title">{currentPage}</h2>

      <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
        <div className="header-icons" onClick={() => setShowAlerts((prev) => !prev)}>
          <FaBell size={20} />
          {allAlerts.length > 0 && (
            <span
              style={{
                position: "absolute",
                top: "-5px",
                right: "-10px",
                background: "red",
                color: "#fff",
                borderRadius: "50%",
                padding: "2px 6px",
                fontSize: "12px",
              }}
            >
              {allAlerts.length}
            </span>
          )}
        </div>

        <div className="header-icons" onClick={() => console.log("TODO: 切換語言")}>
          <FaGlobe size={20} />
        </div>

        <div className="header-icons" onClick={handleAuthToggle}>
          {user?.isLoggedIn ? <FaSignOutAlt size={20} /> : <FaSignInAlt size={20} />}
        </div>
      </div>

      {showAlerts && (
        <div
          style={{
            position: "absolute",
            top: "60px",
            right: "20px",
            background: "#fff",
            color: "#000",
            borderRadius: "8px",
            boxShadow: "0 4px 8px rgba(0,0,0,0.15)",
            width: "300px",
            maxHeight: "300px",
            overflowY: "auto",
            zIndex: 10,
          }}
        >
          <h4 style={{ margin: "10px", borderBottom: "1px solid #ccc", paddingBottom: "5px" }}>
            告警列表
          </h4>
          {allAlerts.length > 0 ? (
            allAlerts.map((alert, index) => (
              <div key={index} 
              style={{ padding: "8px 10px", borderBottom: "1px solid #eee", fontSize: "14px" }}
              onClick={()=>{
                // 點擊某一筆：導到 dashboard、觸發地圖聚焦、關閉彈窗
              focusDeviceOnMap(String(alert.deviceId), 16);
              navigate("/dashboard");
              setShowAlerts(false);
              }}
              title="點擊在地圖上定位此設備"
              >
                <strong>{alert.deviceName}</strong> - {alert.message}
                <br />
                <small style={{ color: "#555" }}>{new Date(alert.timestamp).toLocaleString()}</small>
              </div>
            ))
          ) : (
            <div style={{ padding: "10px", textAlign: "center", color: "#555" }}>沒有告警</div>
          )}
        </div>
      )}
    </header>
  );
}
