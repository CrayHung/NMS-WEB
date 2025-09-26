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
//   ReferenceLine,
// } from "recharts";
// import {
//   Form,
//   Row,
//   Col,
//   Card,
//   Button,
//   Spinner,
//   Badge,
//   InputGroup,
// } from "react-bootstrap";
// import { FiSend, FiRotateCcw, FiSliders, FiInfo } from "react-icons/fi";
// import { apiUrl, apiFetch } from "../../lib/api";

// /** ================== 常數 ================== **/
// const FREQ_LOW = 261;
// const FREQ_HIGH = 1791;
// const PILOT_LOW = 258;
// const PILOT_HIGH = 1794;
// const DFU_DISPLAY = "(1) 204/258";

// // 顏色：與 RFpower 對齊（Base），Current 用另一組色疊加
// const COLOR_BASE_IN = "#3b82f6";  // 藍色
// const COLOR_BASE_OUT = "#ef4444"; // 紅色
// const COLOR_CURR_IN = "#0ea5e9";  // 青色
// const COLOR_CURR_OUT = "#f59e0b"; // 橘色

// // 工具
// const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
// const to0p1dB = (d) => Math.round((d ?? 0) * 10);

// /** ================== 主元件 ================== **/
// export default function ExhibitSpectrumDemo() {
//   const [loadingDevices, setLoadingDevices] = useState(true);
//   const [devices, setDevices] = useState([]);
//   const [err, setErr] = useState("");
//   const [selectedEui, setSelectedEui] = useState("");

//   // 端點功率（dBmV）
//   const [lowPowerDb, setLowPowerDb] = useState(26.0);
//   const [highPowerDb, setHighPowerDb] = useState(40.0);

//   // Base / Current spectrum
//   const [baseSpec, setBaseSpec] = useState([]);     // 初次載入或切換設備時取得
//   const [baseTimestamp, setBaseTimestamp] = useState("");
//   const [currSpec, setCurrSpec] = useState([]);     // 送出參數後由後端回傳的新頻譜
//   const [currTimestamp, setCurrTimestamp] = useState("");
//   const [posting, setPosting] = useState(false);

//   /** 讀取裝置列表 **/
//   useEffect(() => {
//     let ac = new AbortController();
//     (async () => {
//       setLoadingDevices(true);
//       setErr("");
//       try {
//         const resp = await apiFetch("/amplifier/devices", { signal: ac.signal });
//         if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
//         const json = await resp.json();
//         const list = Array.isArray(json?.devices) ? json.devices : [];
//         setDevices(list);
//         if (list.length) setSelectedEui(list[0].deviceEui);
//       } catch (e) {
//         if (!ac.signal.aborted) setErr(String(e?.message || e));
//       } finally {
//         if (!ac.signal.aborted) setLoadingDevices(false);
//       }
//     })();
//     return () => ac.abort();
//   }, []);

//   /** 依設備載入 Base Spectrum（RFpower 的 API 路徑） **/
//   useEffect(() => {
//     if (!selectedEui) return;
//     let ac = new AbortController();
//     (async () => {
//       setErr("");
//       try {
//         const url = apiUrl(`/amplifier/rf-power/${encodeURIComponent(selectedEui)}/spectrum`);
//         const res = await fetch(url, { method: "GET", signal: ac.signal });
//         if (!res.ok) {
//           const t = await res.text().catch(() => "");
//           throw new Error(`GET spectrum failed (${res.status}): ${t || res.statusText}`);
//         }
//         const json = await res.json();
//         const spec = Array.isArray(json?.spectrum) ? json.spectrum.slice() : [];
//         // 按頻率排序 & 限定 261–1791 MHz
//         spec.sort((a, b) => (a.frequency ?? 0) - (b.frequency ?? 0));
//         const clipped = spec.filter(
//           (r) => typeof r.frequency === "number" && r.frequency >= FREQ_LOW && r.frequency <= FREQ_HIGH
//         );
//         setBaseSpec(clipped);
//         setBaseTimestamp(json?.timestamp || "");
//         // 切設備時先清空 current 疊圖
//         setCurrSpec([]);
//         setCurrTimestamp("");
//       } catch (e) {
//         if (!ac.signal.aborted) setErr(String(e?.message || e));
//       }
//     })();
//     return () => ac.abort();
//   }, [selectedEui]);

