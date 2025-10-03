// import React, { useState, useEffect, useMemo,useRef } from 'react';
// import {
//   Card, Form, Button, Alert, Row, Col, Spinner, Badge, ProgressBar, InputGroup
// } from 'react-bootstrap';
// import {
//   LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
//   ResponsiveContainer, ReferenceLine
// } from 'recharts';
// import { amplifierAPI } from './api';
// import wsService from '../../service/websocket';
// import { FiSend, FiRotateCcw, FiInfo } from 'react-icons/fi';


// // 1) 新增在檔案上方（import 後）——共用小工具
// const sleep = (ms) => new Promise(r => setTimeout(r, ms));
// const sameEui = (a,b)=>String(a||'').toLowerCase()===String(b||'').toLowerCase();



// const FREQ_LOW = 261;
// const FREQ_HIGH = 1791;
// const COLOR_INIT_OUT = '#ef4444'; // 初始輸出（紅）
// const COLOR_Q_OUT = '#3b82f6';    // 查詢輸出（藍）
// const PILOT_LOW = 258;
// const PILOT_HIGH = 1794;
// const DFU_DISPLAY = '(1) 204/258';

// // 展示圖只畫 Output：initial vs queried
// export default function ExhibitSpectrumDemo() {
//   // Device
//   const [devices, setDevices] = useState([]);
//   const [selectedDevice, setSelectedDevice] = useState('');

//   // Settings
//   const [lowDb, setLowDb] = useState(30.0);
//   const [highDb, setHighDb] = useState(45.0);
//   const [settingInProgress, setSettingInProgress] = useState(false);
//   const [settingsApplied, setSettingsApplied] = useState(false); // 控制 Query 按鈕顯示

//   // RF data
//   const [initialRfData, setInitialRfData] = useState([]);  // [{frequency, initialOutputPower}]
//   const [queriedRfData, setQueriedRfData] = useState([]);  // [{frequency, queriedOutputPower}]
//   const [queryInProgress, setQueryInProgress] = useState(false);
//   const [rfProgress, setRfProgress] = useState({ isCollecting: false, currentPart: '', completedParts: [], totalParts: 6 });

//   // System
//   const [message, setMessage] = useState(null);
//   const [loading, setLoading] = useState(false);

//   // ===== helpers =====
//   const sameEui = (a, b) => String(a || '').toLowerCase() === String(b || '').toLowerCase();



// // 2) 在 component 內新增：追蹤 ACK 與 WS handler（如果你已經在別處訂了 /topic/command-response，可以沿用）
// const lowAckRef = useRef(false);
// useEffect(() => {
//   const onCR = (msg) => {
//     const eui = msg?.responseData?.deviceEui || msg?.deviceEui;
//     if (!sameEui(eui, selectedDevice)) return;
//     // 收到任一 command-response 就當 Low 已被處理
//     lowAckRef.current = true;
//   };
//   wsService.subscribe('/topic/command-response', onCR);
//   return () => wsService.unsubscribe('/topic/command-response', onCR);
// }, [selectedDevice]);

// // 3) Drop-in：409 退避重試包裝
// async function setSettingWithRetry(eui, body, { attempts=8, base=800 } = {}) {
//   for (let i=1; i<=attempts; i++) {
//     try {
//       await amplifierAPI.setDeviceSettings(eui, body); // 你現有的 axios 呼叫
//       return;
//     } catch (err) {
//       const status = err?.response?.status;
//       if (status !== 409) throw err;                 // 非 409 直接拋出
//       const delay = Math.min(base * Math.pow(1.7, i-1), 7000);  // 指數退避上限 7s
//       // 可加一點抖動避免撞車
//       await sleep(delay + Math.floor(Math.random()*120));
//     }
//   }
//   // 全數重試失敗
//   throw new Error('Device is busy after multiple attempts (409).');
// }




//   const lineRows = useMemo(() => {
//     const map = new Map();
//     initialRfData.forEach(d => {
//       if (d.frequency < FREQ_LOW || d.frequency > FREQ_HIGH) return;
//       map.set(d.frequency, { frequency: d.frequency, initialOutputPower: d.initialOutputPower ?? null, queriedOutputPower: null });
//     });
//     queriedRfData.forEach(d => {
//       if (d.frequency < FREQ_LOW || d.frequency > FREQ_HIGH) return;
//       const ex = map.get(d.frequency) || { frequency: d.frequency };
//       ex.queriedOutputPower = d.queriedOutputPower ?? ex.queriedOutputPower ?? null;
//       map.set(d.frequency, ex);
//     });
//     return Array.from(map.values()).sort((a, b) => a.frequency - b.frequency);
//   }, [initialRfData, queriedRfData]);

