// DeviceKpiDashboard.jsx
import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend,
} from "recharts";
import "./DeviceKpiDashboard.css";
import { apiFetch, apiUrl } from '../../../lib/api';
import { Form } from 'react-bootstrap';
import { useLocation } from "react-router-dom";

import { normalizeChart } from "../../../utils/normalizeDevice";

import { useGlobalContext } from "../../../GlobalContext";

const COLORS = {
  tempMin: "#60a5fa",
  tempAvg: "#3b82f6",
  tempMax: "#f59e0b",
  voltage: "#10b981",
  current: "#f59e0b",
  snapshot: "#6366f1",
  avgSlope: "#E800E8",
  avgPilotHigh: "#00DB00",
  avgPilotLow: "#FF5809"
};

const toHours = (period) =>
  ({ "6h": 6, "12h": 12, "24h": 24, "48h": 48, "7d": 168 }[period] ?? 24);

export default function DeviceKpiDashboard({ device: propDevice }) {

  const {setSelectedDevice, selectedDevice } = useGlobalContext();

  const location = useLocation();
  const stateDevice = location.state?.device;

  // initialEui: 優先來源 stateDevice -> propDevice -> query param -> localStorage -> ""
  const initialEui = (() => {
    try {
      if (selectedDevice) return selectedDevice.deviceEui;
      const qs = new URLSearchParams(location.search);
      const qEui = qs.get("deviceEui");
      if (stateDevice?.deviceEui) return stateDevice.deviceEui;
      if (propDevice?.deviceEui) return propDevice.deviceEui;
      if (qEui) return qEui;
      const ls = localStorage.getItem("selectedDeviceEui");
      if (ls) return ls;
    
      return "";
    } catch (e) {
      return stateDevice?.deviceEui || propDevice?.deviceEui || "";
    }
  })();

  const [deviceEui, setDeviceEui] = useState(initialEui);
  const [listDeviceEui, setListDeviceEui] = useState([]);
  const [devicesLoading, setDevicesLoading] = useState(true);
  const [devicesError, setDevicesError] = useState("");

  const [period, setPeriod] = useState("24h");
  const [chart, setChart] = useState({ period: "", deviceEui: "", data: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);

  // 如果有完整的 device 物件 (stateDevice 或 propDevice)，把它放到 localStorage.selectedDeviceEui 以便未來方便
  useEffect(() => {
    const d = stateDevice || propDevice;
    if (d?.deviceEui) {
      try { localStorage.setItem("selectedDeviceEui", String(d.deviceEui)); } catch (e) {}
    }
    // 不要 setDeviceEui 這裡（會由下面初始化與 fetch devices logic 處理），
    // 但若你希望這裏立即切換可以 uncomment：
    // if (d?.deviceEui) setDeviceEui(d.deviceEui);
  }, [stateDevice, propDevice]);

  // -------- helpers --------
  const HOUR_MS = 3600 * 1000;
  const fmtDateTimeUTC = (t) => {
    if (!t) return "-";
    const d = new Date(t);
    const yyyy = d.getUTCFullYear();
    const MM = String(d.getUTCMonth() + 1).padStart(2, "0");
    const DD = String(d.getUTCDate()).padStart(2, "0");
    const hh = String(d.getUTCHours()).padStart(2, "0");
    const mm = String(d.getUTCMinutes()).padStart(2, "0");
    return `${yyyy}-${MM}-${DD} ${hh}:${mm}`;
  };
  const fmtUTCHHmm = (ms) => {
    const d = new Date(ms);
    const h = String(d.getUTCHours()).padStart(2, "0");
    const m = String(d.getUTCMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  };
  const asNumOrNull = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);

  const buildSparseHourTicks = (series, maxTicks = 7) => {
    if (!series?.length) return [];
    const min = series[0].ts;
    const max = series[series.length - 1].ts;
    const spanHours = Math.max(1, Math.round((max - min) / HOUR_MS));
    const candidates = [1, 2, 3, 4, 6, 8, 12, 24, 48, 72, 168];
    const stepH =
      candidates.find((c) => Math.ceil(spanHours / c) <= maxTicks) ||
      candidates[candidates.length - 1];
    const start = new Date(min);
    start.setUTCMinutes(0, 0, 0);
    while ((start.getUTCHours() % stepH) !== 0 && start.getTime() < max) {
      start.setUTCHours(start.getUTCHours() + 1);
    }
    const ticks = [min];
    for (let t = start.getTime(); t < max; t += stepH * HOUR_MS) ticks.push(t);
    if (ticks[ticks.length - 1] !== max) ticks.push(max);
    return ticks;
  };

  // -------- networking & polling (和你原本保持相同邏輯) --------
  const POLL_INTERVAL_MS = 10000;
  const lastControllerRef = useRef(null);
  const deviceEuiRef = useRef(deviceEui);
  deviceEuiRef.current = deviceEui;

  const fetchDevices = useCallback(async (signal) => {
    const res = await apiFetch("/amplifier/devices", { method: "GET", signal });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`GET /devices failed (${res.status}): ${t || res.statusText}`);
    }
    const json = await res.json();
    let euies = [];
    if (Array.isArray(json?.devices)) {
      const allEuies = json.devices.map(d => d?.deviceEui);
      const validEuies = allEuies.filter(Boolean);
      euies = Array.from(new Set(validEuies));
    }
    return { euies, json };
  }, []);

  const fetchChart = useCallback(async (eui, signal) => {
    if (!eui) return { rows: [], json2: null };
    const url = apiUrl(`/amplifier/status/${encodeURIComponent(eui)}/chart`);
    const res2 = await fetch(url, { method: "GET", signal });
    if (!res2.ok) {
      const t = await res2.text().catch(() => "");
      throw new Error(`GET /status/${eui}/chart failed (${res2.status}): ${t || res2.statusText}`);
    }
    const json2 = await res2.json();
    const rows = Array.isArray(json2?.data) ? json2.data.slice() : [];
    rows.sort((a, b) => new Date(a.time) - new Date(b.time));
    return { rows, json2 };
  }, []);

  const fetchData = useCallback(async () => {
    const ac = new AbortController();
    lastControllerRef.current = ac;
    try {
      setDevicesLoading(true);
      setDevicesError("");
      // 1) 取得 devices 列表
      const { euies, json } = await fetchDevices(ac.signal);

      // 2) 決定 targetEui：優先 deviceEui state -> prop -> existing deviceEui state -> 第一個
      const targetEui = deviceEuiRef.current || euies[0] || "";

      // 3) 取得 chart（使用 targetEui）
      const { rows, json2 } = await fetchChart(targetEui, ac.signal);

      const normalized = normalizeChart({
        period: json?.period || "",
        deviceEui: json?.deviceEui || targetEui,
        data: rows,
      });

      setChart(prev => ({ ...prev, ...normalized }));

      setListDeviceEui(euies);

      // 若目前沒有 deviceEui，改為第一個（保留已存在者）
      if (!deviceEuiRef.current && euies.length) {
        setDeviceEui(euies[0]);
      }
    } catch (err) {
      if (!ac.signal.aborted) {
        setDevicesError(String(err?.message || err));
      }
    } finally {
      if (!ac.signal.aborted) {
        setDevicesLoading(false);
      }
    }
  }, [fetchDevices, fetchChart]);

  useEffect(() => {
    if (autoRefresh) fetchData();

    let id;
    if (autoRefresh) {
      id = setInterval(() => {
        fetchData();
      }, POLL_INTERVAL_MS);
    }
    return () => {
      clearInterval(id);
      if (lastControllerRef.current) {
        try { lastControllerRef.current.abort(); } catch (e) {}
      }
    };
  }, [autoRefresh, fetchData]);

  // -------- fetch devices (initial) --------
  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      setDevicesLoading(true);
      setDevicesError("");
      try {
        const res = await apiFetch("/amplifier/devices", { method: "GET", signal: ac.signal });
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          throw new Error(`GET /devices failed (${res.status}): ${t || res.statusText}`);
        }
        const json = await res.json();
        let euies = [];
        if (Array.isArray(json?.devices)) {
          const allEuies = json.devices.map(d => d?.deviceEui);
          const validEuies = allEuies.filter(Boolean);
          euies = Array.from(new Set(validEuies));
        }
        setListDeviceEui(euies);

        // 優先使用 stateDevice 或 propDevice 的 eui（如果有）
        if (stateDevice?.deviceEui) {
          setDeviceEui(stateDevice.deviceEui);
          // 如果 stateDevice 有基本資料，我們也可以立刻把 chart 設成已知值（可選），但目前仍會走 fetchChart
        } else if (propDevice?.deviceEui) {
          setDeviceEui(propDevice.deviceEui);
        } else {
          // 否則若 prev 沒值，使用第一個
          setDeviceEui(prev => (prev && prev.length ? prev : (euies[0] || "")));
        }
      } catch (err) {
        if (!ac.signal.aborted) setDevicesError(String(err?.message || err));
      } finally {
        if (!ac.signal.aborted) setDevicesLoading(false);
      }
    })();
    return () => ac.abort();
  }, [stateDevice, propDevice]);

  // -------- fetch chart when deviceEui changes --------
  useEffect(() => {
    if (!deviceEui) return;
    const ac = new AbortController();
    (async () => {
      setLoading(true);
      setError("");
      try {
        const url = apiUrl(`/amplifier/status/${encodeURIComponent(deviceEui)}/chart`);
        const res = await fetch(url, { method: "GET", signal: ac.signal });
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          throw new Error(`GET /status/${deviceEui}/chart failed (${res.status}): ${t || res.statusText}`);
        }
        const json = await res.json();
        const rows = Array.isArray(json?.data) ? json.data.slice() : [];
        rows.sort((a, b) => new Date(a.time) - new Date(b.time));

        const normalized = normalizeChart({
          period: json?.period || "",
          deviceEui: json?.deviceEui || deviceEui,
          data: rows,
        });
        setChart(normalized);
        // 同步更新 localStorage.selectedDeviceEui
        try { localStorage.setItem("selectedDeviceEui", deviceEui); } catch (e) {}
      } catch (err) {
        if (!ac.signal.aborted) setError(String(err?.message || err));
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [deviceEui]);

  // -------- data transforms --------
  const rowsAll = chart.data || [];
  const rows = useMemo(() => {
    const hours = toHours(period);
    const cutoff = Date.now() - hours * 3600 * 1000;
    return rowsAll.filter((r) => new Date(r.time).getTime() >= cutoff);
  }, [rowsAll, period]);

  const timeSeries = useMemo(
    () =>
      rows.map((r) => {
        const ts = new Date(r.time).getTime();
        return {
          ts,
          rawTime: r.time,
          avgTemp: asNumOrNull(r.avgTemp),
          avgVoltage: asNumOrNull(r.avgVoltage),
          avgCurrent: asNumOrNull(r.avgCurrent),
          avgSlope: asNumOrNull(r.avgSlope),
          avgPilotHigh: asNumOrNull(r.avgPilotHigh),
          avgPilotLow: asNumOrNull(r.avgPilotLow),
        };
      }),
    [rows]
  );

  const xDomainTight = useMemo(() => {
    if (!timeSeries.length) return ["dataMin", "dataMax"];
    return [timeSeries[0].ts, timeSeries[timeSeries.length - 1].ts];
  }, [timeSeries]);

  const timeTicks = useMemo(() => buildSparseHourTicks(timeSeries, 7), [timeSeries]);

  // -------- UI loading / errors --------
  if (devicesLoading) {
    return <div className="kpi-wrap"><div className="kpi-header"><div className="kpi-title">Loading devices…</div></div></div>;
  }
  if (devicesError) {
    return <div className="kpi-wrap"><div className="kpi-header"><div className="kpi-title">Device list error: {devicesError}</div></div></div>;
  }
  if (!deviceEui) {
    return <div className="kpi-wrap"><div className="kpi-header"><div className="kpi-title">No devices found.</div></div></div>;
  }
  if (loading) {
    return <div className="kpi-wrap"><div className="kpi-header"><div className="kpi-title">Loading charts…</div></div></div>;
  }
  if (error) {
    return <div className="kpi-wrap"><div className="kpi-header"><div className="kpi-title">Chart error: {error}</div></div></div>;
  }

  const toISO = (t) => {
    if (!t) return "";
    const d = t instanceof Date ? t : new Date(t);
    return Number.isNaN(d.getTime()) ? "" : d.toISOString();
  };

  const onExportCSV = () => {
    const header = ["timeISO", "avgTemp", "avgVoltage", "avgCurrent"];
    const lines = [header.join(",")];
    for (const r of rows) {
      const arr = [toISO(r.time), r.avgTemp ?? "", r.avgVoltage ?? "", r.avgCurrent ?? ""];
      lines.push(arr.join(","));
    }
    const csv = "\ufeff" + lines.join("\n");
    const fn = `amp_${chart.deviceEui || deviceEui}_${period}_${new Date()
      .toISOString().slice(0, 19).replace(/[T:]/g, "-")}.csv`;
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
              <div>From: {rows[0] ? new Date(rows[0].time).toLocaleString("en-US") : "-"}</div>
              <div>To: {rows[rows.length - 1] ? fmtDateTimeUTC(rows[rows.length - 1].time) : "-"}</div>
            </div>
          </div>

          {/* <select className="kpi-select" value={deviceEui} onChange={(e) => setDeviceEui(e.target.value)}>
            {listDeviceEui.map(id => <option key={id} value={id}>{id}</option>)}
          </select> */}

          <Form.Check
            type="switch"
            id="auto-refresh"
            label="Auto Refresh"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="ms-3"
          />

          <button className="kpi-button secondary" type="button" onClick={onExportCSV}>Export CSV</button>
        </div>
      </div>

      <div className="kpi-grid">
        {/* Temperature */}
        <div className="kpi-card">
          <h4>Temperature </h4>
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeSeries} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="ts"
                  type="number"
                  scale="time"
                  domain={xDomainTight}
                  ticks={timeTicks}
                  interval="preserveStartEnd"
                  tickFormatter={fmtUTCHHmm}
                  minTickGap={22}
                  tickMargin={8}
                  padding={{ left: 0, right: 0 }}
                />
                {/* Temperature Y axis 固定 -10 ~ 70 */}
                <YAxis domain={[-10, 70]} tickCount={9} />
                <Tooltip labelFormatter={(value) => fmtDateTimeUTC(value)} />
                <Legend />
                <Line name="Average Temperature (°C)" type="monotone" dataKey="avgTemp" stroke={COLORS.tempAvg} dot={false} strokeWidth={2} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Voltage */}
        <div className="kpi-card">
          <h4>Voltage</h4>
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeSeries} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="ts"
                  type="number"
                  scale="time"
                  domain={xDomainTight}
                  ticks={timeTicks}
                  interval="preserveStartEnd"
                  tickFormatter={fmtUTCHHmm}
                  minTickGap={22}
                  tickMargin={8}
                  padding={{ left: 0, right: 0 }}
                />
                {/* Voltage 主軸固定 0 ~ 35V */}
                <YAxis yAxisId="v" domain={[0, 35]} tickCount={8} />
                <YAxis yAxisId="c" orientation="right" domain={[0, 'auto']} tickCount={6} />
                <Tooltip labelFormatter={(v) => fmtDateTimeUTC(v)} />
                <Legend />
                <Line name="Average Voltage (V)" dataKey="avgVoltage" yAxisId="v" type="monotone" stroke={COLORS.voltage} strokeWidth={2} dot={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* avgCurrent (kept commented) */}
        {/* <div className="kpi-card">
          <h4>Average Current</h4>
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeSeries} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="ts" type="number" scale="time" domain={xDomainTight} ticks={timeTicks} interval="preserveStartEnd" tickFormatter={fmtUTCHHmm} minTickGap={22} tickMargin={8} padding={{ left: 0, right: 0 }} />
                <YAxis domain={['auto', 'auto']} />
                <Tooltip labelFormatter={(v) => fmtDateTimeUTC(v)} />
                <Legend />
                <Line name="Average Current (A)" dataKey="avgCurrent" type="monotone" stroke={COLORS.current} strokeWidth={2} dot={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div> */}

      </div>
    </div>
  );
}
