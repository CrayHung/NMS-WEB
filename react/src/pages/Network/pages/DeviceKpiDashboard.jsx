import React, { useEffect, useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  BarChart, Bar, Legend,

} from "recharts";
import "./DeviceKpiDashboard.css";
import { apiFetch,apiUrl } from '../../../lib/api';

const COLORS = {
  tempMin: "#60a5fa",
  tempAvg: "#3b82f6",
  tempMax: "#1d4ed8",
  voltage: "#10b981",
  current: "#f59e0b",
  snapshot: "#6366f1",
  avgSlope: "	#E800E8",
  avgPilotHigh: "	#00DB00",
  avgPilotLow: "#FF5809"


};

const fmtTime = (iso) => (iso ? new Date(iso).toLocaleTimeString() : "");
const fmtDateTime = (iso) => (iso ? new Date(iso).toLocaleString() : "");

const toHours = (period) =>
  ({ "6h": 6, "12h": 12, "24h": 24, "48h": 48, "7d": 168 }[period] ?? 24);

export default function DeviceKpiDashboard() {

  //下拉device選單
  const [listDeviceEui, setListDeviceEui] = useState([]);

  const [devicesLoading, setDevicesLoading] = useState(true);
  const [devicesError, setDevicesError] = useState("");

  // 時間選單
  const [deviceEui, setDeviceEui] = useState("");

  const [period, setPeriod] = useState("24h");

  // --- chart data state ---
  const [chart, setChart] = useState({ period: "", deviceEui: "", data: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 取得所有device資料
  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      setDevicesLoading(true);
      setDevicesError("");
      try {
        // const url = "http://61.216.140.11:9002/api/amplifier/devices";
        const res = await apiFetch("/amplifier/devices", { method: "GET", signal: ac.signal });
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          throw new Error(`GET /devices failed (${res.status}): ${t || res.statusText}`);
        }
        const json = await res.json();
        //檢查是否為陣列避免null或undefine抱錯 , 如果不為陣列設為空陣列 , 如果是陣列的話過濾掉
        let euies = [];
        if (Array.isArray(json?.devices)) {
          // 取出所有 deviceEui過濾掉 null、undefined、空字串等無效值
          const allEuies = json.devices.map(d => d?.deviceEui);
          const validEuies = allEuies.filter(eui => Boolean(eui));
          // 去除重複值
          const uniqueEuies = Array.from(new Set(validEuies));
          euies = uniqueEuies;
        }

        setListDeviceEui(euies);
        if (!deviceEui && euies.length) {
          setDeviceEui(euies[0]);

        }
      } catch (err) {
        if (!ac.signal.aborted) setDevicesError(String(err?.message || err));
      } finally {
        if (!ac.signal.aborted) setDevicesLoading(false);
      }
    })();
    return () => ac.abort();
  }, []);

  //取得cart資料
  useEffect(() => {
    if (!deviceEui) return;
    const ac = new AbortController();
    (async () => {
      setLoading(true);
      setError("");
      try {
        // const url = `http://61.216.140.11:9002/api/amplifier/status/${deviceEui}/chart`;
        const url = apiUrl(`/amplifier/status/${encodeURIComponent(deviceEui)}/chart`);
        
        const res = await fetch(url, { method: "GET", signal: ac.signal });
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          throw new Error(`GET /status/${deviceEui}/chart failed (${res.status}): ${t || res.statusText}`);
        }

        const json = await res.json();
        //檢查rows是否為陣列避免null或undefine抱錯 , 如果不為陣列設為空陣列
        const rows = Array.isArray(json?.data) ? json.data.slice() : [];
        //時間由就到新排序
        rows.sort((a, b) => new Date(a.time) - new Date(b.time));
        setChart({ period: json?.period || "", deviceEui: json?.deviceEui || deviceEui, data: rows });
      } catch (err) {
        if (!ac.signal.aborted) setError(String(err?.message || err));
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [deviceEui]);

  // period filter
  const rowsAll = chart.data || [];
  const rows = useMemo(() => {
    const hours = toHours(period);
    const cutoff = Date.now() - hours * 3600 * 1000;
    return rowsAll.filter((r) => new Date(r.time).getTime() >= cutoff);
  }, [rowsAll, period]);

  const latest = rows[rows.length - 1];

  const HOUR_MS = 3600 * 1000;

  const fmtUTCHHmm = (ms) => {
    const d = new Date(ms);
    const h = String(d.getUTCHours()).padStart(2, "0");
    const m = String(d.getUTCMinutes()).padStart(2, "0");
    return `${h}:${m}Z`;
  };

  const fmtDateTimeUTC = (t) => {
    if (!t) return "-";
    const d = new Date(t);
    const yyyy = d.getUTCFullYear();
    const MM = String(d.getUTCMonth() + 1).padStart(2, "0");
    const DD = String(d.getUTCDate()).padStart(2, "0");
    const hh = String(d.getUTCHours()).padStart(2, "0");
    const mm = String(d.getUTCMinutes()).padStart(2, "0");
    return `${yyyy}-${MM}-${DD} ${hh}:${mm}Z`;
  };

  const asNumOrNull = (v) => (Number.isFinite(v) ? v : null);


  const fmtTimeHHmm = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    const h = String(d.getHours()).padStart(2, "0");
    const m = String(d.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  };

  const timeSeries = useMemo(
    () =>
      rows.map((r) => {
        const ts = new Date(r.time).getTime(); // X 軸使用的數值時間戳
        return {
          ts,
          rawTime: r.time,

          // 這些是 Y 軸資料，確保不是數字就給 null（避免整條線消失）
          minTemp: asNumOrNull(r.minTemp),
          avgTemp: asNumOrNull(r.avgTemp),
          maxTemp: asNumOrNull(r.maxTemp),

          avgVoltage: asNumOrNull(r.avgVoltage),
          avgCurrent: asNumOrNull(r.avgCurrent),

          avgSlope: asNumOrNull(r.avgSlope),
          avgPilotHigh: asNumOrNull(r.avgPilotHigh),
          avgPilotLow: asNumOrNull(r.avgPilotLow),
        };
      }),
    [rows]
  );



  const hourTicks = useMemo(() => {
    if (!timeSeries.length) return [];
    const minTs = timeSeries[0].ts;                           // 你前面已有由舊到新排序
    const maxTs = timeSeries[timeSeries.length - 1].ts;

    const start = new Date(minTs);
    start.setUTCMinutes(0, 0, 0);                             // 對齊整點
    let t = start.getTime();
    if (t < minTs) t += HOUR_MS;                              // 從下一個整點開始

    const ticks = [];
    for (; t <= maxTs; t += HOUR_MS) ticks.push(t);
    return ticks;
  }, [timeSeries]);


  const xDomain = useMemo(() => {
    if (!timeSeries.length) return ["dataMin", "dataMax"];
    const minTs = timeSeries[0].ts;
    const maxTs = timeSeries[timeSeries.length - 1].ts;

    // 估算時間步長（小時資料大多相同間距）
    const step =
      timeSeries.length > 1
        ? timeSeries[1].ts - timeSeries[0].ts
        : 3600 * 1000; // fallback: 1h

    const pad = Math.max(step / 2, 15 * 60 * 1000); // 至少留 15 分鐘等效的 padding
    return [minTs - pad, maxTs + pad];
  }, [timeSeries]);



  const snapshot = useMemo(() => {
    if (!latest) return [];
    return [
      { kpi: "Avg Temp (°C)", value: +(latest.avgTemp ?? 0).toFixed(2) },
      { kpi: "Avg Voltage (V)", value: +(latest.avgVoltage ?? 0).toFixed(2) },
      { kpi: "Avg Current (mA)", value: +(latest.avgCurrent ?? 0).toFixed(2) },
    ];
  }, [latest]);

  const bubble = useMemo(
    () =>
      rows.map((r) => ({
        x: r.avgVoltage ?? 0,
        y: r.avgCurrent ?? 0,
        z: Math.max(6, ((r.maxTemp ?? 0) - (r.minTemp ?? 0)) * 20),
        t: fmtTime(r.time),
      })),
    [rows]
  );


  if (devicesLoading) {
    return (
      <div className="kpi-wrap">
        <div className="kpi-header">
          <div className="kpi-title">Loading devices…</div>
        </div>
      </div>
    );
  }
  if (devicesError) {
    return (
      <div className="kpi-wrap">
        <div className="kpi-header">
          <div className="kpi-title">Device list error: {devicesError}</div>
        </div>
      </div>
    );
  }
  if (!deviceEui) {
    return (
      <div className="kpi-wrap">
        <div className="kpi-header">
          <div className="kpi-title">No devices found.</div>
        </div>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="kpi-wrap">
        <div className="kpi-header">
          <div className="kpi-title">Loading charts…</div>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="kpi-wrap">
        <div className="kpi-header">
          <div className="kpi-title">Chart error: {error}</div>
        </div>
      </div>
    );
  }
  // 轉成 ISO
  const toISO = (t) => {
    if (!t) return "";
    const d = t instanceof Date ? t : new Date(t);
    return Number.isNaN(d.getTime()) ? "" : d.toISOString();
  };

  // CSV Export of the current filtered window
  const onExportCSV = () => {
    const header = ["timeISO", "minTemp", "avgTemp", "maxTemp", "avgVoltage"];
    const lines = [header.join(",")];


    for (const r of rows) {
      const arr = [toISO(r.time), r.minTemp ?? "", r.avgTemp ?? "", r.maxTemp ?? "", r.avgVoltage ?? ""];
      lines.push(arr.join(","));
    }

    const csv = "\ufeff" + lines.join("\n");
    const fn = `amp_${chart.deviceEui || deviceEui}_${period}_${new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[T:]/g, "-")}.csv`;

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = fn; document.body.appendChild(a); a.click();
    a.remove(); URL.revokeObjectURL(url);
  };

  return (
    <div className="kpi-wrap">


      <div className="kpi-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div className="kpi-title">Amplifier Status ({period})</div>
            <div className="kpi-meta">
              <div>Device: {chart.deviceEui}</div>

              <div>From: {rows[0] ? fmtDateTimeUTC(rows[0].time) : "-"}</div>
              <div>To: {rows[rows.length - 1] ? fmtDateTimeUTC(rows[rows.length - 1].time) : "-"}</div>

            </div>
          </div>


          {/* 下拉device選單 */}
          <select
            className="kpi-select"
            value={deviceEui}
            onChange={(e) => { setDeviceEui(e.target.value); }}
          >
            {listDeviceEui.map(id => <option key={id} value={id}>{id}</option>)}
          </select>



          {/* Period */}
          {/* <select className="kpi-select" value={period} onChange={(e)=>setPeriod(e.target.value)}>
              <option value="6h">Last 6h</option>
              <option value="12h">Last 12h</option>
              <option value="24h">Last 24h</option>
              <option value="48h">Last 48h</option>
              <option value="7d">Last 7d</option>
            </select> */}

          <button className="kpi-button secondary" type="button" onClick={onExportCSV}>Export CSV</button>
        </div>

      </div>

      {/* 內容 */}
      <div className="kpi-grid">

        {/* 溫度圖瞟 */}
        <div className="kpi-card">
          <h4>Temperature (min / avg / max)</h4>
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeSeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="ts"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  ticks={hourTicks}
                  // interval={0} // 如果太擠可以拿掉 interval=0 或改用 minTickGap
                  tickFormatter={fmtUTCHHmm}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(value) => fmtDateTimeUTC(value)} // value = ts
                />
                <Legend />
                <Line name="Min" type="monotone" dataKey="minTemp" stroke={COLORS.tempMin}
                  dot={false} strokeWidth={2} connectNulls />
                <Line name="Avg" type="monotone" dataKey="avgTemp" stroke={COLORS.tempAvg}
                  dot={false} strokeWidth={2} connectNulls />
                <Line name="Max" type="monotone" dataKey="maxTemp" stroke={COLORS.tempMax}
                  dot={false} strokeWidth={2} connectNulls />

                <Line name="avgSlope" type="monotone" dataKey="avgSlope" stroke={COLORS.avgSlope}
                  dot={false} strokeWidth={2} connectNulls />
                <Line name="avgPilotLow" type="monotone" dataKey="avgPilotLow" stroke={COLORS.avgPilotLow}
                  dot={false} strokeWidth={2} connectNulls />
                <Line name="avgPilotHigh" type="monotone" dataKey="avgPilotHigh" stroke={COLORS.avgPilotHigh}
                  dot={false} strokeWidth={2} connectNulls />
              </LineChart>
            </ResponsiveContainer>

          </div>
        </div>

        {/* 電壓圖表 */}
        <div className="kpi-card">
          <h4>Voltage / Current</h4>
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeSeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="ts"
                  type="number"
                  domain={xDomain}        // ← 改這裡
                  ticks={hourTicks}
                  tickFormatter={fmtUTCHHmm}
                />
                <YAxis yAxisId="v" />
                <YAxis yAxisId="c" orientation="right" />
                <Tooltip labelFormatter={(value) => fmtDateTimeUTC(value)} />
                <Legend />
                <Bar name="Voltage" dataKey="avgVoltage" yAxisId="v" fill={COLORS.voltage} barSize={24} />
                <Bar name="Current" dataKey="avgCurrent" yAxisId="c" fill={COLORS.current} barSize={24} />
              </BarChart>

            </ResponsiveContainer>

          </div>
        </div>




      </div>
    </div>
  );
}
