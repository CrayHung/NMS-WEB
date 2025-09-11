import React, { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {apiUrl,apiFetch} from '../../../lib/api'

const COLORS = { out: "#ef4444", in: "#3b82f6" };

export default function RFpower() {
  const [rows, setRows] = useState([]);
  const [timestamp, setTimestamp] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  //下拉device選單
  const [listDeviceEui, setListDeviceEui] = useState([]);
  const [deviceEui, setDeviceEui] = useState("");
  const [devicesLoading, setDevicesLoading] = useState(true);
  const [devicesError, setDevicesError] = useState("");

  
  // 取得所有device資料
  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      setDevicesLoading(true);
      setDevicesError("");
      try {
        const url = apiUrl(`/amplifier/devices`);
        // const url = "http://61.216.140.11:9002/api/amplifier/devices";
        const res = await fetch(url, { method: "GET", signal: ac.signal });
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


  useEffect(() => {
    const ac = new AbortController();
    const fetchData = async () => {
      setLoading(true); setError("");
      try {
       const url = apiUrl(`/amplifier/rf-power/${encodeURIComponent(deviceEui)}/spectrum`);
      // const url = `http://61.216.140.11:9002/api/amplifier/rf-power/${deviceEui}/spectrum`;
        const res = await fetch(url, { method: "GET", signal: ac.signal });
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          throw new Error(`GET failed (${res.status}): ${t || res.statusText}`);
        }
        const json = await res.json();
        const spec = Array.isArray(json?.spectrum) ? json.spectrum.slice() : [];
        // sort by frequency so the lines are continuous from left to right
        spec.sort((a,b) => (a.frequency ?? 0) - (b.frequency ?? 0));
        setRows(spec);
        setTimestamp(json?.timestamp || "");
      } catch (err) {
        if (!ac.signal.aborted) setError(String(err?.message || err));
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    };
    fetchData();
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
    // add some padding
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
        <>
         {/* 下拉device選單 */}
         <select
            className="kpi-select"
            value={deviceEui}
            onChange={(e) => { setDeviceEui(e.target.value); }}
          >
            {listDeviceEui.map(id => <option key={id} value={id}>{id}</option>)}
          </select>
          </>
        <div style={infoStyles.meta}>Device: {deviceEui} · {timestamp ? new Date(timestamp).toLocaleString() : ""}</div>
      </div>
      <div style={{ height: 420 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="frequency"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(v) => `${v}`}
              label={{ value: "Frequency", position: "insideBottom", offset: -6 }}
            />
            <YAxis
              domain={yDomain}
              unit=" dBm"
              label={{ value: "Power (dBm)", angle: -90, position: "insideLeft" }}
            />
            <Tooltip
              formatter={(value, name) => {
                const label = name === "outputPower" ? "Output (dBm)" : name === "inputPower" ? "Input (dBm)" : name;
                return [typeof value === "number" ? value.toFixed(2) : value, label];
              }}
              labelFormatter={(f) => `Freq: ${f} `}
            />
            <Legend />
            <Line name="Output (dBm)" type="monotone" dataKey="outputPower" stroke={COLORS.out} dot={false} strokeWidth={2} />
            <Line name="Input (dBm)" type="monotone" dataKey="inputPower" stroke={COLORS.in} dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
