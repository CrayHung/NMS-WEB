// DeviceMap.jsx
import React, { useMemo, useCallback, useState, useRef, useEffect } from "react";
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from "@react-google-maps/api";
import { useGlobalContext } from "../../GlobalContext";
import { Button } from 'react-bootstrap'
import { FiActivity } from "react-icons/fi";
import { useNavigate, useLocation } from "react-router-dom";

//  自然綠樣式（直接取代原本的 mapStyles）
const NATURE_GREEN = [
  { elementType: "geometry", stylers: [{ color: "#dff3e0" }] },
  { elementType: "labels.text.fill", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.stroke", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#bfe6f2" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#3a5a67" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#cfead0" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#2e5a39" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#d7f0d8" }] },
  { featureType: "poi", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "poi.business", stylers: [{ visibility: "off" }] },
  { featureType: "poi.medical", stylers: [{ visibility: "off" }] },
  { featureType: "poi.school", stylers: [{ visibility: "simplified" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#cfe6d6" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#466851" }] },
  { featureType: "road.local", elementType: "geometry", stylers: [{ color: "#d9efe0" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#c7e3d2" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#b9dbc7" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#a6cdb8" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.country", stylers: [{ visibility: "simplified" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#2f4f3a" }] },
];

export default function DeviceMap({
  zoom = 2,
  height = 420,
  boundsPadding = 80,
  typeFilters,
  showOfflineOnly = false,
  searchText,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { deviceData, mapFocus, getRawDevice, getRawGateway, rawData, alerts, setSelectedDevice } = useGlobalContext();

  const [activeId, setActiveId] = useState(null);
  const [userHasZoomed, setUserHasZoomed] = useState(false); // 使用者是否手動縮放過
  const mapRef = useRef(null);
  const pendingOpenRef = useRef(null);
  const didInitRef = useRef(false);          // ✅ 只在第一次 onLoad 初始化
  const fitDebounceTimer = useRef(null);     // 自動 fit 防抖

  // === InfoWindow UI 風格 ===
  const infoCx = {
    shell: {
      minWidth: 380, maxWidth: 420, background: "#fff", borderRadius: 12,
      boxShadow: "0 8px 24px rgba(0,0,0,.18)", border: "1px solid #e6f0ea",
      overflow: "hidden", position: "relative",
    },
    header: {
      display: "flex", alignItems: "center", gap: 8, fontWeight: 700,
      padding: "10px 14px", borderBottom: "1px solid #e6f0ea",
      lineHeight: 1.2, whiteSpace: "nowrap"
    },
    closeBtn: {
      position: "absolute", top: 8, right: 8, width: 22, height: 22,
      borderRadius: 6, border: "1px solid #d1e7dd", background: "#fff",
      color: "#0f5132", fontSize: 14, lineHeight: "20px", display: "inline-flex",
      alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 1
    },
    rows: { padding: "6px 12px 10px" },
    row: {
      display: "grid", gridTemplateColumns: "120px 1fr", alignItems: "center",
      gap: 8, padding: "4px 0", lineHeight: 1.25, whiteSpace: "nowrap",
      overflow: "hidden", textOverflow: "ellipsis",
    },
    key: { color: "#3f6652", fontWeight: 700 },
    val: { color: "#111", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
    pill: (isAlarm) => ({
      display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700,
      padding: "2px 10px", borderRadius: 999, fontSize: 13, lineHeight: 1,
      background: isAlarm ? "#fee2e2" : "#dcfce7",
      color: isAlarm ? "#b91c1c" : "#14532d",
      border: `1px solid ${isAlarm ? "#fecaca" : "#bbf7d0"}`
    })
  };
  const Row = ({ k, v, title }) => (
    <div style={infoCx.row} title={title ?? (typeof v === "string" ? v : undefined)}>
      <div style={infoCx.key}>{k}</div>
      <div style={infoCx.val}>{v ?? "-"}</div>
    </div>
  );

  // 告警偵測
  const hasUnackAlert = useCallback(
    (markerId) => alerts.some((a) => !a.acknowledged && String(a.targetId) === String(markerId)),
    [alerts]
  );

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    id: "google-map-script",
  });


  

  // 將 deviceData 正規化為 Marker 陣列
  const allMarkers = useMemo(() => {
    const list = Array.isArray(deviceData) ? deviceData : [];
    return list
      .map((d, i) => ({
        id: d.deviceId ?? String(i),
        name: d.deviceName ?? `Device ${i + 1}`,
        lat: Number(d.latitude),
        lng: Number(d.longitude),
        onlineStatus: Boolean(d.onlineStatus),
        statusText: d.statusText,
        type: String(d.type || "device").toLowerCase(),
      }))
      .filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng));
  }, [deviceData]);

  const offlineMarkers = useMemo(() => allMarkers.filter((m) => m.onlineStatus === false), [allMarkers]);

  // 依 type / offlineOnly / searchText 篩選
  const filteredMarkers = useMemo(() => {
    if (showOfflineOnly) return offlineMarkers;
    const enabled = {
      gateway: typeFilters?.gateway ?? false,
      device: typeFilters?.device ?? false,
    };
    const anyTypeSelected = Object.values(enabled).some(Boolean);
    if (!anyTypeSelected) return [];

    let base = allMarkers.filter((m) => enabled[m.type]);

    const q = (searchText ?? "").toString().trim().toLowerCase();
    if (!q) return base;

    return base.filter((m) => {
      if ((m.name || "").toLowerCase().includes(q)) return true;
      const raw = m.type === "gateway" ? (getRawGateway?.(m.id) || null) : (getRawDevice?.(m.id) || null);
      if (!raw) return false;

      const euiCandidate = String(raw.deviceEui ?? raw.gatewayEui ?? raw.eui ?? raw.id ?? "").toLowerCase();
      if (euiCandidate && euiCandidate.includes(q)) return true;

      if ((String(raw.serialNumber || "")).toLowerCase().includes(q)) return true;
      if ((String(raw.partNumber || "")).toLowerCase().includes(q)) return true;
      if ((String(raw.partName || "")).toLowerCase().includes(q)) return true;
      if ((String(raw.location || "")).toLowerCase().includes(q)) return true;

      return false;
    });
  }, [allMarkers, typeFilters, showOfflineOnly, offlineMarkers, searchText, getRawDevice, getRawGateway]);

  // demo fallback center（只在地圖尚未有標記時使用）
  const fallbackCenter = { lat: 38.9050090076424, lng: -77.02299340442659 };

  // marker 圖示
  const makeTypeIcon = useCallback((type, color) => {
    const svgByType = {
      device: `
        <svg width="36" height="36" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <g filter="url(#s)">
            <path d="M11 2 L6 12 H11 L9 22 L18 9 H13 L15 2 Z" fill="${color}" stroke="white" stroke-width="1"/>
          </g>
          <defs><filter id="s"><feDropShadow dx="0" dy="1" stdDeviation="1" flood-opacity="0.3"/></filter></defs>
        </svg>
      `,
      gateway: `
        <svg width="36" height="36" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <g filter="url(#s)">
            <rect x="5" y="13" width="14" height="4" rx="1" fill="${color}" stroke="white" stroke-width="1"/>
            <path d="M8 12c1.8-1.8 6.2-1.8 8 0" stroke="${color}" stroke-width="2" fill="none"/>
            <path d="M6 10c3-3 9-3 12 0" stroke="${color}" stroke-width="1.6" fill="none" opacity="0.8"/>
            <path d="M4 8c4.5-4.5 11.5-4.5 16 0" stroke="${color}" stroke-width="1.2" fill="none" opacity="0.6"/>
          </g>
          <defs><filter id="s"><feDropShadow dx="0" dy="1" stdDeviation="1" flood-opacity="0.3"/></filter></defs>
        </svg>
      `,
    };
    const svg = svgByType[type] || svgByType.device;
    const { Size, Point } = window.google.maps;
    return {
      url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg),
      scaledSize: new Size(40, 40),
      anchor: new Point(20, 20),
      labelOrigin: new Point(20, 0),
    };
  }, []);

  // === 共用工具 ===
  const fitToMarkers = useCallback((map, markers, padding = 80) => {
    if (!markers || markers.length === 0) return;
    if (markers.length === 1) {
      const { lat, lng } = markers[0];
      map.setCenter({ lat, lng });
      map.setZoom(14);
      return;
    }
    const bounds = new window.google.maps.LatLngBounds();
    markers.forEach(({ lat, lng }) => bounds.extend({ lat, lng }));
    map.fitBounds(bounds, padding);
  }, []);

  const boundsContainAll = useCallback((map, markers) => {
    if (!map || !markers?.length) return false;
    const b = map.getBounds();
    if (!b) return false;
    return markers.every(m => b.contains(new window.google.maps.LatLng(m.lat, m.lng)));
  }, []);

  const computeBounds = useCallback((markers) => {
    const bounds = new window.google.maps.LatLngBounds();
    markers.forEach(({ lat, lng }) => bounds.extend({ lat, lng }));
    return bounds;
  }, []);

  // === 地圖載入：只在初始時定位（或沒有標記時用 fallback）===
  const handleMapLoad = useCallback(
    (map) => {
      mapRef.current = map;

      if (didInitRef.current) return;   // ✅ 避免重複初始化
      didInitRef.current = true;

      if (allMarkers.length > 0) {
        fitToMarkers(map, allMarkers, boundsPadding);
      } else {
        map.setCenter(fallbackCenter);
        map.setZoom(zoom);
      }
    },
    [allMarkers.length, boundsPadding, zoom, fitToMarkers]
  );

  // 使用者手動縮放
  const handleZoomChanged = () => setUserHasZoomed(true);

  // === 外部聚焦（保留原行為） ===
  useEffect(() => {
    if (!mapFocus) return;
    pendingOpenRef.current = String(mapFocus.id);
    if (mapRef.current) {
      const map = mapRef.current;
      if (Number.isFinite(mapFocus.lat) && Number.isFinite(mapFocus.lng)) {
        map.panTo({ lat: mapFocus.lat, lng: mapFocus.lng });
      }
      if (!userHasZoomed && mapFocus.zoom) {
        map.setZoom(Math.min(18, Math.max(5, Number(mapFocus.zoom))));
      }
    }
    if (mapFocus.openInfo) setActiveId(String(mapFocus.id));
  }, [mapFocus, userHasZoomed]);

  // === 標記準備好後，若有要求開窗則開窗 ===
  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;
    const reqId = pendingOpenRef.current;
    if (!reqId) return;

    let m = filteredMarkers.find((x) => String(x.id) === String(reqId));
    if (!m) m = allMarkers.find((x) => String(x.id) === String(reqId));
    if (!m) return;

    setActiveId(String(reqId));
    if (Number.isFinite(m.lat) && Number.isFinite(m.lng)) {
      mapRef.current.panTo({ lat: m.lat, lng: m.lng });
    }
    pendingOpenRef.current = null;
  }, [filteredMarkers, allMarkers, isLoaded]);

  // === 當「要渲染的 Marker 清單」改變時，自動調整視窗 ===
  useEffect(() => {
    const map = mapRef.current;
    if (!isLoaded || !map) return;

    // 清掉上一個 debounce
    if (fitDebounceTimer.current) {
      clearTimeout(fitDebounceTimer.current);
      fitDebounceTimer.current = null;
    }

    fitDebounceTimer.current = setTimeout(() => {
      const markers = filteredMarkers;
      if (!markers || markers.length === 0) return;

      if (markers.length === 1) {
        const { lat, lng } = markers[0];
        // 如果單點不在目前視窗中才調整（避免多餘位移）
        if (!map.getBounds() || !map.getBounds().contains(new window.google.maps.LatLng(lat, lng))) {
          map.panTo({ lat, lng });
          map.setZoom(14);
        }
        return;
      }

      // 多點：若目前視窗已包含所有點 → 不動；否則 fitBounds
      if (!boundsContainAll(map, markers)) {
        const bounds = computeBounds(markers);
        map.fitBounds(bounds, boundsPadding);
      }
    }, 120);

    return () => {
      if (fitDebounceTimer.current) {
        clearTimeout(fitDebounceTimer.current);
        fitDebounceTimer.current = null;
      }
    };
  }, [filteredMarkers, boundsPadding, isLoaded, boundsContainAll, computeBounds]);

  // 置中工具
  const centerOn = useCallback((lat, lng) => {
    const map = mapRef.current;
    if (!map || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
    map.panTo({ lat, lng });
  }, []);

  if (loadError) return <div style={{ padding: 12, color: "crimson" }}>Map loading fail：{String(loadError)}</div>;
  if (!isLoaded) return <div style={{ padding: 12 }}>Map loading...</div>;



    
  return (
    <div className="map-container card" style={{ height }}>
      {InfoCSS}
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "100%" }}
        defaultCenter={fallbackCenter}  // ✅ 非受控，避免每次 re-render 拉回去
        defaultZoom={zoom}              // ✅ 非受控
        options={{
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          clickableIcons: false,
          gestureHandling: "greedy",
          maxZoom: 18,
          styles: NATURE_GREEN,
        }}
        onLoad={handleMapLoad}
        onClick={() => setActiveId(null)}
        onZoomChanged={handleZoomChanged}
      >
        {filteredMarkers.map((m) => {
          let color;
          if (hasUnackAlert(m.id)) {
            color = "#eab308"; // 未處理告警 → 黃
          } else if (!m.onlineStatus) {
            color = "#ef4444"; // 離線 → 紅
          } else if (!m.statusText || m.statusText === "Normal") {
            color = "#16a34a"; // 線上且 Normal → 綠
          } else {
            color = "#eab308"; // 其他狀態 → 黃
          }

          return (
            <Marker
              key={m.id}
              position={{ lat: m.lat, lng: m.lng }}
              title={`${m.name} [${m.type}] (${m.onlineStatus ? "online" : "offline"})`}
              icon={makeTypeIcon(m.type, color)}
              onClick={() => {
                setActiveId(m.id);
                if (!userHasZoomed) mapRef.current.setZoom(15); // 未縮放過：點 marker 稍微放大
                centerOn(m.lat, m.lng);
              }}
            />
          );
        })}

        {activeId != null && (() => {
          const current =
            filteredMarkers.find((x) => x.id === activeId) ||
            allMarkers.find((x) => x.id === activeId);
          if (!current) return null;

          const isGateway = current.type === "gateway";
          const raw = isGateway ? (getRawGateway?.(current.id) || null) : (getRawDevice?.(current.id) || null);
          const linkedDevices = isGateway
            ? (Array.isArray(rawData?.devices) ? rawData.devices.filter(d =>
              String(d?.gateway?.gatewayEui) === String(current.id)
            ) : [])
            : [];

          return (
            <InfoWindow
              position={{ lat: current.lat, lng: current.lng }}
              onCloseClick={() => setActiveId(null)}
              onDomReady={() => centerOn(current.lat, current.lng)}
            >
              <div style={infoCx.shell}>
                <button
                  style={infoCx.closeBtn}
                  onClick={() => setActiveId(null)}
                  aria-label="Close"
                >
                  ×
                </button>

                <div style={infoCx.header}>
                  <span>{isGateway ? "Gateway" : "Device"} Information</span>
                </div>

                {!isGateway ? (
                  <div style={infoCx.rows}>
                    <Row k="EUI:" v={raw?.deviceEui} />
                    <Row k="SerialNumber:" v={ raw?.serialNumber || "-"} />
                    <Row k="Model:" v={ raw?.partName || "-"} />
                    <Row k="Address:" v={raw?.location} title={raw?.location} />
                    <Row k="Part Number:" v={raw?.partNumber || "-"} />
                    <div style={infoCx.row}>
                      <div style={infoCx.key}>Status:</div>
                      <div style={infoCx.val}>
                        <span style={infoCx.pill((raw?.statusText || "").toLowerCase() === "alarm")}>
                          {(raw?.statusText || "").toLowerCase() === "alarm" ? " Alarm" : " Normal"}
                        </span>
                      </div>
                    </div>
                    <Row k="Temperature:" v={raw?.temperature != null ? `${raw.temperature}°C` : "-"} />
                    <Row k="Voltage:" v={raw?.voltage != null ? `${raw.voltage}V` : "-"} />
                    <Row k="Last Update:" v={raw?.lastUpdated ? new Date(raw.lastUpdated).toLocaleString() : "-"} />

                    <div className="text-center mt-2">
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => {
                          setSelectedDevice(raw);
                          navigate("/dashboard");
                        }}
                      >
                        <FiActivity className="me-1" />
                        View DashBoard
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div style={infoCx.rows}>
                    <Row k="EUI:" v={raw?.gatewayEui} />
                    <Row k="Latitude:" v={raw?.latitude} title={raw?.latitude} />
                    <Row k="Longitude:" v={raw?.longitude} title={raw?.longitude} />
                    <div style={infoCx.row}>
                      <div style={infoCx.key}>Status:</div>
                      <div style={infoCx.val}>
                        <span style={infoCx.pill(current.onlineStatus !== true)}>
                          {current.onlineStatus ? " Online" : " Offline"}
                        </span>
                      </div>
                    </div>
                    <Row k="Last Update:" v={raw?.lastSeen ? new Date(raw.lastSeen).toLocaleString("en-US") : "-"} />
                    


                    {linkedDevices.length > 0 && (
                      <details style={{ marginTop: 6 }}>
                        <summary>Linked devices（{linkedDevices.length}）</summary>
                        <ul style={{ margin: "6px 0 0 18px", padding: 0 }}>
                          {linkedDevices.map(d => (
                            <li key={d.deviceEui}>
                              {d.partName || d.serialNumber || d.deviceEui}（online：{String(d.onlineStatus)}）
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                )}
              </div>
            </InfoWindow>
          );
        })()}
      </GoogleMap>
    </div>
  );

}

// ===== helpers =====
const fmtNullable = (v, unit = "") =>
  (v === null || v === undefined || v === "" ? "-" : `${v}${unit}`);

const fmtRelative = (iso) => {
  if (!iso) return "-";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return iso;
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 5) return "Just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
};

const renderStatusBadge = (raw) => {
  const text = String(raw?.statusText || "").trim();
  const hasAlarmWord = /alarm/i.test(text);
  const hasAlarmFlag =
    raw?.tempAlarmStatus === 1 ||
    raw?.voltAlarmStatus === 1 ||
    raw?.rippleAlarmStatus === 1 ||
    raw?.tcpAlarmStatus === 1;

  const level = hasAlarmWord || hasAlarmFlag ? "alarm" : "ok";
  const label = level === "alarm" ? (text || "Alarm") : (text || "Normal");

  return (
    <span className={`iw-badge ${level}`}>
      {level === "alarm" ? "⚠️ " : "✅ "}
      {label}
    </span>
  );
};

// ===== styles =====
const InfoCSS = (
  <style>{`
  .gm-style .gm-style-iw-d{ overflow: visible !important; max-height: none !important; }
  .gm-style .gm-style-iw-c{ max-height: none !important; overflow: visible !important; }

  .gm-style .gm-style-iw-c button.gm-ui-hover-effect{
    top: 8px !important; right: 8px !important; width: 24px !important; height: 24px !important; line-height: 24px !important;
  }
  .gm-style .gm-style-iw-c button.gm-ui-hover-effect img,
  .gm-style .gm-style-iw-c button.gm-ui-hover-effect span{
    display:block !important; transform: scale(0.75); transform-origin:center; pointer-events:none;
  }

  .iw-wrap{ min-width: 320px; max-width: 420px; font-size: 14px; line-height: 1.6; color: #1f2937; }
  .iw-header{ display:flex; align-items:center; gap:8px; font-weight:700; font-size:18px; color:#1b3e2b;
    margin-bottom:8px; padding-bottom:8px; border-bottom:2px solid #39b980; }
  .iw-header-icon{ font-weight:700; color:#39b980; }
  .iw-header-title{ letter-spacing:.2px; }

  .iw-row{ display:grid; grid-template-columns: 120px 1fr; gap:8px; padding:10px 0; border-bottom:1px solid #edf2f7; }
  .iw-k{ font-weight:700; color:#0f172a; }
  .iw-v{ word-break: break-word; }

  .iw-chip{ display:inline-block; padding:2px 8px; border-radius:8px; background:#fde2f1; color:#8a195a; font-weight:600; font-size:12px; }

  .iw-badge{ display:inline-flex; align-items:center; padding:4px 10px; border-radius:999px; font-weight:700; font-size:13px; letter-spacing:.2px; border:1px solid transparent; }
  .iw-badge.ok{ background:#e8f7ef; color:#146c43; border-color:#b8ebd0; }
  .iw-badge.alarm{ background:#fff6cc; color:#92400e; border-color:#f7e08f; box-shadow: 0 0 0 2px rgba(255, 193, 7, .25) inset; }

  .iw-icon{ margin-right:6px; }
  .iw-btn{ background:#e6f7ef; color:#136f4a; font-weight:700; padding:10px 14px; border:2px solid #b9ead6; border-radius:10px; cursor:pointer; }
  .iw-btn:hover{ background:#d8f1e7; }
`}</style>
);
