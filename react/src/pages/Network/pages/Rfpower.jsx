// import React, { useEffect, useMemo, useState } from "react";
// import {
//   ResponsiveContainer,
//   LineChart,
//   Line,
//   XAxis,
//   YAxis,
//   CartesianGrid,
//   Tooltip,
//   Legend,
// } from "recharts";
// import { apiUrl } from '../../../lib/api'

// const COLORS = { out: "#ef4444", in: "#3b82f6", gain: "#10b981" };

// export default function RFpower({ deviceeui: deviceeui }) {
//   const [rows, setRows] = useState([]);
//   const [timestamp, setTimestamp] = useState("");
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");

//   //下拉device選單
//   const [listDeviceEui, setListDeviceEui] = useState([]);
//   const [deviceEui, setDeviceEui] = useState(deviceeui);
//   // const [deviceEui, setDeviceEui] = useState("");
//   const [devicesLoading, setDevicesLoading] = useState(true);
//   const [devicesError, setDevicesError] = useState("");

//   // 取得所有device資料
//   useEffect(() => {
//     const ac = new AbortController();
//     (async () => {
//       setDevicesLoading(true);
//       setDevicesError("");
//       try {
//         const url = apiUrl(`/amplifier/devices`);
//         const res = await fetch(url, { method: "GET", signal: ac.signal });
//         if (!res.ok) {
//           const t = await res.text().catch(() => "");
//           throw new Error(`GET /devices failed (${res.status}): ${t || res.statusText}`);
//         }
//         const json = await res.json();
//         let euies = [];
//         if (Array.isArray(json?.devices)) {
//           const allEuies = json.devices.map(d => d?.deviceEui);
//           const validEuies = allEuies.filter(eui => Boolean(eui));
//           const uniqueEuies = Array.from(new Set(validEuies));
//           euies = uniqueEuies;
//         }

//         setListDeviceEui(euies);
//         if (!deviceEui && euies.length) {
//           setDeviceEui(euies[0]);
//         }
//       } catch (err) {
//         if (!ac.signal.aborted) setDevicesError(String(err?.message || err));
//       } finally {
//         if (!ac.signal.aborted) setDevicesLoading(false);
//       }
//     })();
//     return () => ac.abort();
//   }, []);


//   useEffect(() => {
//     const ac = new AbortController();
//     const fetchData = async () => {
//       setLoading(true); setError("");
//       try {
//         const url = apiUrl(`/amplifier/rf-power/${encodeURIComponent(deviceEui)}/spectrum`);
//         const res = await fetch(url, { method: "GET", signal: ac.signal });
//         if (!res.ok) {
//           const t = await res.text().catch(() => "");
//           throw new Error(`GET failed (${res.status}): ${t || res.statusText}`);
//         }
//         const json = await res.json();
//         const spec = Array.isArray(json?.spectrum) ? json.spectrum.slice() : [];
//         // sort by frequency so the lines are continuous from left to right
//         spec.sort((a,b) => (a.frequency ?? 0) - (b.frequency ?? 0));
//         setRows(spec);
//         setTimestamp(json?.timestamp || "");
//       } catch (err) {
//         if (!ac.signal.aborted) setError(String(err?.message || err));
//       } finally {
//         if (!ac.signal.aborted) setLoading(false);
//       }
//     };
//     if (deviceEui) fetchData();
//     return () => ac.abort();
//   }, [deviceEui]);


//   const yDomain = useMemo(() => {
//     if (!rows.length) return ["auto", "auto"];
//     let min = Infinity, max = -Infinity;
//     for (const r of rows) {
//       if (typeof r.inputPower === "number") min = Math.min(min, r.inputPower);
//       if (typeof r.outputPower === "number") min = Math.min(min, r.outputPower);
//       if (typeof r.inputPower === "number") max = Math.max(max, r.inputPower);
//       if (typeof r.outputPower === "number") max = Math.max(max, r.outputPower);
//     }
//     if (!isFinite(min) || !isFinite(max)) return ["auto", "auto"];
//     return [Math.floor(min - 3), Math.ceil(max + 3)];
//   }, [rows]);

