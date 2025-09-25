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
import { apiUrl } from '../../../lib/api'

const COLORS = { out: "#ef4444", in: "#3b82f6" };

export default function RFpower({ deviceeui: deviceeui }) {
  const [rows, setRows] = useState([]);
  const [timestamp, setTimestamp] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [listDeviceEui, setListDeviceEui] = useState([]);
  const [deviceEui, setDeviceEui] = useState(deviceeui);
  const [devicesLoading, setDevicesLoading] = useState(true);
  const [devicesError, setDevicesError] = useState("");

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      setDevicesLoading(true);
      setDevicesError("");
      try {
        const url = apiUrl(`/amplifier/devices`);
        const res = await fetch(url, { method: "GET", signal: ac.signal });
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          throw new Error(`GET /devices failed (${res.status}): ${t || res.statusText}`);
        }
        const json = await res.json();
        let euies = [];
        if (Array.isArray(json?.devices)) {
          const allEuies = json.devices.map(d => d?.deviceEui);
          const validEuies = allEuies.filter(eui => Boolean(eui));
          euies = Array.from(new Set(validEuies));
        }
        setListDeviceEui(euies);
        if (!deviceEui && euies.length) setDeviceEui(euies[0]);
      } catch (err) {
        if (!ac.signal.aborted) setDevicesError(String(err?.message || err));
      } finally {
        if (!ac.signal.aborted) setDevicesLoading(false);
      }
    })();
    return () => ac.abort();
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    const fetchData = async () => {
      setLoading(true); setError("");
      try {
        const url = apiUrl(`/amplifier/rf-power/${encodeURIComponent(deviceEui)}/spectrum`);
        const res = await fetch(url, { method: "GET", signal: ac.signal });
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          throw new Error(`GET failed (${res.status}): ${t || res.statusText}`);
        }
        const json = await res.json();
        const spec = Array.isArray(json?.spectrum) ? json.spectrum.slice() : [];
        spec.sort((a,b) => (a.frequency ?? 0) - (b.frequency ?? 0));
        setRows(spec);
        setTimestamp(json?.timestamp || "");
      } catch (err) {
        if (!ac.signal.aborted) setError(String(err?.message || err));
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    };
    if (deviceEui) fetchData();
    return () => ac.abort();
  }, [deviceEui]);

  const yDomain = useMemo(() => {
    if (!rows.length) return ["auto", "auto"];
    let min = Infinity, max = -Infinity;
    for (const r of rows) {
      if (typeof r.inputPower === "number") min = Math.min(min, r.inputPower);
      if (typeof r.outputPower === "number") min = Math.min(min, r.outputPower);
      if (typeof r.inputPower === "number") max = Math.max(max, r.inputPower);
      if (typeof r.outputPower === "number") max = Math.max(max, r.outputPower);
    }
    if (!isFinite(min) || !isFinite(max)) return ["auto", "auto"];
    return [Math.floor(min - 3), Math.ceil(max + 3)];
  }, [rows]);

  const infoStyles = {
    wrap: { border: "1px solid #e5e7eb", borderRadius: 16, padding: 12, background: "#fff" },
    head: { display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 8 },
    title: { fontSize: 18, fontWeight: 700 },
    meta: { fontSize: 12, color: "#6b7280" },
  };

  if (loading) return <div style={infoStyles.wrap}>Loading RF spectrum…</div>;
  if (error) return <div style={infoStyles.wrap}>Error: {error}</div>;

  return (
    <div style={infoStyles.wrap}>
      <div style={infoStyles.head}>
        <div style={infoStyles.title}>RF Power Spectrum</div>
        <div style={infoStyles.meta}>Device: {deviceEui} · {timestamp ? new Date(timestamp).toLocaleString("en-US") : ""}</div>
      </div>
      <div style={{ height: 420 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 10, right: 40, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="frequency"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(v) => `${v}`}
              label={{ value: "Frequency (MHz)", position: "insideBottom", offset: -6 }}
            />
            <YAxis
              domain={yDomain}
              label={{ value: "dBmV", angle: -90, position: "insideLeft" }}
            />
            <Tooltip
              formatter={(value, name) => [
                typeof value === 'number' ? value.toFixed(2) : value,
                name === 'inputPower' ? 'Input (dBmV)' : 'Output (dBmV)'
              ]}
              labelFormatter={(f) => `Frequency: ${f} MHz`}
            />
            <Legend />
            {/* Input 覆蓋 Output */}
            <Bar dataKey="outputPower" fill={COLORS.out} />
            <Bar dataKey="inputPower" fill={COLORS.in} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
