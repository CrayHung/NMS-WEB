// src/components/Layout/Header.jsx
import React, { useState, useMemo, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useGlobalContext } from "../../GlobalContext";
import { FaSignInAlt, FaSignOutAlt, FaGlobe, FaBell } from "react-icons/fa";

export default function Header() {
  const { user, deviceData, logout, focusDeviceOnMap } = useGlobalContext();
  const [showAlerts, setShowAlerts] = useState(false);
  const [now, setNow] = useState(new Date());

  const location = useLocation();
  const navigate = useNavigate();


  // 依路由顯示標題 , 可以不要
  const currentPageTitle = useMemo(() => {
    const path = location.pathname.toLowerCase();
    if (path.startsWith("/map")) return "Map";
    if (path.startsWith("/network")) return "Network";

    if (path.startsWith("/service")) return "Service";
    if (path.startsWith("/nodes")) return "Nodes";

    return "";
  }, [location.pathname]);

  // 告警列表
  const allAlerts = (deviceData || []).flatMap((device) =>
    (device.alerts || []).map((alert) => ({
      ...alert,
      deviceId: device.deviceId,
      deviceName: device.deviceName,
    }))
  );

  // 登入登出
  const handleAuthToggle = () => {
    if (user?.isLoggedIn) {
      logout();
      navigate("/"); // 回登入頁
    } else {
      navigate("/"); // 去登入頁
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 時間格式
  const timeText = useMemo(
    () =>
      now.toLocaleString("zh-TW", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        timeZone: "America/New_York",      //美國時間好像改timezone就可以...不用改en-US  zh-TW
      }),
    [now]
  );

  return (
    <header className="header" style={{ position: "relative" }}>
      {/* 左標題 */}
      <h2 className="header-title" style={{ marginRight: 16 }}>{currentPageTitle}</h2>

      {/* 中主選單 */}
      <nav
        style={{
          display: "flex",
          gap: 16,
          alignItems: "center",
          flex: 1,
        }}
      >
        <NavLink
          to="/map"
          style={({ isActive }) => ({
            color: "#fff",
            textDecoration: "none",
            fontWeight: isActive ? 700 : 500,
            opacity: isActive ? 1 : 0.9,
          })}
        >
          Map
        </NavLink>
        <NavLink
          to="/nodes"
          style={({ isActive }) => ({
            color: "#fff",
            textDecoration: "none",
            fontWeight: isActive ? 700 : 500,
            opacity: isActive ? 1 : 0.9,
          })}
        >
          Nodes
        </NavLink>
        <NavLink
          to="/network"
          style={({ isActive }) => ({
            color: "#fff",
            textDecoration: "none",
            fontWeight: isActive ? 700 : 500,
            opacity: isActive ? 1 : 0.9,
          })}
        >
          Network
        </NavLink>

       



        <NavLink
          to="/service"
          style={({ isActive }) => ({
            color: "#fff",
            textDecoration: "none",
            fontWeight: isActive ? 700 : 500,
            opacity: isActive ? 1 : 0.9,
          })}
        >
          Service
        </NavLink>

       
      </nav>

      {/* 右使用者時間+小圖 */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {/* 使用者名稱 + 實時時間 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            color: "#fff",
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ fontWeight: 600 }}>
            {user?.isLoggedIn ? (user.username || "User") : "Guest"}
          </span>
          <span
            style={{
              fontVariantNumeric: "tabular-nums",
              opacity: 0.95,
            }}
            title="目前時間（自動更新）"
          >
            {timeText}
          </span>
        </div>

        {/* 告警鈴鐺 */}
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

        {/* 語言切換*/}
        {/* <div className="header-icons" onClick={() => console.log("TODO: 切換語言")}>
          <FaGlobe size={20} />
        </div> */}

        {/* 登入登出 */}
        <div className="header-icons" onClick={handleAuthToggle}>
          {user?.isLoggedIn ? <FaSignOutAlt size={20} /> : <FaSignInAlt size={20} />}
        </div>
      </div>

      {/* 告警列表彈出 */}
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
            wraning list
          </h4>
          {allAlerts.length > 0 ? (
            allAlerts.map((alert, index) => (
              <div
                key={index}
                style={{ padding: "8px 10px", borderBottom: "1px solid #eee", fontSize: "14px" }}
                onClick={() => {
                  if (typeof focusDeviceOnMap === "function") {
                    focusDeviceOnMap(String(alert.deviceId), 16);
                  }
                  navigate("/map");
                  setShowAlerts(false);
                }}
                title="focus device on map"
              >
                <strong>{alert.deviceName}</strong> - {alert.message}
                <br />
                <small style={{ color: "#555" }}>{new Date(alert.timestamp).toLocaleString()}</small>
              </div>
            ))
          ) : (
            <div style={{ padding: "10px", textAlign: "center", color: "#555" }}>no warning</div>
          )}
        </div>
      )}
    </header>
  );
}
