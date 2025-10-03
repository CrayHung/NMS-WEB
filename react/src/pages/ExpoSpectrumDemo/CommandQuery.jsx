// import React, { useState, useEffect, useRef } from 'react'
// import { Card, Form, Button, Alert, Row, Col, Table, Badge, Spinner } from 'react-bootstrap'
// import {
//   LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
// } from 'recharts'
// import { amplifierAPI } from '../../services/api'
// import wsService from '../../service/websocket'
// import { formatDateTime } from '../../utils/formatters'
// import { FiSend, FiCheck, FiClock, FiAlertTriangle } from 'react-icons/fi'
// import { ProgressBar } from 'react-bootstrap'

// const CommandQuery = () => {
//   // Device list and selection
//   const [devices, setDevices] = useState([])
//   const [selectedDevice, setSelectedDevice] = useState('')
//   const [commandType, setCommandType] = useState('status')

//   const [settingsLocation, setSettingsLocation] = useState('')
//   const [settingsAlsc, setSettingsAlsc] = useState('unchanged')
//   const [settingsTempHigh, setSettingsTempHigh] = useState('')
//   const [activeSetting, setActiveSetting] = useState(null) // 追蹤正在編輯的欄位

//   // Request and response status
//   const [loading, setLoading] = useState(false)
//   const [requestTime, setRequestTime] = useState(null)
//   const [responseTime, setResponseTime] = useState(null)
//   const [requestId, setRequestId] = useState(null)

//   // Response data
//   const [beforeData, setBeforeData] = useState(null)
//   const [afterData, setAfterData] = useState(null)
//   const [rfPowerData, setRfPowerData] = useState(null)

//   // RF query progression
//   const [rfProgress, setRfProgress] = useState({
//     isCollecting: false,
//     currentPart: '',
//     completedParts: [],
//     totalParts: 6
//   })

//   // WebSocket connection status
//   const [wsConnected, setWsConnected] = useState(false)
//   const [message, setMessage] = useState(null)

//   // Track the current pending request
//   const pendingRequestRef = useRef(null)

//   useEffect(() => {
//     loadDevices()
//     initWebSocket()

//     return () => {
//       wsService.unsubscribe('/topic/command-response')
//       wsService.unsubscribe('/topic/device-status')
//       wsService.unsubscribe('/topic/rf-power-complete')
//     }
//   }, [])

//   // Load device list
//   const loadDevices = async () => {
//     try {
//       const response = await amplifierAPI.getAllDevices()
//       if (response?.devices) {
//         setDevices(response.devices)
//         if (response.devices.length > 0) {
//           setSelectedDevice(response.devices[0].deviceEui)
//           // Load current status for the first device
//           loadCurrentStatus(response.devices[0].deviceEui)
//         }
//       }
//     } catch (error) {
//       console.error('Failed to load devices:', error)
//       setMessage({ type: 'danger', text: 'Failed to load device list' })
//     }
//   }

//   // Load current status as "before" data
//   const loadCurrentStatus = async (deviceEui) => {
//     try {
//       const status = await amplifierAPI.getCurrentStatus(deviceEui)
//       setBeforeData(status)
//     } catch (error) {
//       console.error('Failed to load current status:', error)
//     }
//   }

//   // Initialize WebSocket connection
//   const initWebSocket = () => {
//     wsService.connect(() => {
//       console.log('WebSocket connected (Test Page)')
//       setWsConnected(true)

//       // Subscribe to command response topic
//       wsService.subscribe('/topic/command-response', (data) => {
//         handleCommandResponse(data)
//       })

//       // Subscribe to device status updates
//       wsService.subscribe('/topic/device-status', (data) => {
//         handleDeviceStatusUpdate(data)
//       })

//       // Subscribe to RF Power completion event
//       wsService.subscribe('/topic/rf-power-complete', (data) => {
//         handleRfPowerComplete(data)
//       })

//       // Subscribe RF Power 進度更新
//       wsService.subscribe('/topic/rf-power-progress', (data) => {
//         handleRfPowerProgress(data)
//       })
//     })
//   }

//   // handle RF Power 進度更新
//   const handleRfPowerProgress = (data) => {
//     if (data.deviceEui === selectedDevice) {
//       setRfProgress({
//         isCollecting: true,
//         currentPart: data.currentPart,
//         completedParts: data.completedParts || [],
//         totalParts: 6
//       })
//     }
//   }

//   // Handle command response
//   const handleCommandResponse = (data) => {
//     // if rf-power command => ignore, 改 handleRfPowerComplete 處理
//     if (pendingRequestRef.current && data.commandType === 'rf-power') {
//       return;
//     }

