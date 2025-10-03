// // Sidebar.jsx（重點：在 horizontal 模式帶上 --sidebar-horizontal-h）
// import React, { useEffect, useMemo, useState } from "react";
// import { NavLink } from "react-router-dom";
// import { FaTachometerAlt } from "react-icons/fa";
// import { VscAccount } from "react-icons/vsc";
// import { TbTopologyStar } from "react-icons/tb";
// import { GoLog } from "react-icons/go";
// import { BsNodePlusFill } from "react-icons/bs";
// import { SiGooglemaps } from "react-icons/si";

// export default function Sidebar({ setCurrentPage }) {
//   const [isNarrow, setIsNarrow] = useState(window.innerWidth <= 1024);
//   useEffect(() => {
//     const onResize = () => setIsNarrow(window.innerWidth <= 1024);
//     window.addEventListener("resize", onResize);
//     return () => window.removeEventListener("resize", onResize);
//   }, []);

//   const menu = useMemo(() => [
//     { to: "/map", label: "Map", icon: <SiGooglemaps /> },
//     { to: "/network", label: "Network", icon: <TbTopologyStar /> },
//     { to: "/service", label: "Service", icon: <GoLog /> },
//     { to: "/dashboard", label: "Dashboard", icon: <FaTachometerAlt /> },

//     { to: "/nodes", label: "Nodes", icon: <BsNodePlusFill /> },
//     // { to: "/account", label: "Account", icon: <VscAccount /> },
//   ], []);

//   // horizontalHeight 可以調整（手機時 sidebar 高度）
//   const horizontalHeight = 56;

//   return (
//     <aside
//       className={`sidebar ${isNarrow ? "horizontal" : "vertical"}`}
//       style={ isNarrow ? { ["--sidebar-horizontal-h"]: `${horizontalHeight}px` } : {} }
//       aria-hidden={false}
//     >
//       <nav className="sidebar-nav" role="navigation" aria-label="Main navigation">
//         {menu.map((m) => (
//           <NavLink
//             key={m.to}
//             to={m.to}
//             end
//             className={({ isActive }) => `nav-pill sidebar-item${isActive ? " active" : ""}`}
//             onClick={() => setCurrentPage?.(m.to)}
//             title={m.label}
//           >
//             <span className="nav-icon" aria-hidden="true">{m.icon}</span>
//             <span className="nav-text">{m.label}</span>
//           </NavLink>
//         ))}
//       </nav>
//     </aside>
//   );
// }



// Sidebar.jsx
import React, { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { FaTachometerAlt } from "react-icons/fa";
import { TbTopologyStar } from "react-icons/tb";
import { GoLog } from "react-icons/go";
import { BsNodePlusFill } from "react-icons/bs";
import { SiGooglemaps } from "react-icons/si";
import { FiTerminal } from "react-icons/fi";

import {useGlobalContext}  from '../../GlobalContext'

export default function Sidebar({ setCurrentPage }) {
  const [isNarrow, setIsNarrow] = useState(window.innerWidth <= 1024);
  const location = useLocation();

  // GlobalContext: 取得 deviceData 與 setSelectedDevice
  const { deviceData, setSelectedDevice, selectedDevice } = useGlobalContext();
  

  // 當使用者點 Dashboard 時呼叫：把第一筆 device 存進 context（若有）
  const handleDashboardClick = (e) => {
    try {
      const first = Array.isArray(deviceData) && deviceData.length ? deviceData[0] : null;
      setSelectedDevice?.(first ?? null);
      // 不要 preventDefault — 讓 NavLink 正常導向
      // 如果你想在沒有 deviceData 時阻止導向，可 uncomment 下列：
      // if (!first) { e.preventDefault(); alert("No device available to show"); }
    } catch (err) {
      // 保險：確保不會阻斷導航
      console.error("setSelectedDevice failed:", err);
    }
  };

  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth <= 1024);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const menu = useMemo(() => [
    { to: "/map", label: "Map", icon: <SiGooglemaps /> },
    { to: "/network", label: "Network", icon: <TbTopologyStar /> },
    {
      to: "/service",
      label: "Service",
      icon: <GoLog />,
      children: [
        { to: "/service", label: "Device History" },
        { to: "/service", label: "Notification" },
        { to: "/service", label: "Alarm History" },
        { to: "/service", label: "Events" },
        { to: "/service", label: "Download" },
        { to: "/service", label: "Firmware update" },
      ],
    },
    // { to: "/dashboard", label: "Dashboard", icon: <FaTachometerAlt /> }, 
    // { to: "/nodes", label: "Nodes", icon: <BsNodePlusFill /> },

    // { to: "/command-test", label: "Command Test", icon: <FiTerminal /> },

    { to: "/test", label: "Test", icon: <FiTerminal /> },

  ], []);

  // 控制哪些父項展開
  const [openMap, setOpenMap] = useState({});

  // 當路徑發生改變，自動根據 location 判定是否展開 parent（若 pathname 在 /service 或 query tab 屬於該 parent）
  useEffect(() => {
    const next = {};
    menu.forEach((m) => {
      if (m.children && m.children.length) {
        const parentActive = location.pathname === m.to || location.pathname.startsWith(m.to + "/");
        // 若 query 中有 tab，且 path 是 /service，也展開
        const qs = new URLSearchParams(location.search);
        const tab = qs.get("tab");
        next[m.to] = parentActive || Boolean(tab);
      }
    });
    setOpenMap(prev => ({ ...prev, ...next }));
  }, [location.pathname, location.search, menu]);

  const toggleOpen = (key) => {
    setOpenMap(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const horizontalHeight = 56;

  return (
    <aside className={`sidebar ${isNarrow ? "horizontal" : "vertical"}`}>
      <nav className="sidebar-nav" role="navigation">
        {menu.map((m) => {
          const hasChildren = Array.isArray(m.children) && m.children.length > 0;
          const isOpen = !!openMap[m.to];
  
          if (!hasChildren) {
            return (
              <NavLink
                key={m.to}
                to={m.to}
                className={({ isActive }) => `nav-pill sidebar-item${isActive ? " active" : ""}`}
                onClick={handleDashboardClick}
              >
                <span className="nav-icon">{m.icon}</span>
                <span className="nav-text">{m.label}</span>
              </NavLink>
            );
          }
  
          // 父項 + 子選單：確保 submenu 是父項下方的直接兄弟元素
          return (
            <div key={m.to} className={`sidebar-item parent ${isOpen ? "open" : ""}`}>
              <button
                type="button"
                className="parent-btn"
                onClick={() => toggleOpen(m.to)}
                aria-expanded={isOpen}
              >
                <span className="nav-icon">{m.icon}</span>
                <span className="nav-text">{m.label}</span>
                <span className="caret" aria-hidden></span>
                {/* <span className="caret" aria-hidden>{isOpen ? "▾" : "▸"}</span> */}
              </button>
  
              {/* submenu 緊接在父按鈕之後 — 使用 NavLink 導向 /service?tab=... */}
              <div className={`submenu ${isOpen ? "open" : ""}`} id={`submenu-${m.to}`}>
                {m.children.map((c) => {
                  const target = `${c.to}?tab=${encodeURIComponent(c.label)}`;
                  return (
                    <NavLink
                      key={c.label}
                      to={target}
                      className={({ isActive }) => `sub-item${isActive ? " active" : ""}`}
                    >
                      <span className="sub-text">{c.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
