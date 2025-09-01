import React, { useCallback, useMemo, useState, useEffect } from "react";
import { useGlobalContext } from "../../../GlobalContext";

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

export default function Gateway() {
  const { user, deviceData, setDeviceData, deviceLink, setDeviceLink } = useGlobalContext();

  /* 目前是「新增」或「編輯」模式 */
  const [editingId, setEditingId] = useState(null);

  /* 表單 */
  const [form, setForm] = useState({
    deviceName: "",
    status: "online",
    type: "gateway",
    longitude: "",
    latitude: "",
    IP: "",
    source: "",
    target: ""
  });

  /* 即時錯誤訊息（座標） */
  const [errors, setErrors] = useState({ latitude: "", longitude: "" });

  /* 取出所有 gateway 清單（列表用） */
  const gateways = useMemo(
    () => (Array.isArray(deviceData) ? deviceData.filter((d) => d.type === "gateway") : []),
    [deviceData]
  );

  // 取出所有 server 清單（提供 source 下拉選單用）
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
              : "latitude must between -90 ~ 90 ",
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
              : "longitude  must between -180 ~ 180",
      }));
    }
  }, []);

  /* 必填 + 座標驗證通過才可存 */
  const isFormValid = useMemo(() => {
    const filled =
      form.deviceName.trim() !== "" &&
      form.IP.trim() !== "" &&
      form.longitude.trim() !== "" &&
      form.latitude.trim() !== "" &&
      form.source.trim() !== "";  //來源不可空
    return filled && isValidLng(form.longitude) && isValidLat(form.latitude);
  }, [form.deviceName, form.IP, form.longitude, form.latitude, form.source]);

  const resetForm = useCallback(() => {
    setEditingId(null);
    setForm({
      deviceName: "",
      status: "online",
      type: "gateway",
      longitude: "",
      latitude: "",
      IP: "",
      source: "",
      target: ""
    });
    setErrors({ latitude: "", longitude: "" });
  }, []);

  /* 編輯：把該筆資料帶入表單 */
  const handleEdit = useCallback((srv) => {
    alert('edit below')
    setEditingId(srv.deviceId ?? srv.id ?? null);
    setForm({
      deviceName: srv.deviceName ?? "",
      status: srv.status ?? "online",
      type: "gateway",
      longitude: String(srv.longitude ?? ""),
      latitude: String(srv.latitude ?? ""),
      IP: String(srv.IP ?? ""),
      source: srv.source ?? "",
      target: srv.target ?? "",
    });
    setErrors({ latitude: "", longitude: "" });
  }, []);

  /* 刪除：從全域資料移除 */
  const handleDelete = useCallback(
    (id) => {
      if (!id) return;
      if (!window.confirm("delete this Gateway ?")) return;
      setDeviceData((prev) => prev.filter((d) => (d.deviceId ?? d.id) !== id));
      if (editingId === id) resetForm(); // 若正在編輯該筆，一併清空表單
    },
    [editingId, resetForm, setDeviceData]
  );

  /* 儲存（新增或更新） */
  const handleSave = useCallback(() => {
    alert('handleSave called');
    if (!isFormValid) return;

    const nowISO = new Date().toISOString();

    // 1) 新節點 ID：新增時一次生成，兩邊共用；編輯時沿用 editingId
    const newId = editingId ?? `gw_${Date.now()}`;


    const payload = {
      deviceId: newId, // 新增時產一個 id；也可改為後端給
      deviceName: form.deviceName.trim(),
      status: form.status ?? "online",
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
    };


    setDeviceData((prev) => {
      let next;
      if (editingId) {
        // 更新
        return prev.map((d) =>
          (d.deviceId ?? d.id) === editingId ? { ...d, ...payload } : d
        );
      } else {
        next = [...prev, payload];
      }
      return next;
    });



    const linkpayload = {
      deviceId: editingId ?? `srv_${Date.now()}`, // 新增時產一個 id；也可改為後端給
      source: form.source, target: form.target, type: 'smoothstep', animated: true
    };







    // 2) 再處理 deviceLink（依你規則建立一筆新 link）
    setDeviceLink((prev) => {
      // 從現有的 link 中找出最大的「數字」id，再 +1
      const maxId =
        prev.length === 0
          ? 0
          : Math.max(
            ...prev.map((e) => {
              const n = Number(e.id);
              return Number.isFinite(n) ? n : 0; // 若之前不是數字字串，就當 0
            })
          );

      const nextId = String(maxId + 1);


      // ★ 關鍵：沒填 target 就用「本次節點」當 target
      const targetActual = (form.target ?? "").trim() || (editingId ?? newId);


      // 編輯：更新「以這個節點為 target」的那條邊；找不到就新增
      if (editingId) {
        let found = false;
        const updated = prev.map((e) => {
          if (e.target === editingId) {
            found = true;
            return {
              ...e,
              source: form.source,     // 來源改成使用者選的 server
              target: targetActual,    // 通常是 editingId 自己
              type: "smoothstep",
              animated: true,
            };
          }
          return e;
        });
        if (!found) {
          updated.push({
            id: nextId,
            source: form.source,
            target: targetActual,
            type: "smoothstep",
            animated: true,
          });
        }
        return updated;
      }

      // 新增：直接加一條 server → 新節點 的邊（或 → 指定的 target）
      return [
        ...prev,
        {
          id: nextId,
          source: form.source,     // 來源一定是 server（你已改成下拉）
          target: targetActual,    // 沒填就接到新節點 newId
          type: "smoothstep",
          animated: true,
        },
      ];
    });

    alert(editingId ? "Gateway Update" : "Gateway Add");


    resetForm();
  }, [editingId, form, isFormValid, resetForm, setDeviceData, user.username]);


  // 1) deviceData 變動就印
  useEffect(() => {
    console.log('deviceData changed:', deviceData);
    console.log('deviceLink changed:', deviceLink);
  }, [deviceData, deviceLink]);


  return (
    <div style={{ display: "grid", gap: 16 }}>
      <h3 style={{ marginTop: 0 }}>Gateway Management</h3>

      {/* 伺服器列表（卡片 + 表格） */}
      <div className="card" style={{ overflowX: "auto" }}>
        <h4 style={{ marginTop: 0 }}>Gateway</h4>
        {gateways.length === 0 ? (
          <div style={{ color: "#666" }}>No Gateway</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>device name</th>
                <th>IP</th>
                <th>longitude</th>
                <th>latitude</th>
                <th>status</th>
                <th>createdBy</th>
                <th>source</th>
                <th>target</th>
                <th>operation</th>
              </tr>
            </thead>
            <tbody>
              {gateways.map((s) => {
                const id = s.deviceId ?? s.id;
                return (
                  <tr key={id}>
                    <td>{s.deviceName}</td>
                    <td>{s.IP ?? "-"}</td>
                    <td>{s.longitude}</td>
                    <td>{s.latitude}</td>
                    <td>{s.status ?? "online"}</td>
                    <td>{s.createdBy ?? "-"}</td>
                    <td>{s.source}</td>
                    <td>{s.target ?? "-"}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <button onClick={() => handleEdit(s)} style={{ marginRight: 8 }}>
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

      {/* 新增 / 編輯 表單（上下欄位、沿用你的樣式） */}
      <div className="card" style={{ display: "grid", gap: 16 }}>
        <h4 style={{ margin: 0 }}>{editingId ? "edit Gateway" : "add Gateway"}</h4>

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
            placeholder="121.564 ( -180 ~ 180 )"
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
            placeholder="25.034 ( -90 ~ 90 )"
            inputMode="decimal"
            style={{
              ...inputStyle,
              borderColor: errors.latitude ? "#c0392b" : "#ccc",
            }}
          />
          {errors.latitude && <div style={errorText}>{errors.latitude}</div>}
        </div>
        {/* Source 下拉：必定是 server */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
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
        </div>

        <Field
          label="target"
          value={form.target}
          onChange={handleChange("target")}
          placeholder="empty is ok"
        />

        <Field label="user name" value={user.username} disabled />

        {/* 操作按鈕 */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          {editingId && (
            <button
              onClick={resetForm}
              style={{ background: "#7f8c8d" }}
              title="cancel"
            >
              cancel
            </button>
          )}
          {isFormValid && (
            <button onClick={handleSave}>
              {editingId ? "update Gateway" : "save Gateway"}
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
  const handleInput = useCallback(
    (e) => onChange?.(e.target.value),
    [onChange]
  );

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