//     // Check if this is the response we are waiting for
//     if (pendingRequestRef.current &&
//       data.deviceEui === pendingRequestRef.current.deviceEui &&
//       data.commandType === pendingRequestRef.current.commandType) {

//       setResponseTime(new Date())
//       setAfterData(data.responseData)
//       setLoading(false)
//       setMessage({
//         type: 'success',
//         text: `Received ${data.commandType} response`
//       })

//       // Clear pending flag
//       pendingRequestRef.current = null
//     }
//   }

//   // Handle device status update
//   const handleDeviceStatusUpdate = (data) => {
//     // In this specific test component, we should only rely on the '/topic/command-response'
//     // message as the definitive result of a command.
//     // The '/topic/device-status' message is a general broadcast with partial data,
//     // which can overwrite the complete data we are waiting for.
//     // Therefore, we will ignore this update within the context of this component.

//     console.log('Received a general device status update (ignored by CommandTest):', data);

//     /*
//     // If waiting for a response and the device EUI matches
//     if (pendingRequestRef.current && 
//         data.deviceEui === pendingRequestRef.current.deviceEui) {
      
//       // Check if this is the corresponding response based on command type
//       const cmdType = pendingRequestRef.current.commandType
//       if (cmdType === 'status' || cmdType === 'settings' || cmdType === 'model') {
//         setResponseTime(new Date())
//         setAfterData(data)
//         setLoading(false)
//         setMessage({ 
//           type: 'success', 
//           text: `Received device status update` 
//         })
        
//         // Clear pending flag
//         pendingRequestRef.current = null
//       }
//     }
//     */
//   }

//   // Handle RF Power completion event
//   const handleRfPowerComplete = (data) => {
//     if (pendingRequestRef.current &&
//       data.deviceEui === pendingRequestRef.current.deviceEui &&
//       pendingRequestRef.current.commandType === 'rf-power') {

//       setResponseTime(new Date())
//       setRfPowerData(data)
//       setLoading(false)

//       // reset RF 進度狀態
//       setRfProgress({
//         isCollecting: false,
//         currentPart: '',
//         completedParts: [],
//         totalParts: 6
//       })

//       if (data.status === 'timeout') {
//         setMessage({
//           type: 'warning',
//           text: `RF Power collection timeout, only ${data.receivedParts?.length || 0}/6`
//         })
//       } else {
//         setMessage({
//           type: 'success',
//           text: 'RF Power data collection complete'
//         })
//       }

//       // Clear pending flag
//       pendingRequestRef.current = null
//     }
//   }

//   // Send command
//   const sendCommand = async () => {
//     if (!selectedDevice) {
//       setMessage({ type: 'warning', text: 'Please select a device' })
//       return
//     }

//     // 若afterData 中有上一次查詢結果, 設為這次查詢的 beforeData
//     if (afterData) {
//       setBeforeData(afterData);
//     }

//     setLoading(true)
//     setMessage(null)
//     setAfterData(null)
//     setRfPowerData(null)
//     setRequestTime(new Date())
//     setResponseTime(null)

//     // Generate request ID
//     const reqId = `${selectedDevice}-${commandType}-${Date.now()}`
//     setRequestId(reqId)

//     // Set pending flag
//     pendingRequestRef.current = {
//       deviceEui: selectedDevice,
//       commandType: commandType,
//       requestId: reqId,
//       timestamp: Date.now()
//     }

//     try {
//       // Call the corresponding API based on command type
//       switch (commandType) {
//         case 'set-settings':
//           const payload = {};
//           if (settingsLocation) {
//             payload.locationAddress = settingsLocation;
//           }
//           if (settingsAlsc !== 'unchanged') {
//             payload.alscEnabled = (settingsAlsc === 'true');
//           }
//           if (settingsTempHigh) {
//             payload.tempHighAlarm = parseFloat(settingsTempHigh);
//           }

//           if (Object.keys(payload).length === 0) {
//             throw new Error('Please provide at least one setting to change.');
//           }
//           // 後端限制一次只能修改一個設定
//           if (Object.keys(payload).length > 1) {
//             throw new Error('Backend only supports one setting change per request.');
//           }

//           await amplifierAPI.setDeviceSettings(selectedDevice, payload);
//           break;

//         case 'status':
//           await amplifierAPI.queryStatus(selectedDevice)
//           break
//         case 'settings':
//           await amplifierAPI.querySettings(selectedDevice)
//           break
//         case 'model':
//           await amplifierAPI.queryModelInfo(selectedDevice)
//           break
//         case 'rf-power':
//           await amplifierAPI.queryAllRFPower(selectedDevice)
//           break
//         default:
//           throw new Error('Unknown command type')
//       }

