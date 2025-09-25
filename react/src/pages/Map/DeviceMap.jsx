import React, { useMemo, useCallback, useState, useRef, useEffect } from "react";
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from "@react-google-maps/api";
import { useGlobalContext } from "../../GlobalContext";
import { Button } from 'react-bootstrap'
import { FiActivity } from "react-icons/fi";
import { useNavigate, useLocation } from "react-router-dom";

//  自然綠樣式（直接取代原本的 mapStyles）
const NATURE_GREEN = [
  // 整體色調
  { elementType: "geometry", stylers: [{ color: "#dff3e0" }] },           // 地面

  // { elementType: "labels.text.fill", stylers: [{ color: "#2f4f3a" }] },   // 文字
  { elementType: "labels.text.fill", stylers: [{ visibility: "off" }] },   // 文字
  // { elementType: "labels.text.stroke", stylers: [{ color: "#f2fbf2" }] }, // 文字描邊
  { elementType: "labels.text.stroke", stylers: [{ visibility: "off" }] }, // 文字描邊


  // 水域
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#bfe6f2" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#3a5a67" }] },

  // 自然地景 / 公園
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#cfead0" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#2e5a39" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#d7f0d8" }] },

  // 一般 POI（商店、餐飲等）弱化
  { featureType: "poi", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "poi.business", stylers: [{ visibility: "off" }] },
  { featureType: "poi.medical", stylers: [{ visibility: "off" }] },
  { featureType: "poi.school", stylers: [{ visibility: "simplified" }] },

  // 道路：低對比、偏綠灰
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#cfe6d6" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#466851" }] },
  { featureType: "road.local", elementType: "geometry", stylers: [{ color: "#d9efe0" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#c7e3d2" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#b9dbc7" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#a6cdb8" }] },

  // 交通與行政界線：弱化
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.country", stylers: [{ visibility: "simplified" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#2f4f3a" }] },
];

