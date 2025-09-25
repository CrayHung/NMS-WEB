// Firmware.jsx
import React, { useEffect, useState, useRef } from "react";
import {
    Card, Row, Col, Button, Form, Table, ProgressBar, Tabs, Tab,
    Modal, Spinner, Alert
} from "react-bootstrap";

import { apiUrl, apiFetch } from '../../../lib/api';

/**
 * Firmware.jsx
 * - 讀 /api/devices (預期格式: { alarmed, devices: [...], count, online })
 * - 以 gateway.gatewayEui 當作 group
 * - 顯示 deviceEui, gatewayEui, fwVersion, unitStatus
 * - 支援 select group (gatewayEui)、canary(用 deviceEui)、批次、排程、上傳韌體 (前端 template)
 * - 保持 react-bootstrap 風格
 */

export default function Firmware() {
    const [rawPayload, setRawPayload] = useState(null);
    const [devices, setDevices] = useState([]); // normalized devices
    const [groups, setGroups] = useState([]); // gatewayEui list

    const [selectedGroups, setSelectedGroups] = useState([]);
    const [canaryIds, setCanaryIds] = useState([]); // deviceEui
    const [batchSize, setBatchSize] = useState(10);
    const [scheduleAt, setScheduleAt] = useState("");

    const [firmwareFile, setFirmwareFile] = useState(null);
    const [firmwareMeta, setFirmwareMeta] = useState(null);

    const [rolloutId, setRolloutId] = useState(null);
    const [progress, setProgress] = useState(null);
    const [logs, setLogs] = useState([]);
    const [records, setRecords] = useState([]);

    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);
    // 記錄剛剛成功上傳的檔名
    const [uploadedFilename, setUploadedFilename] = useState(null);

    const [showTechModal, setShowTechModal] = useState(false);
    const techRef = useRef(null);
    const wsRef = useRef(null);
    const fileInputRef = useRef(null);

    // --- fetch devices and normalize fields ---
    useEffect(() => { fetchDevices(); }, []);

    async function fetchDevices() {
        setLoading(true);
        setError(null);
        try {
            const url = apiUrl("/amplifier/devices");
            const res = await fetch(url, { method: "GET" });
            if (!res.ok) throw new Error("fetch devices failed");
            const json = await res.json();
            setRawPayload(json);

            const list = (json.devices || []).map((d) => ({
                deviceEui: d.deviceEui,
                name: d.partName || d.serialNumber || d.deviceEui,
                partNumber: d.partNumber,
                serialNumber: d.serialNumber,
                hwVersion: d.hwVersion,
                fwVersion: d.fwVersion,
                location: d.location,
                gatewayEui: d.gateway?.gatewayEui || "unknown",
                gatewayName: d.gateway?.name || null,
                unitStatus: d.unitStatus,
                statusText: d.statusText,
                onlineStatus: d.onlineStatus,
                lastSeen: d.lastSeen,
            }));

            setDevices(list);
            // derive groups
            const gwSet = new Set(list.map((x) => x.gatewayEui || "unknown"));
            setGroups(Array.from(gwSet).sort());
        } catch (e) {
            console.error(e);
            setError("載入設備失敗：" + (e.message || e));
            setDevices([]);
            setGroups([]);
        } finally {
            setLoading(false);
        }
    }

    // --- toggle helpers ---
    function toggleGroup(g) {
        setSelectedGroups((s) => (s.includes(g) ? s.filter(x => x !== g) : [...s, g]));
    }
    function toggleCanary(deviceEui) {
        setCanaryIds((s) => (s.includes(deviceEui) ? s.filter(x => x !== deviceEui) : [...s, deviceEui]));
    }

    // handle file selection from hidden input
    function handleFileSelect(e) {
        const f = e.target.files ? e.target.files[0] : null;
        setFirmwareFile(f);
        // if previously uploaded a different file, require re-upload
        if (firmwareMeta && uploadedFilename && f && f.name !== uploadedFilename) {
            setFirmwareMeta(null);
            setUploadedFilename(null);
            setLogs(s => [...s, `[${new Date().toLocaleTimeString()}] New file selected, please upload.`]);
        }
    }

    // --- firmware upload (template) ---
    async function uploadFirmware() {
        if (!firmwareFile) return alert("Please choose a firmware file first");
        setUploading(true);
        setError(null);
        const fd = new FormData();
        fd.append("file", firmwareFile);
        try {
            const res = await fetch("/api/firmware/upload", { method: "POST", body: fd });
            if (!res.ok) throw new Error("upload failed");
            const j = await res.json();
            setFirmwareMeta({ firmwareId: j.firmwareId, version: j.version || j.firmwareId, compatibleModels: j.compatibleModels || [], originalName: firmwareFile.name });
            setLogs(s => [...s, `[${new Date().toLocaleTimeString()}] Upload success: ${j.firmwareId}`]);
            setUploadedFilename(firmwareFile.name);
        } catch (e) {
            console.warn(e);
            // fallback: parse filename for a version token like R150
            const meta = firmwareFile ? parseMetaFromFilename(firmwareFile.name) : { firmwareId: `local-${Date.now()}`, version: 'unknown' };
            setFirmwareMeta(meta);
            if (meta) {
                setUploadedFilename(firmwareFile.name);
                setLogs(s => [...s, `[${new Date().toLocaleTimeString()}] Parsed firmware info: ${meta.version}`]);
            } else {
                setError("upload fail");
            }
        } finally {
            setUploading(false);
        }
    }
    function parseMetaFromFilename(name) {
        const m = name && name.match(/R(\d+)/i);
        return { firmwareId: `local-${Date.now()}`, version: m ? `R${m[1]}` : 'unknown' };
    }

    // --- begin start (PDF requires Tech# confirm) ---
    function beginConfirmStart() {
        if (!firmwareMeta) return alert('Please upload firmware and confirm compatibility first');
        const m = (firmwareMeta.version || '').match(/R(\d+)/i);
        if (m && Number(m[1]) < 148) return alert('Firmware version too old (below R148), use alternate update method');
        setShowTechModal(true);
    }

    // --- start / stop / rollback (template: call backend) ---
    async function startRollout(techNumber) {
        setShowTechModal(false);
        setLogs(s => [...s, `[${new Date().toLocaleTimeString()}] Tech# ${techNumber} initiated rollout`]);
        const payload = { firmwareId: firmwareMeta.firmwareId, groups: selectedGroups, canaryIds, batchSize, scheduleAt: scheduleAt || null, initiatedBy: techNumber };
        try {
            const res = await fetch("/api/firmware/start-rollout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error("start rollout failed");
            const j = await res.json();
            setRolloutId(j.rolloutId);
            setProgress({ rolloutId: j.rolloutId, total: j.total || 0, updated: 0, failed: 0, state: "running" });
            setRecords(r => [{ id: j.rolloutId, firmwareVersion: firmwareMeta.version, initiatedBy: techNumber, startAt: new Date().toISOString(), status: "running" }, ...r]);
            setLogs(s => [...s, `[${new Date().toLocaleTimeString()}] Rollout started: ${j.rolloutId}`]);
        } catch (e) {
            console.error(e);
            alert("Start failed: " + (e.message || e));
        }
    }

    async function stopRollout() {
        if (!rolloutId) return;
        try {
            await fetch("/api/firmware/stop-rollout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rolloutId }),
            });
            setLogs(s => [...s, `[${new Date().toLocaleTimeString()}] Rollout stop requested: ${rolloutId}`]);
            setRecords(r => r.map(rec => rec.id === rolloutId ? { ...rec, status: "stopped", stopAt: new Date().toISOString() } : rec));
        } catch (e) {
            console.error(e);
            alert("Stop failed");
        }
    }

    async function doRollback() {
        if (!rolloutId) return alert("No running rolloutId");
        const confirmTarget = window.prompt("Enter target version to rollback to (e.g. R147):");
        if (!confirmTarget) return;
        try {
            await fetch("/api/firmware/rollback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rolloutId, targetVersion: confirmTarget }),
            });
            setLogs(s => [...s, `[${new Date().toLocaleTimeString()}] Rollback requested to ${confirmTarget}`]);
            setRecords(r => r.map(rec => rec.id === rolloutId ? { ...rec, status: "rollback-requested" } : rec));
        } catch (e) {
            console.error(e);
            alert("Rollback failed");
        }
    }

    // --- progress websocket + polling fallback ---
    useEffect(() => {
        if (!rolloutId) return;
        const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${wsProtocol}//${window.location.host}/ws/firmware-progress?rolloutId=${encodeURIComponent(rolloutId)}`;
        let ws;
        try {
            ws = new WebSocket(wsUrl);
            wsRef.current = ws;
            ws.onmessage = (ev) => {
                try {
                    const msg = JSON.parse(ev.data);
                    if (msg.type === "progress") setProgress(msg.payload);
                    if (msg.type === "log") setLogs(s => [...s, `[${new Date().toLocaleTimeString()}] ${msg.payload}`]);
                } catch (e) { console.warn("ws parse err", e); }
            };
        } catch (e) {
            console.warn("ws init failed", e);
        }
        // polling fallback (in case ws not available)
        let mounted = true;
        let timer = null;
        async function poll() {
            try {
                const res = await fetch(`/api/firmware/rollout-status/${rolloutId}`);
                if (res.ok) {
                    const j = await res.json();
                    if (!mounted) return;
                    setProgress(j);
                    if (j.state === "completed" || j.state === "stopped") {
                        setRecords(r => r.map(rec => rec.id === rolloutId ? { ...rec, status: j.state, endAt: new Date().toISOString() } : rec));
                    }
                }
            } catch (e) { }
            timer = setTimeout(poll, 5000);
        }
        poll();

        return () => {
            mounted = false;
            if (timer) clearTimeout(timer);
            try { ws && ws.close(); } catch (e) { }
        };
    }, [rolloutId]);

    // --- UI helpers ---
    const eligibleDevices = devices.filter(d => selectedGroups.length === 0 ? true : selectedGroups.includes(d.gatewayEui));
    const percent = progress && progress.total ? Math.round((progress.updated / progress.total) * 100) : 0;

    function exportRecordsCSV() {
        const header = "rolloutId,firmwareVersion,initiatedBy,startAt,endAt,status";
        const rows = records.map(r => `${r.id},${r.firmwareVersion},${r.initiatedBy || ""},${r.startAt || ""},${r.endAt || ""},${r.status || ""}`);
        const csv = [header, ...rows].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `firmware_records_${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }


    const handleConfirm = async () => {

        if (uploadedFilename === null) return alert("upload firmware file");;
        alert("test");
    }


    // --- render ---
    return (
        <Card>
            <Card.Body>
                <h4>Firmware Update </h4>

                {/* --- Custom file chooser (English) --- */}
                <input
                    ref={fileInputRef}
                    type="file"
                    style={{ display: "none" }}
                    onChange={handleFileSelect}
                />
                <div className="d-flex align-items-center gap-2 mb-2">
                    <Button variant="outline-primary" onClick={() => fileInputRef.current && fileInputRef.current.click()}>
                        Choose file
                    </Button>
                    <div className="text-muted" style={{ minWidth: 220 }}>
                        <strong>{firmwareFile ? firmwareFile.name : "No file chosen"}</strong>
                        {uploadedFilename && firmwareFile && uploadedFilename === firmwareFile.name && (
                            <span className="ms-2 text-success"> (Uploaded)</span>
                        )}
                    </div>
                </div>

                {/* Upload / Confirm button area (single button) */}
                <div className="mb-3">
                    {!firmwareMeta ? (
                        <Button variant="primary" onClick={uploadFirmware} disabled={uploading}>
                            {uploading ? <Spinner animation="border" size="sm" /> : "Upload"}
                        </Button>
                    ) : (
                        <Button variant="success" onClick={beginConfirmStart} disabled={uploading}>
                            Confirm
                        </Button>
                    )}

                    {/* {firmwareMeta && (
            <Button
              variant="outline-secondary"
              size="sm"
              className="ms-2"
              onClick={() => {
                setFirmwareMeta(null);
                setFirmwareFile(null);
                setUploadedFilename(null);
                setLogs(s => [...s, `[${new Date().toLocaleTimeString()}] Upload cleared — please choose a file.`]);
              }}
            >
              Replace
            </Button>
          )} */}

                    <div className="ms-3 text-muted d-inline">Uploaded: <code>{uploadedFilename ?? "(none)"}</code></div>
                </div>

                <Tabs defaultActiveKey="update" id="firmware-tabs" className="mb-3">
                    <Tab eventKey="update" title="Update">

                        {/* 如果沒有 devices 才顯示 error, 有 devices 則用 table 呈現 */}
                        {devices.length === 0 ? (
                            error ? <Alert variant="danger">{error}</Alert> : <Alert variant="info">no device data</Alert>
                        ) : (
                            <Card className="mb-3">
                                <Card.Body>
                                    <h6>choose device to update</h6>

                                    {canaryIds.length === 0 ? <></> : <><Button variant="primary" onClick={handleConfirm}> confirm</Button></>}

                                    <div style={{ maxHeight: 360, overflow: "auto" }}>
                                        <Table size="sm" striped bordered className="text-center">
                                            <thead>
                                                <tr>
                                                  


                                                    <th>deviceEui</th>
                                                    <th> partNumber</th>
                                                    <th>gatewayEui</th>
                                                    <th>fwVersion</th>
                                                    
                                                    <th>update</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(() => {
                                                    // build groups map: gatewayEui -> devices[]
                                                    const groupsMap = devices.reduce((acc, d) => {
                                                        const gw = (d.gateway && d.gateway.gatewayEui) || d.gatewayEui || "unknown";
                                                        if (!acc[gw]) acc[gw] = [];
                                                        acc[gw].push(d);
                                                        return acc;
                                                    }, {});
                                                    // sort groups by gatewayEui
                                                    const groupKeys = Object.keys(groupsMap).sort();
                                                    return groupKeys.map((gw) => {
                                                        const list = groupsMap[gw];
                                                        // whether all devices in this group are selected as canary
                                                        const allChecked = list.every(d => canaryIds.includes(d.deviceEui));
                                                        return (
                                                            <React.Fragment key={gw}>
                                                                {/* group header row with checkbox to select/unselect whole group */}
                                                                <tr style={{ backgroundColor: '#1abc9c', color: '#ffffff', fontWeight: 600 }}>
                                                                    <td colSpan={4} style={{ textAlign: 'left', paddingLeft: 12 }}>
                                                                        Gateway: {gw} — {list.length} device(s)
                                                                    </td>
                                                                    <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>
                                                                        <Form.Check
                                                                            type="checkbox"
                                                                            checked={allChecked}
                                                                            onChange={(e) => {
                                                                                if (e.target.checked) {
                                                                                    // add all devices in this gateway to canaryIds
                                                                                    const toAdd = list.map(d => d.deviceEui).filter(id => !canaryIds.includes(id));
                                                                                    setCanaryIds(prev => [...prev, ...toAdd]);
                                                                                } else {
                                                                                    // remove all devices of this gateway from canaryIds
                                                                                    setCanaryIds(prev => prev.filter(id => !list.some(d => d.deviceEui === id)));
                                                                                }
                                                                            }}
                                                                        />
                                                                    </td>
                                                                </tr>

                                                                {/* rows for this group */}
                                                                {list.map((d, idx) => (
                                                                    <tr key={d.deviceEui || `${gw}-${idx}`}>

                                                             


                                                                        <td>{d.deviceEui}</td>
                                                                        <td>{d.partNumber}</td>
                                                                        <td>{gw}</td>
                                                                        <td>{d.fwVersion ?? "-"}</td>
                                                                      

                                                                        <td>
                                                                            <Form.Check
                                                                                type="checkbox"
                                                                                checked={canaryIds.includes(d.deviceEui)}
                                                                                onChange={() => toggleCanary(d.deviceEui)}
                                                                            />
                                                                        </td>

                                                                    </tr>
                                                                ))}
                                                            </React.Fragment>
                                                        );
                                                    });
                                                })()}
                                            </tbody>
                                        </Table>
                                    </div>
                                </Card.Body>
                            </Card>
                        )}

                        <Row>
                            <Col md={4}>
                                {/* left panel reserved (you can re-enable controls here) */}
                            </Col>
                        </Row>
                    </Tab>

                    <Tab eventKey="record" title="Record">
                        <Card><Card.Body>
                            <div>update record</div>
                        </Card.Body></Card>
                    </Tab>
                </Tabs>

                <Modal show={showTechModal} onHide={() => setShowTechModal(false)}>
                    {/* <Modal.Header closeButton><Modal.Title>Enter Tech# to start firmware update</Modal.Title></Modal.Header>
                    <Modal.Body>
                        <Form.Group>
                            <Form.Label>Tech# (e.g. 8 digits)</Form.Label>
                            <Form.Control ref={techRef} placeholder="e.g. 12345678" />
                        </Form.Group>
                        <div className="mt-2 small text-muted">Per process: enter Tech# and confirm. System will record initiator and timestamp.</div>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowTechModal(false)}>Cancel</Button>
                        <Button variant="primary" onClick={() => startRollout(techRef.current?.value || "unknown")}>Confirm & Start</Button>
                    </Modal.Footer> */}
                    <Modal.Header closeButton><Modal.Title>Prepareing...</Modal.Title></Modal.Header>
                    
                </Modal>
            </Card.Body>
        </Card>
    );
}
