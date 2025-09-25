import React, { useState, useEffect, useRef } from 'react'
import { Card, Form, Button, Alert, Row, Col, Table, Badge, Spinner } from 'react-bootstrap'
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
// import { amplifierAPI } from '../../services/api'
import { apiUrl, apiFetch } from '../../lib/api';
import wsService from '../../service/websocket'
import { formatDateTime } from '../../utils/formatters'
import { FiSend, FiCheck, FiClock } from 'react-icons/fi'

import { amplifierAPI } from './api'

const CommandTest = () => {
    // Device list and selection
    const [devices, setDevices] = useState([])
    const [selectedDevice, setSelectedDevice] = useState('')
    const [commandType, setCommandType] = useState('status')

    // Request and response status
    const [loading, setLoading] = useState(false)
    const [requestTime, setRequestTime] = useState(null)
    const [responseTime, setResponseTime] = useState(null)
    const [requestId, setRequestId] = useState(null)

    // Response data
    const [beforeData, setBeforeData] = useState(null)
    const [afterData, setAfterData] = useState(null)
    const [rfPowerData, setRfPowerData] = useState(null)

    // WebSocket connection status
    const [wsConnected, setWsConnected] = useState(false)
    const [message, setMessage] = useState(null)

    // Track the current pending request
    const pendingRequestRef = useRef(null)


    useEffect(() => {
        // Load device list
        const loadDevices = async () => {
            const ac = new AbortController();
            try {

                const response = await apiFetch('/amplifier/devices', { method: 'GET', signal: ac.signal });

                //   const response = await amplifierAPI.getAllDevices()
                if (!response.ok) {
                    const t = await response.text().catch(() => "");
                    throw new Error(`GET /amplifier/devices/ fail`);
                }
                const data = await response.json();

                setDevices(data.devices)

                setSelectedDevice(data.devices[0].deviceEui)
                console.log("setSelectedDevice : "+data.devices[0].deviceEui);
                // Load current status for the first device
                loadCurrentStatus(data.devices[0].deviceEui)


            } catch (error) {
                console.error('Failed to load devices:', error)
                setMessage({ type: 'danger', text: 'Failed to load device list' })
            }
        }

        loadDevices()
        initWebSocket()

        return () => {
            wsService.unsubscribe('/topic/command-response')
            wsService.unsubscribe('/topic/device-status')
            wsService.unsubscribe('/topic/rf-power-complete')
        }
    }, [])



    // Load current status as "before" data
    const loadCurrentStatus = async (deviceEui) => {
        try {
            const url = apiUrl(`/amplifier/status/${encodeURIComponent(deviceEui)}/current`);
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            const json = await res.json();

            //   const status = await amplifierAPI.getCurrentStatus(deviceEui)
            setBeforeData(json)
        } catch (error) {
            console.error('Failed to load current status:', error)
        }
    }

    // Initialize WebSocket connection
    const initWebSocket = () => {
        wsService.connect(() => {
            console.log('WebSocket connected (Test Page)')
            setWsConnected(true)

            // Subscribe to command response topic
            wsService.subscribe('/topic/command-response', (data) => {
                handleCommandResponse(data)
            })

            // Subscribe to device status updates
            wsService.subscribe('/topic/device-status', (data) => {
                handleDeviceStatusUpdate(data)
            })

            // Subscribe to RF Power completion event
            wsService.subscribe('/topic/rf-power-complete', (data) => {
                handleRfPowerComplete(data)
            })
        })
    }

    // Handle command response
    const handleCommandResponse = (data) => {

        console.log("receive data from command-response start");
        // Check if this is the response we are waiting for
        if (pendingRequestRef.current &&
            data.deviceEui === pendingRequestRef.current.deviceEui &&
            data.commandType === pendingRequestRef.current.commandType) {

            console.log("receive data from command-response start 1");

            setResponseTime(new Date())
            setAfterData(data.responseData)
            setLoading(false)
            setMessage({
                type: 'success',
                text: `Received ${data.commandType} response`
            })

            console.log("receive data from command-response start 2 ");

            // Clear pending flag
            pendingRequestRef.current = null
            console.log("receive data from command-response end");
        }
    }

    // Handle device status update
    const handleDeviceStatusUpdate = (data) => {
        // In this specific test component, we should only rely on the '/topic/command-response'
        // message as the definitive result of a command.
        // The '/topic/device-status' message is a general broadcast with partial data,
        // which can overwrite the complete data we are waiting for.
        // Therefore, we will ignore this update within the context of this component.

 //        console.log('Received a general device status update (ignored by CommandTest):', data);

        /*
        // If waiting for a response and the device EUI matches
        if (pendingRequestRef.current && 
            data.deviceEui === pendingRequestRef.current.deviceEui) {
          
          // Check if this is the corresponding response based on command type
          const cmdType = pendingRequestRef.current.commandType
          if (cmdType === 'status' || cmdType === 'settings' || cmdType === 'model') {
            setResponseTime(new Date())
            setAfterData(data)
            setLoading(false)
            setMessage({ 
              type: 'success', 
              text: `Received device status update` 
            })
            
            // Clear pending flag
            pendingRequestRef.current = null
          }
        }
        */
    }

    // Handle RF Power completion event
    const handleRfPowerComplete = (data) => {
        console.log("handle RfPower start");

        if (pendingRequestRef.current &&
            data.deviceEui === pendingRequestRef.current.deviceEui &&
            pendingRequestRef.current.commandType === 'rf-power') {

            console.log("pendingRequestRef : "+pendingRequestRef.current);

            setResponseTime(new Date())
            setRfPowerData(data)
            setLoading(false)
            setMessage({
                type: 'success',
                text: 'RF Power data collection complete'
            })

            console.log("handle RfPower Complete end");
            // Clear pending flag
            pendingRequestRef.current = null
  
        }
    }

    // Send command
    const sendCommand = async () => {
        console.log("sendCommand start 1")
        if (!selectedDevice) {
            setMessage({ type: 'warning', text: 'Please select a device' })
            return
        }

        console.log("sendCommand start 2")
        setLoading(true)
        setMessage(null)
        setAfterData(null)
        setRfPowerData(null)
        setRequestTime(new Date())
        setResponseTime(null)
        console.log("sendCommand start 3")

        // Generate request ID
        const reqId = `${selectedDevice}-${commandType}-${Date.now()}`
        setRequestId(reqId)
        console.log("sendCommand start 4 : "+reqId);

        // Set pending flag
        pendingRequestRef.current = {
            deviceEui: selectedDevice,
            commandType: commandType,
            requestId: reqId,
            timestamp: Date.now()
        }

        console.log("sendCommand start 5"+pendingRequestRef.current.deviceEui);

        try {
            // Call the corresponding API based on command type
            switch (commandType) {
                case 'status':
                    // await amplifierAPI.queryStatus(selectedDevice)
                    await amplifierAPI.queryStatus(selectedDevice)
                    break
                case 'settings':
                    await amplifierAPI.querySettings(selectedDevice)
                    break
                case 'model':
                    await amplifierAPI.queryModelInfo(selectedDevice)
                    break
                case 'rf-power':
                    await amplifierAPI.queryAllRFPower(selectedDevice)
                    break
                default:
                    throw new Error('Unknown command type')
            }
            console.log("sendCommand start 6 commandType : "+commandType);

            setMessage({
                type: 'info',
                text: `Command sent, waiting for device response...`
            })
       

            // Set timeout handler (30 seconds)
            setTimeout(() => {
                if (pendingRequestRef.current?.requestId === reqId) {
                    setLoading(false)
                    setMessage({
                        type: 'warning',
                        text: 'Response timeout (30 sec)'
                    })
                    pendingRequestRef.current = null
                }
            }, 90000)

        } catch (error) {
            console.error('Failed to send command:', error)
            setLoading(false)
            setMessage({
                type: 'danger',
                text: `Failed to send command: ${error.message}`
            })
            pendingRequestRef.current = null
        }
    }

    // When device selection changes, load its current status
    const handleDeviceChange = (deviceEui) => {
        setSelectedDevice(deviceEui)
        setAfterData(null)
        setRfPowerData(null)
        setMessage(null)
        if (deviceEui) {
            loadCurrentStatus(deviceEui)
        }
    }

    // Render data comparison table
    const renderDataComparison = () => {
        if (!beforeData && !afterData) return null

        const fields = [
            { key: 'partName', label: 'Device Name' },
            { key: 'partNumber', label: 'Model' },
            { key: 'serialNumber', label: 'Serial No.' },
            { key: 'hwVersion', label: 'HW Version' },
            { key: 'fwVersion', label: 'FW Version' },
            { key: 'location', label: 'Location' },
            { key: 'temperature', label: 'Temperature', format: v => v ? `${v}°C` : '-' },
            { key: 'voltage', label: 'Voltage', format: v => v ? `${v}V` : '-' },
            { key: 'ripple', label: 'Ripple', format: v => v ? `${v}mV` : '-' },
            { key: 'rfOutputPower', label: 'Output Power', format: v => v ? `${v} dBmV` : '-' },
            { key: 'tempHighAlarm', label: 'High Temp Alarm', format: v => v ? `${v}°C` : '-' },
            { key: 'tempLowAlarm', label: 'Low Temp Alarm', format: v => v ? `${v}°C` : '-' },
            { key: 'voltHighAlarm', label: 'High Volt Alarm', format: v => v ? `${v}V` : '-' },
            { key: 'voltLowAlarm', label: 'Low Volt Alarm', format: v => v ? `${v}V` : '-' },
        ]

        return (
            <Table hover responsive size="sm">
                <thead>
                    <tr>
                        <th width="30%">Field</th>
                        <th width="35%">Before Request</th>
                        <th width="35%">After Request</th>
                    </tr>
                </thead>
                <tbody>
                    {fields.map(field => {
                        const beforeValue = beforeData?.[field.key]
                        const afterValue = afterData?.[field.key]
                        const formatter = field.format || (v => v || '-')
                        const hasChanged = beforeValue !== afterValue && afterData

                        return (
                            <tr key={field.key}>
                                <td><strong>{field.label}</strong></td>
                                <td>{formatter(beforeValue)}</td>
                                <td>
                                    <span className={hasChanged ? 'text-primary fw-bold' : ''}>
                                        {formatter(afterValue)}
                                        {hasChanged && ' ✓'}
                                    </span>
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </Table>
        )
    }

    // Render RF Power chart
    const renderRfPowerChart = () => {
        if (!rfPowerData) return null

        // Prepare chart data
        const chartData = []
        const frequencies = new Set()

        // Collect all frequency points
        Object.values(rfPowerData.inputPower || {}).forEach(part => {
            Object.keys(part).forEach(freq => frequencies.add(parseInt(freq)))
        })
        Object.values(rfPowerData.outputPower || {}).forEach(part => {
            Object.keys(part).forEach(freq => frequencies.add(parseInt(freq)))
        })

        // Sort frequencies
        const sortedFreqs = Array.from(frequencies).sort((a, b) => a - b)

        // Create chart data
        sortedFreqs.forEach(freq => {
            const point = { frequency: freq }

            // Find input power
            Object.values(rfPowerData.inputPower || {}).forEach(part => {
                if (part[freq] !== undefined) {
                    point.inputPower = part[freq]
                }
            })

            // Find output power
            Object.values(rfPowerData.outputPower || {}).forEach(part => {
                if (part[freq] !== undefined) {
                    point.outputPower = part[freq]
                }
            })

            // Calculate gain
            if (point.inputPower !== undefined && point.outputPower !== undefined) {
                point.gain = point.outputPower - point.inputPower
            }

            chartData.push(point)
        })

        return (
            <div>
                <h6>RF Power Spectrum Chart</h6>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                            dataKey="frequency"
                            label={{ value: 'Frequency (MHz)', position: 'insideBottom', offset: -5 }}
                        />
                        <YAxis
                            label={{ value: 'Power (dBmV)', angle: -90, position: 'insideLeft' }}
                        />
                        <Tooltip />
                        <Legend />
                        <Line
                            type="monotone"
                            dataKey="inputPower"
                            stroke="#8884d8"
                            name="Input Power"
                            strokeWidth={2}
                            dot={false}
                        />
                        <Line
                            type="monotone"
                            dataKey="outputPower"
                            stroke="#82ca9d"
                            name="Output Power"
                            strokeWidth={2}
                            dot={false}
                        />
                        <Line
                            type="monotone"
                            dataKey="gain"
                            stroke="#ffc658"
                            name="Gain"
                            strokeWidth={2}
                            dot={false}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        )
    }

    return (
        <div>
            <Card className="mb-3">
                <Card.Body>
                    <h5 className="mb-3">Downlink Command Test Tool</h5>

                    {/* Control Panel */}
                    <Row className="mb-3">
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Select Device</Form.Label>
                                <Form.Select
                                    value={selectedDevice}
                                    onChange={(e) => handleDeviceChange(e.target.value)}
                                    disabled={loading}
                                >
                                    <option value="">Please select...</option>
                                    {devices.map(device => (
                                        <option key={device.deviceEui} value={device.deviceEui}>
                                            {device.deviceEui} - {device.partName || 'Unnamed'}
                                            {device.onlineStatus ? ' (Online)' : ' (Offline)'}
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>

                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>Command Type</Form.Label>
                                <Form.Select
                                    value={commandType}
                                    onChange={(e) => setCommandType(e.target.value)}
                                    disabled={loading}
                                >
                                    <option value="status">Query Status </option>
                                    <option value="settings">Query Settings </option>
                                    <option value="model">Query Model </option>
                                    <option value="rf-power">Query RF Power </option>
                                </Form.Select>
                            </Form.Group>
                        </Col>

                        <Col md={2}>
                            <Form.Group>
                                <Form.Label>&nbsp;</Form.Label>
                                <div>
                                    <Button
                                        variant="primary"
                                        onClick={sendCommand}
                                        disabled={!selectedDevice || loading || !wsConnected}
                                        className="w-100"
                                    >
                                        {loading ? (
                                            <>
                                                <Spinner animation="border" size="sm" className="me-2" />
                                                Waiting...
                                            </>
                                        ) : (
                                            <>
                                                <FiSend className="me-2" />
                                                Send
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </Form.Group>
                        </Col>

                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>Connection Status</Form.Label>
                                <div>
                                    <Badge bg={wsConnected ? 'success' : 'danger'}>
                                        WebSocket: {wsConnected ? 'Connected' : 'Disconnected'}
                                    </Badge>
                                </div>
                            </Form.Group>
                        </Col>
                    </Row>

                    {/* Message Alert */}
                    {message && (
                        <Alert
                            variant={message.type}
                            dismissible
                            onClose={() => setMessage(null)}
                        >
                            {message.text}
                        </Alert>
                    )}

                    {/* Timestamps */}
                    <Row className="mb-3">
                        <Col>
                            <div className="d-flex gap-4 text-muted">
                                {requestTime && (
                                    <span>
                                        <FiClock className="me-1" />
                                        Sent: {formatDateTime(requestTime)}
                                    </span>
                                )}
                                {responseTime && (
                                    <span>
                                        <FiCheck className="me-1 text-success" />
                                        Received: {formatDateTime(responseTime)}
                                    </span>
                                )}
                                {requestTime && responseTime && (
                                    <span>
                                        Duration: {((responseTime - requestTime) / 1000).toFixed(1)} s
                                    </span>
                                )}
                            </div>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {/* Data Comparison Table */}
            {(beforeData || afterData) && (
                <Card className="mb-3">
                    <Card.Body>
                        <h5>Data Comparison</h5>
                        {renderDataComparison()}
                    </Card.Body>
                </Card>
            )}

            {/* RF Power Chart */}
            {/* {rfPowerData && (
                <Card>
                    <Card.Body>
                        {renderRfPowerChart()}
                        <div className="mt-3">
                            <small className="text-muted">
                                Collection Time: {rfPowerData.collectionTimeMs ?
                                    `${(rfPowerData.collectionTimeMs / 1000).toFixed(1)} s` :
                                    'N/A'}
                            </small>
                        </div>
                    </Card.Body>
                </Card>
            )} */}
        </div>
    )
}

export default CommandTest