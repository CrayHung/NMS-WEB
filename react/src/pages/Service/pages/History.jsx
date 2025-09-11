import React, { useState, useEffect } from 'react'
import 'bootstrap/dist/css/bootstrap.min.css'
import { Table, Card, Form, Button, Row, Col, Badge, Pagination } from 'react-bootstrap'

import { formatDateTime } from '../../../utils/formatters'
import { apiUrl,apiFetch } from '../../../lib/api';

const History = () => {

    const [alarmLogs, setAlarmLogs] = useState([])
    const [currentPage, setCurrentPage] = useState(0)
    const [totalPages, setTotalPages] = useState(0)
    const [filters, setFilters] = useState({
        deviceEui: '',
        alarmType: '',
        alarmLevel: '',
        days: 7
    })
    const [loading, setLoading] = useState(false)
    const [devices, setDevices] = useState([]) // for devices list

    useEffect(() => {
        loadDevices()
        console.log("loadDevices :" + devices);
    }, [])

    useEffect(() => {
        loadAlarmLogs()
    }, [currentPage, filters])

    const loadDevices = async () => {
        try {
            // const url = "http://61.216.140.11:9002/api/amplifier/devices";
            const url = apiUrl("/amplifier/devices");
            const response = await fetch(url, { method: "GET" });

            if (!response.ok) {
                const t = await response.text().catch(() => "");
                throw new Error(`GET /devices failed (${response.status}): ${t || response.statusText}`);
            }
            const data = await response.json();

            console.log("data : ", JSON.stringify(data, null, 2));


            setDevices(Array.isArray(data.devices) ? data.devices : []);


        } catch (error) {
            console.error('Failed to load devices:', error)
        }
    }

    const loadAlarmLogs = async () => {
        try {
            setLoading(true);

            const end = new Date();
            const start = new Date();
            start.setDate(end.getDate() - (Number(filters.days) || 7));

            // const BASE = "http://61.216.140.11:9002/api/amplifier/alarms";
            const url = apiUrl("/amplifier/alarms");

            // 按原本邏輯：空字串就不帶；alarmLevel 可選擇轉數字
            const paramsRaw = {
                deviceEui: filters.deviceEui || undefined,
                alarmType: filters.alarmType || undefined,
                alarmLevel:
                    filters.alarmLevel === ""
                        ? undefined
                        : (/^\d+$/.test(filters.alarmLevel)
                            ? Number(filters.alarmLevel)
                            : filters.alarmLevel),
                start: start.toISOString(),
                end: end.toISOString(),
                page: currentPage, // 0-based
                size: 50,
            };

            // 過濾 undefined/null/空字串，避免 ?key=undefined
            const cleaned = Object.fromEntries(
                Object.entries(paramsRaw).filter(([, v]) => v !== undefined && v !== null && v !== "")
            );

            const qs = new URLSearchParams(cleaned).toString();
            const urlWithQs = `${url}?${qs}`;

            const res = await fetch(urlWithQs, { method: "GET" });
            if (!res.ok) {
                const t = await res.text().catch(() => "");
                throw new Error(`GET /amplifier/alarms failed (${res.status}): ${t || res.statusText}`);
            }

            const data = await res.json();
            console.log("alarms:", JSON.stringify(data, null, 2));

            setAlarmLogs(Array.isArray(data?.content) ? data.content : []);
            setTotalPages(Number.isFinite(data?.totalPages) ? data.totalPages : 0);
        } catch (error) {
            console.error("Failed to load alarm logs:", error);
        } finally {
            setLoading(false);
        }
    };



    return (
        <>
            <Card>
                <Card.Body>
                    <h5>Alarm History Log</h5>

                    {/* filter */}
                    <Row className="mb-3">
                        <Col md={3}>
                            <Form.Select
                                value={filters.deviceEui}
                                onChange={(e) => {
                                    setFilters({ ...filters, deviceEui: e.target.value })
                                    setCurrentPage(0) // reset 頁碼到第1頁
                                }}
                            >
                                <option value="">All Devices</option>
                                {devices.map(device => (
                                    <option key={device.deviceEui} value={device.deviceEui}>
                                        {device.partName || device.deviceEui}
                                        {device.gateway && ` (GW: ${device.gateway.gatewayEui.slice(-8)})`}
                                    </option>
                                ))}
                            </Form.Select>
                        </Col>
                        <Col md={2}>
                            <Form.Select
                                value={filters.alarmType}
                                onChange={(e) => {
                                    setFilters({ ...filters, alarmType: e.target.value })
                                    setCurrentPage(0) // reset page
                                }}
                            >
                                <option value="">All Types</option>
                                <option value="TEMPERATURE">Temperature</option>
                                <option value="VOLTAGE">Voltage</option>
                                <option value="RIPPLE">Ripple</option>
                                <option value="POWER">Power</option>
                            </Form.Select>
                        </Col>
                        <Col md={2}>
                            <Form.Select
                                value={filters.alarmLevel}
                                onChange={(e) => {
                                    setFilters({ ...filters, alarmLevel: e.target.value })
                                    setCurrentPage(0) // reset page
                                }}
                            >
                                <option value="">All Levels</option>
                                <option value="0">Info</option>
                                <option value="1">Warning</option>
                                <option value="2">Critical</option>
                            </Form.Select>
                        </Col>
                        <Col md={2}>
                            <Form.Select
                                value={filters.days}
                                onChange={(e) => {
                                    setFilters({ ...filters, days: parseInt(e.target.value) })
                                    setCurrentPage(0) // reset page
                                }}
                            >
                                <option value={1}>Last 24 Hours</option>
                                <option value={7}>Last 7 Days</option>
                                <option value={30}>Last 30 Days</option>
                            </Form.Select>
                        </Col>
                        <Col md={2}>
                            <Button onClick={loadAlarmLogs} disabled={loading}>
                                Search
                            </Button>
                        </Col>
                    </Row>

                    {/* 警告日誌表格 */}
                    <Table hover responsive>
                        <thead>
                            <tr>
                                <th>Time</th>
                                <th>Device</th>
                                <th>Type</th>
                                <th>Level</th>
                                <th>Message</th>
                                <th>Value</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {alarmLogs.map(log => (
                                <tr key={log.id}>
                                    <td>{log.createdAt}</td>
                                    <td>
                                        <div>{log.deviceName || log.deviceEui}</div>
                                        <small className="text-muted">{log.deviceEui}</small>
                                    </td>
                                    <td>{log.alarmType}</td>
                                    <td>
                                        <Badge bg={
                                            log.alarmLevel === 2 ? 'danger' :
                                                log.alarmLevel === 1 ? 'warning' : 'info'
                                        }>
                                            {log.alarmLevel === 2 ? 'Critical' :
                                                log.alarmLevel === 1 ? 'Warning' : 'Info'}
                                        </Badge>
                                    </td>
                                    <td>{log.alarmMessage}</td>
                                    <td>
                                        {log.alarmValue?.toFixed(1)}
                                        {log.thresholdValue && ` (Threshold: ${log.thresholdValue})`}
                                    </td>
                                    <td>
                                        {log.resolved ? (
                                            <Badge bg="success">Resolved</Badge>
                                        ) : log.acknowledged ? (
                                            <Badge bg="secondary">Acknowledged</Badge>
                                        ) : (
                                            <Badge bg="danger">Active</Badge>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>

                    {/* 分頁控制 */}
                    <Pagination>
                        <Pagination.First onClick={() => setCurrentPage(0)} disabled={currentPage === 0} />
                        <Pagination.Prev onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 0} />
                        <Pagination.Item active>{currentPage + 1}</Pagination.Item>
                        <Pagination.Next onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage >= totalPages - 1} />
                        <Pagination.Last onClick={() => setCurrentPage(totalPages - 1)} disabled={currentPage >= totalPages - 1} />
                    </Pagination>
                </Card.Body>
            </Card>
        </>

    );
}

export default History;




