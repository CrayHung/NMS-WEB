import React, { useCallback, useMemo, useState, useEffect } from "react";
import { useGlobalContext } from "../../../GlobalContext";

import { apiUrl } from '../../../lib/api';

/* 樣式 */
const inputStyle = {
    width: "100%",
    padding: "8px 10px",
    border: "1px solid #ccc",
    borderRadius: 6,
    fontSize: 14,
};
const errorText = { color: "#c0392b", fontSize: 12, marginTop: 4 };


/* 工具 */
const toNum = (v) => Number(String(v ?? "").trim());
const isValidLat = (v) => {
    const n = toNum(v);
    return Number.isFinite(n) && n >= -90 && n <= 90;
};
const isValidLng = (v) => {
    const n = toNum(v);
    return Number.isFinite(n) && n >= -180 && n <= 180;
};

// parse "Lat:24.8075,Lon:121.0445,Site 01"
function parseLocationString(loc) {
    if (!loc || typeof loc !== "string") return { lat: null, lon: null };
    const mLat = loc.match(/Lat\s*:\s*([+-]?\d+(\.\d+)?)/i);
    const mLon = loc.match(/Lon\s*:\s*([+-]?\d+(\.\d+)?)/i);
    const lat = mLat ? Number(mLat[1]) : null;
    const lon = mLon ? Number(mLon[1]) : null;
    return { lat, lon };
}

// 將 API 的 onlineStatus / statusText 轉成你的三態
function toStatus(onlineStatus, statusText) {
    if (onlineStatus === true) return "online";
    if (onlineStatus === false) return "offline";
    const t = String(statusText || "").toLowerCase();
    if (t.includes("warn") || t.includes("alarm")) return "warning";
    return "online";
}

// Edge 自動 id：找出目前 links 的最大數字 id，再 +1
function nextEdgeId(links) {
    const max = (links || []).reduce((m, e) => {
        const n = Number(e.id);
        return Number.isFinite(n) ? Math.max(m, n) : m;
    }, 0);
    return String(max + 1);
}

