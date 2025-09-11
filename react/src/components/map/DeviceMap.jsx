import React, { useMemo, useCallback, useState, useRef, useEffect } from "react";
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from "@react-google-maps/api";
import { useGlobalContext } from "../../GlobalContext";

//  自然綠樣式（直接取代原本的 mapStyles）
const NATURE_GREEN = [
  // 整體色調
  { elementType: "geometry", stylers: [{ color: "#dff3e0" }] },           // 地面
  { elementType: "labels.text.fill", stylers: [{ color: "#2f4f3a" }] },   // 文字
  { elementType: "labels.text.stroke", stylers: [{ color: "#f2fbf2" }] }, // 文字描邊

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
}) {
  const { deviceData, mapFocus, getRawDevice, getRawGateway, rawData } = useGlobalContext();
  const [activeId, setActiveId] = useState(null);
  const mapRef = useRef(null);
  const pendingOpenRef = useRef(null);
  const prevOfflineOnlyRef = useRef(showOfflineOnly);

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
        type: String(d.type || "device").toLowerCase(),
      }))
      .filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng));
  }, [deviceData]);

  const offlineMarkers = useMemo(() => {
    return allMarkers.filter((m) => m.onlineStatus === false);
  }, [allMarkers]);

  const filteredMarkers = useMemo(() => {
    if (showOfflineOnly) return offlineMarkers;
    const enabled = {
      gateway: typeFilters?.gateway ?? false,
      device: typeFilters?.device ?? false,
    };
    const anyTypeSelected = Object.values(enabled).some(Boolean);
    if (!anyTypeSelected) return [];
    return allMarkers.filter((m) => enabled[m.type]);
  }, [allMarkers, typeFilters, showOfflineOnly, offlineMarkers]);

  const fallbackCenter = { lat: 25.033964, lng: 121.564468 };

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
      scaledSize: new Size(32, 32),
      anchor: new Point(16, 16),
      labelOrigin: new Point(16, 0),
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

  const handleMapLoad = useCallback(
    (map) => {
      mapRef.current = map;
      if (allMarkers.length > 0) {
        fitToMarkers(map, allMarkers, boundsPadding);
      } else {
        map.setCenter(fallbackCenter);
        map.setZoom(zoom);
      }
    },
    [allMarkers, boundsPadding, zoom, fitToMarkers]
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

  return (
    <div className="map-container card">
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
        {filteredMarkers.map((m) => (
          <Marker
            key={m.id}
            position={{ lat: m.lat, lng: m.lng }}
            title={`${m.name} [${m.type}] (${m.onlineStatus ? "online" : "offline"})`}
            icon={makeTypeIcon(m.type, colorFromStatus(m.onlineStatus))}
            onClick={() => {
              setActiveId(m.id);
              if (!userHasZoomed) {
                mapRef.current.setZoom(15); // 預設未縮放過 → 自動 zoom
              }
              centerOn(m.lat, m.lng);
            }}
          />
        ))}

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
              <div style={{ minWidth: 240 }}>
                {raw && (
                  <>
                    <hr />
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>
                      Raw {isGateway ? "Gateway" : "Device"} (from API)
                    </div>
                    {!isGateway ? (
                      <>
                        <div>deviceEui：{raw.deviceEui}</div>
                        <div>statusText：{raw.statusText ?? "-"}</div>
                        <div>onlineStatus：{String(raw.onlineStatus)}</div>
                        <div>location：{raw.location ?? "-"}</div>
                        <div>temperature：{raw.temperature ?? "-"}</div>
                        <div>voltage：{raw.voltage ?? "-"}</div>
                        <div>ripple：{raw.ripple ?? "-"}</div>
                        <div>current：{raw.current ?? "-"}</div>
                        <div>rfInputAvgPower：{raw.rfInputAvgPower ?? "-"}</div>
                        <div>rfOutputAvgPower：{raw.rfOutputAvgPower ?? "-"}</div>
                        <div>rfGainAvg：{raw.rfGainAvg ?? "-"}</div>
                        <div>lastUpdated：{raw.lastUpdated ?? "-"}</div>
                        {raw.gateway?.gatewayEui && (
                          <div style={{ marginTop: 6 }}>
                            gatewayEui：{raw.gateway.gatewayEui}（online：{String(raw.gateway.onlineStatus)}）
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div>gatewayEui：{raw.gatewayEui}</div>
                        <div>onlineStatus：{String(raw.onlineStatus)}</div>
                        <div>latitude：{raw.latitude ?? "-"}</div>
                        <div>longitude：{raw.longitude ?? "-"}</div>
                        <div>lastSeen：{raw.lastSeen ?? "-"}</div>
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
                      </>
                    )}
                  </>
                )}
              </div>
            </InfoWindow>
          );
        })()}
      </GoogleMap>
    </div>
  );
}