//   /** 合併 base / current 成圖表列 **/
//   const rows = useMemo(() => {
//     // 以頻率為 key 合併
//     const map = new Map();
//     for (const r of baseSpec) {
//       const f = r.frequency;
//       if (f < FREQ_LOW || f > FREQ_HIGH) continue;
//       map.set(f, {
//         frequency: f,
//         baseInput: r.inputPower ?? null,
//         baseOutput: r.outputPower ?? null,
//         currInput: null,
//         currOutput: null,
//       });
//     }
//     for (const r of currSpec) {
//       const f = r.frequency;
//       if (f < FREQ_LOW || f > FREQ_HIGH) continue;
//       const ex = map.get(f) || { frequency: f };
//       ex.currInput = r.inputPower ?? ex.currInput ?? null;
//       ex.currOutput = r.outputPower ?? ex.currOutput ?? null;
//       map.set(f, ex);
//     }
//     const arr = Array.from(map.values());
//     arr.sort((a, b) => a.frequency - b.frequency);
//     return arr;
//   }, [baseSpec, currSpec]);

//   /** Y 軸範圍（含 headroom） **/
//   const yDomain = useMemo(() => {
//     if (!rows.length) return ["auto", "auto"];
//     let min = Infinity, max = -Infinity;
//     for (const r of rows) {
//       for (const k of ["baseInput", "baseOutput", "currInput", "currOutput"]) {
//         const v = r[k];
//         if (typeof v === "number" && isFinite(v)) {
//           min = Math.min(min, v);
//           max = Math.max(max, v);
//         }
//       }
//     }
//     if (!isFinite(min) || !isFinite(max)) return ["auto", "auto"];
//     return [Math.floor(min - 3), Math.ceil(max + 3)];
//   }, [rows]);



//   /** 送出設定（期望後端回傳新的 spectrum） **/
//   async function handleSubmit() {
//     if (!selectedEui) return;
//     setPosting(true);
//     setErr("");
//     try {
//       const url = apiUrl(`/api/amplifier/settings/${encodeURIComponent(selectedEui)}`);
//       const payload = {
//         pilotLowFreqMHz: PILOT_LOW,
//         pilotHighFreqMHz: PILOT_HIGH,
//         outSetLow_261: to0p1dB(clamp(lowPowerDb, 0, 60)),   // 0.1dB 單位
//         outSetHigh_1791: to0p1dB(clamp(highPowerDb, 0, 60)) // 0.1dB 單位
//       };
//       const res = await fetch(url, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(payload),
//       });
//       if (!res.ok) {
//         const t = await res.text().catch(() => "");
//         throw new Error(`POST failed (${res.status}): ${t || res.statusText}`);
//       }
//       // 後端應回傳：{ deviceEui, spectrum: [...], timestamp? }
//       const j = await res.json();
//       const spec = Array.isArray(j?.spectrum) ? j.spectrum.slice() : [];
//       spec.sort((a, b) => (a.frequency ?? 0) - (b.frequency ?? 0));
//       const clipped = spec.filter(
//         (r) => typeof r.frequency === "number" && r.frequency >= FREQ_LOW && r.frequency <= FREQ_HIGH
//       );
//       setCurrSpec(clipped);
//       setCurrTimestamp(j?.timestamp || new Date().toISOString());
//     } catch (e) {
//       setErr(String(e?.message || e));
//     } finally {
//       setPosting(false);
//     }
//   }

//   function resetToDefault() {
//     setLowPowerDb(26.0);
//     setHighPowerDb(40.0);
//     setCurrSpec([]); // 清除疊圖
//     setCurrTimestamp("");
//   }