export default function Device() {
    const { user, deviceData, setDeviceData, deviceLink, setDeviceLink } = useGlobalContext();

    const [editingId, setEditingId] = useState(null);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        deviceEui: "",        // ← 將成 deviceId
        deviceName: "",
        onlineStatus: true,     // online / warning / offline（用於初始，之後以 API 同步為主）
        type: "device",
        longitude: "",
        latitude: "",
    });

    const [errors, setErrors] = useState({ latitude: "", longitude: "" });

    // 列表：type === 'device'
    const devices = useMemo(
        () => (Array.isArray(deviceData) ? deviceData.filter((d) => d.type === "device") : []),
        [deviceData]
    );

    const handleChange = useCallback(
        (key) => (val) => {
            setForm((f) => ({ ...f, [key]: val }));
            if (key === "latitude") {
                setErrors((e) => ({
                    ...e,
                    latitude:
                        val === "" ? "" : isValidLat(val) ? "" : "latitude must be between -90 ~ 90",
                }));
            }
            if (key === "longitude") {
                setErrors((e) => ({
                    ...e,
                    longitude:
                        val === "" ? "" : isValidLng(val) ? "" : "longitude must be between -180 ~ 180",
                }));
            }
        },
        []
    );

    const isFormValid = useMemo(() => {
        const filled =
            form.deviceEui.trim() !== "" &&
            form.deviceName.trim() !== "";
        // 經緯度可留空（API 會補）；若要強制必填就把下兩行加回：
        // && form.longitude.trim() !== "" &&
        // && form.latitude.trim() !== ""
        const geoOk =
            (form.longitude === "" || isValidLng(form.longitude)) &&
            (form.latitude === "" || isValidLat(form.latitude));
        return filled && geoOk;
    }, [form.deviceEui, form.deviceName, form.longitude, form.latitude]);

    const resetForm = useCallback(() => {
        setEditingId(null);
        setForm({
            deviceEui: "",
            deviceName: "",
            onlineStatus: true,
            type: "device",
            longitude: "",
            latitude: "",
        });
        setErrors({ latitude: "", longitude: "" });
    }, []);

    const handleEdit = useCallback((dev) => {
        setEditingId(dev.deviceId ?? dev.id ?? null);
        setForm({
            deviceEui: String(dev.deviceId ?? ""),
            deviceName: dev.deviceName ?? "",
            onlineStatus: dev.onlineStatus ?? true,
            type: "device",
            longitude: String(dev.longitude ?? ""),
            latitude: String(dev.latitude ?? ""),
        });
        setErrors({ latitude: "", longitude: "" });
    }, []);

    const handleDelete = useCallback(
        (id) => {
            if (!id) return;
            if (!window.confirm("delete this device ?")) return;
            setDeviceData((prev) => prev.filter((d) => (d.deviceId ?? d.id) !== id));
            setDeviceLink((prev) => prev.filter((e) => e.source !== id && e.target !== id));
            if (editingId === id) resetForm();
        },
        [editingId, resetForm, setDeviceData, setDeviceLink]
    );

    // 新增/更新（本地）→ 立即 GET 同步狀態 → 更新 node / gateway node / edge
    const handleSave = useCallback(async () => {
        if (!isFormValid || saving) return;
        // const nowISO = new Date().toISOString();
        const nowISO = new Date().toLocaleString("en-US");
        const id = form.deviceEui.trim();

        setSaving(true);

        // 1) 先把 device 寫進本地（新增或更新）
        const nodePayload = {
            deviceId: id,
            deviceName: form.deviceName.trim(),
            onlineStatus: form.onlineStatus ?? true,
            type: "device",
            longitude: form.longitude.trim(),
            latitude: form.latitude.trim(),
            lastUpdated: nowISO,
            alerts: [],
            position: { x: 0, y: 0 },
            createdBy: user.username,
            createdAt: nowISO,

            deviceEui: id,
            partName: form.deviceName.trim(),
            partNumber: form.deviceName.trim(),
            serialNumber: "",
            hwVersion: "1.0",

            fwVersion: "1.6.",
            location: "Lat:24.8075,Lon:121.0445,Site 01",
            siteName: null,
            siteId: null,
            cabinetId: null,
            rackPosition: null,
            unitStatus: 2,
            statusText: "Normal",
            temperature: 38.8,
            voltage: 23.5,
            ripple: 49,
            current: 739,
            rfInputPower: 10,
            rfOutputPower: 50,
            pilotLevel: 15.9,
            alarmStatus: 0,
            tempHighAlarm: 50,
            tempLowAlarm: -6,
            voltHighAlarm: 27,
            voltLowAlarm: 21,
            rippleHighAlarm: 200,
            rfInputAvgPower: -3.4799242424242425,
            rfOutputAvgPower: 37.27045454545454,
            rfGainAvg: 40.75037878787878,
            rfPowerLastUpdated: "2025-09-05T16:57:58.753123",
            lastUpdated: "2025-09-05T16:58:18.788585",
            lastModelInfoUpdated: "2025-09-05T16:55:18.683699",
            lastConfigUpdated: "2025-09-05T16:55:38.683394",
            onlineStatus: true,
            lastSeen: "2025-09-05T16:58:18.788074",
            gateway: {
                gatewayEui: "ae7e4c79724ea4aa",
                name: "string1321",
                location: "Lat:24.807181692096442,Lon:121.03549957128982",
                latitude: 24.807181692096442,
                longitude: 121.03549957128982,
                altitude: 0,
                onlineStatus: true,
                lastSeen: "2025-09-05T16:58:18.784995"
            }

        };

        setDeviceData((prev) => {
            const exists = prev.some((d) => (d.deviceId ?? d.id) === id);
            if (exists) {
                return prev.map((d) => ((d.deviceId ?? d.id) === id ? { ...d, ...nodePayload } : d));
            }
            return [...prev, nodePayload];
        });


        //先直接建立local端地連線,之後是要等response以後才知道要連到哪個gateway
        //現在先假設連到gwId=ae7e4c79724ea4aa	

        const gwId = "ae7e4c79724ea4aa";
        setDeviceLink((prev) => {
            const has = prev.some((e) => e.source === gwId && e.target === id);
            if (has) return prev;
            const id1 = nextEdgeId(prev);
            return [
                ...prev,
                { id: id1, source: gwId, target: id, type: "smoothstep", animated: true },
            ];
        });


        // try {

        //     // 2) 立即打 API 取即時狀態
        //     const res = await fetch(`${STATUS_BASE}/${encodeURIComponent(id)}/current`, {
        //         method: "GET",
        //     });
        //     if (!res.ok) {
        //         const t = await res.text().catch(() => "");
        //         throw new Error(`GET status failed (${res.status}): ${t || res.statusText}`);
        //     }
        //     const data = await res.json();

        //     // 3) 解析 API：更新 device 狀態與座標
        //     const apiStatus = toStatus(data?.onlineStatus, data?.statusText);
        //     const { lat, lon } = parseLocationString(data?.location);

        //     setDeviceData((prev) =>
        //         prev.map((d) => {
        //             if ((d.deviceId ?? d.id) !== id) return d;
        //             return {
        //                 ...d,
        //                 deviceName: d.deviceName || data?.partName || id,
        //                 status: apiStatus,
        //                 // 若表單沒給經緯度，或想以 API 為主，可用 API 值覆蓋：
        //                 latitude: lat != null ? String(lat) : d.latitude,
        //                 longitude: lon != null ? String(lon) : d.longitude,
        //                 lastUpdated: data?.lastUpdated || d.lastUpdated,
        //                 // 也可把其他欄位（溫度等）帶進來
        //                 temperature: data?.temperature ?? d.temperature,
        //             };
        //         })
        //     );

        //     // 4) 確保 gateway 節點存在 / 更新
        //     const gw = data?.gateway;
        //     if (gw?.gatewayEui) {
        //         const gwId = String(gw.gatewayEui);
        //         const gwStatus = toStatus(gw.onlineStatus, null);

        //         setDeviceData((prev) => {
        //             const exists = prev.some((n) => (n.deviceId ?? n.id) === gwId);
        //             const payloadGw = {
        //                 deviceId: gwId,
        //                 deviceName: gw.name || gwId,
        //                 status: gwStatus,
        //                 type: "gateway",
        //                 latitude: gw.latitude != null ? String(gw.latitude) : "",
        //                 longitude: gw.longitude != null ? String(gw.longitude) : "",
        //                 lastUpdated: gw.lastSeen || nowISO,
        //                 alerts: [],
        //                 position: { x: 0, y: 0 },
        //             };
        //             if (exists) {
        //                 return prev.map((n) => ((n.deviceId ?? n.id) === gwId ? { ...n, ...payloadGw } : n));
        //             }
        //             return [...prev, payloadGw];
        //         });

        //         // 5) 新增 gateway → device 的 edge（若不存在）
        //         setDeviceLink((prev) => {
        //             const has = prev.some((e) => e.source === gwId && e.target === id);
        //             if (has) return prev;
        //             const id1 = nextEdgeId(prev);
        //             return [
        //                 ...prev,
        //                 { id: id1, source: gwId, target: id, type: "smoothstep", animated: true },
        //             ];
        //         });
        //     }

        //     alert(editingId ? "Device updated (local + synced)" : "Device added (local + synced)");
        //     resetForm();
        // } catch (err) {
        //     console.error(err);
        //     alert(`Save device failed: ${err.message}`);
        // } finally {
        //     setSaving(false);
        // }
        setSaving(false);
        alert(editingId ? "Device updated" : "Device added");
    }, [editingId, form, isFormValid, resetForm, saving, setDeviceData, setDeviceLink, user.username]);

    // Debug
    useEffect(() => {
        console.log("deviceData:", deviceData);
        console.log("deviceLink:", deviceLink);
    }, [deviceData, deviceLink]);

    return (
        <div style={{ display: "grid", gap: 16 }}>
            <h3 style={{ marginTop: 0 }}>Device Management</h3>

            {/* 列表 */}
            <div className="card" style={{ overflowX: "auto" }}>
                <h4 style={{ marginTop: 0 }}>Devices</h4>
                {devices.length === 0 ? (
                    <div style={{ color: "#666" }}>No Device</div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>deviceEui (id)</th>
                                <th>device name</th>
                                <th>longitude</th>
                                <th>latitude</th>
                                <th>onlineStatus</th>
                                <th>operation</th>
                            </tr>
                        </thead>
                        <tbody>
                            {devices.map((d) => {
                                const id = d.deviceId ?? d.id;
                                return (
                                    <tr key={id}>
                                        <td>{id}</td>
                                        <td>{d.deviceName}</td>
                                        <td>{d.longitude}</td>
                                        <td>{d.latitude}</td>
                                        <td>
                                            {d.onlineStatus ? (
                                                <span style={{ color: '#16a34a', fontWeight: 600 }}>online</span>
                                            ) : (
                                                <span style={{ color: '#ef4444', fontWeight: 600 }}>offline</span>
                                            )}
                                        </td>
                                        <td style={{ whiteSpace: "nowrap" }}>
                                            <button onClick={() => handleEdit(d)} style={{ marginRight: 8 }}>
                                                edit
                                            </button>
                                            <button onClick={() => handleDelete(id)} style={{ background: "#c0392b" }}>
                                                delete
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* 表單 */}
            <div className="card" style={{ display: "grid", gap: 16 }}>
                <h4 style={{ margin: 0 }}>{editingId ? "edit Device" : "add Device"}</h4>

                <Field
                    label="deviceEui (unique id)"
                    value={form.deviceEui}
                    onChange={handleChange("deviceEui")}
                    disabled={!!editingId}
                />

                <Field
                    label="device name"
                    value={form.deviceName}
                    onChange={handleChange("deviceName")}

                />

                {/* <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label>status</label>
                    <select
                        value={form.status}
                        onChange={(e) => handleChange("status")(e.target.value)}
                        style={inputStyle}
                    >
                        <option value="online">online</option>
                        <option value="warning">warning</option>
                        <option value="offline">offline</option>
                    </select>
                </div> */}

                <Field label="type" value="device" disabled />

                {/* 經度 */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label>longitude</label>
                    <input
                        value={form.longitude}
                        onChange={(e) => handleChange("longitude")(e.target.value)}
                        placeholder="121.0445"
                        inputMode="decimal"
                        style={{
                            ...inputStyle,
                            borderColor: errors.longitude ? "#c0392b" : "#ccc",
                        }}
                    />
                    {errors.longitude && <div style={errorText}>{errors.longitude}</div>}
                </div>

                {/* 緯度 */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label>latitude</label>
                    <input
                        value={form.latitude}
                        onChange={(e) => handleChange("latitude")(e.target.value)}
                        placeholder="24.8075"
                        inputMode="decimal"
                        style={{
                            ...inputStyle,
                            borderColor: errors.latitude ? "#c0392b" : "#ccc",
                        }}
                    />
                    {errors.latitude && <div style={errorText}>{errors.latitude}</div>}
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                    {editingId && (
                        <button
                            onClick={resetForm}
                            style={{ background: "#7f8c8d" }}
                            title="cancel"
                            disabled={saving}
                        >
                            cancel
                        </button>
                    )}
                    {isFormValid && (
                        <button onClick={handleSave} disabled={saving}>
                            {saving ? "saving..." : editingId ? "update Device" : "save Device"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

/* 單一欄位 */
const Field = React.memo(function Field({
    label,
    value,
    onChange,
    placeholder,
    disabled = false,
}) {
    const handleInput = useCallback((e) => onChange?.(e.target.value), [onChange]);
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label>{label}</label>
            <input
                value={value}
                onChange={handleInput}
                placeholder={placeholder}
                disabled={disabled}
                style={inputStyle}
            />
        </div>
    );
});
