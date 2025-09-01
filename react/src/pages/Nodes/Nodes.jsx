import React, { useState } from "react";
import Server from "./pages/Server";
import Gateway from "./pages/Gateway";
import Transponder from "./pages/Transponder";
import Ampifer from "./pages/Ampifer";

const TABS = [
  { key: "server", label: "Server" },
  { key: "gateway", label: "Gateway" },
  { key: "transponder", label: "Transponder" },
  { key: "ampifer", label: "Ampifer" },
];

export default function Nodes() {
  const [active, setActive] = useState("server");

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
        {active === "server" && <Server />}
        {active === "gateway" && <Gateway />}
        {active === "transponder" && <Transponder />}
        {active === "ampifer" && <Ampifer />}
      </div>
    </div>
  );
}