//   // separate domain for gain (right axis)
//   const gainDomain = useMemo(() => {
//     if (!rows.length) return ["auto", "auto"];
//     let min = Infinity, max = -Infinity;
//     for (const r of rows) {
//       if (typeof r.gain === "number") min = Math.min(min, r.gain);
//       if (typeof r.gain === "number") max = Math.max(max, r.gain);
//     }
//     if (!isFinite(min) || !isFinite(max)) return ["auto", "auto"];
//     // add padding
//     return [Math.floor(min - 1), Math.ceil(max + 1)];
//   }, [rows]);


//   const infoStyles = {
//     wrap: { border: "1px solid #e5e7eb", borderRadius: 16, padding: 12, background: "#fff" },
//     head: { display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 8 },
//     title: { fontSize: 18, fontWeight: 700 },
//     meta: { fontSize: 12, color: "#6b7280" },
//   };

//   if (loading) return <div style={infoStyles.wrap}>Loading RF spectrum…</div>;
//   if (error) return <div style={infoStyles.wrap}>Error: {error}</div>;

//   return (
//     <div style={infoStyles.wrap}>
//       <div style={infoStyles.head}>
//         <div style={infoStyles.title}>RF Power Spectrum</div>
//         <>
//          {/* 下拉device選單 */}
//          {/* <select
//             className="kpi-select"
//             value={deviceEui}
//             onChange={(e) => { setDeviceEui(e.target.value); }}
//           >
//             {listDeviceEui.map(id => <option key={id} value={id}>{id}</option>)}
//           </select> */}
//           </>
//         <div style={infoStyles.meta}>Device: {deviceEui} · {timestamp ? new Date(timestamp).toLocaleString("en-US") : ""}</div>
//       </div>
//       <div style={{ height: 420 }}>
//         <ResponsiveContainer width="100%" height="100%">
//           <LineChart data={rows} margin={{ top: 10, right: 40, left: 10, bottom: 10 }}>
//             <CartesianGrid strokeDasharray="3 3" />
//             <Tooltip
//               formatter={(value, name) => {
//                 // name might be the display name (e.g. "Output (dBmV)") or the dataKey (e.g. "outputPower") depending on Recharts version.
//                 let label = name;
//                 if (name === 'outputPower' || name === 'Output (dBmV)') label = 'Output (dBmV)';
//                 else if (name === 'inputPower' || name === 'Input (dBmV)') label = 'Input (dBmV)';
//                 // else if (name === 'gain' || name === 'Gain (dB)') label = 'Gain (dB)';
//                 return [typeof value === 'number' ? value.toFixed(2) : value, label];
//               }}
//               labelFormatter={(f) => `Frequency: ${f} MHz`}
//             />

//             <XAxis
//               type="number"
//               dataKey="frequency"
//               domain={["dataMin", "dataMax"]}
//               tickFormatter={(v) => `${v}`}
//               label={{ value: "Frequency (MHz)", position: "insideBottom", offset: -6 }}
//             />

//             {/* left axis for dBmV values */}
//             <YAxis
//               yAxisId="left"
//               domain={yDomain}
//               label={{ value: "dBmV", angle: -90, position: "insideLeft" }}
//             />

//             {/* right axis for gain (dB) */}
//             {/* <YAxis
//               yAxisId="right"
//               orientation="right"
//               domain={gainDomain}
//               label={{ value: "dB", angle: 90, position: "insideRight" }}
//             /> */}

//             <Legend />
//             <Line name="Output (dBmV)" type="monotone" dataKey="outputPower" stroke={COLORS.out} dot={false} strokeWidth={2} yAxisId="left" />
//             <Line name="Input (dBmV)" type="monotone" dataKey="inputPower" stroke={COLORS.in} dot={false} strokeWidth={2} yAxisId="left" />
//             {/* <Line name="Gain (dB)" type="monotone" dataKey="gain" stroke={COLORS.gain} dot={false} strokeWidth={2} yAxisId="right" /> */}
//           </LineChart>
//         </ResponsiveContainer>
//       </div>
//     </div>
//   );
// }