export default function DeviceMap({
  zoom = 12,
  height = 420,
  boundsPadding = 80,
  typeFilters,
  showOfflineOnly = false,

  searchText,
}) {

  const navigate = useNavigate();
  const location = useLocation();
  const { deviceData, mapFocus, getRawDevice, getRawGateway, rawData, alerts, loadData, setSelectedDevice, selectedDevice } = useGlobalContext();
  const [activeId, setActiveId] = useState(null);
  const mapRef = useRef(null);
  const pendingOpenRef = useRef(null);
  const prevOfflineOnlyRef = useRef(showOfflineOnly);

  //   /*****
  //  * 
  //  * 
  //  * 增加監聽alerts,吳有變動則重新fetch一次資料
  //  * 
  //  *  */ 
  //    useEffect(()=>{
  //     loadData()
  //   },[alerts])

  // === 放在 DeviceMap.jsx 內（元件最上面或 InfoWindow 附近都可）===
  const infoCx = {
    shell: {
      /* 這是我們唯一的卡片外觀（Google 外層已透明） */
      minWidth: 380,
      maxWidth: 420,
      background: "#fff",
      borderRadius: 12,
      boxShadow: "0 8px 24px rgba(0,0,0,.18)",
      border: "1px solid #e6f0ea",
      overflow: "hidden",
      position: "relative",
    },
    header: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      fontWeight: 700,
      padding: "10px 14px",
      borderBottom: "1px solid #e6f0ea",
      lineHeight: 1.2,
      whiteSpace: "nowrap"
    },
    closeBtn: {
      position: "absolute",
      top: 8,
      right: 8,
      width: 22,
      height: 22,
      borderRadius: 6,
      border: "1px solid #d1e7dd",
      background: "#fff",
      color: "#0f5132",
      fontSize: 14,
      lineHeight: "20px",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      zIndex: 1
    },
    rows: { padding: "6px 12px 10px" },
    row: {
      display: "grid",
      gridTemplateColumns: "120px 1fr",
      alignItems: "center",
      gap: 8,
      padding: "4px 0",
      lineHeight: 1.25,
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    },
    key: { color: "#3f6652", fontWeight: 700 },
    val: { color: "#111", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
    pill: (isAlarm) => ({
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      fontWeight: 700,
      padding: "2px 10px",
      borderRadius: 999,
      fontSize: 13,
      lineHeight: 1,
      background: isAlarm ? "#fee2e2" : "#dcfce7",
      color: isAlarm ? "#b91c1c" : "#14532d",
      border: `1px solid ${isAlarm ? "#fecaca" : "#bbf7d0"}`
    })
  };

  // 小工具：單列
  const Row = ({ k, v, title }) => (
    <div style={infoCx.row} title={title ?? (typeof v === "string" ? v : undefined)}>
      <div style={infoCx.key}>{k}</div>
      <div style={infoCx.val}>{v ?? "-"}</div>
    </div>
  );






  // 判斷該 marker 是否有未被 acknowledged 的告警
  // const hasUnackAlert = useCallback((markerId) => {
  //   return alerts.some(
  //     a => !a.acknowledged && String(a.targetId) === String(markerId)
  //   );
  // }, [alerts]);
  const hasUnackAlert = useCallback(
    (markerId) =>
      alerts.some(
        (a) => !a.acknowledged && String(a.targetId) === String(markerId)
      ),
    [alerts]
  );




  // 新增：判斷使用者是否有手動縮放過
  const [userHasZoomed, setUserHasZoomed] = useState(false);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    id: "google-map-script",
  });

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

  const offlineMarkers = useMemo(() => {
    return allMarkers.filter((m) => m.onlineStatus === false);
  }, [allMarkers]);

  /**
   * 
   * 
   * 
   */
  // const filteredMarkers = useMemo(() => {
  //   if (showOfflineOnly) return offlineMarkers;
  //   const enabled = {
  //     gateway: typeFilters?.gateway ?? false,
  //     device: typeFilters?.device ?? false,
  //   };

  //   const anyTypeSelected = Object.values(enabled).some(Boolean);
  //   if (!anyTypeSelected) return [];
  //   return allMarkers.filter((m) => enabled[m.type]);
  // }, [allMarkers, typeFilters, showOfflineOnly, offlineMarkers]);

  const filteredMarkers = useMemo(() => {
    // 若開啟只顯示 offline，直接回傳 offline list（保持你原行為）
    if (showOfflineOnly) return offlineMarkers;

    const enabled = {
      gateway: typeFilters?.gateway ?? false,
      device: typeFilters?.device ?? false,
    };
    const anyTypeSelected = Object.values(enabled).some(Boolean);
    if (!anyTypeSelected) return [];

    // 先依 type 過濾（保留原先依 type 顯示的行為）
    let base = allMarkers.filter((m) => enabled[m.type]);

    // 若沒有搜尋字串就直接回傳
    const q = (searchText ?? "").toString().trim().toLowerCase();
    if (!q) return base;

    // 有搜尋字串 -> 再用 raw 裡面的 eui 欄位（deviceEui / gatewayEui / eui / id）
    // 以及 marker 的 name（deviceName）做過濾（大小寫忽略）
    return base.filter((m) => {
      // 先比對本身 name
      if ((m.name || "").toLowerCase().includes(q)) return true;

      // 取得原始物件（由 context getter）
      const raw = m.type === "gateway" ? (getRawGateway?.(m.id) || null) : (getRawDevice?.(m.id) || null);
      if (!raw) return false;

      const euiCandidate = String(raw.deviceEui ?? raw.gatewayEui ?? raw.eui ?? raw.id ?? "").toLowerCase();
      if (euiCandidate && euiCandidate.includes(q)) return true;

      // 若 raw 裡有其他可搜尋欄位（例如 serialNumber / partNumber / partName），也可同時比對
      if ((String(raw.serialNumber || "")).toLowerCase().includes(q)) return true;
      if ((String(raw.partNumber || "")).toLowerCase().includes(q)) return true;
      if ((String(raw.partName || "")).toLowerCase().includes(q)) return true;
      if ((String(raw.location || "")).toLowerCase().includes(q)) return true;

      return false;
    });
  }, [allMarkers, typeFilters, showOfflineOnly, offlineMarkers, searchText, getRawDevice, getRawGateway]);



  /**
   * 
   * 
   * 
   */

  // demo地點
   const fallbackCenter = { lat: 38.9050090076424, lng: -77.02299340442659 };

  
  // const fallbackCenter = { lat: 25.033964, lng: 121.564468 };

  const colorFromStatus = (statusBool) => (statusBool ? "#27ae60" : "#e74c3c");

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

  // const handleMapLoad = useCallback(
  //   (map) => {
  //     mapRef.current = map;
  //     if (allMarkers.length > 0) {
  //       fitToMarkers(map, allMarkers, boundsPadding);
  //     } else {
  //       map.setCenter(fallbackCenter);
  //       map.setZoom(zoom);
  //     }
  //   },
  //   [allMarkers, boundsPadding, zoom, fitToMarkers]
  // );

  const handleMapLoad = useCallback(
    (map) => {
      mapRef.current = map;
      if (allMarkers.length > 0) {
        fitToMarkers(map, allMarkers, boundsPadding);
      } else {
        //如果打開每次load地圖就會回到初始點
        // map.setCenter(fallbackCenter);
        map.setZoom(zoom);
      }
    },
    [boundsPadding, zoom, fitToMarkers]
  );

  // 🔹 偵測使用者是否縮放過
  const handleZoomChanged = () => {
    if (mapRef.current) {
      setUserHasZoomed(true);
    }
  };



  // 外部聚焦
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
    if (mapFocus.openInfo) {
      setActiveId(String(mapFocus.id));
    }
  }, [mapFocus, userHasZoomed]);

  // markers 準備好後 → 嘗試開窗
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

  // ---- 其他 useEffect (offlineOnly, resize 等) 保持不變 ----

  const centerOn = useCallback((lat, lng) => {
    const map = mapRef.current;
    if (!map || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
    map.panTo({ lat, lng });
  }, []);

  if (loadError) return <div style={{ padding: 12, color: "crimson" }}>地圖載入失敗：{String(loadError)}</div>;
  if (!isLoaded) return <div style={{ padding: 12 }}>地圖載入中…</div>;





  // useEffect(() => {
  //   const qs = new URLSearchParams(location.search);
  //   const eui = qs.get("deviceEui") || localStorage.getItem("selectedDeviceEui");

  //   console.log("deviceeui : "+eui)

  // }, [location.search]);




  return (
    <div className="map-container card">
      {InfoCSS}
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "100%" }}
        center={fallbackCenter}
        zoom={zoom}
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
        onZoomChanged={handleZoomChanged} // 🔹 追蹤使用者縮放
      >
        {/* {filteredMarkers.map((m) => (
          // 顏色邏輯：
          // 1. onlineStatus 為 false → 紅色
          // 2. onlineStatus 為 true 且 (沒有 statusText 或 statusText === 'Normal') → 綠色
          // 3. onlineStatus 為 true 且 statusText !== 'Normal' → 黃色

          <Marker
            key={m.id}
            position={{ lat: m.lat, lng: m.lng }}
            title={`${m.name} [${m.type}] (${m.onlineStatus ? "online" : "offline"})`}
            // icon={makeTypeIcon(m.type, colorFromStatus(m.onlineStatus))}
            icon={makeTypeIcon(
              m.type,
              !m.onlineStatus
                ? "#ef4444" // 紅：offline
                : !m.statusText || m.statusText === "Normal"
                  ? "#16a34a" // 綠：online 且 Normal 或沒有 statusText
                  : "#eab308" // 黃：online 且 非 Normal
            )}
            onClick={() => {
              setActiveId(m.id);
              if (!userHasZoomed) {
                mapRef.current.setZoom(15); // 預設未縮放過 → 自動 zoom
              }
              centerOn(m.lat, m.lng);
            }}
          />
        ))} */}

        {filteredMarkers.map((m) => {
          let color;
          if (hasUnackAlert(m.id)) {
            // ❶ 全域告警優先：有任何未處理告警 → 黃
            color = "#eab308";
          } else if (!m.onlineStatus) {
            // ❷ 沒告警時再看上線狀態
            color = "#ef4444"; // 紅
          } else if (!m.statusText || m.statusText === "Normal") {
            color = "#16a34a"; // 綠
          } else {
            color = "#eab308"; // 黃
          }

          return (
            <Marker
              key={m.id}
              position={{ lat: m.lat, lng: m.lng }}
              title={`${m.name} [${m.type}] (${m.onlineStatus ? "online" : "offline"})`}
              icon={makeTypeIcon(m.type, color)}
              onClick={() => {
                setActiveId(m.id);
                if (!userHasZoomed) mapRef.current.setZoom(15);
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
              onCloseClick={() => setActiveId(null)}     // 雖然預設 X 被隱藏，但仍保留事件以防未來還原
              onDomReady={() => centerOn(current.lat, current.lng)}
            >
              <div style={infoCx.shell}>
                {/* 自訂唯一的關閉鈕（只留這個） */}
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
                {
                  !isGateway ? (<>
                    <div style={infoCx.rows}>
                      <div style={infoCx.row}><div style={infoCx.key}>EUI:</div><div style={infoCx.val}>{raw.deviceEui}</div></div>
                      <div style={infoCx.row}><div style={infoCx.key}>Name:</div><div style={infoCx.val}>{raw.partName || raw.serialNumber || "-"}</div></div>
                      <div style={infoCx.row}><div style={infoCx.key}>Address:</div><div style={infoCx.val} title={raw.location}>{raw.location}</div></div>
                      <div style={infoCx.row}><div style={infoCx.key}>Model:</div><div style={infoCx.val}>{raw.partNumber || "-"}</div></div>

                      <div style={infoCx.row}>
                        <div style={infoCx.key}>Status:</div>
                        <div style={infoCx.val}>
                          <span style={infoCx.pill((raw.statusText || "").toLowerCase() === "alarm")}>
                            {(raw.statusText || "").toLowerCase() === "alarm" ? " Alarm" : " Normal"}
                          </span>



                        </div>
                      </div>
                      <div style={infoCx.row}><div style={infoCx.key}>Temperature:</div><div style={infoCx.val}>{raw.temperature ?? "-"}°C</div></div>
                      <div style={infoCx.row}><div style={infoCx.key}>Voltage:</div><div style={infoCx.val}>{raw.voltage ?? "-"}V</div></div>
                      <div style={infoCx.row}><div style={infoCx.key}>Last Update:</div><div style={infoCx.val}>{raw.lastUpdated ? new Date(raw.lastUpdated).toLocaleString() : "-"}</div></div>



                      <div className="text-center mt-2">
                        {/* <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => {
                            localStorage.setItem("selectedDeviceEui", String(raw.deviceEui)); 
    
                            const url = `/dashboard?deviceEui=${encodeURIComponent(String(raw.deviceEui))}`;
                            navigate(url);
                          }
                          }
                        > */}
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => {
                            // // 儲存 selectedDeviceEui（保留舊行為）
                            // localStorage.setItem("selectedDeviceEui", String(raw.deviceEui));

                            // // 同時把整個 device 物件放進 location.state，並帶上 query（可選）
                            // navigate(`/dashboard?deviceEui=${encodeURIComponent(String(raw.deviceEui))}`, {
                            //   state: { device: raw },
                            // });

                            setSelectedDevice(raw);    // from useGlobalContext()
                            navigate("/dashboard");    // 不再傳 state/url
                          }}
                        >
                          <FiActivity className="me-1" />
                          View DashBoard
                        </Button>
                      </div>






                    </div>
                  </>
                  ) : (
                    <>
                      <div style={infoCx.rows}>
                        <div style={infoCx.row}><div style={infoCx.key}>EUI:</div><div style={infoCx.val}>{raw.gatewayEui}</div></div>

                        <div style={infoCx.row}><div style={infoCx.key}>latitude:</div><div style={infoCx.val} title={raw.latitude}>{raw.latitude}</div></div>
                        <div style={infoCx.row}><div style={infoCx.key}>longitude:</div><div style={infoCx.val} title={raw.longitude}>{raw.longitude}</div></div>


                        <div style={infoCx.row}>
                          <div style={infoCx.key}>Status:</div>
                          <div style={infoCx.val}>
                            <span style={infoCx.pill(current.onlineStatus !== true)}>
                              {current.onlineStatus ? " Online" : " Offline"}
                            </span>
                          </div>
                        </div>

                        <div style={infoCx.row}><div style={infoCx.key}>Last Update:</div><div style={infoCx.val}>{raw.lastSeen ? new Date(raw.lastSeen).toLocaleString() : "-"}</div></div>



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

                    </>
                  )
                }

                {/* <div style={infoCx.rows}>
                  <div style={infoCx.row}><div style={infoCx.key}>EUI:</div><div style={infoCx.val}>{raw.deviceEui}</div></div>
                  <div style={infoCx.row}><div style={infoCx.key}>Name:</div><div style={infoCx.val}>{raw.partName || raw.serialNumber || "-"}</div></div>
                  <div style={infoCx.row}><div style={infoCx.key}>Address:</div><div style={infoCx.val} title={raw.location}>{raw.location}</div></div>
                  <div style={infoCx.row}><div style={infoCx.key}>Model:</div><div style={infoCx.val}>{raw.partNumber || "-"}</div></div>
                  <div style={infoCx.row}>
                    <div style={infoCx.key}>Status:</div>
                    <div style={infoCx.val}>
                      <span style={infoCx.pill((raw.statusText || "").toLowerCase() === "alarm")}>
                        {(raw.statusText || "").toLowerCase() === "alarm" ? " Alarm" : " Normal"}
                      </span>
                    </div>
                  </div>
                  <div style={infoCx.row}><div style={infoCx.key}>Temperature:</div><div style={infoCx.val}>{raw.temperature ?? "-"}°C</div></div>
                  <div style={infoCx.row}><div style={infoCx.key}>Voltage:</div><div style={infoCx.val}>{raw.voltage ?? "-"}V</div></div>
                  <div style={infoCx.row}><div style={infoCx.key}>Last Update:</div><div style={infoCx.val}>{raw.lastUpdated ? new Date(raw.lastUpdated).toLocaleString() : "-"}</div></div>



                  {isGateway && linkedDevices.length > 0 && (
                    <div style={{ paddingTop: 8 }}>
                      <div style={{ fontWeight: 700, color: "#3f6652", marginBottom: 6 }}>Linked Devices</div>
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {linkedDevices.slice(0, 6).map((d) => (
                          <li key={d.deviceEui} title={d.partName || d.serialNumber || d.deviceEui}>
                            {d.partName || d.serialNumber || d.deviceEui}
                          </li>
                        ))}
                        {linkedDevices.length > 6 && <li>…and {linkedDevices.length - 6} more</li>}
                      </ul>
                    </div>
                  )}

                </div> */}
              </div>
            </InfoWindow>


          );
        })()}
      </GoogleMap>
    </div >
  );
}