//   const yDomain = useMemo(() => {
//     if (!lineRows.length) return ['auto', 'auto'];
//     let min = Infinity, max = -Infinity;
//     lineRows.forEach(r => {
//       ['initialOutputPower', 'queriedOutputPower'].forEach(k => {
//         const v = r[k];
//         if (typeof v === 'number' && isFinite(v)) {
//           min = Math.min(min, v);
//           max = Math.max(max, v);
//         }
//       });
//     });
//     if (!isFinite(min) || !isFinite(max)) return ['auto', 'auto'];
//     return [Math.floor(min - 3), Math.ceil(max + 3)];
//   }, [lineRows]);

//   // ===== init devices + ws =====
//   useEffect(() => {
//     (async () => {
//       try {
//         const res = await amplifierAPI.getAllDevices();
//         if (res?.devices?.length) {
//           setDevices(res.devices);
//           setSelectedDevice(res.devices[0].deviceEui);
//         }
//       } catch (e) {
//         console.error(e);
//         setMessage({ type: 'danger', text: 'Failed to load device list.' });
//       }
//     })();
//   }, []);

//   useEffect(() => {
//     if (!selectedDevice) return;
//     // WS handlers
//     const onProgress = (data) => {
//       if (!sameEui(data?.deviceEui, selectedDevice)) return;
//       setRfProgress({
//         isCollecting: true,
//         currentPart: data.currentPart || '',
//         completedParts: data.completedParts || [],
//         totalParts: 6
//       });
//     };
//     const onComplete = (data) => {
//       if (!sameEui(data?.deviceEui, selectedDevice)) return;
//       // merge OUTPUT_PART_* to line format
//       const outParts = Object.values(data?.outputPower || {});
//       const freqSet = new Set();
//       outParts.forEach(p => Object.keys(p || {}).forEach(f => freqSet.add(+f)));
//       const arr = Array.from(freqSet).sort((a, b) => a - b).map(f => {
//         let op = null;
//         outParts.forEach(p => { if (p && p[f] != null) op = p[f]; });
//         return { frequency: f, queriedOutputPower: op };
//       }).filter(r => r.frequency >= FREQ_LOW && r.frequency <= FREQ_HIGH);

//       setQueriedRfData(arr);
//       setRfProgress({ isCollecting: false, currentPart: '', completedParts: [], totalParts: 6 });
//       setQueryInProgress(false);
//       setMessage(
//         data?.status === 'timeout'
//           ? { type: 'warning', text: `RF Power incomplete (${(data?.receivedParts || []).length}/6)` }
//           : { type: 'success', text: 'RF Power data query complete.' }
//       );
//     };

//     wsService.connect(() => {
//       wsService.subscribe('/topic/rf-power-progress', onProgress);
//       wsService.subscribe('/topic/rf-power-complete', onComplete);
//       // 也可監聽 /topic/command-response 顯示設定回覆（非必要）
//     });

//     return () => {
//       wsService.unsubscribe('/topic/rf-power-progress');
//       wsService.unsubscribe('/topic/rf-power-complete');
//     };
//   }, [selectedDevice]);

//   // load baseline when device changes
//   useEffect(() => {
//     if (!selectedDevice) return;
//     (async () => {
//       setQueriedRfData([]);
//       setSettingsApplied(false);
//       try {
//         setLoading(true);
//         const res = await amplifierAPI.getRFPowerSpectrum(selectedDevice);
//         if (Array.isArray(res?.spectrum)) {
//           const formatted = res.spectrum
//             .filter(p => typeof p.frequency === 'number' && p.frequency >= FREQ_LOW && p.frequency <= FREQ_HIGH)
//             .map(p => ({ frequency: p.frequency, initialOutputPower: p.outputPower ?? null }))
//             .sort((a, b) => a.frequency - b.frequency);
//           setInitialRfData(formatted);
//         } else {
//           setInitialRfData([]);
//         }
//       } catch (e) {
//         console.error(e);
//         setMessage({ type: 'warning', text: 'Failed to load baseline RF spectrum.' });
//       } finally {
//         setLoading(false);
//       }
//     })();
//   }, [selectedDevice]);

//   // ===== actions =====
//   // const sendSettings = async () => {
//   //   if (!selectedDevice) return;
//   //   setSettingInProgress(true);
//   //   setSettingsApplied(false);
//   //   setMessage({ type: 'info', text: 'Sending settings… (backend allows one field per request)' });

//   //   try {
//   //     // 低 → 高（一次只能改一個欄位）
//   //     await amplifierAPI.setDeviceSettings(selectedDevice, { fwdLoadingPowerLow: parseFloat(lowDb) });
//   //     // 簡單緩衝
//   //     await new Promise(r => setTimeout(r, 300));
//   //     await amplifierAPI.setDeviceSettings(selectedDevice, { fwdLoadingPowerHigh: parseFloat(highDb) });

