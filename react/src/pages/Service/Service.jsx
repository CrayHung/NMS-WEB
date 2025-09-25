// import React, { useState, useEffect } from "react";
// import Events from "./pages/Events";
// import History from "./pages/History";
// import Download from "./pages/Download";
// import Firmware from "./pages/Firmware";
// import Notification from "./pages/Notification";
// import DeviceHistory from "./pages/DeviceHistory"
// import { useGlobalContext } from "../../GlobalContext";
// import { apiFetch, apiUrl } from '../../lib/api';

// export default function Service() {
//   const { user, deviceData, setDeviceData, deviceLink, setDeviceLink } = useGlobalContext();

//   const [data, setData] = useState([]);
//   useEffect(() => {



//     const fetchData = async () => {
//       try {

//         const res = await apiFetch(`/amplifier/devices`, { method: "GET" });
//         // const res = await fetch(API_BASE, {
//         //   method: "GET",
//         // });
//         if (!res.ok) {
//           const t = await res.text().catch(() => "");
//           throw new Error(`GET status failed (${res.status}): ${t || res.statusText}`);
//         }
//         const data = await res.json();
//         setData(data);
//       } catch (err) {
//         console.error(err);
//         alert(`error`);
//       } finally {

//       }
//     }

//     fetchData();
//   }, []);

//   const [active, setActive] = useState("Device History");
//   // 左側清單
//   const items = ["Device History", "Notification", "Alarm History", "Events", "Download", "Firmware update"];

//   // 右側元件
//   const renderContent = () => {
//     switch (active) {
//       case "Device History":
//         return <DeviceHistory />;

//       case "Notification":
//         return <Notification />;
//       case "Alarm History":
//         return <History />;
//       case "Events":
//         return <Events />;
//       case "Download":
//         return <Download />;
//       case "Firmware update":
//         return <Firmware />;


//       default:
//         return null;
//     }
//   };

//   return (
//     <div
//       className="dashboard-grid"
//       style={{
//         display: "grid",
//         gridTemplateColumns: "200px minmax(0, 1fr)",
//         gap: 16,
//         alignItems: "start",
//         maxWidth: "100vw",     // 不超出螢幕寬
//         boxSizing: "border-box",
//       }}
//     >
//       {/* 左側控制bar */}
//       <div className="card" style={{ width: 200, padding: 0 }}>
//         {items.map((label) => {
//           const isActive = active === label;
//           return (
//             <div
//               key={label}
//               onClick={() => setActive(label)}
//               style={{
//                 padding: "12px 16px",
//                 cursor: "pointer",
//                 userSelect: "none",
//                 borderBottom: "1px solid #eee",
//                 background: isActive ? "#f5f5f5" : "transparent",
//                 fontWeight: isActive ? 600 : 400,
//               }}
//             >
//               {label}
//             </div>
//           );
//         })}
//       </div>

//       {/* 右側顯示區（只在右半邊渲染，包括 Notification） */}
//       <div className="card" style={{ minWidth: 0, maxWidth: "100%", overflowX: "auto" }}>
//         {renderContent()}
//       </div>
//     </div>
//   );

// }
// Service.jsx
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Events from "./pages/Events";
import History from "./pages/History";
import Download from "./pages/Download";
import Firmware from "./pages/Firmware";
import Notification from "./pages/Notification";
import DeviceHistory from "./pages/DeviceHistory";
import { useGlobalContext } from "../../GlobalContext";
import { apiFetch } from '../../lib/api';

export default function Service() {
  const { user, deviceData, setDeviceData, deviceLink, setDeviceLink } = useGlobalContext();
  const location = useLocation();
  const navigate = useNavigate();

  const [data, setData] = useState([]);
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await apiFetch(`/amplifier/devices`, { method: "GET" });
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          throw new Error(`GET status failed (${res.status}): ${t || res.statusText}`);
        }
        const data = await res.json();
        setData(data);
      } catch (err) {
        console.error(err);
        alert(`error`);
      }
    };
    fetchData();
  }, []);

  const items = ["Device History", "Notification", "Alarm History", "Events", "Download", "Firmware update"];
  const [active, setActive] = useState("Device History");

  // 當 URL 的 ?tab= 改變時，同步設定 active（並驗證 tab 是否在 items 中）
  useEffect(() => {
    const qs = new URLSearchParams(location.search);
    const tab = qs.get("tab");
    if (tab && items.includes(tab)) {
      setActive(tab);
    }
    // 如果沒有 tab 可以選擇保留現有 active 或設預設
  }, [location.search]); // eslint-disable-line react-hooks/exhaustive-deps

  // 當使用者在左側點擊時，除了 setActive，也更新 URL 的 ?tab= 以便 Sidebar / shareable url
  const onClickLeftItem = (label) => {
    setActive(label);
    // 更新 URL（不新增歷史紀錄，使用 replace）
    const url = `/service?tab=${encodeURIComponent(label)}`;
    navigate(url, { replace: false }); // 若想不建立 history，用 replace: true
  };

  const renderContent = () => {
    switch (active) {
      case "Device History":
        return <DeviceHistory />;
      case "Notification":
        return <Notification />;
      case "Alarm History":
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
        maxWidth: "100vw",
        boxSizing: "border-box",
      }}
    >
      {/* 左側清單 */}
      <div className="card" style={{ width: 200, padding: 0 }}>
        {items.map((label) => {
          const isActive = active === label;
          return (
            <div
              key={label}
              onClick={() => onClickLeftItem(label)}
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

      {/* 右側內容 */}
      <div className="card" style={{ minWidth: 0, maxWidth: "100%", overflowX: "auto" }}>
        {renderContent()}
      </div>
    </div>
  );
}
