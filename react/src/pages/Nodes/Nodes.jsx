import React, { useState } from "react";
import Server from "./pages/Server";
import Gateway from "./pages/Gateway";

import Device from "./pages/Device";


const TABS = [
  // { key: "server", label: "Server" },
  { key: "gateway", label: "Gateway" },
  // { key: "transponder", label: "Transponder" },
  // { key: "ampifer", label: "Ampifer" },
  { key: "device", label: "Device" },
  // { key: "setting", label: "Setting" },
];

export default function Nodes() {
  const [active, setActive] = useState("gateway");

  return (
    <div
      className="node-grid"
      style={{
        width: "100%",
        overflowX: "hidden",  
        overflowY: "auto",   
      }}
    >
      {/* Tabs */}
      <div className="card" style={{ width: "100%" }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              style={{
                background: active === t.key ? "#16a085" : "#1abc9c",
                padding: "8px 14px",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="card" style={{ width: "100%" }}>
        {/* {active === "server" && <Server />} */}
        {active === "gateway" && <Gateway />}
        {/* {active === "transponder" && <Transponder />}
        {active === "ampifer" && <Ampifer />} */}

        {active === "device" && <Device />}

        {/* {active === "setting" && <Setting />} */}

      </div>
    </div>
  );
}