//   //     setSettingInProgress(false);
//   //     setSettingsApplied(true); // ← 成功後才顯示 Query 按鈕
//   //     setMessage({ type: 'success', text: `Settings applied successfully! Low: ${lowDb} dBmV, High: ${highDb} dBmV` });
//   //   } catch (e) {
//   //     console.error(e);
//   //     setSettingInProgress(false);
//   //     setSettingsApplied(false);
//   //     setMessage({ type: 'danger', text: e?.response?.data?.message || e.message || 'Failed to apply settings' });
//   //   }
//   // };
//   // 4) 取代你原本的 sendSettings
// const sendSettings = async () => {
//   if (!selectedDevice) return;
//   setMessage({ type:'info', text:'Sending settings…' });
//   setSettingInProgress(true);
//   lowAckRef.current = false;

//   try {
//     // (a) 先送 Low
//     await setSettingWithRetry(selectedDevice, { fwdLoadingPowerLow: parseFloat(lowDb) }, { attempts: 3, base: 600 });

//     // (b) 等 ACK 或備援 5 秒（有 WS 就靠 WS，沒來就單純等）
//     const start = Date.now();
//     while (!lowAckRef.current && Date.now() - start < 5000) {
//       await sleep(150);
//     }

//     // (c) 再送 High（這筆最容易撞 409，用多一點次數）
//     await setSettingWithRetry(selectedDevice, { fwdLoadingPowerHigh: parseFloat(highDb) }, { attempts: 8, base: 900 });

//     setSettingsApplied(true); // ← 成功才顯示「Query RF Power」按鈕
//     setMessage({ type:'success', text:`Settings applied successfully! Low: ${lowDb} dBmV, High: ${highDb} dBmV` });
//   } catch (e) {
//     console.error('Send settings failed:', e);
//     setSettingsApplied(false);
//     // 後端會回 {"message":"Device ... is busy or unavailable"}；友善顯示
//     const t = e?.response?.data?.message || e.message || 'Failed to apply settings';
//     setMessage({ type:'danger', text: t });
//   } finally {
//     setSettingInProgress(false);
//   }
// };

//   const queryRfPower = async () => {
//     if (!selectedDevice) return;
//     setQueryInProgress(true);
//     setMessage({ type: 'info', text: 'Querying RF Power data…' });
//     setRfProgress({ isCollecting: true, currentPart: '', completedParts: [], totalParts: 6 });
//     setQueriedRfData([]);
//     try {
//       await amplifierAPI.queryAllRFPower(selectedDevice);
//       // await amplifierAPI.queryRfPowerAll(selectedDevice);
//     } catch (e) {
//       console.error(e);
//       setQueryInProgress(false);
//       setRfProgress({ isCollecting: false, currentPart: '', completedParts: [], totalParts: 6 });
//       setMessage({ type: 'danger', text: e?.response?.data?.message || e.message || 'Query failed' });
//     }
//   };

//   const resetLocal = () => {
//     setLowDb(30.0);
//     setHighDb(45.0);
//     setQueriedRfData([]);
//     setSettingsApplied(false);
//     setMessage(null);
//   };

//   return (
//     <div className="container" style={{ padding: 16 }}>
//       {/* Header */}
//       <Card className="mb-3 shadow-sm" style={{ borderRadius: 16 }}>
//         <Card.Body>
//           <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
//             <div>
//               <h4 className="mb-1">Downlink Command — Exhibit UI</h4>
//               <div className="text-muted" style={{ fontSize: 12 }}>
//                 Baseline points: {initialRfData.length} · Queried points: {queriedRfData.length}
//               </div>
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
//         {/* 左側：控制面板 */}
//         <Col lg={4}>
//           <Card className="h-100 shadow-sm" style={{ borderRadius: 16 }}>
//             <Card.Header className="bg-white" style={{ borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
//               <div className="d-flex align-items-center gap-2">
//                 <span className="fw-semibold">Control Panel</span>
//               </div>
//             </Card.Header>
//             <Card.Body>
//               <Form.Group className="mb-3">
//                 <Form.Label className="fw-semibold">Select Device</Form.Label>
//                 <Form.Select
//                   value={selectedDevice}
//                   onChange={(e) => setSelectedDevice(e.target.value)}
//                   disabled={loading || settingInProgress || queryInProgress}
//                 >
//                   <option value="">Select a device…</option>
//                   {devices.map(device => (
//                     <option key={device.deviceEui} value={device.deviceEui}>
//                       {(device.partName || device.partNumber || 'Device')} — {device.deviceEui}-{device.onlineStatus?'offline':'online'}
//                     </option>
//                   ))}
//                 </Form.Select>
//               </Form.Group>

//               {/* Low/High */}
//               <div className="mb-4 p-3 border rounded-3">
//                 <div className="fw-semibold mb-2">FWD Power @ Low Freq (261 MHz)</div>
//                 <InputGroup className="mb-2">
//                   <Form.Control
//                     type="number" step="0.1" min="20" max="40"
//                     value={lowDb}
//                     onChange={(e) => setLowDb(Number(e.target.value))}
//                     disabled={settingInProgress}
//                   />
//                   <InputGroup.Text>dBmV (20–40)</InputGroup.Text>
//                 </InputGroup>
//                 <Form.Range min={20} max={40} step={0.1} value={lowDb} onChange={(e) => setLowDb(Number(e.target.value))} disabled={settingInProgress} />
//               </div>