//       setMessage({
//         type: 'info',
//         text: `Command sent, waiting for device response...`
//       })

//       // Set timeout handler (30 seconds)
//       setTimeout(() => {
//         if (pendingRequestRef.current?.requestId === reqId) {
//           setLoading(false)
//           setMessage({
//             type: 'warning',
//             text: 'Response timeout (60 sec)'
//           })
//           pendingRequestRef.current = null
//         }
//       }, 60000)

//     } catch (error) {
//       console.error('Failed to send command:', error)
//       setLoading(false)
//       setMessage({
//         type: 'danger',
//         text: `Failed to send command: ${error.message}`
//       })
//       pendingRequestRef.current = null
//     }
//   }

//   // When device selection changes, load its current status
//   const handleDeviceChange = (deviceEui) => {
//     setSelectedDevice(deviceEui)
//     setAfterData(null)
//     setRfPowerData(null)
//     setMessage(null)
//     if (deviceEui) {
//       loadCurrentStatus(deviceEui)
//     }
//   }

//   // Render data comparison table
//   const renderDataComparison = () => {
//     if (!beforeData && !afterData) return null

//     const fields = [
//       // --- Model Info (from 0x00 command) ---
//       { key: 'partName', label: 'Model' },
//       { key: 'partNumber', label: 'Part Number' },
//       { key: 'serialNumber', label: 'Serial No.' },
//       { key: 'hwVersion', label: 'HW Version' },
//       { key: 'fwVersion', label: 'FW Version' },

//       // --- Settings Info (from 0x90 command) ---
//       { key: 'location', label: 'Location' },
//       { key: 'alscEnabled', label: 'ALSC Status', format: v => typeof v === 'boolean' ? (v ? 'Enabled' : 'Disabled') : '-' },
//       { key: 'tempHighAlarm', label: 'High Temp Alarm', format: v => v != null ? `${v}°C` : '-' },
//       { key: 'tempLowAlarm', label: 'Low Temp Alarm', format: v => v != null ? `${v}°C` : '-' },
//       { key: 'voltHighAlarm', label: 'High Volt Alarm', format: v => v != null ? `${v}V` : '-' },
//       { key: 'voltLowAlarm', label: 'Low Volt Alarm', format: v => v != null ? `${v}V` : '-' },
//       { key: 'rippleHighAlarm', label: 'High Ripple Alarm', format: v => v != null ? `${v}mV` : '-' },

//       // --- Status Info (from 0xA0 command) ---
//       { key: 'temperature', label: 'Current Temperature', format: v => v != null ? `${v}°C` : '-' },
//       { key: 'voltage', label: 'Current Voltage', format: v => v != null ? `${v}V` : '-' },
//       { key: 'ripple', label: 'Current Ripple', format: v => v != null ? `${v}mV` : '-' },
//       { key: 'rfOutputPower', label: 'Current Output Power', format: v => v != null ? `${v} dBmV` : '-' },
//     ]

//     return (
//       <Table hover responsive size="sm">
//         <thead>
//           <tr>
//             <th width="30%">Field</th>
//             <th width="35%">Before Request</th>
//             <th width="35%">After Request</th>
//           </tr>
//         </thead>
//         <tbody>
//           {fields.map(field => {
//             const beforeValue = beforeData?.[field.key]
//             const afterValue = afterData?.[field.key]
//             const formatter = field.format || (v => v || '-')
//             const hasChanged = beforeValue !== afterValue && afterData

//             return (
//               <tr key={field.key}>
//                 <td><strong>{field.label}</strong></td>
//                 <td>{formatter(beforeValue)}</td>
//                 <td>
//                   <span className={hasChanged ? 'text-primary fw-bold' : ''}>
//                     {formatter(afterValue)}
//                     {hasChanged && ' ✓'}
//                   </span>
//                 </td>
//               </tr>
//             )
//           })}
//         </tbody>
//       </Table>
//     )
//   }

//   // Render RF Power chart
//   const renderRfPowerChart = () => {
//     if (!rfPowerData) return null

//     // Prepare chart data
//     const chartData = []
//     const frequencies = new Set()

//     // Collect all frequency points
//     Object.values(rfPowerData.inputPower || {}).forEach(part => {
//       Object.keys(part).forEach(freq => frequencies.add(parseInt(freq)))
//     })
//     Object.values(rfPowerData.outputPower || {}).forEach(part => {
//       Object.keys(part).forEach(freq => frequencies.add(parseInt(freq)))
//     })

