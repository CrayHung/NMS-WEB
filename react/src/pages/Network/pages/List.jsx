// List.jsx
// 直接從 API /api/amplifier/devices 取資料；
// 上方列出所有 Gateways；下方依 Gateway 分組渲染 Devices；
// 點 deviceId 會開啟詳情視窗（含多個 Tabs）。
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import DeviceKpiDashboard from '../../Network/pages/DeviceKpiDashboard';
import RFpower from './Rfpower';
import {apiUrl,apiFetch} from '../../../lib/api'

import { normalizeDevice, normalizeDevices } from "../../../utils/normalizeDevice";

// === 工具：解析 "Lat:24.8075,Lon:121.0445,Site 01" ===
// 解析 "Lat:24.8080,Lon:121.0412"
function parseLocationString(loc) {
  if (!loc || typeof loc !== 'string') return { lat: null, lon: null, rest: '' };
  const mLat = loc.match(/Lat\s*:\s*([+-]?\d+(?:\.\d+)?)/i);
  const mLon = loc.match(/Lon\s*:\s*([+-]?\d+(?:\.\d+)?)/i);
  const lat = mLat ? Number(mLat[1]) : null;
  const lon = mLon ? Number(mLon[1]) : null;
  return { lat, lon, rest: loc };
}
function parseGpsLocation(gps) {
  if (typeof gps !== 'string') return { lat: null, lon: null };
  const m = gps.match(/^\s*([+-]?\d+(?:\.\d+)?)\s*,\s*([+-]?\d+(?:\.\d+)?)/);
  if (!m) return { lat: null, lon: null };
  return { lat: Number(m[1]), lon: Number(m[2]) };
}


