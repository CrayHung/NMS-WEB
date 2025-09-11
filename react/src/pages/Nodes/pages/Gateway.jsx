import React, { useCallback, useMemo, useState, useEffect } from "react";
import { useGlobalContext } from "../../../GlobalContext";
import { apiUrl,apiFetch } from "../../../lib/api";
/* 固定樣式（避免每次 render 產生新物件） */
const inputStyle = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid #ccc",
  borderRadius: 6,
  fontSize: 14,
};
const errorText = { color: "#c0392b", fontSize: 12, marginTop: 4 };


/* 驗證工具 */
const toNum = (v) => Number(String(v).trim());
const isValidLat = (v) => {
  const n = toNum(v);
  return Number.isFinite(n) && n >= -90 && n <= 90;
};
const isValidLng = (v) => {
  const n = toNum(v);
  return Number.isFinite(n) && n >= -180 && n <= 180;
};

/* 取下一個 edge id（數字字串） */
const nextEdgeId = (links) => {
  const max = (links || []).reduce((m, e) => {
    const n = Number(e.id);
    return Number.isFinite(n) ? Math.max(m, n) : m;
  }, 0);
  return String(max + 1);
};

export default function Gateway() {
  const { user, deviceData, setDeviceData, deviceLink, setDeviceLink } = useGlobalContext();

  /* 目前是「新增」或「編輯」模式（值為 deviceId/gatewayEui 或 null） */
  const [editingId, setEditingId] = useState(null);

  /* 表單 */
  const [form, setForm] = useState({
    gatewayEui: "",        //  API 主鍵，也將成為 deviceId
    deviceName: "",
    onlineStatus: true,      // online / warning / offline（轉成 API 的 onlineStatus 布林）
    type: "gateway",
    longitude: "",
    latitude: "",
    IP: "",
    source: "",            // server 的 deviceId
    target: "",            // 可選：要插在 target 前方
  });

  /* 載入/錯誤 */
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({ latitude: "", longitude: "" });

  /* 取出所有 gateway 清單（列表用） */
  const gateways = useMemo(
    () => (Array.isArray(deviceData) ? deviceData.filter((d) => d.type === "gateway") : []),
    [deviceData]
  );

  // 取出所有 server 清單（提供 source 下拉用）
  const servers = useMemo(
    () => (Array.isArray(deviceData) ? deviceData.filter((d) => d.type === "server") : []),
    [deviceData]
  );

  /* 共用變更處理器（reference 穩定，避免 re-render） */
  const handleChange = useCallback((key) => (val) => {
    setForm((f) => ({ ...f, [key]: val }));

    if (key === "latitude") {
      setErrors((e) => ({
        ...e,
        latitude:
          val === ""
            ? ""
            : isValidLat(val)
              ? ""
              : "latitude must be between -90 ~ 90",
      }));
    }
    if (key === "longitude") {
      setErrors((e) => ({
        ...e,
        longitude:
          val === ""
            ? ""
            : isValidLng(val)
              ? ""
              : "longitude must be between -180 ~ 180",
      }));
    }
  }, []);

  /* 必填 + 座標驗證通過才可存 */
  const isFormValid = useMemo(() => {
    const filled =
      form.gatewayEui.trim() !== "" &&   //  必填：API 主鍵
      form.deviceName.trim() !== "" &&
      form.IP.trim() !== "" &&
      form.longitude.trim() !== "" &&
      form.latitude.trim() !== "";

    return filled && isValidLng(form.longitude) && isValidLat(form.latitude);
  }, [form.gatewayEui, form.deviceName, form.IP, form.longitude, form.latitude]);

  const resetForm = useCallback(() => {
    setEditingId(null);
    setForm({
      gatewayEui: "",
      deviceName: "",
      onlineStatus: true,
      type: "gateway",
      longitude: "",
      latitude: "",
      IP: "",
      source: "",
      target: "",
    });
    setErrors({ latitude: "", longitude: "" });
  }, []);

  /* 把該筆資料帶入表單 */
  const handleEdit = useCallback((gw) => {
    setEditingId(gw.deviceId ?? gw.id ?? null);
    setForm({
      gatewayEui: String(gw.deviceId ?? ""),
      deviceName: gw.deviceName ?? "",
      onlineStatus: gw.onlineStatus ?? true,
      type: "gateway",
      longitude: String(gw.longitude ?? ""),
      latitude: String(gw.latitude ?? ""),
      IP: String(gw.IP ?? ""),
      source: gw.source ?? "", 
      target: gw.target ?? "",
    });
    setErrors({ latitude: "", longitude: "" });
  }, []);




  const handleDelete = useCallback(
    async (id) => {
      if (!id) return;
      if (!window.confirm("delete this Gateway ?" + id)) return;
      if (saving) return;

      try {
        setSaving(true);
        const res = await apiFetch(`/gateways/${encodeURIComponent(id)}`, {
          method: 'DELETE',
        });
        
        // const res = await fetch(`http://61.216.140.11:9002/api/gateways/${encodeURIComponent(id)}`, { method: "DELETE" });
        // const res = await fetch(`${API_BASE}/${encodeURIComponent(id)}`, { method: "DELETE" });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`API DELETE failed (${res.status}): ${text || res.statusText}`);
        }

        // API 成功 → 同步更新本地資料+線
        setDeviceData((prev) => prev.filter((d) => (d.deviceId ?? d.id) !== id));
        setDeviceLink((prev) => prev.filter((e) => e.source !== id && e.target !== id));
        if (editingId === id) resetForm();

        alert("Gateway deleted (API + local)");
      } catch (err) {
        console.error(err);
        alert(`Delete gateway failed: ${err.message}`);
      } finally {
        setSaving(false);
      }
    },
    [editingId, resetForm, saving, setDeviceData, setDeviceLink]
  );

  /* 儲存（新增或更新 + 呼叫後端） */
  const handleSave = useCallback(async () => {
    if (!isFormValid || saving) return;

    const nowISO = new Date().toISOString();
    const gatewayEui = form.gatewayEui.trim(); 
    const latNum = toNum(form.latitude);
    const lngNum = toNum(form.longitude);

    // 組 API body
    const apiBody = {
      gatewayEui: gatewayEui,
      name: form.deviceName.trim(),
      location: `Lat:${latNum},Lon:${lngNum}`, // 後端有 location 可接受字串
      latitude: latNum,
      longitude: lngNum,
      altitude: 0,
      onlineStatus: form.onlineStatus === true,  // 只以 online / 非 online 分流
      lastSeen: nowISO,
    };


    try {
      setSaving(true);
      // call API
      const url = editingId
  ? apiUrl(`/gateways/${encodeURIComponent(gatewayEui)}`)
  : apiUrl('/gateways');
      // const url = editingId ? `http://61.216.140.11:9002/api/gateways/${encodeURIComponent(gatewayEui)}` : "http://61.216.140.11:9002/api/gateways";
      // const url = editingId ? `http://61.216.140.11:9002/api/gateways/${encodeURIComponent(gatewayEui)}` : "http://61.216.140.11:9002/api/gateways";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiBody),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`API ${method} failed (${res.status}): ${text || res.statusText}`);
      }

      // API 成功後 → 寫入全域 node
      const nodePayload = {
        deviceId: gatewayEui,                   // ★ 使用 gatewayEui 當成 node id
        deviceName: form.deviceName.trim(),
        onlineStatus: form.onlineStatus ?? true,
        type: "gateway",
        longitude: String(form.longitude).trim(),
        latitude: String(form.latitude).trim(),
        temperature: "",
        humidity: "",
        batteryLevel: "",
        lastUpdated: nowISO,
        alerts: [],
        IP: String(form.IP).trim(),
        createdBy: user.username,
        createdAt: nowISO,
        position: { x: 0, y: 0 },
        source: form.source,                   // 是否要存進 node 視你的模型而定
        target: form.target,
      };

      setDeviceData((prev) => {
        if (editingId) {
          return prev.map((d) =>
            (d.deviceId ?? d.id) === editingId ? { ...d, ...nodePayload } : d
          );
        }
        // 新增：若已存在同 id，做覆蓋；否則 append
        const exists = prev.some((d) => (d.deviceId ?? d.id) === gatewayEui);
        return exists
          ? prev.map((d) => ((d.deviceId ?? d.id) === gatewayEui ? { ...d, ...nodePayload } : d))
          : [...prev, nodePayload];
      });

      // ===== edges：建立或「拆邊插入」 =====
      setDeviceLink((prev) => {
        const src = form.source.trim();               // server id（必填）
        const tgt = (form.target || "").trim();       // 可能是「原 gateway」

        // 沒指定 target：只接一條 server→新 gateway
        if (!tgt) {
          const id1 = nextEdgeId(prev);
          return [
            ...prev,
            { id: id1, source: src, target: gatewayEui, type: "smoothstep", animated: true },
          ];
        }

        // 有指定 target：要把 server→target 拆成 server→新、 新→target
        const idx = prev.findIndex((e) => e.source === src && e.target === tgt);

        const base = Number(nextEdgeId(prev)); // 下一個數字
        const idA = String(base);
        const idB = String(base + 1);

        const edgeA = { id: idA, source: src, target: gatewayEui, type: "smoothstep", animated: true };
        const edgeB = { id: idB, source: gatewayEui, target: tgt, type: "smoothstep", animated: true };

        if (idx >= 0) {
          const copy = [...prev];
          copy.splice(idx, 1);          // 刪掉原 server→tgt
          copy.push(edgeA, edgeB);      // 插入新兩條
          return copy;
        }
        // 找不到原邊也沒關係，直接新增兩條
        return [...prev, edgeA, edgeB];
      });

      alert(editingId ? "Gateway updated " : "Gateway added ");
      resetForm();
    } catch (err) {
      console.error(err);
      alert(`Save gateway failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }, [editingId, form, isFormValid, saving, resetForm, setDeviceData, setDeviceLink, user.username]);

  // Debug：觀察全域變更
  useEffect(() => {
    console.log("deviceData changed:", deviceData);
    console.log("deviceLink changed:", deviceLink);
  }, [deviceData, deviceLink]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <h3 style={{ marginTop: 0 }}>Gateway Management</h3>

      {/* 列表 */}
      <div className="card" style={{ overflowX: "auto" }}>
        <h4 style={{ marginTop: 0 }}>Gateways</h4>
        {gateways.length === 0 ? (
          <div style={{ color: "#666" }}>No Gateway</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>gatewayEui (id)</th>
                <th>device name</th>
                <th>IP</th>
                <th>longitude</th>
                <th>latitude</th>
                <th>onlineStatus</th>

                <th>operation</th>
              </tr>
            </thead>
            <tbody>
              {gateways.map((g) => {
                const id = g.deviceId ?? g.id;
                return (
                  <tr key={id}>
                    <td>{id}</td>
                    <td>{g.deviceName}</td>
                    <td>{g.IP ?? "-"}</td>
                    <td>{g.longitude}</td>
                    <td>{g.latitude}</td>
                    <td>
                      {g.onlineStatus ? (
                        <span style={{ color: '#16a34a', fontWeight: 600 }}>online</span>
                      ) : (
                        <span style={{ color: '#ef4444', fontWeight: 600 }}>offline</span>
                      )}
                    </td>
           
                    <td style={{ whiteSpace: "nowrap" }}>
                      <button onClick={() => handleEdit(g)} style={{ marginRight: 8 }}>
                        edit
                      </button>
                      <button
                        onClick={() => handleDelete(id)}
                        style={{ background: "#c0392b" }}
                      >
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
        <h4 style={{ margin: 0 }}>{editingId ? "edit Gateway" : "add Gateway"}</h4>

        {/* gatewayEui */}
        <Field
          label="gatewayEui (unique id)"
          value={form.gatewayEui}
          onChange={handleChange("gatewayEui")}
          disabled={!!editingId}  
        />

        <Field
          label="device name"
          value={form.deviceName}
          onChange={handleChange("deviceName")}
          placeholder="gw-01"
        />

        <Field label="type" value="gateway" disabled />

        <Field
          label="IP"
          value={form.IP}
          onChange={handleChange("IP")}
          placeholder="10.0.0.1"
        />

        {/* 經度 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label>longitude</label>
          <input
            value={form.longitude}
            onChange={(e) => handleChange("longitude")(e.target.value)}
            placeholder="-180 ~ 180 "
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
            placeholder="-90 ~ 90 "
            inputMode="decimal"
            style={{
              ...inputStyle,
              borderColor: errors.latitude ? "#c0392b" : "#ccc",
            }}
          />
          {errors.latitude && <div style={errorText}>{errors.latitude}</div>}
        </div>

        {/* Source 下拉：必定是 server */}
        {/* <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label>source server</label>
          <select
            value={form.source}
            onChange={(e) => handleChange("source")(e.target.value)}
            style={inputStyle}
          >
            <option value="">select server</option>
            {servers.map((srv) => (
              <option key={srv.deviceId ?? srv.id} value={srv.deviceId ?? srv.id}>
                {srv.deviceName} ({srv.deviceId ?? srv.id})
              </option>
            ))}
          </select>
        </div> */}

        {/* target 可選：若填，會做「插入中間」的拆邊 */}
        {/* <Field
          label="target (optional: insert before this gateway)"
          value={form.target}
          onChange={handleChange("target")}
          placeholder="填入既有 gateway 的 id，會插在它前面"
        /> */}

        {/* 狀態（簡單版） */}
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

        <Field label="user name" value={user.username} disabled />

        {/* 操作按鈕 */}
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
              {saving
                ? "saving..."
                : editingId
                  ? "update Gateway (API)"
                  : "save Gateway (API)"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* 單一欄位元件（memo：避免不必要重繪） */
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