//               <div className="mb-4 p-3 border rounded-3">
//                 <div className="fw-semibold mb-2">FWD Power @ High Freq (1791 MHz)</div>
//                 <InputGroup className="mb-2">
//                   <Form.Control
//                     type="number" step="0.1" min="35" max="55"
//                     value={highDb}
//                     onChange={(e) => setHighDb(Number(e.target.value))}
//                     disabled={settingInProgress}
//                   />
//                   <InputGroup.Text>dBmV (35–55)</InputGroup.Text>
//                 </InputGroup>
//                 <Form.Range min={35} max={55} step={0.1} value={highDb} onChange={(e) => setHighDb(Number(e.target.value))} disabled={settingInProgress} />
//               </div>

//               <div className="d-flex gap-2">
//                 <Button
//                   variant="primary"
//                   className="flex-grow-1"
//                   onClick={sendSettings}
//                   disabled={!selectedDevice || settingInProgress || queryInProgress}
//                 >
//                   {settingInProgress ? (
//                     <>
//                       <Spinner animation="border" size="sm" className="me-2" />
//                       Sending…
//                     </>
//                   ) : (
//                     <>
//                       <FiSend className="me-2" />
//                       Send Settings
//                     </>
//                   )}
//                 </Button>

//                 <Button variant="outline-secondary" onClick={resetLocal} disabled={settingInProgress || queryInProgress}>
//                   <FiRotateCcw className="me-2" />
//                   Reset & Clear
//                 </Button>
//               </div>

//               {/* 設定成功後才出現 Query 按鈕 */}
//               {settingsApplied && (
//                 <div className="d-grid mt-3">
//                   <Button
//                     variant="info"
//                     onClick={queryRfPower}
//                     disabled={!selectedDevice || queryInProgress}
//                   >
//                     {queryInProgress ? (
//                       <>
//                         <Spinner animation="border" size="sm" className="me-2" />
//                         Querying…
//                       </>
//                     ) : (
//                       <>
//                         <FiSend className="me-2" />
//                         Query RF Power
//                       </>
//                     )}
//                   </Button>
//                 </div>
//               )}

//               {/* RF 進度條 */}
//               {rfProgress.isCollecting && (
//                 <div className="mt-3 border rounded p-3 bg-light">
//                   <h6 className="text-primary mb-2">
//                     <Spinner animation="border" size="sm" className="me-2" />
//                     Collecting RF Power…
//                   </h6>
//                   <ProgressBar className="mb-2">
//                     <ProgressBar
//                       now={(rfProgress.completedParts.length / rfProgress.totalParts) * 100}
//                       label={`${rfProgress.completedParts.length}/${rfProgress.totalParts}`}
//                       animated
//                       striped
//                     />
//                   </ProgressBar>
//                   <small className="text-muted">
//                     Processing: {rfProgress.currentPart || 'Waiting…'}<br />
//                     Completed: {rfProgress.completedParts.join(', ') || 'None'}
//                   </small>
//                 </div>
//               )}

//               {message && (
//                 <Alert variant={message.type} className="mt-3" onClose={() => setMessage(null)} dismissible>
//                   {message.text}
//                 </Alert>
//               )}
//             </Card.Body>
//           </Card>
//         </Col>

//         {/* 右側：折線圖 */}
//         <Col lg={8}>
//           <Card className="h-100 shadow-sm" style={{ borderRadius: 16 }}>
//             <Card.Body style={{ height: 460 }}>
//               <ResponsiveContainer width="100%" height="100%">
//                 <LineChart data={lineRows} margin={{ top: 20, right: 24, bottom: 28, left: 12 }}>
//                   <CartesianGrid strokeDasharray="3 3" />
//                   <XAxis
//                     dataKey="frequency"
//                     type="number"
//                     domain={[FREQ_LOW, FREQ_HIGH]}
//                     tickFormatter={(v) => `${v} MHz`}
//                     interval="preserveStartEnd"
//                     minTickGap={24}
//                     padding={{ left: 14, right: 14 }}
//                     tickMargin={12}
//                   />
//                   <YAxis
//                     domain={yDomain}
//                     tickFormatter={(v) => `${Number(v).toFixed(1)} dBmV`}
//                     width={86}
//                     tickMargin={10}
//                     padding={{ top: 12, bottom: 12 }}
//                     allowDecimals
//                   />
//                   <Tooltip
//                     formatter={(v, name) => [
//                       typeof v === 'number' ? `${v.toFixed(2)} dBmV` : v,
//                       name === 'initialOutputPower' ? 'Initial Output' : 'Queried Output',
//                     ]}
//                     labelFormatter={(l) => `Freq: ${l} MHz`}
//                     wrapperStyle={{ zIndex: 1 }}
//                   />
//                   <Legend />
//                   <ReferenceLine x={FREQ_LOW} stroke="#94a3b8" strokeDasharray="4 4" ifOverflow="extendDomain" />
//                   <ReferenceLine x={FREQ_HIGH} stroke="#94a3b8" strokeDasharray="4 4" ifOverflow="extendDomain" />