//////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////

// import React, { useEffect, useMemo, useState } from "react";
// import {
//   ResponsiveContainer,
//   BarChart,
//   Bar,
//   XAxis,
//   YAxis,
//   CartesianGrid,
//   Tooltip,
//   Legend,
// } from "recharts";
// import { apiUrl } from '../../../lib/api'

// const COLORS = { out: "#ef4444", in: "#3b82f6" };

// export default function RFpower({ deviceeui: deviceeui }) {
//   const [rows, setRows] = useState([]);
//   const [timestamp, setTimestamp] = useState("");
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");
//   const [listDeviceEui, setListDeviceEui] = useState([]);
//   const [deviceEui, setDeviceEui] = useState(deviceeui);
//   const [devicesLoading, setDevicesLoading] = useState(true);
//   const [devicesError, setDevicesError] = useState("");

//   useEffect(() => {
//     const ac = new AbortController();
//     (async () => {
//       setDevicesLoading(true);
//       setDevicesError("");
//       try {
//         const url = apiUrl(`/amplifier/devices`);
//         const res = await fetch(url, { method: "GET", signal: ac.signal });
//         if (!res.ok) {
//           const t = await res.text().catch(() => "");
//           throw new Error(`GET /devices failed (${res.status}): ${t || res.statusText}`);
//         }
//         const json = await res.json();
//         let euies = [];
//         if (Array.isArray(json?.devices)) {
//           const allEuies = json.devices.map(d => d?.deviceEui);
//           const validEuies = allEuies.filter(eui => Boolean(eui));
//           euies = Array.from(new Set(validEuies));
//         }
//         setListDeviceEui(euies);
//         if (!deviceEui && euies.length) setDeviceEui(euies[0]);
//       } catch (err) {
//         if (!ac.signal.aborted) setDevicesError(String(err?.message || err));
//       } finally {
//         if (!ac.signal.aborted) setDevicesLoading(false);
//       }
//     })();
//     return () => ac.abort();
//   }, []);

//   useEffect(() => {
//     const ac = new AbortController();
//     const fetchData = async () => {
//       setLoading(true); setError("");
//       try {
//         const url = apiUrl(`/amplifier/rf-power/${encodeURIComponent(deviceEui)}/spectrum`);
//         const res = await fetch(url, { method: "GET", signal: ac.signal });
//         if (!res.ok) {
//           const t = await res.text().catch(() => "");
//           throw new Error(`GET failed (${res.status}): ${t || res.statusText}`);
//         }
//         const json = await res.json();
//         const spec = Array.isArray(json?.spectrum) ? json.spectrum.slice() : [];
//         spec.sort((a,b) => (a.frequency ?? 0) - (b.frequency ?? 0));
//         setRows(spec);
//         setTimestamp(json?.timestamp || "");
//       } catch (err) {
//         if (!ac.signal.aborted) setError(String(err?.message || err));
//       } finally {
//         if (!ac.signal.aborted) setLoading(false);
//       }
//     };
//     if (deviceEui) fetchData();
//     return () => ac.abort();
//   }, [deviceEui]);

//   const yDomain = useMemo(() => {
//     if (!rows.length) return ["auto", "auto"];
//     let min = Infinity, max = -Infinity;
//     for (const r of rows) {
//       if (typeof r.inputPower === "number") min = Math.min(min, r.inputPower);
//       if (typeof r.outputPower === "number") min = Math.min(min, r.outputPower);
//       if (typeof r.inputPower === "number") max = Math.max(max, r.inputPower);
//       if (typeof r.outputPower === "number") max = Math.max(max, r.outputPower);
//     }
//     if (!isFinite(min) || !isFinite(max)) return ["auto", "auto"];
//     return [Math.floor(min - 3), Math.ceil(max + 3)];
//   }, [rows]);

