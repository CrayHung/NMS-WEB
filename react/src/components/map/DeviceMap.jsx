// src/components/map/DeviceMap.jsx
import React, { useMemo, useCallback, useState, useRef, useEffect } from "react";
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from "@react-google-maps/api";
import { useGlobalContext } from "../../GlobalContext";

export default function DeviceMap({ zoom = 12, height = 420, boundsPadding = 80 }) {
  const { deviceData,mapFocus  } = useGlobalContext();
  const [activeId, setActiveId] = useState(null);
  const mapRef = useRef(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    id: "google-map-script",
  });

  const markers = useMemo(() => {
    const list = Array.isArray(deviceData) ? deviceData : [];
    return list
      .map((d, i) => ({
        id: d.deviceId ?? String(i),
        name: d.deviceName ?? `Device ${i + 1}`,
        lat: Number(d.latitude),
        lng: Number(d.longitude),
        status: d.status, // 'online' | 'offline' | ...
      }))
      .filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng));
  }, [deviceData]);

  // 預設 fallback 中心（真的沒有資料時才會用到）台北101
  const fallbackCenter = { lat: 25.033964, lng: 121.564468 };

  const colorFromStatus = (status) => (status === "online" ? "#27ae60" : "#e74c3c");

  const makeIcon = useCallback((color) => {
    const svg = `
      <svg width="32" height="32" viewBox="0 0 24 24" fill="${color}" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C8.134 2 5 5.134 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/>
      </svg>`;
    const { Size, Point } = window.google.maps;
    return {
      url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg),
      scaledSize: new Size(32, 32),
      anchor: new Point(16, 32),
      labelOrigin: new Point(16, -2),
    };
  }, []);

  // 地圖載入時先 fit 到所有設備
  const handleMapLoad = useCallback((map) => {
    mapRef.current = map;
    if (markers.length === 0) {
      map.setCenter(fallbackCenter);
      map.setZoom(zoom);
      return;
    }
    fitToMarkers(map, markers, boundsPadding);
  }, [markers, boundsPadding, zoom]);



// 監聽 mapFocus：打開對應 marker 的 InfoWindow，並移動/縮放
useEffect(() => {
  if (!mapRef.current || !mapFocus) return;
  const map = mapRef.current;

  // 設定目前 active marker
  setActiveId(mapFocus.id);

  // 如果 mapFocus.lat 和 mapFocus.lng 都是合法的數字，就把地圖視角平移到該座標
  // 平移
  if (Number.isFinite(mapFocus.lat) && Number.isFinite(mapFocus.lng)) {
    map.panTo({ lat: mapFocus.lat, lng: mapFocus.lng });
  }
  //縮放
  // if (mapFocus.zoom) {
  //   const targetZoom = Math.min(18, Math.max(5, Number(mapFocus.zoom)));
  //   map.setZoom(targetZoom);
  // }
}, [mapFocus]);



  // markers 變動時重新 fit（即時資料更新會觸發）
  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;
    const map = mapRef.current;

    if (markers.length === 1) {
      // 單一點：給個好看的近距離 zoom
      const { lat, lng } = markers[0];
      map.setCenter({ lat, lng });
      map.setZoom(14);
    } else if (markers.length > 1) {
      fitToMarkers(map, markers, boundsPadding);
    } else {
      map.setCenter(fallbackCenter);
      map.setZoom(zoom);
    }
  }, [markers, isLoaded, boundsPadding, zoom]);

  if (loadError) return <div style={{ padding: 12, color: "crimson" }}>地圖載入失敗：{String(loadError)}</div>;
  if (!isLoaded) return <div style={{ padding: 12 }}>地圖載入中…</div>;

  return (
    <div style={{ width: "100%", height, borderRadius: 8, overflow: "hidden", boxShadow: "0 2px 6px rgba(0,0,0,0.08)" }}>
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "100%" }}
        center={fallbackCenter}   // 實際會在 onLoad/Effect 裡被 fitBounds 覆蓋
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
        {markers.map((m) => (
          <Marker
            key={m.id}
            position={{ lat: m.lat, lng: m.lng }}
            title={`${m.name} (${m.status ?? "unknown"})`}
            icon={makeIcon(colorFromStatus(m.status))}
            label={{
              text: m.name ?? "",
              color: "#111",
              fontSize: "12px",
              fontWeight: "500",
            }}
            onClick={() => setActiveId(m.id)}
          />
        ))}

        {activeId != null && (() => {
          const current = markers.find((x) => x.id === activeId);
          if (!current) return null;
          return (
            <InfoWindow
              position={{ lat: current.lat, lng: current.lng }}
              onCloseClick={() => setActiveId(null)}
            >
              <div style={{ minWidth: 180 }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>{current.name}</div>
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

// 工具：把地圖視角 fit 到所有 markers
function fitToMarkers(map, markers, padding = 80) {
  const bounds = new window.google.maps.LatLngBounds();
  markers.forEach(({ lat, lng }) => bounds.extend({ lat, lng }));
  // padding 可用 number 或 {top,right,bottom,left}
  map.fitBounds(bounds, padding);
  // 有些情況（所有點非常接近）fitBounds 會把 zoom 調到很大，可視需求再加上最小縮放限制
  // const z = map.getZoom();
  // if (z > 18) map.setZoom(18);
}