// ===== helpers 放在元件內（return 之前） =====
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
  // 自訂告警判斷規則：statusText 含 alarm、或任何 *_AlarmStatus 為 1
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

// ===== styles：可放在 return 上方，或集中到你的全域 css =====
const InfoCSS = (
  <style>{`
  /* 取消 InfoWindow 內層內容容器的捲軸與高度限制 */
.gm-style .gm-style-iw-d{
  overflow: visible !important;
  max-height: none !important;
}

/* 外層殼也不要限制高度（避免間接觸發捲軸） */
.gm-style .gm-style-iw-c{
  max-height: none !important;
  overflow: visible !important;
}

    /* 收斂 Google InfoWindow 的關閉鍵：只縮圖示，不縮點擊熱區 */
    .gm-style .gm-style-iw-c button.gm-ui-hover-effect{
      top: 8px !important;
      right: 8px !important;
      width: 24px !important;
      height: 24px !important;
      line-height: 24px !important;
    }
    .gm-style .gm-style-iw-c button.gm-ui-hover-effect img,
    .gm-style .gm-style-iw-c button.gm-ui-hover-effect span{
      display:block !important;
      transform: scale(0.75);
      transform-origin:center;
      pointer-events:none;
    }

    /* 內容容器 */
    .iw-wrap{
      min-width: 320px;
      max-width: 420px;
      font-size: 14px;
      line-height: 1.6;
      color: #1f2937;
    }
    .iw-header{
      display:flex; align-items:center; gap:8px;
      font-weight:700; font-size:18px; color:#1b3e2b;
      margin-bottom:8px; padding-bottom:8px; border-bottom:2px solid #39b980;
    }
    .iw-header-icon{ font-weight:700; color:#39b980; }
    .iw-header-title{ letter-spacing:.2px; }

    .iw-row{
      display:grid; grid-template-columns: 120px 1fr;
      gap:8px; padding:10px 0; border-bottom:1px solid #edf2f7;
    }
    .iw-k{ font-weight:700; color:#0f172a; }
    .iw-v{ word-break: break-word; }

    .iw-chip{
      display:inline-block; padding:2px 8px; border-radius:8px;
      background:#fde2f1; color:#8a195a; font-weight:600; font-size:12px;
    }

    .iw-badge{
      display:inline-flex; align-items:center; padding:4px 10px; border-radius:999px;
      font-weight:700; font-size:13px; letter-spacing:.2px;
      border:1px solid transparent;
    }
    .iw-badge.ok{
      background:#e8f7ef; color:#146c43; border-color:#b8ebd0;
    }
    .iw-badge.alarm{
      background:#fff6cc; color:#92400e; border-color:#f7e08f;
      box-shadow: 0 0 0 2px rgba(255, 193, 7, .25) inset;
    }

    .iw-icon{ margin-right:6px; }

    .iw-btn{
      background:#e6f7ef; color:#136f4a; font-weight:700;
      padding:10px 14px; border:2px solid #b9ead6; border-radius:10px;
      cursor:pointer;
    }
    .iw-btn:hover{ background:#d8f1e7; }
  `}</style>
);
