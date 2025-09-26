// src/components/Layout/Header.jsx
import React, { useState, useMemo, useEffect, useRef } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useGlobalContext } from "../../GlobalContext";
import { FaSignInAlt, FaSignOutAlt, FaBell } from "react-icons/fa";
import wsService from "../../service/websocket";
import logo from "../../assets/twowaylogo2.png";

import { TbTopologyStar } from "react-icons/tb";
import { GoLog } from "react-icons/go";
import { BsNodePlusFill } from "react-icons/bs";
import { SiGooglemaps } from "react-icons/si";
import { FiTerminal } from "react-icons/fi";



export default function Header() {
  const {
    user, logout, focusDeviceOnMap,
    alerts, addAlert, markAllAlertsRead, clearAllAlerts,
  } = useGlobalContext();

  const [showAlerts, setShowAlerts] = useState(false);
  const [now, setNow] = useState(new Date());
  const [connected, setConnected] = useState(false);

  const alarmIdCounter = useRef(0);
  const bellRef = useRef(null);
  const dropdownRef = useRef(null);

  const location = useLocation();
  const navigate = useNavigate();

  // 標題（原樣）
  const currentPageTitle = useMemo(() => {
    const path = location.pathname.toLowerCase();
    if (path.startsWith("/map")) return "Map";
    if (path.startsWith("/network")) return "Network";
    if (path.startsWith("/service")) return "Service";
    if (path.startsWith("/nodes")) return "Nodes";
    if (path.startsWith("/dashboard")) return "Dashboard";
    if (path.startsWith("/command-test")) return "Command Test";
    if (path.startsWith("/test")) return " Test";
    return "";
  }, [location.pathname]);

  // 時鐘（原樣）
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const timeText = useMemo(
    () =>
      now.toLocaleString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        timeZone: "America/New_York",
      }),
    [now]
  );

  // const dt = new Date(); 

  // const timeText = dt.toLocaleString("en-US", {
  //   timeZone: "America/New_York",
  //   year: "numeric",
  //   month: "2-digit",
  //   day: "2-digit",
  //   hour: "2-digit",
  //   minute: "2-digit",
  //   second: "2-digit",
  //   hour12: false
  // });



  // 🔔 WebSocket 訂閱（只在 Header 做一次，所有頁共用 alerts）
  useEffect(() => {
    const ensureWs = () => {
      if (wsService.getConnectionStatus?.()) {
        setConnected(true);
        subAlarms();
      } else {
        wsService.connect(() => {
          setConnected(true);
          subAlarms();
        });
      }
    };
    const subAlarms = () => {
      wsService.subscribe("/topic/alarms", (data) => {
        const payload = typeof data === "string" ? { message: data } : data || {};
        const newOne = {
          id: ++alarmIdCounter.current,
          deviceEui: payload.deviceEui,
          deviceName: payload.deviceName || payload.deviceEui || "Unknown",
          message: payload.message || "Alarm",
          level: Number(payload.level ?? 1),
          timestamp: new Date(payload.timestamp || Date.now()),
          acknowledged: false,
        };
        addAlert(newOne); // ⬅️ 寫入全域 alerts
      });
    };
    ensureWs();
    return () => wsService.unsubscribe("/topic/alarms");
  }, [addAlert]);

  // 點擊外部 & Esc 關閉
  useEffect(() => {
    const onDocClick = (e) => {
      if (!showAlerts) return;
      const inBell = bellRef.current?.contains(e.target);
      const inDrop = dropdownRef.current?.contains(e.target);
      if (!inBell && !inDrop) setShowAlerts(false);
    };
    const onKey = (e) => e.key === "Escape" && setShowAlerts(false);
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [showAlerts]);

  useEffect(() => setShowAlerts(false), [location.pathname]);

  const handleAuthToggle = () => {
    if (user?.isLoggedIn) { logout(); navigate("/"); } else { navigate("/"); }
  };

  const unreadCount = useMemo(() => alerts.filter((a) => !a.acknowledged).length, [alerts]);

  return (
    <header className="header" style={{
      position: "relative",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 20px",
    }}>
      {/* 左邊：Logo + Title */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <img
          src={logo}
          alt="Logo"
          style={{ height: 32 }}
        />
        <h2 className="header-title" style={{ margin: 0 }}>
          {currentPageTitle}
        </h2>
      </div>

      {/* 中間：Nav 固定置中 */}
      <nav style={{
        display: "flex",
        gap: 12,
        alignItems: "center",
        position: "absolute",
        left: "50%",
        transform: "translateX(-50%)",
      }}>
        <NavLink to="/map" end className={({ isActive }) => `nav-pill${isActive ? " active" : ""}`}><SiGooglemaps />Map</NavLink>
        <NavLink to="/network" end className={({ isActive }) => `nav-pill${isActive ? " active" : ""}`}><TbTopologyStar />Network</NavLink>
        <NavLink to="/service" end className={({ isActive }) => `nav-pill${isActive ? " active" : ""}`}><GoLog />Service</NavLink>

        {/* <NavLink to="/nodes" end className={({ isActive }) => `nav-pill${isActive ? " active" : ""}`}> <BsNodePlusFill />Nodes</NavLink> */}
        {/* <NavLink to="/command-test" end className={({ isActive }) => `nav-pill${isActive ? " active" : ""}`}> <FiTerminal />Command-Test</NavLink> */}
        
        <NavLink to="/test" end className={({ isActive }) => `nav-pill${isActive ? " active" : ""}`}> <FiTerminal />Test</NavLink>


      </nav>

      {/* 右側 */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ color: "#fff", whiteSpace: "nowrap" }}>
          <strong>{user?.isLoggedIn ? (user.username || "User") : "Guest"}</strong>{" "}
          <span style={{ fontVariantNumeric: "tabular-nums" }}>  {new Date().toLocaleString("en-US")}</span>

        </div>

        {/* 鈴鐺 */}
        <div
          ref={bellRef}
          className="header-icons"
          onClick={() => setShowAlerts((p) => !p)}
          style={{ position: "relative", cursor: "pointer", color: "#fff" }}
          title={connected ? "WebSocket Connected" : "WebSocket Disconnected"}
        >
          <FaBell size={20} />
          {unreadCount > 0 && (
            <span style={{
              position: "absolute", top: -6, right: -8, background: "red", color: "#fff",
              borderRadius: 999, padding: "1px 6px", fontSize: 11, fontWeight: 700
            }}>
              {unreadCount}
            </span>
          )}
        </div>

        {/* 登入登出 */}
        <div className="header-icons" onClick={handleAuthToggle} style={{ cursor: "pointer", color: "#fff" }}>
          {user?.isLoggedIn ? <FaSignOutAlt size={20} /> : <FaSignInAlt size={20} />}
        </div>
      </div>

      {/* 下拉 */}
      {showAlerts && (
        <div
          ref={dropdownRef}
          style={{
            position: "absolute", top: 60, right: 20, background: "#fff", color: "#000",
            borderRadius: 8, boxShadow: "0 4px 8px rgba(0,0,0,0.15)", width: 360, maxHeight: 380,
            overflow: "hidden", zIndex: 10, display: "flex", flexDirection: "column",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", padding: "10px 12px", borderBottom: "1px solid #eee" }}>
            <strong style={{ flex: 1 }}>Alarms</strong>
            <span style={{ marginRight: 8, fontSize: 12, color: connected ? "#22c55e" : "#dc2626", fontWeight: 600 }}>
              {connected ? "Connected" : "Disconnected"}
            </span>
            <button onClick={markAllAlertsRead} style={{ fontSize: 12, marginRight: 6, border: "none", background: "transparent", color: "#2563eb", cursor: "pointer" }}>
              Mark all read
            </button>
            <button onClick={clearAllAlerts} style={{ fontSize: 12, border: "none", background: "transparent", color: "#ef4444", cursor: "pointer" }}>
              Clear
            </button>
          </div>

          <div style={{ overflowY: "auto" }}>
            {alerts.length ? alerts.map((a) => (
              <div
                key={a.id}
                // onClick={() => { a.deviceEui && focusDeviceOnMap?.(String(a.deviceEui), 16); navigate("/map"); setShowAlerts(false); }}
                onClick={() => {
                  a.deviceEui && focusDeviceOnMap?.(String(a.deviceEui), 16, true);
                  navigate("/map");
                  setShowAlerts(false);
                }}
                style={{ padding: "10px 12px", borderBottom: "1px solid #f1f1f1", display: "grid", gridTemplateColumns: "1fr auto", gap: 8, background: a.acknowledged ? "#fafafa" : "#fff", cursor: "pointer" }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: a.level === 2 ? "#ef4444" : a.level === 1 ? "#eab308" : "#06b6d4" }} />
                    <strong style={{ fontSize: 14 }} title={a.deviceEui}>{a.deviceName || a.deviceEui}</strong>
                  </div>
                  <div style={{ fontSize: 13, color: "#444", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {a.message}
                  </div>
                  <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>
                    {new Date(a.timestamp).toLocaleString()}
                  </div>
                </div>
                <div>
                  <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 999, fontSize: 12, fontWeight: 600, color: a.level === 2 ? "#fff" : "#111", background: a.level === 2 ? "#ef4444" : a.level === 1 ? "#fde047" : "#a3e635" }}>
                    {a.level === 2 ? "Critical" : a.level === 1 ? "Warning" : "Info"}
                  </span>
                </div>
              </div>
            )) : (
              <div style={{ padding: 16, textAlign: "center", color: "#666" }}>No alarms</div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
