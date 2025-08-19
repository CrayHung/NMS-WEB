// pages/Dashboard/Dashboard.jsx
import React, { useEffect, useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useGlobalContext } from "../../GlobalContext";
import DeviceMap from "../../components/map/DeviceMap";

export default function Dashboard() {
  const { deviceData, focusDeviceOnMap } = useGlobalContext();
  const [devices, setDevices] = useState([]);
  const [logs, setLogs] = useState([]);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    // 設備列表
    setDevices(deviceData || []);

    // 模擬折線圖
    const simulatedChart = Array.from({ length: 10 }, (_, i) => ({
      time: `T${i}`,
      humidity: Math.random() * 50 + 40,
      batteryLevel: Math.random() * 50 + 30,
    }));
    setChartData(simulatedChart);

    // log（僅取特定 type，並做空值防呆）
    const wanted = new Set(["shutdown", "warning", "lowBattery"]);
    const allLogs = (deviceData || []).flatMap((dev) =>
      (dev.alerts || [])
        .filter((a) => wanted.has(a.type))
        .map((a) => ({
          deviceName: dev.deviceName,
          timestamp: a.timestamp || dev.timestamp || Date.now(),
          ...a,
        }))
    );
    setLogs(allLogs);
  }, [deviceData]);




  return (
    <div className="dashboard-grid">

      {/* 地圖卡片 */}
      {/* <div className="card" style={{ flex: "1 1 100%" }}>
        <h3>設備地圖</h3>
        <p>綠色＝online，紅色＝非 online（offline/error 等）</p>
        <DeviceMap height={420} />
      </div> */}



      {/* 左：折線圖 */}
      <div className="card chart-card">
        {/* <h3>設備狀態折線圖</h3>
        <p>顯示 Humidity 與 Battery Level</p>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData}>
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="humidity" stroke="#1abc9c" />
            <Line type="monotone" dataKey="batteryLevel" stroke="#e74c3c" />
          </LineChart>
        </ResponsiveContainer> */}

        {/* 地圖卡片 */}
        <div className="card" style={{ flex: "1 1 100%" }}>
          <h3>設備地圖</h3>
          <p>綠色＝online，紅色＝非 online（offline/error 等）</p>
          <DeviceMap height={420} />
        </div>
      </div>

      {/* 右：狀態 + Log */}
      <div className="side-panel">
        <div className="card device-status-card">
          <h3>設備狀態</h3>
          <div className="device-status-buttons">
            {devices.map((dev) => (
              <div key={dev.deviceId} className="device-status-item">
                <button
                  onClick={() => focusDeviceOnMap(String(dev.deviceId), 16)}  // 點擊定位 + Zoom in
                  title={`在地圖定位：${dev.deviceName}`}
                  style={{
                    flex: 1,
                    padding: "12px",
                    background: dev.status === "online" ? "#27ae60" : "#c0392b",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "14px",
                    cursor: "default",
                  }}
                
                >
                  {dev.deviceId}
                </button>
                <p style={{ margin: 0, fontSize: "12px" }}>{dev.status || "unknown"}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card log-card">
          <h3>Log 紀錄</h3>
          <ul className="log-list"
            style={{
              maxHeight: "200px",   // 控制高度，大概能容納約 5 筆資料
              overflowY: "auto",    // 超過就出現捲軸
              paddingRight: "8px",  // 避免被捲軸蓋住文字
            }}
          >
            {logs.map((log, index) => (
              <li key={index} className="log-item">
                <b>{log.deviceName}</b> - {log.message} ({new Date(log.timestamp).toLocaleString()})
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