//   const selected = devices.find((d) => d.deviceEui === selectedEui);

//   /** ============== UI ============== **/
//   return (
//     <div className="container" style={{ padding: 16 }}>
//       {/* Header */}
//       <Card className="mb-3 shadow-sm" style={{ borderRadius: 16 }}>
//         <Card.Body>
//           <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
//             <div>
//               <h4 className="mb-1">Downlink Command Test Tool</h4>

//             </div>
//             <div className="d-flex align-items-center gap-2 flex-wrap">
//               <Badge bg="secondary" pill className="px-3 py-2">
//                 <span className="me-2">Forward Pilot</span>
//                 <span className="fw-semibold">{PILOT_LOW} MHz</span>
//                 <span className="mx-1">·</span>
//                 <span className="fw-semibold">{PILOT_HIGH} MHz</span>
//               </Badge>
//               <Badge bg="dark" pill className="px-3 py-2">
//                 DFU Type <span className="ms-2 fw-semibold">{DFU_DISPLAY}</span>
//               </Badge>

//             </div>
//           </div>
//         </Card.Body>
//       </Card>

//       <Row className="g-3">
//         {/* 左側控制面板 */}
//         <Col lg={4}>
//           <Card className="h-100 shadow-sm" style={{ borderRadius: 16 }}>
//             <Card.Header className="bg-white" style={{ borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
//               <div className="d-flex align-items-center gap-2">
//                 <FiSliders />
//                 <span className="fw-semibold">Control Panel</span>
//               </div>
//             </Card.Header>
//             <Card.Body>
//               <Form.Group className="mb-3">
//                 <Form.Label className="fw-semibold">Select Device</Form.Label>
//                 {loadingDevices ? (
//                   <div><Spinner size="sm" /> Loading…</div>
//                 ) : err ? (
//                   <div style={{ color: "crimson" }}>Load devices failed: {err}</div>
//                 ) : (
//                   <Form.Select
//                     value={selectedEui}
//                     onChange={(e) => setSelectedEui(e.target.value)}
//                   >
//                     {devices.map((d) => (
//                       <option key={d.deviceEui} value={d.deviceEui}>
//                         {(d.partName || d.partNumber) + " — " + d.deviceEui}
//                       </option>
//                     ))}
//                   </Form.Select>
//                 )}
//                 {selected && (
//                   <div className="text-muted mt-2" style={{ fontSize: 12 }}>
//                     <FiInfo className="me-1" />
//                     Voltage {selected.voltage ?? "-"}V · Temp {selected.temperature ?? "-"}°C
//                   </div>
//                 )}
//               </Form.Group>

//               <div className="mb-4 p-3 border rounded-3">
//                 <div className="fw-semibold mb-2">Low Power（@261 MHz）</div>
//                 <InputGroup className="mb-2">
//                   <Form.Control
//                     type="number"
//                     step="0.1"
//                     min="20"
//                     max="30"
//                     value={lowPowerDb}
//                     onChange={(e) => setLowPowerDb(Number(e.target.value))}
//                   />
//                   <InputGroup.Text>dBmV</InputGroup.Text>
//                 </InputGroup>
//                 <Form.Range
//                   min={20}
//                   max={30}
//                   step={0.1}
//                   value={lowPowerDb}
//                   onChange={(e) => setLowPowerDb(Number(e.target.value))}
//                 />
//               </div>

//               <div className="mb-4 p-3 border rounded-3">
//                 <div className="fw-semibold mb-2">High Power（@1791 MHz）</div>
//                 <InputGroup className="mb-2">
//                   <Form.Control
//                     type="number"
//                     step="0.1"
//                     min="35"
//                     max="45"
//                     value={highPowerDb}
//                     onChange={(e) => setHighPowerDb(Number(e.target.value))}
//                   />
//                   <InputGroup.Text>dBmV</InputGroup.Text>
//                 </InputGroup>
//                 <Form.Range
//                   min={35}
//                   max={45}
//                   step={0.1}
//                   value={highPowerDb}
//                   onChange={(e) => setHighPowerDb(Number(e.target.value))}
//                 />
//               </div>

