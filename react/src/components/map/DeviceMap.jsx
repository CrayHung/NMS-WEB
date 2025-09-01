//src/component/map/DeviceMap.jsx
import React, { useMemo, useCallback, useState, useRef, useEffect } from "react";
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from "@react-google-maps/api";
import { useGlobalContext } from "../../GlobalContext";

//google map api param
/**
 * @param {object} props
 * @param {number} [props.zoom=12]
 * @param {number} [props.height=420]
 * @param {number} [props.boundsPadding=80]
 * @param {{server:boolean,gateway:boolean,transponder:boolean,amp:boolean}} [props.typeFilters]
 * @param {boolean} [props.showOfflineOnly=false]
 */

export default function DeviceMap({
  zoom = 12,
  height = 420,
  boundsPadding = 80,
  typeFilters,
  showOfflineOnly = false,
}) {

  //將focus的部分設為全域變數
  const { deviceData, mapFocus } = useGlobalContext();
  //點擊到哪一個Marker時 (方便展開InfoWindow用)
  const [activeId, setActiveId] = useState(null);
  const mapRef = useRef(null);

  // 用來偵測 showOfflineOnly 的上一次值 , 做切換瞬間的特殊處理
  const prevOfflineOnlyRef = useRef(showOfflineOnly);

  //此為google map API使用的金鑰 , 之齁應該要換成公司的
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    id: "google-map-script",
  });


  // 全部設備（不受 checkbox 影響，用於初始 fit）
  //將deviceData的所有內容儲存再allMarkers
  const allMarkers = useMemo(() => {
    const list = Array.isArray(deviceData) ? deviceData : [];
    return list
      .map((d, i) => ({
        id: d.deviceId ?? String(i),
        name: d.deviceName ?? `Device ${i + 1}`,
        lat: Number(d.latitude),
        lng: Number(d.longitude),
        status: String(d.status || "").toLowerCase(),
        type: String(d.type || "server").toLowerCase(),
      }))
      .filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng));
  }, [deviceData]);


  // 全部offline的設備
  const offlineMarkers = useMemo(() => {
    return allMarkers.filter((m) => m.status === "offline" || m.status === "shutdown");
  }, [allMarkers]);


  // 依 UI 勾選後實際要顯示的 markers
  const filteredMarkers = useMemo(() => {

    if (showOfflineOnly) return offlineMarkers;

    const enabled = {
      server: typeFilters?.server ?? false,
      gateway: typeFilters?.gateway ?? false,
      transponder: typeFilters?.transponder ?? false,
      amp: typeFilters?.amp ?? false,
    };
    //如果都沒選,回傳空[]
    const anyTypeSelected = Object.values(enabled).some(Boolean);
    if (!anyTypeSelected) {
      return [];
    }
    //依照選到的"type"去篩選allMarkers並回傳
    return allMarkers.filter((m) => enabled[m.type]);
  }, [allMarkers, typeFilters, showOfflineOnly, offlineMarkers]);

  //地圖預設的中心點(當都沒選時會回到這)
  const fallbackCenter = { lat: 25.033964, lng: 121.564468 };

  // 依照"status"決定colorFromStatus()會回傳什麼顏色
  const colorFromStatus = (status) => {
    switch (status) {
      case "online":
        return "#27ae60"; // 綠
      case "warning":
        return "#f39c12"; // 橘
      case "offline":
      case "shutdown":
        return "#e74c3c"; // 紅
      default:
        return "#7f8c8d"; // 灰
    }
  };

  // 類型->SVG（顏色帶入 status 色）
  const makeTypeIcon = useCallback((type, color) => {
    const svgByType = {
      server: `
        <svg width="36" height="36" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <g filter="url(#s)"><rect x="4" y="4" width="16" height="4" rx="1" fill="${color}" stroke="white" stroke-width="1"/>
          <rect x="4" y="9" width="16" height="4" rx="1" fill="${color}" stroke="white" stroke-width="1"/>
          <rect x="4" y="14" width="16" height="4" rx="1" fill="${color}" stroke="white" stroke-width="1"/>
          <circle cx="7" cy="6" r="0.9" fill="white"/><circle cx="7" cy="11" r="0.9" fill="white"/><circle cx="7" cy="16" r="0.9" fill="white"/></g>
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
      transponder: `
        <svg width="36" height="36" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <g filter="url(#s)" stroke="${color}" stroke-width="2" fill="none">
            <path d="M12 4 L7 18 L9 18 L10 15 L14 15 L15 18 L17 18 Z" fill="${color}" stroke="white" stroke-width="1"/>
            <circle cx="12" cy="6" r="1.5" fill="white"/>
            <path d="M12 6 c3 0 5 2 5 5" opacity="0.7"/>
            <path d="M12 6 c-3 0 -5 2 -5 5" opacity="0.7"/>
          </g>
          <defs><filter id="s"><feDropShadow dx="0" dy="1" stdDeviation="1" flood-opacity="0.3"/></filter></defs>
        </svg>
      `,
      amp: `
        <svg width="36" height="36" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <g filter="url(#s)">
            <path d="M11 2 L6 12 H11 L9 22 L18 9 H13 L15 2 Z" fill="${color}" stroke="white" stroke-width="1"/>
          </g>
          <defs><filter id="s"><feDropShadow dx="0" dy="1" stdDeviation="1" flood-opacity="0.3"/></filter></defs>
        </svg>
      `,
    };

    const svg = svgByType[type] || svgByType.server;
    const { Size, Point } = window.google.maps;
    return {
      url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg),
      scaledSize: new Size(32, 32),
      anchor: new Point(16, 16),
      labelOrigin: new Point(16, 0),
    };
  }, []);

  // 共用：fit 到一批 markers
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

  // 初次載入：fit到全部設備
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

  // 外部聚焦（Header/清單點擊）→ 可主動定位/縮放
  useEffect(() => {
    if (!mapRef.current || !mapFocus) return;
    const map = mapRef.current;

    setActiveId(mapFocus.id);
    if (Number.isFinite(mapFocus.lat) && Number.isFinite(mapFocus.lng)) {
      map.panTo({ lat: mapFocus.lat, lng: mapFocus.lng });
    }
    if (mapFocus.zoom) {
      map.setZoom(Math.min(18, Math.max(5, Number(mapFocus.zoom))));
    }
  }, [mapFocus]);

  /**
   * 偵測「只顯示 offline的切換瞬間
   * - false → true：馬上 fit 到 offlineMarkers
   * - true → false：不做任何移動/縮放（維持目前視角）
   */
  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;

    const was = prevOfflineOnlyRef.current;
    const now = showOfflineOnly;

    if (!was && now) {
      // 關 → 開：fit 到 offline 標記
      fitToMarkers(mapRef.current, offlineMarkers, boundsPadding);
      setActiveId(null); // 不自動開窗
    }
    // 開 → 關：不動視角（保持使用者目前的位置/縮放）
    prevOfflineOnlyRef.current = now;
  }, [showOfflineOnly, offlineMarkers, fitToMarkers, boundsPadding, isLoaded]);

  /**
   * 類型 checkbox 改變 → 自動 fit 到目前顯示的 filteredMarkers
   * 但若 showOfflineOnly 為 true，則此 effect 不處理（交給上面的「切換瞬間」effect）
   */
  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;

    // 若目前的 InfoWindow 已不在顯示集合中，關閉它
    if (activeId && !filteredMarkers.some((m) => m.id === activeId)) {
      setActiveId(null);
    }

    // 離線模式中，不在這裡動視角（只在切換瞬間動一次）
    if (showOfflineOnly) return;

    // 一般情況：fit 到目前顯示資料
    const map = mapRef.current;
    if (filteredMarkers.length === 0) {
      // 沒資料就不亂動；若希望回到預設，可解除註解：
      // map.setCenter(fallbackCenter);
      // map.setZoom(zoom);
      return;
    }
    fitToMarkers(map, filteredMarkers, boundsPadding);
  }, [filteredMarkers, isLoaded, boundsPadding, zoom, showOfflineOnly, activeId, fitToMarkers]);


  // 視窗尺寸改變時，依「目前可見的標記」重新 fit（避免回到 fallback）
  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;

    let timer = null;
    const onResize = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const map = mapRef.current;
        // 依目前顯示的集合來 fit：offline 模式就用 offlineMarkers，否則用 filteredMarkers
        const visible = showOfflineOnly ? offlineMarkers : filteredMarkers;
        if (visible.length > 0) {
          fitToMarkers(map, visible, boundsPadding);
        }
      }, 150);
    };
    window.addEventListener("resize", onResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", onResize);
    };
  }, [isLoaded, filteredMarkers, offlineMarkers, showOfflineOnly, boundsPadding, fitToMarkers]);

  // 1) 在元件內加一個小工具：只平移，不改 zoom
const centerOn = useCallback((lat, lng) => {
  const map = mapRef.current;
  if (!map || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
  map.panTo({ lat, lng });  // 只移動視角，不會改變縮放等級
}, []);



  if (loadError) return <div style={{ padding: 12, color: "crimson" }}>地圖載入失敗：{String(loadError)}</div>;
  if (!isLoaded) return <div style={{ padding: 12 }}>地圖載入中…</div>;

 
  
  return (
    // <div style={{ width: "100%", height, borderRadius: 8, overflow: "hidden", boxShadow: "0 2px 6px rgba(0,0,0,0.08)" }}>
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
        }}
        onLoad={handleMapLoad}
        onClick={() => setActiveId(null)}
      >
        {filteredMarkers.map((m) => (
          <Marker
            key={m.id}
            position={{ lat: m.lat, lng: m.lng }}
            title={`${m.name} [${m.type}] (${m.status ?? "unknown"})`}
            icon={makeTypeIcon(m.type, colorFromStatus(m.status))}
            label={{ text: m.name ?? "", color: "#111", fontSize: "12px", fontWeight: "500" }}
            onClick={() => {
              setActiveId(m.id);
              centerOn(m.lat, m.lng);   // 保持使用者目前的縮放，只把中心移到這顆
            }}
          />
        ))}

        {activeId != null && (() => {
          const current = filteredMarkers.find((x) => x.id === activeId);
          if (!current) return null;
          return (
            <InfoWindow
              position={{ lat: current.lat, lng: current.lng }}
              onCloseClick={() => setActiveId(null)}
              onDomReady={() => centerOn(current.lat, current.lng)}  // 再次居中但不影響 zoom
            >
              <div style={{ minWidth: 180 }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>{current.name}</div>
                <div>Type：{current.type}</div>
                <div>Status：{current.status ?? "unknown"}</div>
                <div>Lat：{current.lat}</div>
                <div>Lng：{current.lng}</div>
              </div>
            </InfoWindow>
          );
        })()}
      </GoogleMap>
    </div>
  );
}