//   const infoStyles = {
//     wrap: { border: "1px solid #e5e7eb", borderRadius: 16, padding: 12, background: "#fff" },
//     head: { display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 8 },
//     title: { fontSize: 18, fontWeight: 700 },
//     meta: { fontSize: 12, color: "#6b7280" },
//   };

//   if (loading) return <div style={infoStyles.wrap}>Loading RF spectrum…</div>;
//   if (error) return <div style={infoStyles.wrap}>Error: {error}</div>;

//   return (
//     <div style={infoStyles.wrap}>
//       <div style={infoStyles.head}>
//         <div style={infoStyles.title}>RF Power Spectrum</div>
//         <div style={infoStyles.meta}>Device: {deviceEui} · {timestamp ? new Date(timestamp).toLocaleString("en-US") : ""}</div>
//       </div>
//       <div style={{ height: 420 }}>
//         <ResponsiveContainer width="100%" height="100%">
//           <BarChart data={rows} margin={{ top: 10, right: 40, left: 10, bottom: 10 }}>
//             <CartesianGrid strokeDasharray="3 3" />
//             <XAxis
//               type="number"
//               dataKey="frequency"
//               domain={["dataMin", "dataMax"]}
//               tickFormatter={(v) => `${v}`}
//               label={{ value: "Frequency (MHz)", position: "insideBottom", offset: -6 }}
//             />
//             <YAxis
//               domain={yDomain}
//               label={{ value: "dBmV", angle: -90, position: "insideLeft" }}
//             />
//             <Tooltip
//               formatter={(value, name) => [
//                 typeof value === 'number' ? value.toFixed(2) : value,
//                 name === 'inputPower' ? 'Input (dBmV)' : 'Output (dBmV)'
//               ]}
//               labelFormatter={(f) => `Frequency: ${f} MHz`}
//             />
//             <Legend />
//             {/* Input 覆蓋 Output */}
//             <Bar dataKey="outputPower" fill={COLORS.out} />
//             <Bar dataKey="inputPower" fill={COLORS.in} />
//           </BarChart>
//         </ResponsiveContainer>
//       </div>
//     </div>
//   );
// }

//////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////

// import React, { useEffect, useMemo, useState } from "react";
// import {
//   ResponsiveContainer,
//   BarChart,
//   Bar,
//   XAxis,
//   YAxis,
//   CartesianGrid,
//   Tooltip,
//   Legend,
// } from "recharts";
// import { apiUrl } from '../../../lib/api'

// const COLORS = { out: "#ef4444", in: "#3b82f6" };

// // 產生「漂亮」刻度：使用 1, 2, 5 × 10^n 的步階
// function makeNiceStep(rawStep) {
//   if (!isFinite(rawStep) || rawStep <= 0) return 1;
//   const p = Math.pow(10, Math.floor(Math.log10(rawStep)));
//   const s = rawStep / p;
//   if (s <= 1) return 1 * p;
//   if (s <= 2) return 2 * p;
//   if (s <= 5) return 5 * p;
//   return 10 * p;
// }
// function makeNiceTicks(min, max, desired = 10) {
//   if (!isFinite(min) || !isFinite(max) || min === max) return [min];
//   const span = max - min;
//   const raw = span / Math.max(2, desired); // 多一點密度
//   const step = makeNiceStep(raw);
//   const start = Math.ceil(min / step) * step;
//   const end = Math.floor(max / step) * step;
//   const ticks = [];
//   for (let v = start; v <= end + 1e-9; v += step) {
//     // 修正浮點小數誤差
//     const fixed = Number((Math.round(v / step) * step).toFixed(10));
//     ticks.push(fixed);
//   }
//   // 落在範圍外緣也補上（確保圖框邊界刻度清楚）
//   if (ticks.length === 0 || ticks[0] > min) ticks.unshift(Number(min.toFixed(10)));
//   if (ticks[ticks.length - 1] < max) ticks.push(Number(max.toFixed(10)));
//   return ticks;
// }