//               <div className="d-flex gap-2">
//                 <Button
//                   variant="primary"
//                   className="flex-grow-1"
//                   onClick={handleSubmit}
//                   disabled={posting || !selectedEui}
//                 >
//                   {posting ? "Sending…" : (<><FiSend className="me-2" />Send</>)}
//                 </Button>
//                 <Button variant="outline-secondary" onClick={resetToDefault}>
//                   <FiRotateCcw className="me-2" />
//                   Reset & Clear Overlay
//                 </Button>
//               </div>

//               {err && (
//                 <div className="text-danger mt-3" style={{ fontSize: 12 }}>
//                   {err}
//                 </div>
//               )}
//             </Card.Body>
//           </Card>
//         </Col>

//         {/* 右側圖表 */}
//         <Col lg={8}>
//           <Card className="h-100 shadow-sm" style={{ borderRadius: 16 }}>
//             <Card.Header
//               className="bg-white d-flex align-items-center justify-content-between"
//               style={{ borderTopLeftRadius: 16, borderTopRightRadius: 16 }}
//             >
//               <span className="fw-semibold">261–1791 MHz Spectrum</span>
//               <div className="text-muted" style={{ fontSize: 12 }}>
//                 Base: {baseTimestamp ? new Date(baseTimestamp).toLocaleString() : "-"}
//                 {currTimestamp && <> · Current: {new Date(currTimestamp).toLocaleString()}</>}
//               </div>
//             </Card.Header>
//             <Card.Body style={{ height: 460 }}>
//               <ResponsiveContainer width="100%" height="100%">
//                 <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
//                   <CartesianGrid strokeDasharray="3 3" />
//                   <XAxis
//                     dataKey="frequency"
//                     type="number"
//                     domain={[FREQ_LOW, FREQ_HIGH]}
//                     tickFormatter={(v) => `${v} MHz`}
//                     interval="preserveStartEnd"
//                     minTickGap={24}
//                   />
//                   <YAxis
//                     domain={yDomain}
//                     tickFormatter={(v) => `${Number(v).toFixed(1)} dBmV`}
//                     width={72}
//                   />
//                   <Tooltip
//                     formatter={(v, name) => [
//                       typeof v === "number" ? `${v.toFixed(2)} dBmV` : v,
//                       name
//                         .replace("baseInput", "Input (base)")
//                         .replace("baseOutput", "Output (base)")
//                         .replace("currInput", "Input (current)")
//                         .replace("currOutput", "Output (current)"),
//                     ]}
//                     labelFormatter={(l) => `Freq: ${l} MHz`}
//                   />
//                   <Legend />

//                   {/* 端點參考線 */}
//                   <ReferenceLine x={261} stroke="#94a3b8" strokeDasharray="4 4" ifOverflow="extendDomain" />
//                   <ReferenceLine x={1791} stroke="#94a3b8" strokeDasharray="4 4" ifOverflow="extendDomain" />

//                   {/* Base：顏色與 RFpower 一致 */}
//                   <Line
//                     name="baseInput"
//                     type="monotone"
//                     dataKey="baseInput"
//                     dot={false}
//                     stroke={COLOR_BASE_IN}
//                     strokeWidth={2}
//                     connectNulls
//                   />
//                   <Line
//                     name="baseOutput"
//                     type="monotone"
//                     dataKey="baseOutput"
//                     dot={false}
//                     stroke={COLOR_BASE_OUT}
//                     strokeWidth={2}
//                     connectNulls
//                   />

