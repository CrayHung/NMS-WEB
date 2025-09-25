import React, { useState, useEffect } from 'react'
import 'bootstrap/dist/css/bootstrap.min.css';
import { Table, Card, Form, Button, Alert, Spinner, Row, Col } from 'react-bootstrap'
import { Line } from 'recharts'
import {
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
// import { amplifierAPI } from '../../services/api'
import { apiUrl,apiFetch } from '../../../lib/api';

import {
  formatDateTime,
  formatShortDateTime,
  formatTemperature,
  formatVoltage,
  formatPower
} from '../../../utils/formatters'

const DeviceHistory = () => {
  // State management
  const [devices, setDevices] = useState([])
  const [selectedDevice, setSelectedDevice] = useState('')
  const [historyData, setHistoryData] = useState([])
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [timeRange, setTimeRange] = useState(24) // Default to 24 hours

  // 時間間隔
  const [interval, setInterval] = useState('1 hour')

  // Load device list on component mount
  useEffect(() => {
    loadDevices()
  }, [])

  // Load history data when device or time range changes
  useEffect(() => {
    if (selectedDevice) {
      loadHistoryData()
      loadChartData()
    }
  }, [selectedDevice, timeRange, interval])

  // useEffect(() => {
  //   console.log("setDevices : ", JSON.stringify(devices, null, 2));
  // }, [devices])

  // useEffect(() => {
  //   console.log("setSelectedDevice : ", JSON.stringify(selectedDevice, null, 2));
  // }, [selectedDevice])


  useEffect(() => {
    console.log("setHistoryData : ", JSON.stringify(historyData, null, 2));
  }, [historyData])
  useEffect(() => {
    console.log("chartData : ", JSON.stringify(chartData, null, 2));
  }, [chartData])

  // Load all devices for selection
  const loadDevices = async () => {
    const ac = new AbortController();
    try {
      const response = await apiFetch('/amplifier/devices', { method: 'GET', signal: ac.signal }); 
      // const url = `http://61.216.140.11:9002/api/amplifier/devices`;
      // const response = await fetch(url, { method: "GET", signal: ac.signal });
      if (!response.ok) {
        const t = await response.text().catch(() => "");
        throw new Error(`GET /status/${deviceEui}/chart failed (${response.status}): ${t || response.statusText}`);
      }

      const data = await response.json();
      setDevices(Array.isArray(data.devices) ? data.devices : []);

      const firstEui =
      Array.isArray(data?.devices)
        ? data.devices.find(
            (d) => d && typeof d.deviceEui === "string" && d.deviceEui.trim() !== ""
          )?.deviceEui
        : undefined;
    
    if (firstEui) {
      setSelectedDevice(firstEui);
    }
    console.log("selectedDevice : ", JSON.stringify(selectedDevice, null, 2));

      console.log("setDevices : ", JSON.stringify(devices, null, 2));

      setSelectedDevice(data[0].deviceEui)


    } catch (err) {
      console.error('Failed to load devices:', err)
      setError('Failed to load devices')
    }
  }

  // Load history data
  const loadHistoryData = async () => {
    if (!selectedDevice) return
    const ac = new AbortController();
    try {
      setLoading(true)
      setError(null)

      // Calculate time range
      const now = new Date()
      const start = new Date(now.getTime() - timeRange * 60 * 60 * 1000)
      const end = new Date();

      const controller = new AbortController();

      // 後端要求：YYYY-MM-DDTHH:mm:ss（不含毫秒）
      // 這裡用 ISO 去掉毫秒與尾端 Z；若要 +08:00 見下方備註
      const toQueryTime = (v) =>
        (v instanceof Date ? v : new Date(v)).toISOString().slice(0, 19) + "+08:00";

      
      // 直接把 start / end 串在 URL 後面（記得做編碼）
      // const url =
      //   `http://61.216.140.11:9002/api/amplifier/status/${encodeURIComponent(selectedDevice)}/history` +
      //   `?start=${encodeURIComponent(toQueryTime(start))}` +
      //   `&end=${encodeURIComponent(toQueryTime(end))}`;

      const path = `/amplifier/status/${encodeURIComponent(selectedDevice)}/history`;
      const params = new URLSearchParams({
        start: toQueryTime(start),
        end: toQueryTime(end),
      });
      
      const url = `${apiUrl(path)}?${params.toString()}`;

      try {
        const res = await fetch(url, {
          method: "GET",
          signal: ac.signal,
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status} ${res.statusText}`);
        }

        const data = await res.json();
        // 後端回傳應該是陣列，保險起見做個防呆
        setHistoryData(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("fetch history failed:", e);
        setHistoryData([]); // 失敗也不要讓畫面炸掉
      }

    } catch (err) {
      console.error('Failed to load history:', err)
      setError('Failed to load history')
      setHistoryData([])
    } finally {
      setLoading(false)
    }
  }

  // Load chart data
  const loadChartData = async () => {
    if (!selectedDevice) return
    const ac = new AbortController();
    try {
      // add interval
      // const url =
      //   `http://61.216.140.11:9002/api/amplifier/status/${encodeURIComponent(selectedDevice)}/chart` +
      //   `?${timeRange}` +
      //   `&${interval}`;


      const url =
      `/api/amplifier/status/${encodeURIComponent(selectedDevice)}/chart` +
      `?${timeRange}` +
      `&${interval}`;
        
      // const url = `http://61.216.140.11:9002/api/amplifier/status/${selectedDevice}/chart`;
      const response = await fetch(url, { method: "GET", signal: ac.signal });

      const data = await response.json();

      const raw = Array.isArray(data?.data) ? data.data : [];
      const toNum = (v) =>
        v === null || v === undefined || v === "" ? null : Number.parseFloat(String(v));

      const chartData = rows
        // 丟掉空物件與沒有 time 的資料
        .filter((x) => x && typeof x === "object" && Object.keys(x).length > 0 && x.time)
        // 依實際時間升冪排序
        .sort((a, b) => Date.parse(a.time) - Date.parse(b.time))
        // 只保留並格式化需要的欄位
        .map((item) => ({
          time: formatShortDateTime(item.time),
          avgTemp: toNum(item.avgTemp),
          avgVoltage: toNum(item.avgVoltage),
          avgCurrent: toNum(item.avgCurrent),
          avgPilotLow: toNum(item.avgPilotLow),
          avgPilotHigh: toNum(item.avgPilotHigh),
          avgSlope: toNum(item.avgSlope),
          // 若也需要 min/max 溫度，打開下面兩行即可
          // maxTemp: toNum(item.maxTemp),
          // minTemp: toNum(item.minTemp),
        }));
      setChartData(formatted)

    } catch (err) {
      console.error('Failed to load chart data:', err)
      setChartData([])
    }
  }

  // Handle time range change
  const handleTimeRangeChange = (hours) => {
    setTimeRange(hours)
  }

  // Reload data
  const handleRefresh = () => {
    loadHistoryData()
    loadChartData()
  }

  return (
    <div>
      {/* Control Panel */}
      <Card className="mb-3">
        <Card.Body>
          <Row>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Select Device</Form.Label>
                <Form.Select
                  value={selectedDevice}
                  onChange={(e) => setSelectedDevice(e.target.value)}
                >
                  <option value="">Please select a device...</option>
                  {devices.map(device => (
                    <option key={device.deviceEui} value={device.deviceEui}>
                      {device.deviceEui} - {device.partName || 'Unnamed'}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Time Range</Form.Label>
                <Form.Select
                  value={timeRange}
                  onChange={(e) => handleTimeRangeChange(parseInt(e.target.value))}
                >
                  <option value={1}>Last 1 Hour</option>
                  <option value={6}>Last 6 Hours</option>
                  <option value={12}>Last 12 Hours</option>
                  <option value={24}>Last 24 Hours</option>
                  <option value={48}>Last 48 Hours</option>
                  <option value={168}>Last 7 Days</option>
                </Form.Select>
              </Form.Group>
            </Col>
            {/* 增 time interval下拉選單 */}
            <Col md={3}> {/* 調整欄位寬度 */}
              <Form.Group>
                <Form.Label>Interval</Form.Label>
                <Form.Select
                  value={interval}
                  onChange={(e) => setInterval(e.target.value)}
                >
                  <option value="10 minutes">10 Minutes</option>
                  <option value="30 minutes">30 Minutes</option>
                  <option value="1 hour">1 Hour</option>
                  <option value="2 hours">2 Hours</option>
                </Form.Select>
              </Form.Group>
            </Col>
            {/* <Col md={2} className="d-flex align-items-end">
              <Button
                variant="primary"
                onClick={handleRefresh}
                disabled={!selectedDevice || loading}
              >
                Reload
              </Button>
            </Col> */}
          </Row>
        </Card.Body>
      </Card>

      {/* {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )} */}

      {/* Charts Area */}
      {selectedDevice && chartData.length > 0 && (
        <Card className="mb-3">
          <Card.Body>
            <h5>Historical Trend Charts</h5>

            {/* Temperature Trend */}
            <div className="mb-4">
              <h6>Temperature Trend</h6>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="avgTemp"
                    stroke="#8884d8"
                    name="Avg. Temperature (°C)"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Voltage Trend */}
            <div className="mb-4">
              <h6>Voltage Trend</h6>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="avgVoltage"
                    stroke="#82ca9d"
                    name="Avg. Voltage (V)"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Pilot Power Trend */}
            <div className="mb-4">
              <h6>Pilot Power Trend</h6>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="avgPilotLow"
                    stroke="#ffc658"
                    name="Low Pilot (dBmV)"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="avgPilotHigh"
                    stroke="#ff7c7c"
                    name="High Pilot (dBmV)"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* History Data Table */}
      <Card>
        <Card.Body>
          <h5>Detailed History Log</h5>

          {loading ? (
            <div className="text-center py-4">
              <Spinner animation="border" />
              <p className="mt-2">Loading...</p>
            </div>
          ) : (
            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              <Table hover responsive size="sm" className="data-table">
                <thead style={{ position: 'sticky', top: 0, backgroundColor: 'white' }}>
                  <tr>
                    <th>Time</th>
                    <th>Status</th>
                    <th>Temperature</th>
                    <th>Voltage</th>
                    <th>Ripple</th>
                    <th>Output Power</th>
                    <th>Low Pilot</th>
                    <th>High Pilot</th>
                    <th>Slope</th>
                    <th>Temp. Alarm</th>
                    <th>Volt. Alarm</th>
                  </tr>
                </thead>
                <tbody>
                  {historyData.map((record, index) => (
                    <tr key={`${record.deviceEui}-${record.createdAt}-${index}`}>
                      <td>{formatDateTime(record.createdAt)}</td>
                      <td>{record.statusText || '-'}</td>
                      <td>{formatTemperature(record.temperature)}</td>
                      <td>{formatVoltage(record.voltage)}</td>
                      <td>
                        {record.ripple !== null ? `${record.ripple} mV` : '-'}
                      </td>
                      <td>{formatPower(record.rfOutputPower)}</td>
                      <td>{formatPower(record.pilotLowPower)}</td>
                      <td>{formatPower(record.pilotHighPower)}</td>
                      <td>
                        {record.outputSlope !== null
                          ? `${record.outputSlope.toFixed(1)} dB`
                          : '-'}
                      </td>
                      <td>
                        <span className={record.tempAlarmStatus > 0 ? 'text-danger' : 'text-success'}>
                          {record.tempAlarmStatus > 0 ? 'Alarm' : 'Normal'}
                        </span>
                      </td>
                      <td>
                        <span className={record.voltAlarmStatus > 0 ? 'text-danger' : 'text-success'}>
                          {record.voltAlarmStatus > 0 ? 'Alarm' : 'Normal'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>

              {historyData.length === 0 && !loading && (
                <div className="text-center text-muted py-4">
                  {selectedDevice ? 'No history data for this time range' : 'Please select a device'}
                </div>
              )}
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  )
}

export default DeviceHistory