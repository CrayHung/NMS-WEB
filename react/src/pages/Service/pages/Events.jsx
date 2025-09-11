import React, { useEffect, useState, useMemo } from 'react';
import { useGlobalContext } from "../../../GlobalContext";
const Events = () => {
    const { deviceData } = useGlobalContext();

    const logs = useMemo(() => {
      const wanted = new Set(["shutdown", "warning", "lowBattery"]);
      const all = (deviceData || []).flatMap((dev) =>
        (dev.alerts || [])
          .filter((a) => wanted.has(a.type))
          .map((a) => ({
            deviceId: dev.deviceId,
            deviceName: dev.deviceName,
            message: a.message,
            type: a.type,
            timestamp: a.timestamp || dev.timestamp || Date.now(),
          }))
      );
      // 依時間新到舊
      return all.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }, [deviceData]);



    return (
        <div>
            <div className="dashboard-grid">
                <div className="card" style={{ flex: "1 1 100%" }}>
                    <h3>Events</h3>

                    {/* 可捲動清單：約 5 筆高度 */}
                    <ul
                        className="log-list"
                        style={{
                            maxHeight: "220px",
                            overflowY: "auto",
                            paddingRight: "8px",
                            marginTop: "10px",
                        }}
                    >
                        {logs.length === 0 && (
                            <li className="log-item" style={{ borderBottom: "none", color: "#666" }}>
                                No Events
                            </li>
                        )}

                        {logs.map((log, idx) => (
                            <li key={idx} className="log-item" style={{ padding: "8px 0" }}>
                                <b>{log.deviceName}</b> - {log.message}{" "}
                                <span style={{ color: "#888" }}>
                                    ({new Date(log.timestamp).toLocaleString()})
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}

export default Events;