//                   {/* Current 疊圖：另一組色 */}
//                   {currSpec.length > 0 && (
//                     <>
//                       <Line
//                         name="currInput"
//                         type="monotone"
//                         dataKey="currInput"
//                         dot={false}
//                         stroke={COLOR_CURR_IN}
//                         strokeWidth={2}
//                         strokeDasharray="6 6"
//                         connectNulls
//                       />
//                       <Line
//                         name="currOutput"
//                         type="monotone"
//                         dataKey="currOutput"
//                         dot={false}
//                         stroke={COLOR_CURR_OUT}
//                         strokeWidth={3}
//                         connectNulls
//                       />
//                     </>
//                   )}
//                 </LineChart>
//               </ResponsiveContainer>
//             </Card.Body>
//           </Card>
//         </Col>
//       </Row>
//     </div>
//   );
// }


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
  ReferenceLine,
} from "recharts";
import {
  Form,
  Row,
  Col,
  Card,
  Button,
  Spinner,
  Badge,
  InputGroup,
} from "react-bootstrap";
import { FiSend, FiRotateCcw, FiSliders, FiInfo } from "react-icons/fi";
import { apiUrl, apiFetch } from "../../lib/api";

/** ================== 常數 ================== **/
const FREQ_LOW = 261;
const FREQ_HIGH = 1791;
const PILOT_LOW = 258;
const PILOT_HIGH = 1794;
const DFU_DISPLAY = "(1) 204/258";

// 顏色（對齊 RFpower；Current 用橘色）
const COLOR_BASE_IN = "#3b82f6";  // Base Input 藍
const COLOR_BASE_OUT = "#ef4444"; // Base Output 紅
const COLOR_CURR_OUT = "#f59e0b"; // Current Output 橘