/** ===== 詳情 Modal（上方 Tabs，預設 Device Info） ===== */
function DeviceDetailModal({ deviceEui, onClose }) {
  const TABS = [
    { key: 'device', label: 'Device Info' },
    { key: 'telemetry', label: 'Telemetry' },
    { key: 'alarms', label: 'Alarms' },
    { key: 'spectrum', label: 'Spectrum' },
    // { key: 'diagnostics', label: 'Diagnostics' },
    { key: 'dashboard', label: 'Dashboard' },
    // { key: 'config', label: 'Configuration' },
  ];

  const [active, setActive] = useState('device');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [data, setData] = useState(null);

// 將資料統一
//1. 數值只到小數點後兩位
//2. 時間格式統一




  useEffect(() => {
    if (!deviceEui) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const url = apiUrl(`/amplifier/status/${encodeURIComponent(deviceEui)}/current`);
        // const url = `http://61.216.140.11:9002/api/amplifier/status/${encodeURIComponent(
        //   deviceEui
        // )}/current`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        const json = await res.json();
        if (!cancelled) setData(normalizeDevice(json));
      } catch (e) {
        if (!cancelled) setErr(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [deviceEui]);

  const Row = ({ k, v }) => (
    <div style={{ display: 'flex', gap: 8, padding: '6px 0', borderBottom: '1px dashed #eee' }}>
      <div style={{ width: 160, color: '#6b7280' }}>{k}</div>
      <div style={{ flex: 1 }}>{v ?? '-'}</div>
    </div>
  );

  const renderBody = useCallback(() => {
    if (loading) return <div style={{ padding: 12 }}>Loading…</div>;
    if (err) return <div style={{ padding: 12, color: 'crimson' }}>Load failed: {String(err.message || err)}</div>;
    if (!data) return null;


    //為了增加USA字串
    const normalizeLocation = (loc) => {
      if (!loc) return loc;
      const s = String(loc).trim();
    
      // 規則1：指定地址完全相同 → 補上 ", USA"
      const exact = "801 Allen Y. Lew Place NW, Washington, DC 20001,";
      if (s === exact) return `${s} USA`;
    
      // 規則2：一般化處理：尾端是 "Washington, DC 12345" 且沒有 USA → 補上 ", USA"
      const endsWithWDCZip = /Washington,\s*DC\s*\d{5}$/i.test(s);
      const hasUSA = /,\s*USA$/i.test(s);
      if (endsWithWDCZip && !hasUSA) return `${s}, USA`;
    
      return s;
    };
    



    let { lat, lon } = parseGpsLocation(data.gpsLocation);
    if (lat == null || lon == null) {
      const p = parseLocationString(data.location);
      lat = p.lat; lon = p.lon;
    }

    if (active === 'device') {
      return (
        <div>
          <Row k="Device EUI" v={data.deviceEui} />
          <Row k="Part Name" v={data.partName} />
          <Row k="Part Number" v={data.partNumber} />
          <Row k="Serial Number" v={data.serialNumber} />
          <Row k="HW Version" v={data.hwVersion} />
          <Row k="FW Version" v={data.fwVersion} />
          {/* <Row k="Location(raw)" v={data.location} /> */}
          <Row k="Location(raw)" v={normalizeLocation(data.location)} />

          <Row k="Location(parsed)" v={lat != null && lon != null ? `${lat}, ${lon}` : '-'} />
          <Row k="Online" v={String(data.onlineStatus)} />
          <Row
            k="Last Seen"
            v={data.lastSeen ? new Date(data.lastSeen).toLocaleString("en-US") : '-'}
            // v={data.lastSeen ? new Date(data.lastSeen).toLocaleString("en-US") : '-'}
          />
          {/* {data.gateway && (
            <>
              <div style={{ fontWeight: 700, margin: '16px 0 8px' }}>Gateway</div>
              <Row k="gatewayEui" v={data.gateway.gatewayEui} />
              <Row k="Online" v={String(data.gateway.onlineStatus)} />
              <Row k="Latitude" v={data.gateway.latitude} />
              <Row k="Longitude" v={data.gateway.longitude} />

              <Row k="Last Seen" v={data.gateway.lastSeen ? new Date(data.gateway.lastSeen).toISOString("en-US") : '-'} />
            </>
          )} */}
        </div>
      );
    }

    if (active === 'telemetry') {
      return (
        <div>
          <Row k="Temperature(°C)" v={data.temperature} />
          <Row k="Voltage(V)" v={data.voltage} />
          {/* <Row k="Current(mA)" v={data.current} /> */}
          <Row k="Ripple(mV)" v={data.ripple} />
          {/* <Row k="RF In Power(dBmV)" v={data.rfInputPower} />
          <Row k="RF Out Power(dBmV)" v={data.rfOutputPower} /> */}
          <Row k="rfInputAvgPower" v={data.rfInputAvgPower} />
          <Row k="rfOutputAvgPower" v={data.rfOutputAvgPower} />
          <Row k="rfGainAvg(dB)" v={data.rfGainAvg} />
          {/* <Row k="rfPowerLastUpdated" v={data.rfPowerLastUpdated ? new Date(data.rfPowerLastUpdated).toISOString("en-US") : '-'} /> */}
          <Row k="rfPowerLastUpdated" v={data.rfPowerLastUpdated ? new Date(data.rfPowerLastUpdated).toLocaleString("en-US") : '-'} />
          {/* <Row k="lastUpdated" v={data.lastUpdated ? new Date(data.lastUpdated).toISOString("en-US") : '-'} /> */}
          <Row k="lastUpdated" v={data.lastUpdated ? new Date(data.lastUpdated).toLocaleString("en-US") : '-'} />

        </div>
      );
    }

    if (active === 'alarms') {
      return (
        <div>
          {/* <Row k="Alarm Status" v={data.tempAlarmStatus} /> */}
          <Row k="Temp High Alarm" v={data.tempHighAlarm} />
          <Row k="Temp Low Alarm" v={data.tempLowAlarm} />
          <Row k="Volt High Alarm" v={data.voltHighAlarm} />
          <Row k="Volt Low Alarm" v={data.voltLowAlarm} />
          <Row k="Ripple High Alarm" v={data.rippleHighAlarm} />
          <Row k="Status Text" v={data.statusText} />
        </div>
      );
    }

    if (active === 'spectrum') {
      return (
        <>
        <div>
          {/* <Row k="RF In Power (dBmV)" v={data.rfInputPower} />
          <Row k="RF Out Power (dBmV)" v={data.rfOutputPower} /> */}
          {/* <Row k="Gain Avg" v={data.rfGainAvg} /> */}
          {/* <Row k="Last Updated" v={data.rfPowerLastUpdated ? new Date(data.rfPowerLastUpdated).toISOString("en-US") : '-'} /> */}
          <Row k="Last Updated" v={data.rfPowerLastUpdated ? new Date(data.rfPowerLastUpdated).toLocaleString("en-US") : '-'} />
        </div>
        <RFpower deviceeui={data.deviceEui}/>
        </>
      );
    }

    // if (active === 'diagnostics') {
    //   return <RFpower />;
    // }

    if (active === 'dashboard') {
      return <DeviceKpiDashboard device={data} historySize={60} />;
    }

    if (active === 'config') {
      return (
        <div>
          {/* <Row k="Last Config Updated" v={data.lastConfigUpdated ? new Date(data.lastConfigUpdated).toISOString("en-US") : '-'} /> */}
          <Row k="Last Config Updated" v={data.lastConfigUpdated ? new Date(data.lastConfigUpdated).toLocaleString("en-US") : '-'} />
          
          <Row k="Site Name" v={data.siteName} />
          <Row k="Site Id" v={data.siteId} />
          <Row k="Cabinet Id" v={data.cabinetId} />
          <Row k="Rack Position" v={data.rackPosition} />
        </div>
      );
    }

    return null;
  }, [active, data, err, loading]);

  if (!deviceEui) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="modal-overlay"
      // style={{
      //   position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      //   display: 'grid', placeItems: 'center', zIndex: 50,
      // }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: '85vw',
          height: '85vh',        // ✅ 固定高度
          overflow: 'hidden',    // 不要因內容撐開
          padding: 16,
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}
        >
          <h3 style={{ margin: 0 }}>Amplifier</h3>
          <button className="xy-theme__button" onClick={onClose}>✕</button>
        </div>

        <div style={{
          display: 'flex',
          gap: 8,
          marginTop: 12,
          marginBottom: 12,
          flexWrap: 'wrap'
        }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              className="xy-theme__button"
              onClick={() => setActive(t.key)}
              style={{ fontWeight: 700, ...(active === t.key ? { background: '#111', color: '#fff' } : {}) }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ✅ 固定高度內容區域，超過就滾動 */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          borderTop: '1px solid #eee',
          paddingTop: 8
        }}>
          {renderBody()}
        </div>
      </div>

    </div>
  );
}