//     // Sort frequencies
//     const sortedFreqs = Array.from(frequencies).sort((a, b) => a - b)

//     // Create chart data
//     sortedFreqs.forEach(freq => {
//       const point = { frequency: freq }

//       // Find input power
//       Object.values(rfPowerData.inputPower || {}).forEach(part => {
//         if (part[freq] !== undefined) {
//           point.inputPower = part[freq]
//         }
//       })

//       // Find output power
//       Object.values(rfPowerData.outputPower || {}).forEach(part => {
//         if (part[freq] !== undefined) {
//           point.outputPower = part[freq]
//         }
//       })

//       // Calculate gain
//       if (point.inputPower !== undefined && point.outputPower !== undefined) {
//         point.gain = point.outputPower - point.inputPower
//       }

//       chartData.push(point)
//     })

//     return (
//       <div>
//         <h6>RF Power Spectrum Chart</h6>
//         <ResponsiveContainer width="100%" height={300}>
//           <LineChart data={chartData}>
//             <CartesianGrid strokeDasharray="3 3" />
//             <XAxis
//               dataKey="frequency"
//               label={{ value: 'Frequency (MHz)', position: 'insideBottom', offset: -5 }}
//             />
//             <YAxis
//               label={{ value: 'Power (dBmV)', angle: -90, position: 'insideLeft' }}
//             />
//             <Tooltip />
//             <Legend />
//             <Line
//               type="monotone"
//               dataKey="inputPower"
//               stroke="#8884d8"
//               name="Input Power"
//               strokeWidth={2}
//               dot={false}
//             />
//             <Line
//               type="monotone"
//               dataKey="outputPower"
//               stroke="#82ca9d"
//               name="Output Power"
//               strokeWidth={2}
//               dot={false}
//             />
//             <Line
//               type="monotone"
//               dataKey="gain"
//               stroke="#ffc658"
//               name="Gain"
//               strokeWidth={2}
//               dot={false}
//             />
//           </LineChart>
//         </ResponsiveContainer>
//       </div>
//     )
//   }

//   return (
//     <div>
//       <Card className="mb-3">
//         <Card.Body>
//           <h5 className="mb-3">Downlink Command Test Tool</h5>

//           {/* Control Panel */}
//           <Row className="mb-3">
//             <Col md={4}>
//               <Form.Group>
//                 <Form.Label>Select Device</Form.Label>
//                 <Form.Select
//                   value={selectedDevice}
//                   onChange={(e) => handleDeviceChange(e.target.value)}
//                   disabled={loading}
//                 >
//                   <option value="">Please select...</option>
//                   {devices.map(device => (
//                     <option key={device.deviceEui} value={device.deviceEui}>
//                       {device.deviceEui} - {device.partName || 'Unnamed'}
//                       {device.onlineStatus ? ' (Online)' : ' (Offline)'}
//                     </option>
//                   ))}
//                 </Form.Select>
//               </Form.Group>
//             </Col>

//             <Col md={3}>
//               <Form.Group>
//                 <Form.Label>Command Type</Form.Label>
//                 <Form.Select
//                   value={commandType}
//                   onChange={(e) => setCommandType(e.target.value)}
//                   disabled={loading}
//                 >
//                   <option value="status">Query Status (0xA0)</option>
//                   <option value="settings">Query Settings (0x90)</option>
//                   <option value="model">Query Model (0x00)</option>
//                   <option value="rf-power">Query RF Power (All)</option>
//                 </Form.Select>
//               </Form.Group>
//             </Col>

//             <Col md={2}>
//               <Form.Group>
//                 <Form.Label>&nbsp;</Form.Label>
//                 <div>
//                   <Button
//                     variant="primary"
//                     onClick={sendCommand}
//                     disabled={!selectedDevice || loading || !wsConnected}
//                     className="w-100"
//                   >
//                     {loading ? (
//                       <>
//                         <Spinner animation="border" size="sm" className="me-2" />
//                         Waiting...
//                       </>
//                     ) : (
//                       <>
//                         <FiSend className="me-2" />
//                         Send
//                       </>
//                     )}
//                   </Button>
//                 </div>
//               </Form.Group>
//             </Col>

//             <Col md={3}>
//               <Form.Group>
//                 <Form.Label>Connection Status</Form.Label>
//                 <div>
//                   <Badge bg={wsConnected ? 'success' : 'danger'}>
//                     WebSocket: {wsConnected ? 'Connected' : 'Disconnected'}
//                   </Badge>
//                 </div>
//               </Form.Group>
//             </Col>
//           </Row>