// export default function RFpower({ deviceeui: deviceeui }) {
//   const [rows, setRows] = useState([]);
//   const [timestamp, setTimestamp] = useState("");
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");
//   const [listDeviceEui, setListDeviceEui] = useState([]);
//   const [deviceEui, setDeviceEui] = useState(deviceeui);
//   const [devicesLoading, setDevicesLoading] = useState(true);
//   const [devicesError, setDevicesError] = useState("");

//   useEffect(() => {
//     const ac = new AbortController();
//     (async () => {
//       setDevicesLoading(true);
//       setDevicesError("");
//       try {
//         const url = apiUrl(`/amplifier/devices`);
//         const res = await fetch(url, { method: "GET", signal: ac.signal });
//         if (!res.ok) {
//           const t = await res.text().catch(() => "");
//           throw new Error(`GET /devices failed (${res.status}): ${t || res.statusText}`);
//         }
//         const json = await res.json();
//         let euies = [];
//         if (Array.isArray(json?.devices)) {
//           const allEuies = json.devices.map(d => d?.deviceEui);
//           const validEuies = allEuies.filter(eui => Boolean(eui));
//           euies = Array.from(new Set(validEuies));
//         }
//         setListDeviceEui(euies);
//         if (!deviceEui && euies.length) setDeviceEui(euies[0]);
//       } catch (err) {
//         if (!ac.signal.aborted) setDevicesError(String(err?.message || err));
//       } finally {
//         if (!ac.signal.aborted) setDevicesLoading(false);
//       }
//     })();
//     return () => ac.abort();
//   }, []);

//   useEffect(() => {
//     const ac = new AbortController();
//     const fetchData = async () => {
//       setLoading(true); setError("");
//       try {
//         const url = apiUrl(`/amplifier/rf-power/${encodeURIComponent(deviceEui)}/spectrum`);
//         const res = await fetch(url, { method: "GET", signal: ac.signal });
//         if (!res.ok) {
//           const t = await res.text().catch(() => "");
//           throw new Error(`GET failed (${res.status}): ${t || res.statusText}`);
//         }
//         const json = await res.json();
//         const spec = Array.isArray(json?.spectrum) ? json.spectrum.slice() : [];
//         spec.sort((a,b) => (a.frequency ?? 0) - (b.frequency ?? 0));
//         setRows(spec);
//         setTimestamp(json?.timestamp || "");
//       } catch (err) {
//         if (!ac.signal.aborted) setError(String(err?.message || err));
//       } finally {
//         if (!ac.signal.aborted) setLoading(false);
//       }
//     };
//     if (deviceEui) fetchData();
//     return () => ac.abort();
//   }, [deviceEui]);

//   // Y 軸 domain
//   const yDomain = useMemo(() => {
//     if (!rows.length) return ["auto", "auto"];
//     let min = Infinity, max = -Infinity;
//     for (const r of rows) {
//       if (typeof r.inputPower === "number") { min = Math.min(min, r.inputPower); max = Math.max(max, r.inputPower); }
//       if (typeof r.outputPower === "number") { min = Math.min(min, r.outputPower); max = Math.max(max, r.outputPower); }
//     }
//     if (!isFinite(min) || !isFinite(max)) return ["auto", "auto"];
//     // 留 3dB headroom
//     return [Math.floor(min - 3), Math.ceil(max + 3)];
//   }, [rows]);

//   // X/Y 軸更細刻度
//   const DESIRED_X_TICKS = 16; // 想要的 X 軸刻度數量（可調整）
//   const DESIRED_Y_TICKS = 12; // 想要的 Y 軸刻度數量（可調整）