// 小工具
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** ================== 主元件 ================== **/
export default function ExhibitSpectrumDemo() {
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [devices, setDevices] = useState([]);
  const [err, setErr] = useState("");
  const [selectedEui, setSelectedEui] = useState("");

  // 端點功率（dBmV）
  const [lowPowerDb, setLowPowerDb] = useState(26.0);
  const [highPowerDb, setHighPowerDb] = useState(40.0);

  // Base / Current spectrum
  const [baseSpec, setBaseSpec] = useState([]);     // 進頁面/換設備時取一次
  const [baseTimestamp, setBaseTimestamp] = useState("");
  const [currSpec, setCurrSpec] = useState([]);     // 模擬送出後回來的新曲線（假資料）
  const [currTimestamp, setCurrTimestamp] = useState("");
  const [posting, setPosting] = useState(false);

  /** 讀取裝置列表 **/
  useEffect(() => {
    let ac = new AbortController();
    (async () => {
      setLoadingDevices(true);
      setErr("");
      try {
        const resp = await apiFetch("/amplifier/devices", { signal: ac.signal });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const json = await resp.json();
        const list = Array.isArray(json?.devices) ? json.devices : [];
        setDevices(list);
        if (list.length) setSelectedEui(list[0].deviceEui);
      } catch (e) {
        if (!ac.signal.aborted) setErr(String(e?.message || e));
      } finally {
        if (!ac.signal.aborted) setLoadingDevices(false);
      }
    })();
    return () => ac.abort();
  }, []);

  /** 依設備載入 Base Spectrum（與 RFpower 相同 API） **/
  useEffect(() => {
    if (!selectedEui) return;
    let ac = new AbortController();
    (async () => {
      setErr("");
      try {
        const url = apiUrl(`/amplifier/rf-power/${encodeURIComponent(selectedEui)}/spectrum`);
        const res = await fetch(url, { method: "GET", signal: ac.signal });
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          throw new Error(`GET spectrum failed (${res.status}): ${t || res.statusText}`);
        }
        const json = await res.json();
        const spec = Array.isArray(json?.spectrum) ? json.spectrum.slice() : [];
        // 排序＋限制 261–1791 MHz
        spec.sort((a, b) => (a.frequency ?? 0) - (b.frequency ?? 0));
        const clipped = spec.filter(
          (r) => typeof r.frequency === "number" && r.frequency >= FREQ_LOW && r.frequency <= FREQ_HIGH
        );
        setBaseSpec(clipped);
        setBaseTimestamp(json?.timestamp || "");
        // 切設備時清掉 current 疊圖
        setCurrSpec([]);
        setCurrTimestamp("");
      } catch (e) {
        if (!ac.signal.aborted) setErr(String(e?.message || e));
      }
    })();
    return () => ac.abort();
  }, [selectedEui]);

  /** 把 base/current 合併成圖表列 **/
  const rows = useMemo(() => {
    const map = new Map();
    for (const r of baseSpec) {
      const f = r.frequency;
      if (f < FREQ_LOW || f > FREQ_HIGH) continue;
      map.set(f, {
        frequency: f,
        baseInput: r.inputPower ?? null,
        baseOutput: r.outputPower ?? null,
        currOutput: null,
      });
    }
    for (const r of currSpec) {
      const f = r.frequency;
      if (f < FREQ_LOW || f > FREQ_HIGH) continue;
      const ex = map.get(f) || { frequency: f };
      ex.currOutput = r.outputPower ?? ex.currOutput ?? null;
      map.set(f, ex);
    }
    const arr = Array.from(map.values());
    arr.sort((a, b) => a.frequency - b.frequency);
    return arr;
  }, [baseSpec, currSpec]);

  /** Y 軸範圍（含 headroom） **/
  const yDomain = useMemo(() => {
    if (!rows.length) return ["auto", "auto"];
    let min = Infinity, max = -Infinity;
    for (const r of rows) {
      for (const k of ["baseInput", "baseOutput", "currOutput"]) {
        const v = r[k];
        if (typeof v === "number" && isFinite(v)) {
          min = Math.min(min, v);
          max = Math.max(max, v);
        }
      }
    }
    if (!isFinite(min) || !isFinite(max)) return ["auto", "auto"];
    return [Math.floor(min - 3), Math.ceil(max + 3)];
  }, [rows]);

  /** 取得 base 端點值（@261 / @1791），若沒有精確點就用最近點替代 **/
  function getBaseEndpoint(dbKey, freqWanted) {
    if (!baseSpec.length) return null;
    // 找最接近 freqWanted 的點
    let best = null, bestDiff = Infinity;
    for (const r of baseSpec) {
      const df = Math.abs((r.frequency ?? 0) - freqWanted);
      if (df < bestDiff) {
        bestDiff = df;
        best = r;
      }
    }
    return best ? (best[dbKey] ?? null) : null;
  }

  /** 送出：這裡用「假資料」即時產生 current output 疊圖 **/
  async function handleSubmit() {
    if (!baseSpec.length) return; // 沒 base 就不做

    alert(" ~~先作假的看效果~~");
    setPosting(true);
    setErr("");
    try {
      // 1) 找 base 的兩端點（用 base output）
      const baseLowAt261 = getBaseEndpoint("outputPower", 261);
      const baseHighAt1791 = getBaseEndpoint("outputPower", 1791);

      // 若沒有端點，先用全段平均值當退路
      const fallback = baseSpec.reduce((s, r) => s + (r.outputPower ?? 0), 0) / Math.max(1, baseSpec.length);
      const baseLow = typeof baseLowAt261 === "number" ? baseLowAt261 : fallback;
      const baseHigh = typeof baseHighAt1791 === "number" ? baseHighAt1791 : fallback;

      // 2) 使用者目標端點（clamp 到 0~60 dBmV）
      const targetLow = clamp(lowPowerDb, 0, 60);
      const targetHigh = clamp(highPowerDb, 0, 60);

      // 3) 做線性端點差值，並加入一點小抖動（±0.15 dB）
      const span = FREQ_HIGH - FREQ_LOW;
      const jitter = () => (Math.random() - 0.5) * 0.3; // ±0.15 dB

      const simulated = baseSpec.map((r) => {
        const f = r.frequency;
        const t = span > 0 ? (f - FREQ_LOW) / span : 0;
        const baseOut = r.outputPower ?? 0;
        const endShift = (targetLow - baseLow) * (1 - t) + (targetHigh - baseHigh) * t;
        const currOut = baseOut + endShift + jitter();
        return {
          frequency: f,
          // 這次只畫 current output（不畫 current input）
          outputPower: currOut,
        };
      });

      // 4) 套用到畫面
      setCurrSpec(simulated);
      setCurrTimestamp(new Date().toISOString());

      // === 如果你要改成「真的打 API」：
      // const url = apiUrl(`/firmware/settings/${encodeURIComponent(selectedEui)}`);
      // const payload = {
      //   pilotLowFreqMHz: PILOT_LOW,
      //   pilotHighFreqMHz: PILOT_HIGH,
      //   outSetLow_261: Math.round(targetLow * 10),   // 0.1dB
      //   outSetHigh_1791: Math.round(targetHigh * 10) // 0.1dB
      // };
      // const res = await fetch(url, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(payload) });
      // const j = await res.json(); // { spectrum: [...] }
      // setCurrSpec(j.spectrum);
      // setCurrTimestamp(j.timestamp || new Date().toISOString());
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setPosting(false);
    }
  }

  function resetToDefault() {
    setLowPowerDb(26.0);
    setHighPowerDb(40.0);
    setCurrSpec([]); // 清掉疊圖
    setCurrTimestamp("");
  }

  const selected = devices.find((d) => d.deviceEui === selectedEui);

  /** ============== UI ============== **/
  return (
    <div className="container" style={{ padding: 16 }}>
      {/* Header */}
      <Card className="mb-3 shadow-sm" style={{ borderRadius: 16 }}>
        <Card.Body>
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
            <div>
              <h4 className="mb-1">Downlink Command Test Tool</h4>

            </div>
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <Badge bg="secondary" pill className="px-3 py-2">
                <span className="me-2">Forward Pilot</span>
                <span className="fw-semibold">{PILOT_LOW} MHz</span>
                <span className="mx-1">·</span>
                <span className="fw-semibold">{PILOT_HIGH} MHz</span>
              </Badge>
              <Badge bg="dark" pill className="px-3 py-2">
                DFU Type <span className="ms-2 fw-semibold">{DFU_DISPLAY}</span>
              </Badge>

            </div>
          </div>
        </Card.Body>
      </Card>

      <Row className="g-3">
        {/* 左側控制面板 */}
        <Col lg={4}>
          <Card className="h-100 shadow-sm" style={{ borderRadius: 16 }}>
            <Card.Header className="bg-white" style={{ borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
              <div className="d-flex align-items-center gap-2">

                <span className="fw-semibold">Control Panel</span>
              </div>
            </Card.Header>
            <Card.Body>
              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold">Select Device</Form.Label>
                {loadingDevices ? (
                  <div><Spinner size="sm" /> Loading…</div>
                ) : err ? (
                  <div style={{ color: "crimson" }}>Load devices failed: {err}</div>
                ) : (
                  <Form.Select
                    value={selectedEui}
                    onChange={(e) => setSelectedEui(e.target.value)}
                  >
                    {devices.map((d) => (
                      <option key={d.deviceEui} value={d.deviceEui}>
                        {(d.partName || d.partNumber) + " — " + d.deviceEui}
                      </option>
                    ))}
                  </Form.Select>
                )}
              </Form.Group>

              <div className="mb-4 p-3 border rounded-3">
                <div className="fw-semibold mb-2">Low Power（@261 MHz）</div>
                <InputGroup className="mb-2">
                  <Form.Control
                    type="number"
                    step="0.1"
                    min="0"
                    max="60"
                    value={lowPowerDb}
                    onChange={(e) => setLowPowerDb(Number(e.target.value))}
                  />
                  <InputGroup.Text>dBmV</InputGroup.Text>
                </InputGroup>
                <Form.Range
                  min={20}
                  max={30}
                  step={0.1}
                  value={lowPowerDb}
                  onChange={(e) => setLowPowerDb(Number(e.target.value))}
                />
              </div>

              <div className="mb-4 p-3 border rounded-3">
                <div className="fw-semibold mb-2">High Power（@1791 MHz）</div>
                <InputGroup className="mb-2">
                  <Form.Control
                    type="number"
                    step="0.1"
                    min="0"
                    max="60"
                    value={highPowerDb}
                    onChange={(e) => setHighPowerDb(Number(e.target.value))}
                  />
                  <InputGroup.Text>dBmV</InputGroup.Text>
                </InputGroup>
                <Form.Range
                  min={35}
                  max={45}
                  step={0.1}
                  value={highPowerDb}
                  onChange={(e) => setHighPowerDb(Number(e.target.value))}
                />
              </div>

              <div className="d-flex gap-2">
                <Button
                  variant="primary"
                  className="flex-grow-1"
                  onClick={handleSubmit}
                  disabled={posting || !selectedEui || !baseSpec.length}
                >
                  {posting ? "Sending…" : (<><FiSend className="me-2" />Send </>)}
                </Button>
                <Button variant="outline-secondary" onClick={resetToDefault}>
                  <FiRotateCcw className="me-2" />
                  Reset & Clear Overlay
                </Button>
              </div>

              {err && (
                <div className="text-danger mt-3" style={{ fontSize: 12 }}>
                  {err}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* 右側圖表 */}
        <Col lg={8}>
          <Card className="h-100 shadow-sm" style={{ borderRadius: 16 }}>
            <Card.Body style={{ height: 460 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={rows}
                  // ↑ 增加四周外距，避免刻度被卡住
                  margin={{ top: 20, right: 24, bottom: 28, left: 12 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />

                  <XAxis
                    dataKey="frequency"
                    type="number"
                    domain={[FREQ_LOW, FREQ_HIGH]}
                    tickFormatter={(v) => `${v} MHz`}
                    interval="preserveStartEnd"
                    minTickGap={24}
                    // ↓ 讓第一個刻度不要貼著 Y 軸，避開左下角重疊
                    padding={{ left: 14, right: 14 }}
                    // ↓ 與軸線保持距離，避免文字壓在一起
                    tickMargin={12}
                  />

                  <YAxis
                    domain={yDomain}
                    tickFormatter={(v) => `${Number(v).toFixed(1)} dBmV`}
                    // ↓ 預留寬度，避免長單位文字被吃掉
                    width={86}
                    // ↓ 與軸線保持距離
                    tickMargin={10}
                    // ↓ 上下加緩衝，避免頂部/底部刻度被裁切
                    padding={{ top: 12, bottom: 12 }}
                    allowDecimals
                  />

                  <Tooltip
                    formatter={(v, name) => [
                      typeof v === "number" ? `${v.toFixed(2)} dBmV` : v,
                      name
                        .replace("baseInput", "Input (base)")
                        .replace("baseOutput", "Output (base)")
                        .replace("currOutput", "Output (current)"),
                    ]}
                    labelFormatter={(l) => `Freq: ${l} MHz`}
                    wrapperStyle={{ zIndex: 1 }}
                  />
                  <Legend />

                  <ReferenceLine x={261} stroke="#94a3b8" strokeDasharray="4 4" ifOverflow="extendDomain" />
                  <ReferenceLine x={1791} stroke="#94a3b8" strokeDasharray="4 4" ifOverflow="extendDomain" />

                  <Line
                    name="baseInput"
                    type="monotone"
                    dataKey="baseInput"
                    dot={false}
                    stroke="#3b82f6"
                    strokeWidth={2}
                    connectNulls
                  />
                  <Line
                    name="baseOutput"
                    type="monotone"
                    dataKey="baseOutput"
                    dot={false}
                    stroke="#ef4444"
                    strokeWidth={2}
                    connectNulls
                  />
                  {currSpec.length > 0 && (
                    <Line
                      name="currOutput"
                      type="monotone"
                      dataKey="currOutput"
                      dot={false}
                      stroke="#f59e0b"
                      strokeWidth={3}
                      connectNulls
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </Card.Body>

          </Card>
        </Col>
      </Row>
    </div>
  );
}