//                   <Line name="Initial Output" type="monotone" dataKey="initialOutputPower" dot={false} stroke={COLOR_INIT_OUT} strokeWidth={2} connectNulls />
//                   {queriedRfData.length > 0 && (
//                     <Line name="Queried Output" type="monotone" dataKey="queriedOutputPower" dot={false} stroke={COLOR_Q_OUT} strokeWidth={3} connectNulls />
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

// ExhibitSpectrumOneButton.jsx
import React, { useState, useEffect, useRef } from 'react'
import { Card, Form, Button, Alert, Row, Col, Spinner } from 'react-bootstrap'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, ReferenceLine
} from 'recharts'
import { amplifierAPI } from './api'
import { FiSend, FiChevronUp, FiChevronDown } from 'react-icons/fi'
import wsService from '../../service/websocket'

const ExpoSpectrumDemo = () => {
    // Device Selection & State
    const [devices, setDevices] = useState([])
    const [selectedDevice, setSelectedDevice] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState(null)

    // RF Power Data
    const [initialRfData, setInitialRfData] = useState([])
    const [queriedRfData, setQueriedRfData] = useState([])
    const [chartData, setChartData] = useState([])

    // FWD Loading Power Settings
    const [fwdLoadingPowerLow, setFwdLoadingPowerLow] = useState(30.0)
    const [fwdLoadingPowerHigh, setFwdLoadingPowerHigh] = useState(45.0)
    
    // 整合後的狀態
    const [operationInProgress, setOperationInProgress] = useState(false)
    const [operationStage, setOperationStage] = useState('idle') // 'setting_low' | 'setting_high' | 'querying' | 'idle'

    // RF Query Progress
    const [rfProgress, setRfProgress] = useState({
        isCollecting: false,
        currentPart: '',
        completedParts: [],
        totalParts: 6,
        progress: 0
    })

    // 用 ref 追蹤是否需要自動查詢
    const shouldAutoQueryRef = useRef(false)

    // Effect 1: Initial data loading (runs only once on mount)
    useEffect(() => {
        loadDevices()
    }, [])

    // Effect 2: Manages all WebSocket lifecycle and event handling
    useEffect(() => {
        // --- WebSocket Event Handlers ---

        const handleRfProgress = (data) => {
            if (data.deviceEui === selectedDevice) {
                setRfProgress({
                    isCollecting: true,
                    currentPart: data.currentPart || '',
                    completedParts: data.completedParts || [],
                    totalParts: 6,
                    progress: data.progress || 0
                });
            }
        };

        const handleRfComplete = (data) => {
            if (data.deviceEui === selectedDevice) {
                setOperationInProgress(false);
                setOperationStage('idle');
                setRfProgress({ isCollecting: false, currentPart: '', completedParts: [], totalParts: 6, progress: 0 });

                if (data.status === 'timeout') {
                    setMessage({ type: 'warning', text: `RF Power query timed out. Received only ${data.receivedParts?.length || 0}/6 parts.` });
                } else {
                    setMessage({ type: 'success', text: 'Settings applied and RF Power data collected successfully!' });
                    handleRfPowerData(data);
                }
            }
        };

        const handleCommandResponse = (data) => {
            if (data.deviceEui === selectedDevice) {
                console.log('Received command response for setting:', data);
                
                if (operationStage === 'setting_low') {
                    // Low 設定完成，送 High
                    sendHighPowerSetting();
                } 
                else if (operationStage === 'setting_high') {
                    // High 設定完成
                    setMessage({
                        type: 'success',
                        text: `Settings applied successfully! Now querying RF Power data...`
                    });
                    
                    // 如果是整合操作，自動查詢
                    if (shouldAutoQueryRef.current) {
                        setOperationStage('querying');
                        queryRfPowerInternal();
                    } else {
                        setOperationInProgress(false);
                        setOperationStage('idle');
                    }
                }
            }
        };

        // --- WebSocket Connection & Subscriptions ---
        if (selectedDevice) {
            wsService.connect(() => {
                console.log('WebSocket connected successfully for device:', selectedDevice);
                wsService.subscribe('/topic/rf-power-progress', handleRfProgress);
                wsService.subscribe('/topic/rf-power-complete', handleRfComplete);
                wsService.subscribe('/topic/command-response', handleCommandResponse);
            });
        }
        
        // --- Cleanup Function ---
        return () => {
            wsService.unsubscribe('/topic/rf-power-progress');
            wsService.unsubscribe('/topic/rf-power-complete');
            wsService.unsubscribe('/topic/command-response');
        };

    }, [selectedDevice, operationStage, fwdLoadingPowerLow, fwdLoadingPowerHigh]);

    // Load device list
    const loadDevices = async () => {
        try {
            const response = await amplifierAPI.getAllDevices()
            if (response?.devices) {
                setDevices(response.devices)
                if (response.devices.length > 0) {
                    const firstDevice = response.devices[0].deviceEui
                    setSelectedDevice(firstDevice)
                    loadInitialRfData(firstDevice)
                }
            }
        } catch (error) {
            console.error('Failed to load devices:', error)
            setMessage({ type: 'danger', text: 'Failed to load device list.' })
        }
    }

    // Load initial RF data
    const loadInitialRfData = async (deviceEui) => {
        try {
            setLoading(true)
            const response = await amplifierAPI.getRFPowerSpectrum(deviceEui)
            if (response.spectrum && Array.isArray(response.spectrum)) {
                const formattedData = response.spectrum
                    .filter(point => point.frequency >= 261)
                    .map(point => ({ frequency: point.frequency, initialOutputPower: point.outputPower }))
                setInitialRfData(formattedData)
                updateChartData(formattedData, [])
            }
        } catch (error) {
            console.error('Failed to load RF data:', error)
            setMessage({ type: 'warning', text: 'Failed to load RF data.' })
        } finally {
            setLoading(false)
        }
    }

    // Handle device change
    const handleDeviceChange = (deviceEui) => {
        setSelectedDevice(deviceEui)
        setQueriedRfData([])
        setMessage(null)
        if (deviceEui) {
            loadInitialRfData(deviceEui)
        }
    }

    // Adjust FWD Loading Power values
    const adjustPowerLow = (delta) => {
        const newValue = parseFloat(fwdLoadingPowerLow) + delta;
        if (newValue >= 20 && newValue <= 40) {
            setFwdLoadingPowerLow(newValue.toFixed(1));
        }
    }

    const adjustPowerHigh = (delta) => {
        const newValue = parseFloat(fwdLoadingPowerHigh) + delta;
        if (newValue >= 35 && newValue <= 55) {
            setFwdLoadingPowerHigh(newValue.toFixed(1));
        }
    }

    // 整合的操作：設定 + 查詢
    const startIntegratedOperation = async () => {
        if (!selectedDevice) {
            setMessage({ type: 'warning', text: 'Please select a device first.' });
            return
        }
        
        shouldAutoQueryRef.current = true; // 標記需要自動查詢
        setOperationInProgress(true)
        setMessage({ type: 'info', text: 'Sending Low Power setting...' })
        setOperationStage('setting_low')

        try {
            const response = await amplifierAPI.setDeviceSettings(selectedDevice, { 
                fwdLoadingPowerLow: parseFloat(fwdLoadingPowerLow) 
            })
            if (response.status === 'success') {
                setMessage({ type: 'info', text: 'Low Power setting sent, waiting for device response...' })
            }
        } catch (error) {
            console.error('Failed to send low power setting:', error)
            setMessage({ 
                type: 'danger', 
                text: 'Failed to set Low Power: ' + (error.response?.data?.message || error.message) 
            })
            setOperationInProgress(false)
            setOperationStage('idle')
            shouldAutoQueryRef.current = false
        }
    }

    // Send the second part of the settings
    const sendHighPowerSetting = async () => {
        setMessage({ type: 'info', text: 'Low Power Acknowledged. Sending High Power setting...' })
        setOperationStage('setting_high')

        try {
            const response = await amplifierAPI.setDeviceSettings(selectedDevice, { 
                fwdLoadingPowerHigh: parseFloat(fwdLoadingPowerHigh) 
            })
            if (response.status === 'success') {
                setMessage({ type: 'info', text: 'High Power setting sent, waiting for device response...' })
            }
        } catch (error) {
            console.error('Failed to send high power setting:', error)
            setMessage({ 
                type: 'danger', 
                text: 'Failed to set High Power: ' + (error.response?.data?.message || error.message) 
            })
            setOperationInProgress(false)
            setOperationStage('idle')
            shouldAutoQueryRef.current = false
        }
    }

    // 內部查詢函數（不改變 shouldAutoQueryRef）
    const queryRfPowerInternal = async () => {
        setMessage({ type: 'info', text: 'Querying RF Power data...' })
        try {
            await amplifierAPI.queryAllRFPower(selectedDevice)
        } catch (error) {
            console.error('Failed to query RF power:', error)
            setMessage({ type: 'danger', text: 'Query failed: ' + error.message })
            setOperationInProgress(false)
            setOperationStage('idle')
            shouldAutoQueryRef.current = false
        }
    }

    // Process RF Power query results
    const handleRfPowerData = (data) => {
        if (data.outputPower) {
            const formattedData = []
            Object.values(data.outputPower).forEach(part => {
                Object.entries(part).forEach(([freq, power]) => {
                    formattedData.push({ frequency: parseInt(freq), queriedOutputPower: power })
                })
            })
            formattedData.sort((a, b) => a.frequency - b.frequency)
            const filteredData = formattedData.filter(d => d.frequency >= 261)
            setQueriedRfData(filteredData)
            updateChartData(initialRfData, filteredData)
        }
        shouldAutoQueryRef.current = false // 完成後重置
    }

    // Update chart data
    const updateChartData = (initial, queried) => {
        const combinedMap = new Map()
        initial.forEach(item => {
            combinedMap.set(item.frequency, { frequency: item.frequency, initialOutputPower: item.initialOutputPower })
        })
        queried.forEach(item => {
            const existing = combinedMap.get(item.frequency) || { frequency: item.frequency }
            existing.queriedOutputPower = item.queriedOutputPower
            combinedMap.set(item.frequency, existing)
        })
        const combined = Array.from(combinedMap.values()).sort((a, b) => a.frequency - b.frequency)
        setChartData(combined)
    }

    // Custom Tooltip for chart
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-2 border rounded shadow">
                    <p className="mb-1"><strong>Frequency: {label} MHz</strong></p>
                    {payload.map((entry, index) => (
                        <p key={index} className="mb-0" style={{ color: entry.color }}>
                            {entry.name}: {entry.value !== null ? `${entry.value.toFixed(1)} dBmV` : 'N/A'}
                        </p>
                    ))}
                </div>
            )
        }
        return null
    }

    // 獲取按鈕顯示文字
    const getButtonText = () => {
        if (!operationInProgress) {
            return (
                <>
                    <FiSend className="me-2" />
                    Apply & Query
                </>
            )
        }
        
        switch (operationStage) {
            case 'setting_low':
                return (
                    <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Sending Low Setting...
                    </>
                )
            case 'setting_high':
                return (
                    <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Sending High Setting...
                    </>
                )
            case 'querying':
                return (
                    <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Querying RF Power...
                    </>
                )
            default:
                return (
                    <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Processing...
                    </>
                )
        }
    }

    return (
        <div>
            {/* Control Panel */}
            <Card className="mb-3">
                <Card.Body>
                    <h5 className="mb-3">Device Settings Console</h5>
                    <Row className="mb-3">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Select Device</Form.Label>
                                <Form.Select 
                                    value={selectedDevice} 
                                    onChange={(e) => handleDeviceChange(e.target.value)} 
                                    disabled={loading || operationInProgress}
                                >
                                    <option value="">Select a device...</option>
                                    {devices.map(device => (
                                        <option key={device.deviceEui} value={device.deviceEui}>
                                            {device.deviceEui} - {device.partName || 'Unnamed'}
                                            {device.onlineStatus ? ' (Online)' : ' (Offline)'}
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                    </Row>

                    {/* FWD Loading Power Settings */}
                    <Row className="mb-3">
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>FWD Power @ Low Freq</Form.Label>
                                <div className="d-flex align-items-center">
                                    <Form.Control 
                                        type="number" 
                                        value={fwdLoadingPowerLow}
                                        onChange={(e) => setFwdLoadingPowerLow(e.target.value)}
                                        onBlur={(e) => {
                                            let val = parseFloat(e.target.value);
                                            if (isNaN(val)) val = 20.0;
                                            if (val < 20) val = 20.0;
                                            if (val > 40) val = 40.0;
                                            setFwdLoadingPowerLow(val.toFixed(1));
                                        }}
                                        min="20" 
                                        max="40" 
                                        step="0.1" 
                                        disabled={operationInProgress} 
                                        style={{ width: '100px' }}
                                    />
                                    <div className="ms-2 d-flex flex-column">
                                        <Button 
                                            variant="outline-secondary" 
                                            size="sm" 
                                            onClick={() => adjustPowerLow(0.1)} 
                                            disabled={operationInProgress} 
                                            className="p-0" 
                                            style={{ width: '24px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            <FiChevronUp />
                                        </Button>
                                        <Button 
                                            variant="outline-secondary" 
                                            size="sm" 
                                            onClick={() => adjustPowerLow(-0.1)} 
                                            disabled={operationInProgress} 
                                            className="p-0" 
                                            style={{ width: '24px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            <FiChevronDown />
                                        </Button>
                                    </div>
                                    <span className="ms-2 text-muted">dBmV (20-40)</span>
                                </div>
                            </Form.Group>
                        </Col>

                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>FWD Power @ High Freq</Form.Label>
                                <div className="d-flex align-items-center">
                                    <Form.Control 
                                        type="number" 
                                        value={fwdLoadingPowerHigh}
                                        onChange={(e) => setFwdLoadingPowerHigh(e.target.value)}
                                        onBlur={(e) => {
                                            let val = parseFloat(e.target.value);
                                            if (isNaN(val)) val = 35.0;
                                            if (val < 35) val = 35.0;
                                            if (val > 55) val = 55.0;
                                            setFwdLoadingPowerHigh(val.toFixed(1));
                                        }}
                                        min="35" 
                                        max="55" 
                                        step="0.1" 
                                        disabled={operationInProgress} 
                                        style={{ width: '100px' }}
                                    />
                                    <div className="ms-2 d-flex flex-column">
                                        <Button 
                                            variant="outline-secondary" 
                                            size="sm" 
                                            onClick={() => adjustPowerHigh(0.1)} 
                                            disabled={operationInProgress} 
                                            className="p-0" 
                                            style={{ width: '24px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            <FiChevronUp />
                                        </Button>
                                        <Button 
                                            variant="outline-secondary" 
                                            size="sm" 
                                            onClick={() => adjustPowerHigh(-0.1)} 
                                            disabled={operationInProgress} 
                                            className="p-0" 
                                            style={{ width: '24px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            <FiChevronDown />
                                        </Button>
                                    </div>
                                    <span className="ms-2 text-muted">dBmV (35-55)</span>
                                </div>
                            </Form.Group>
                        </Col>

                        <Col md={4} className="d-flex align-items-end">
                            <Button 
                                variant="primary" 
                                onClick={startIntegratedOperation} 
                                disabled={!selectedDevice || operationInProgress}
                                className="w-100"
                            >
                                {getButtonText()}
                            </Button>
                        </Col>
                    </Row>

                    {/* Progress Indicator */}
                    {rfProgress.isCollecting && (
                        <Row className="mb-3">
                            <Col>
                                <div className="border rounded p-3 bg-light">
                                    <h6 className="text-primary mb-2">
                                        <Spinner animation="border" size="sm" className="me-2" />
                                        Collecting RF Power Data...
                                    </h6>
                                    <div className="progress mb-2">
                                        <div 
                                            className="progress-bar progress-bar-striped progress-bar-animated" 
                                            style={{ width: `${rfProgress.progress}%` }}
                                        >
                                            {Math.round(rfProgress.progress)}%
                                        </div>
                                    </div>
                                    <small className="text-muted">
                                        Processing: {rfProgress.currentPart || 'Waiting...'}<br />
                                        Completed: {rfProgress.completedParts.join(', ') || 'None'}
                                    </small>
                                </div>
                            </Col>
                        </Row>
                    )}

                    {/* Messages */}
                    {message && (
                        <Alert variant={message.type} dismissible onClose={() => setMessage(null)}>
                            {message.text}
                        </Alert>
                    )}
                </Card.Body>
            </Card>

            {/* RF Power Chart */}
            {chartData.length > 0 && (
                <Card>
                    <Card.Body>
                        <h5>RF Output Power Comparison</h5>
                        <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px' }}>
                            <ResponsiveContainer width="100%" height={400}>
                                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 45, bottom: 50 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                                    <XAxis 
                                        dataKey="frequency" 
                                        label={{ value: 'Frequency (MHz)', position: 'insideBottom', offset: -5 }} 
                                        domain={[111, 1809]} 
                                        ticks={[111, 369, 627, 885, 1143, 1221, 1401, 1659, 1809]} 
                                        tick={{ fontSize: 11 }} 
                                        allowDataOverflow={true} 
                                        interval={0} 
                                    />
                                    <YAxis 
                                        label={{ value: 'Power (dBmV)', angle: -90, position: 'insideLeft' }} 
                                        domain={[20, 60]} 
                                        ticks={[20, 25, 30, 35, 40, 45, 50, 55, 60]} 
                                        tick={{ fontSize: 11 }} 
                                    />
                                    <ReferenceLine 
                                        y={fwdLoadingPowerLow} 
                                        stroke="#28a745" 
                                        strokeDasharray="5 5" 
                                        strokeWidth={1.5} 
                                        label={{ 
                                            value: `Low: ${fwdLoadingPowerLow} dBmV`, 
                                            position: "right", 
                                            style: { fontSize: 10, fill: '#28a745' } 
                                        }} 
                                    />
                                    <ReferenceLine 
                                        y={fwdLoadingPowerHigh} 
                                        stroke="#dc3545" 
                                        strokeDasharray="5 5" 
                                        strokeWidth={1.5} 
                                        label={{ 
                                            value: `High: ${fwdLoadingPowerHigh} dBmV`, 
                                            position: "right", 
                                            style: { fontSize: 10, fill: '#dc3545' } 
                                        }} 
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend verticalAlign="top" height={36} iconType="rect" />
                                    <Bar 
                                        dataKey="initialOutputPower" 
                                        name="Initial Output Power" 
                                        fill="#6c757d" 
                                        barSize={4} 
                                    />
                                    {queriedRfData.length > 0 && (
                                        <Bar 
                                            dataKey="queriedOutputPower" 
                                            name="Queried Output Power" 
                                            fill="#007bff" 
                                            barSize={4} 
                                        />
                                    )}
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Card.Body>
                </Card>
            )}

            {/* Loading State */}
            {loading && (
                <div className="text-center py-5">
                    <Spinner animation="border" variant="primary" />
                    <p className="mt-3">Loading RF data...</p>
                </div>
            )}
        </div>
    )
}

export default ExpoSpectrumDemo