//   const xTicks = useMemo(() => {
//     if (!rows.length) return undefined;
//     const freqs = rows.map(r => r.frequency).filter(v => typeof v === "number");
//     if (!freqs.length) return undefined;
//     const min = Math.min(...freqs);
//     const max = Math.max(...freqs);
//     return makeNiceTicks(min, max, DESIRED_X_TICKS);
//   }, [rows]);

//   const yTicks = useMemo(() => {
//     if (yDomain[0] === "auto" || yDomain[1] === "auto") return undefined;
//     const [min, max] = yDomain;
//     return makeNiceTicks(min, max, DESIRED_Y_TICKS);
//   }, [yDomain]);

//   const infoStyles = {
//     wrap: { border: "1px solid #e5e7eb", borderRadius: 16, padding: 12, background: "#fff" },
//     head: { display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 8 },
//     title: { fontSize: 18, fontWeight: 700 },
//     meta: { fontSize: 12, color: "#6b7280" },
//   };

//   if (loading) return <div style={infoStyles.wrap}>Loading RF spectrum…</div>;
//   if (error) return <div style={infoStyles.wrap}>Error: {error}</div>;

//   return (
//     <div style={infoStyles.wrap}>
//       <div style={infoStyles.head}>
//         <div style={infoStyles.title}>RF Power Spectrum</div>
//         <div style={infoStyles.meta}>Device: {deviceEui} · {timestamp ? new Date(timestamp).toLocaleString("en-US") : ""}</div>
//       </div>
//       <div style={{ height: 420 }}>
//         <ResponsiveContainer width="100%" height="100%">
//           <BarChart
//             data={rows}
//             margin={{ top: 10, right: 40, left: 10, bottom: 10 }}
//             barCategoryGap={2}
//           >
//             <CartesianGrid strokeDasharray="3 3" />
//             <XAxis
//               type="number"
//               dataKey="frequency"
//               domain={["dataMin", "dataMax"]}
//               ticks={xTicks}                 // ← 更細 X 刻度
//               tickFormatter={(v) => `${v}`}
//               tickMargin={8}
//               tickSize={6}
//               label={{ value: "Frequency (MHz)", position: "insideBottom", offset: -6 }}
//               allowDecimals
//               allowDataOverflow
//               scale="linear"
//             />
//             <YAxis
//               domain={yDomain}
//               ticks={yTicks}                 // ← 更細 Y 刻度
//               tickMargin={6}
//               tickSize={6}
//               allowDecimals
//               label={{ value: "dBmV", angle: -90, position: "insideLeft" }}
//             />
//             <Tooltip
//               formatter={(value, name) => [
//                 typeof value === 'number' ? value.toFixed(2) : value,
//                 name === 'inputPower' ? 'Input (dBmV)' : 'Output (dBmV)'
//               ]}
//               labelFormatter={(f) => `Frequency: ${f} MHz`}
//             />
//             <Legend />
//             {/* Input 覆蓋 Output */}
//             <Bar dataKey="outputPower" fill={COLORS.out} />
//             <Bar dataKey="inputPower" fill={COLORS.in} />
//           </BarChart>
//         </ResponsiveContainer>
//       </div>
//     </div>
//   );
// }

//////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////
// RFpower.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { apiUrl } from "../../../lib/api";

// 預設顏色
// const DEFAULT_COLORS = { out: "#ef4444", in: "#3b82f6" };
const DEFAULT_COLORS = { out: "#dc2626", in: "#1d4ed8" };