//           {/* Message Alert */}
//           {message && (
//             <Alert
//               variant={message.type}
//               dismissible
//               onClose={() => setMessage(null)}
//             >
//               {message.text}
//             </Alert>
//           )}

//           {/* RF progress indicator */}
//           {rfProgress.isCollecting && (
//             <Card className="mb-3 border-primary">
//               <Card.Body>
//                 <h6 className="text-primary mb-3">
//                   <Spinner animation="border" size="sm" className="me-2" />
//                   RF Power Data Collecting...
//                 </h6>
//                 <ProgressBar className="mb-2">
//                   <ProgressBar
//                     now={(rfProgress.completedParts.length / rfProgress.totalParts) * 100}
//                     label={`${rfProgress.completedParts.length}/6`}
//                     animated
//                     striped
//                   />
//                 </ProgressBar>
//                 <div className="small text-muted">
//                   <div>processed: {rfProgress.currentPart || 'ongoing...'}</div>
//                   <div>complete: {rfProgress.completedParts.join(', ') || 'none'}</div>
//                   <div className="text-warning mt-2">
//                     <FiAlertTriangle className="me-1" />
//                     Please wait, collecting data... (Approx. 1~3 minutes)
//                   </div>
//                 </div>
//               </Card.Body>
//             </Card>
//           )}
//           {/* Timestamps */}
//           <Row className="mb-3">
//             <Col>
//               <div className="d-flex gap-4 text-muted">
//                 {requestTime && (
//                   <span>
//                     <FiClock className="me-1" />
//                     Sent: {formatDateTime(requestTime)}
//                   </span>
//                 )}
//                 {responseTime && (
//                   <span>
//                     <FiCheck className="me-1 text-success" />
//                     Received: {formatDateTime(responseTime)}
//                   </span>
//                 )}
//                 {requestTime && responseTime && (
//                   <span>
//                     Duration: {((responseTime - requestTime) / 1000).toFixed(1)} s
//                   </span>
//                 )}
//               </div>
//             </Col>
//           </Row>
//         </Card.Body>
//       </Card>

//       {/* Data Comparison Table */}
//       {(beforeData || afterData) && (
//         <Card className="mb-3">
//           <Card.Body>
//             <h5>Data Comparison</h5>
//             {renderDataComparison()}
//           </Card.Body>
//         </Card>
//       )}

//       {/* RF Power Chart */}
//       {rfPowerData && (
//         <Card>
//           <Card.Body>
//             {renderRfPowerChart()}
//             <div className="mt-3">
//               <small className="text-muted">
//                 Collection Time: {rfPowerData.collectionTimeMs ?
//                   `${(rfPowerData.collectionTimeMs / 1000).toFixed(1)} s` :
//                   'N/A'}
//               </small>
//             </div>
//           </Card.Body>
//         </Card>
//       )}
//     </div>
//   )
// }

// export default CommandQuery

// ExhibitSpectrumOneShot.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Card, Row, Col, Button, Form, Alert, Spinner, Badge,
} from "react-bootstrap";
import {
  ResponsiveContainer,
  BarChart, Bar,
  XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, LineChart, Line,
} from "recharts";

import { apiUrl, apiFetch } from "../../../lib/api";
import wsService from "../../../service/websocket";

// 顏色：與你既有風格保持一致
const COLORS = { out: "#ef4444", in: "#3b82f6", gain: "#10b981" };

// 你專案中普遍用的 WebSocket topic（相容 CommandTest）
// 若你後端是其他 topic，改掉這兩個常數即可
const TOPIC_COMMAND = "/topic/command-response";
const TOPIC_RF_DONE = "/topic/rf-power-complete";

