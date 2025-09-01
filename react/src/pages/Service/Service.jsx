// pages/Events/Events.jsx
import React, { useState } from "react";
import Events from "./pages/Events";
import History from "./pages/History";
import Download from "./pages/Download";
import Firewall from "./pages/Firewall";
import Notification from "./pages/Notification";

export default function Service() {
  const [active, setActive] = useState("Events");
  // 左側清單
  const items = ["Events", "History", "Download", "firewall upgrade", "notification"];
  // 右側元件
  const renderContent = () => {
    switch (active) {
      case "Events":
        return <Events />;
      case "History":
        return <History />;
      case "Download":
        return <Download />;
      case "firewall upgrade":
        return <Firewall />;
      case "notification":
        return <Notification />;
      default:
        return null;
    }
  };

  return (
    <div className="dashboard-grid" style={{ alignItems: "flex-start" }}>
      {/* 左側控制bar */}
      <div className="card" style={{ width: 300, padding: 0 }}>
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

      {/* 右側顯示區 */}
      <div className="card" style={{ flex: "1 1 auto", minWidth: 0 }}>
        {renderContent()}
      </div>
    </div>
  );
}