/* ========= 刻度產生工具：1,2,5 × 10^n ========= */
function makeNiceStep(rawStep) {
  if (!isFinite(rawStep) || rawStep <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const s = rawStep / p;
  if (s <= 1) return 1 * p;
  if (s <= 2) return 2 * p;
  if (s <= 5) return 5 * p;
  return 10 * p;
}
function makeNiceTicks(min, max, desired = 10) {
  if (!isFinite(min) || !isFinite(max) || min === max) return [min];
  const span = max - min;
  const raw = span / Math.max(2, desired);
  const step = makeNiceStep(raw);
  const start = Math.ceil(min / step) * step;
  const end = Math.floor(max / step) * step;
  const ticks = [];
  for (let v = start; v <= end + 1e-9; v += step) {
    const fixed = Number((Math.round(v / step) * step).toFixed(10));
    ticks.push(fixed);
  }
  if (ticks.length === 0 || ticks[0] > min) ticks.unshift(Number(min.toFixed(10)));
  if (ticks[ticks.length - 1] < max) ticks.push(Number(max.toFixed(10)));
  return ticks;
}

/**
 * RFpower
 * Props
 * - deviceeui: string                 // 要查詢的 device EUI
 * - embed?: boolean = false           // 卡片內嵌模式（不渲染自帶外框與標題）
 * - height?: number = 420             // 圖高（搭配 ResponsiveContainer）
 * - desiredXTicks?: number = 16       // X 軸期望刻度數量
 * - desiredYTicks?: number = 12       // Y 軸期望刻度數量
 * - colors?: { out?: string, in?: string }  // 覆蓋顏色
 * - showHeader?: boolean = true       // 非 embed 模式下，是否顯示標題與時間
 */
export default function RFpower({
  deviceeui,
  embed = false,
  height = 420,
  desiredXTicks = 16,
  desiredYTicks = 12,
  colors = DEFAULT_COLORS,
  showHeader = true,
}) {
  const [rows, setRows] = useState([]);
  const [timestamp, setTimestamp] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 載入頻譜資料
  useEffect(() => {
    if (!deviceeui) return;
    const ac = new AbortController();
    (async () => {
      setLoading(true);
      setError("");
      try {
        const url = apiUrl(`/amplifier/rf-power/${encodeURIComponent(deviceeui)}/spectrum`);
        const res = await fetch(url, { method: "GET", signal: ac.signal });
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          throw new Error(`GET failed (${res.status}): ${t || res.statusText}`);
        }
        const json = await res.json();
        const spec = Array.isArray(json?.spectrum) ? json.spectrum.slice() : [];
        spec.sort((a, b) => (a.frequency ?? 0) - (b.frequency ?? 0));
        setRows(spec);
        setTimestamp(json?.timestamp || "");
      } catch (err) {
        if (!ac.signal.aborted) setError(String(err?.message || err));
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [deviceeui]);

  // Y 軸 domain（含 headroom）
  const yDomain = useMemo(() => {
    if (!rows.length) return ["auto", "auto"];
    let min = Infinity,
      max = -Infinity;
    for (const r of rows) {
      if (typeof r.inputPower === "number") {
        min = Math.min(min, r.inputPower);
        max = Math.max(max, r.inputPower);
      }
      if (typeof r.outputPower === "number") {
        min = Math.min(min, r.outputPower);
        max = Math.max(max, r.outputPower);
      }
    }
    if (!isFinite(min) || !isFinite(max)) return ["auto", "auto"];
    return [Math.floor(min - 3), Math.ceil(max + 3)]; // 3dB headroom
  }, [rows]);

  // X / Y 刻度
  const xTicks = useMemo(() => {
    if (!rows.length) return undefined;
    const freqs = rows.map((r) => r.frequency).filter((v) => typeof v === "number");
    if (!freqs.length) return undefined;
    const min = Math.min(...freqs);
    const max = Math.max(...freqs);
    return makeNiceTicks(min, max, desiredXTicks);
  }, [rows, desiredXTicks]);

  const yTicks = useMemo(() => {
    if (yDomain[0] === "auto" || yDomain[1] === "auto") return undefined;
    const [min, max] = yDomain;
    return makeNiceTicks(min, max, desiredYTicks);
  }, [yDomain, desiredYTicks]);

  // 樣式（只有非 embed 模式才用外框）
  const infoStyles = {
    wrap: { border: "1px solid #e5e7eb", borderRadius: 16, padding: 12, background: "#fff" },
    head: {
      display: "flex",
      alignItems: "baseline",
      justifyContent: "space-between",
      gap: 12,
      marginBottom: 8,
    },
    title: { fontSize: 18, fontWeight: 700 },
    meta: { fontSize: 12, color: "#6b7280" },
  };

  if (loading)
    return embed ? (
      <div style={{ height, display: "grid", placeItems: "center", color: "#6b7280" }}>
        Loading RF spectrum…
      </div>
    ) : (
      <div style={infoStyles.wrap}>Loading RF spectrum…</div>
    );

  if (error)
    return embed ? (
      <div style={{ height, display: "grid", placeItems: "center", color: "#b91c1c" }}>
        Error: {error}
      </div>
    ) : (
      <div style={infoStyles.wrap}>Error: {error}</div>
    );

  // 圖表本體
  const ChartBox = (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={rows}
          margin={{ top: 6, right: 18, left: 10, bottom: 14 }} // 緊湊一些，避免溢出
          // barCategoryGap={2}
          barCategoryGap={1} barGap={0}
        >
          {/* <CartesianGrid strokeDasharray="3 3" /> */}
          <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />  {/* 網格更淡 */}
          {/* <XAxis
            type="number"
            dataKey="frequency"
            domain={["dataMin", "dataMax"]}
            ticks={xTicks}
            tickFormatter={(v) => `${v}`}
            tickMargin={8}
            tickSize={6}
            label={{ value: "Frequency (MHz)", position: "insideBottom", offset: -6 }}
            allowDecimals
            allowDataOverflow
            scale="linear"
          /> */}
          <XAxis
            type="category"
            dataKey="frequency"
            allowDuplicatedCategory={false}
            tickMargin={8}
            tickSize={6}
            // 依資料量決定是否全部顯示刻度，太多可改成 "preserveStartEnd" 或自訂 tick
            interval="preserveStartEnd"
            label={{ value: "Frequency (MHz)", position: "insideBottom", offset: -6 }}
          />
          <YAxis
            domain={yDomain}
            ticks={yTicks}
            tickMargin={6}
            tickSize={6}
            allowDecimals
            label={{ value: "dBmV", angle: -90, position: "insideLeft" }}
          />
          <Tooltip
            wrapperStyle={{ zIndex: 1 }} // 保證在圖上層、仍在卡片內
            formatter={(value, name) => [
              typeof value === "number" ? value.toFixed(2) : value,
              name === "inputPower" ? "Input (dBmV)" : "Output (dBmV)",
            ]}
            labelFormatter={(f) => `Frequency: ${f} MHz`}
          />
          <Legend />
          {/* 讓 Output 在下方、Input 疊在上方（覆蓋視覺） */}
          {/* <Bar dataKey="outputPower" fill={colors.out || DEFAULT_COLORS.out} />
          <Bar dataKey="inputPower" fill={colors.in || DEFAULT_COLORS.in} /> */}
          <Bar
            dataKey="outputPower"
            fill={colors.out || DEFAULT_COLORS.out}
            fillOpacity={1}
            stroke={colors.out || DEFAULT_COLORS.out}
            strokeOpacity={0.9}
            strokeWidth={0.8}
          />
          <Bar
            dataKey="inputPower"
            fill={colors.in || DEFAULT_COLORS.in}
            fillOpacity={1}
            stroke={colors.in || DEFAULT_COLORS.in}
            strokeOpacity={0.9}
            strokeWidth={0.8}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  // 嵌入模式：不畫自帶白底與標題
  if (embed) {
    return <div style={{ height, overflow: "hidden" }}>{ChartBox}</div>;
  }

  // 獨立模式：自帶外框與標題/時間
  return (
    <div style={infoStyles.wrap}>
      {showHeader && (
        <div style={infoStyles.head}>
          <div style={infoStyles.title}>RF Power Spectrum</div>
          <div style={infoStyles.meta}>
            Device: {deviceeui} · {timestamp ? new Date(timestamp).toLocaleString("en-US") : ""}
          </div>
        </div>
      )}
      {ChartBox}
    </div>
  );
}