/** ===== 主清單（上：Gateways；下：Devices by Gateway） ===== */
export default function List() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [devices, setDevices] = useState([]); // 直接存 API 的 devices 陣列
  const [detailId, setDetailId] = useState(null);

  // 抓 /devices
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await apiFetch(`/amplifier/devices`);
        // const res = await fetch('http://61.216.140.11:9002/api/amplifier/devices');
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        const json = await res.json();
        if (!cancelled) {
          setDevices(Array.isArray(json?.devices) ? json.devices : []);
        }
      } catch (e) {
        if (!cancelled) setErr(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // 取得所有 gateway 清單（唯一 gatewayEui）
  const gateways = useMemo(() => {
    const map = new Map();
    for (const d of devices) {
      const gw = d.gateway;
      const eui = gw?.gatewayEui ? String(gw.gatewayEui) : null;
      if (!eui) continue;
      // 如果不同裝置帶來同一 gateway，但有不同 name/座標，以第一筆為準（你可改為合併策略）
      if (!map.has(eui)) {
        map.set(eui, {
          gatewayEui: eui,
          name: gw?.name ?? null,
          onlineStatus: !!gw?.onlineStatus,
          latitude: gw?.latitude ?? null,
          longitude: gw?.longitude ?? null,
          lastSeen: gw?.lastSeen ?? null,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.gatewayEui.localeCompare(b.gatewayEui));
  }, [devices]);

  // 依 gateway 分組 devices（含未綁定 gateway 的分組）
  const grouped = useMemo(() => {
    const m = new Map(); // key: gatewayEui | "__ungrouped__"
    for (const d of devices) {
      const key = d?.gateway?.gatewayEui ? String(d.gateway.gatewayEui) : '__ungrouped__';
      if (!m.has(key)) m.set(key, []);
      m.get(key).push(d);
    }
    // 排序每組的裝置（可依需求調整）
    for (const [, arr] of m) {
      arr.sort((a, b) => String(a.deviceEui).localeCompare(String(b.deviceEui)));
    }
    return m;
  }, [devices]);

  // UI：小徽章
  const OnlineBadge = ({ flag }) => (
    flag ? <span style={{ color: '#16a34a', fontWeight: 600 }}>Online</span>
      : <span style={{ color: '#ef4444', fontWeight: 600 }}>Offline</span>
  );

  if (loading) return <div className="card" style={{ padding: 12 }}>Loading…</div>;
  if (err) return <div className="card" style={{ padding: 12, color: 'crimson' }}>Load failed: {String(err.message || err)}</div>;

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* === 上半：Gateways 彙整 === */}
      <div className="card" style={{ overflowX: 'auto' }}>
        <h4 style={{ marginTop: 0 }}>Gateways</h4>
        {gateways.length === 0 ? (
          <div style={{ color: '#666' }}>No Gateways</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>GatewayEui</th>
                <th>Name</th>
                <th>Online</th>
                <th>Latitude</th>
                <th>Longitude</th>
                <th>Last seen</th>
                <th># Devices</th>
              </tr>
            </thead>
            <tbody>
              {gateways.map((g) => {
                const cnt = grouped.get(g.gatewayEui)?.length ?? 0;
                return (
                  <tr key={g.gatewayEui}>
                    <td>{g.gatewayEui}</td>
                    <td>{g.name ?? '-'}</td>
                    <td><OnlineBadge flag={g.onlineStatus} /></td>
                    <td>{g.latitude ?? ''}</td>
                    <td>{g.longitude ?? ''}</td>
                    <td>{g.lastSeen ? new Date(g.lastSeen).toLocaleString("en-US") : '-'}</td>
                    <td>{cnt}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* === 下半：依 Gateway 分組的 Devices === */}
      {[...grouped.keys()].map((key) => {
        const list = grouped.get(key) || [];
        const title = key === '__ungrouped__' ? 'Ungrouped (no gateway)' : `Gateway ${key}`;
        return (
          <div key={key} className="card" style={{ overflowX: 'auto' }}>
            <h4 style={{ marginTop: 0 }}>{title}</h4>
            {list.length === 0 ? (
              <div style={{ color: '#666' }}>No devices</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>DeviceEui</th>
                    <th>Serial Number</th>
                    <th>Model</th>
                    <th>Part Number</th>
           
                    <th>Type</th>
                    <th>Online</th>
                    <th>Longitude</th>
                    <th>Latitude</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((d) => {
                    let { lat, lon } = parseGpsLocation(d.gpsLocation);
                    if (lat == null || lon == null) {
                      const p = parseLocationString(d.location);
                      lat = p.lat; lon = p.lon;
                    }
                    return (
                      <tr key={d.deviceEui}>
                        <td>
                          <button
                            className="linklike"
                            onClick={() => setDetailId(d.deviceEui)}
                            title="Open details"
                            style={{
                              background: 'none', border: 'none', color: '#2563eb',
                              cursor: 'pointer', padding: 0, textDecoration: 'underline',
                            }}
                          >
                            {d.deviceEui}
                          </button>
                        </td>
                        <td>{ d.serialNumber ||'-'}</td>
                        <td>{ d.partName ||'-'}</td>
                        <td>{ d.partNumber ||'-'}</td>
                        <td>Device</td>
                        <td><OnlineBadge flag={!!d.onlineStatus} /></td>
                        <td>{lon ?? ''}</td>
                        <td>{lat ?? ''}</td>
                        <td>{d.lastUpdated ? new Date(d.lastUpdated).toLocaleString("en-US") : '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        );
      })}

      {/* 詳情視窗 */}
      {detailId && <DeviceDetailModal deviceEui={detailId} onClose={() => setDetailId(null)} />}
    </div>
  );
}