// 工具：生成 requestId（避免引入額外套件）
function uuid4() {
  // 簡易 UUID v4（足夠用於前端 correlation）
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// 產生好看的 Y 軸刻度
function makeNiceStep(rawStep) {
  if (!isFinite(rawStep) || rawStep <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const s = rawStep / p;
  if (s <= 1) return 1 * p;
  if (s <= 2) return 2 * p;
  if (s <= 5) return 5 * p;
  return 10 * p;
}
function makeNiceTicks(min, max, desired = 6) {
  if (!isFinite(min) || !isFinite(max) || min === max) {
    const base = isFinite(min) ? min : 0;
    return Array.from({ length: desired }, (_, i) => base + i);
  }
  const span = max - min;
  const raw = span / (desired - 1);
  const step = makeNiceStep(raw);
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = start; v <= end + 1e-9; v += step) ticks.push(Number(v.toFixed(10)));
  return ticks;
}

export default function ExhibitSpectrumOneShot() {
  // ===== 狀態 =====
  const [devices, setDevices] = useState([]); // 下拉清單
  const [selectedEui, setSelectedEui] = useState("");
  const [lowPowerDb, setLowPowerDb] = useState("");  // 使用者輸入
  const [highPowerDb, setHighPowerDb] = useState("");

  const [running, setRunning] = useState(false);      // 一鍵流程中
  const [phase, setPhase] = useState("idle");         // idle | posting | awaitingSettings | querying | awaitingRf | done | error
  const [message, setMessage] = useState(null);       // {type:'success'|'warning'|'danger'|'info', text:string}

  const [spectrumRows, setSpectrumRows] = useState([]); // 圖表資料（後端回來的 /spectrum 格式）
  const [timestamp, setTimestamp] = useState("");       // 時間戳（若有）

  const [timeoutMs] = useState(60_000); // 整個流程逾時
  const timeoutRef = useRef(null);

  // 當前操作的 correlation
  const opRef = useRef({ requestId: null, eui: null, startTs: 0 });

  // 訂閱清理
  const unsubRef = useRef([]);

  // ===== 1) 初始化：載入 devices =====
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const url = apiUrl("/devices"); // 若你的清單 API 不同，改這裡
        const res = await apiFetch(url);
        // 預期格式 { devices: [...] }
        const list = Array.isArray(res?.devices) ? res.devices : [];
        if (mounted) {
          setDevices(list);
          if (list.length && !selectedEui) {
            setSelectedEui(list[0]?.deviceEui || "");
          }
        }
      } catch (err) {
        // 不阻斷主流程，只做提示
        setMessage({ type: "warning", text: `載入裝置清單失敗：${String(err?.message || err)}` });
      }
    })();
    return () => { mounted = false; };
  }, []); // eslint-disable-line

  // ===== WebSocket：確保連線 =====
  useEffect(() => {
    // 僅在頁面載入時嘗試連線一次
    if (!wsService?.client || !wsService?.isConnected) {
      wsService.connect(() => {
        // 已連上
      });
    }
  }, []);

  // ===== 工具：清掉所有 WS 訂閱 =====
  const clearSubscriptions = useCallback(() => {
    unsubRef.current.forEach(fn => { try { fn?.(); } catch (e) {} });
    unsubRef.current = [];
  }, []);

  // ===== 工具：啟動與清掉逾時計時 =====
  const armTimeout = useCallback((ms) => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setRunning(false);
      setPhase("error");
      setMessage({ type: "danger", text: `流程逾時（>${Math.round(ms / 1000)} 秒）` });
      clearSubscriptions();
    }, ms);
  }, [clearSubscriptions]);

  const disarmTimeout = useCallback(() => {
    clearTimeout(timeoutRef.current);
  }, []);

  // ===== 主流程：一鍵送設定 ➜ 等 ack ➜ query ➜ 等 RF spectrum 回來 =====
  const handleApplyAndQuery = useCallback(async () => {
    if (!selectedEui) {
      setMessage({ type: "warning", text: "請先選擇裝置 Device EUI" });
      return;
    }
    // 數值檢查（可依需求放寬）
    const low = Number(lowPowerDb);
    const high = Number(highPowerDb);
    if (!isFinite(low) && !isFinite(high)) {
      setMessage({ type: "warning", text: "請至少輸入 Low 或 High 其中一個數值" });
      return;
    }

    // 重置狀態
    setRunning(true);
    setPhase("posting");
    setMessage({ type: "info", text: "送出設定中…" });
    setSpectrumRows([]);
    setTimestamp("");

    // correlation
    const requestId = uuid4();
    opRef.current = { requestId, eui: selectedEui, startTs: Date.now() };

    // 訂閱 WebSocket 事件（先訂好，避免 race）
    clearSubscriptions();

    // 1) 訂閱：通用命令回送（用於抓 settings ack 或 query 回覆）
    const unsubCmd = wsService.subscribe(TOPIC_COMMAND, (frame) => {
      try {
        const payload = JSON.parse(frame.body || "{}");
        // 後端形態建議：
        // { deviceEui, command: 'SETTINGS'|'RF_POWER_QUERY', requestId, ok: true|false, message, data? }
        const matchByReq = payload?.requestId && payload.requestId === opRef.current.requestId;
        const matchByDeviceOnly = !payload?.requestId && payload?.deviceEui === opRef.current.eui;
        if (!matchByReq && !matchByDeviceOnly) return;

        if (payload?.command === "SETTINGS") {
          // 收到設定ACK
          if (payload?.ok) {
            setPhase("awaitingSettings"); // 邏輯上已完成設定，準備進入發 query
            setMessage({ type: "info", text: "設備完成設定，準備查詢 RF Power…" });
            // 立即觸發查詢
            fireRfQuery().catch((e) => {
              setRunning(false);
              setPhase("error");
              setMessage({ type: "danger", text: `查詢 RF Power 失敗：${String(e?.message || e)}` });
              clearSubscriptions();
              disarmTimeout();
            });
          } else {
            setRunning(false);
            setPhase("error");
            setMessage({ type: "danger", text: `設備回報設定失敗：${payload?.message || "未知錯誤"}` });
            clearSubscriptions();
            disarmTimeout();
          }
        }
      } catch (e) {
        // 忽略壞格式
      }
    });
    unsubRef.current.push(unsubCmd);

    // 2) 訂閱：RF 結果完成（spectrum）——相容你的 CommandTest 流
    const unsubRf = wsService.subscribe(TOPIC_RF_DONE, (frame) => {
      try {
        const payload = JSON.parse(frame.body || "{}");
        // 期望格式與 /api/amplifier/rf-power/{deviceEui}/spectrum 一樣：
        // { deviceEui, spectrum:[{outputPower,inputPower,frequency,gain?},...], timestamp?, requestId? }
        const matchByReq = payload?.requestId && payload.requestId === opRef.current.requestId;
        const matchByDeviceOnly = !payload?.requestId && payload?.deviceEui === opRef.current.eui;
        if (!matchByReq && !matchByDeviceOnly) return;

        const sp = Array.isArray(payload?.spectrum) ? payload.spectrum : [];
        setSpectrumRows(sp);
        if (payload?.timestamp) setTimestamp(payload.timestamp);
        setRunning(false);
        setPhase("done");
        setMessage({ type: "success", text: "RF Power 資料已取得。" });
        // 完成後可保留訂閱讓後續多次按鈕重用；但此處乾淨一些，直接清除
        clearSubscriptions();
        disarmTimeout();
      } catch (e) {
        // 忽略壞格式
      }
    });
    unsubRef.current.push(unsubRf);

    // 3) 送出「設定」HTTP（事件驅動，不使用 setTimeout）
    try {
      armTimeout(timeoutMs);
      const url = apiUrl(`/amplifier/settings/${encodeURIComponent(selectedEui)}`);
      const payload = { requestId, ...(isFinite(low) ? { low } : {}), ...(isFinite(high) ? { high } : {}) };
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const text = await res.text().catch(() => "");
      // 後端容許 200 + 空/OK 字樣
      if (!res.ok) {
        if (res.status === 409) {
          throw new Error("裝置忙碌或不可用（409 Conflict）");
        }
        throw new Error(`設定失敗（${res.status}）：${text || res.statusText}`);
      }
      // 設定送出成功，等待 settings ack（由 TOPIC_COMMAND 捕捉）
      setPhase("awaitingSettings");
      setMessage({ type: "info", text: "設定已送出，等待設備確認…" });
    } catch (err) {
      setRunning(false);
      setPhase("error");
      setMessage({ type: "danger", text: String(err?.message || err) });
      clearSubscriptions();
      disarmTimeout();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEui, lowPowerDb, highPowerDb, timeoutMs, armTimeout, disarmTimeout, clearSubscriptions]);

  // 實際發 RF Query 的函式（由 settings ack 觸發）
  const fireRfQuery = useCallback(async () => {
    setPhase("querying");
    setMessage({ type: "info", text: "查詢 RF Power 中…" });
    // 這個 API 會觸發 WebSocket 回傳 spectrum（你原本 CommandTest 的行為）
    const url = apiUrl(`/amplifier/query/${encodeURIComponent(opRef.current.eui)}/rf-power-all`);
    // 建議也傳 requestId（若後端有支援）
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId: opRef.current.requestId }),
    });
    setPhase("awaitingRf");
  }, []);

  // ===== 圖表資料整備 =====
  const yTicks = useMemo(() => {
    if (!spectrumRows.length) return undefined;
    const all = spectrumRows.reduce(
      (acc, r) => {
        if (isFinite(r?.outputPower)) acc.min = Math.min(acc.min, r.outputPower);
        if (isFinite(r?.inputPower)) acc.min = Math.min(acc.min, r.inputPower);
        if (isFinite(r?.gain)) acc.min = Math.min(acc.min, r.gain);
        if (isFinite(r?.outputPower)) acc.max = Math.max(acc.max, r.outputPower);
        if (isFinite(r?.inputPower)) acc.max = Math.max(acc.max, r.inputPower);
        if (isFinite(r?.gain)) acc.max = Math.max(acc.max, r.gain);
        return acc;
      },
      { min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY }
    );
    if (!isFinite(all.min) || !isFinite(all.max)) return undefined;
    return makeNiceTicks(all.min, all.max, 7);
  }, [spectrumRows]);

  // 卸載清理
  useEffect(() => {
    return () => {
      clearSubscriptions();
      clearTimeout(timeoutRef.current);
    };
  }, [clearSubscriptions]);

  // ===== UI =====
  return (
    <Card>
      <Card.Header>
        <strong>Exhibit Spectrum (One-shot)</strong>{" "}
        {phase !== "idle" && (
          <Badge bg={phase === "done" ? "success" : phase === "error" ? "danger" : "secondary"} className="ms-2">
            {phase}
          </Badge>
        )}
      </Card.Header>
      <Card.Body>
        <Row className="g-3">
          <Col md={4}>
            <Form.Group className="mb-2">
              <Form.Label>Device EUI</Form.Label>
              <Form.Select
                value={selectedEui}
                onChange={(e) => setSelectedEui(e.target.value)}
                disabled={running}
              >
                {devices.map((d) => (
                  <option key={d.deviceEui} value={d.deviceEui}>
                    {d.deviceEui} {d?.gateway?.gatewayEui ? ` / GW: ${d.gateway.gatewayEui}` : ""}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Row>
              <Col>
                <Form.Group className="mb-2">
                  <Form.Label>Low power (dB)</Form.Label>
                  <Form.Control
                    inputMode="numeric"
                    value={lowPowerDb}
                    onChange={(e) => setLowPowerDb(e.target.value)}
                    placeholder="輸入 Low（可留空）"
                    disabled={running}
                  />
                </Form.Group>
              </Col>
              <Col>
                <Form.Group className="mb-2">
                  <Form.Label>High power (dB)</Form.Label>
                  <Form.Control
                    inputMode="numeric"
                    value={highPowerDb}
                    onChange={(e) => setHighPowerDb(e.target.value)}
                    placeholder="輸入 High（可留空）"
                    disabled={running}
                  />
                </Form.Group>
              </Col>
            </Row>

            <div className="d-flex align-items-center gap-2 mt-2">
              <Button
                variant="primary"
                onClick={handleApplyAndQuery}
                disabled={running || !selectedEui}
              >
                {running ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    處理中…
                  </>
                ) : (
                  "Apply settings & Query RF Power"
                )}
              </Button>

              {running && (
                <small className="text-muted">
                  全流程事件驅動（含逾時 {Math.round(timeoutMs / 1000)}s）
                </small>
              )}
            </div>

            {message && (
              <Alert variant={message.type} className="mt-3 mb-0">
                {message.text}
              </Alert>
            )}

            {timestamp && (
              <div className="mt-2">
                <small className="text-muted">Data time: {new Date(timestamp).toLocaleString("en-US")}</small>
              </div>
            )}
          </Col>

          <Col md={8}>
            {/* 條狀圖（Input 蓋過 Output） */}
            <div style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={spectrumRows}
                  margin={{ top: 12, right: 12, bottom: 16, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="frequency"
                    tickFormatter={(v) => `${v}`}
                    label={{ value: "Frequency", position: "insideBottom", offset: -6 }}
                    minTickGap={16}
                  />
                  <YAxis
                    ticks={yTicks}
                    label={{ value: "Power (dB)", angle: -90, position: "insideLeft" }}
                  />
                  <Tooltip />
                  <Legend />
                  {/* 先畫 Output（紅）再畫 Input（藍），藍色會覆蓋紅色 */}
                  <Bar name="Output" dataKey="outputPower" fill={COLORS.out} />
                  <Bar name="Input" dataKey="inputPower" fill={COLORS.in} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Gain 線圖（可選，若不要可移除） */}
            {spectrumRows.some(r => isFinite(r?.gain)) && (
              <div style={{ height: 220, marginTop: 12 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={spectrumRows}
                    margin={{ top: 8, right: 12, bottom: 8, left: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="frequency" />
                    <YAxis ticks={yTicks} />
                    <Tooltip />
                    <Legend />
                    <Line
                      name="Gain"
                      type="monotone"
                      dataKey="gain"
                      dot={false}
                      stroke={COLORS.gain}
                      strokeWidth={2}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
}
