// deviceEui → deviceId
// partName / serialNumber → deviceName
// longitude/latitude → string
// gatewayEui → deviceId (gateway node)


// 解析 "Lat:24.8080,Lon:121.0412"
export function parseLocationString(loc) {
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



// 取目前 deviceLink 的「數字最大 id」用來遞增
function getNextEdgeId(currentLinks) {
  const max = (currentLinks || []).reduce((m, e) => {
    const n = Number.parseInt(String(e.id), 10);
    return Number.isInteger(n) ? Math.max(m, n) : m;
  }, 0);
  return String(max + 1);
}

// 將 useEffect 取得的所有資料轉成 nodes 資料和 links 資料
export function mapApiToApp(api, existingNodes = [], existingLinks = []) {
  const nodesById = new Map((existingNodes || []).map((n) => [String(n.deviceId), n]));
  const linksKey = new Set((existingLinks || []).map((e) => `${e.source}->${e.target}`));

  const newNodes = [...existingNodes];
  const newLinks = [...existingLinks];

  const devices = Array.isArray(api?.devices) ? api.devices : [];

  devices.forEach((dev) => {
    const devId = String(dev.deviceEui);
    const gwId = dev.gateway?.gatewayEui ? String(dev.gateway.gatewayEui) : null;

    console.log("接收到的資料:", JSON.stringify(devices, null, 2))
    // ---- device node ----
    let { lat, lon } = parseGpsLocation(dev.gpsLocation);
    if (lat == null || lon == null) {
      const p = parseLocationString(dev.location);
      lat = p.lat; lon = p.lon;
    }

    if (!nodesById.has(devId)) {
      newNodes.push({
        deviceId: devId,
        deviceName: dev.partName || dev.serialNumber || devId,
        onlineStatus: dev.onlineStatus,
        type: "device",
        // longitude: dLon != null ? String(dLon) : "",
        // latitude: dLat != null ? String(dLat) : "",
        latitude: lat ?? null,
        longitude: lon ?? null,
        temperature: dev.temperature ?? null,
        humidity: null,
        batteryLevel: null,
        lastUpdated: dev.lastUpdated || dev.lastSeen || null,
        alerts: [],
        position: { x: 0, y: 0 },


        deviceEui: dev.deviceEui,
        partName: dev.partName,
        partNumber: dev.partNumber,
        serialNumber: dev.serialNumber,
        hwVersion: dev.hwVersion,
        fwVersion: dev.fwVersion,
        location: dev.location,
        gpsLocation: dev.gpsLocation,
        siteName: dev.siteName,
        siteId: dev.siteId,
        cabinetId: dev.cabinetId,
        rackPosition: dev.rackPosition,
        workingMode: dev.workingMode,
        dfuType: dev.dfuType,
        unitStatus: dev.unitStatus,
        statusText: dev.statusText,
        temperature: dev.temperature,
        voltage: dev.voltage,
        ripple: dev.ripple,
        current: dev.current,
        rfInputPower: dev.rfInputPower,
        rfOutputPower: dev.rfOutputPower,
        pilotLowPower: dev.pilotLowPower,
        pilotHighPower: dev.pilotHighPower,
        outputSlope: dev.outputSlope,
        tempAlarmStatus: dev.tempAlarmStatus,
        voltAlarmStatus: dev.voltAlarmStatus,
        rippleAlarmStatus: dev.rippleAlarmStatus,
        tcpAlarmStatus: dev.tcpAlarmStatus,
        tempHighAlarm: dev.tempHighAlarm,
        tempLowAlarm: dev.tempLowAlarm,
        voltHighAlarm: dev.voltHighAlarm,
        voltLowAlarm: dev.voltLowAlarm,
        rippleHighAlarm: dev.rippleHighAlarm,
        rfInputAvgPower: dev.rfInputAvgPower,
        rfOutputAvgPower: dev.rfOutputAvgPower,
        rfGainAvg: dev.rfGainAvg,
        rfPowerLastUpdated: dev.rfPowerLastUpdated,
        lastUpdated: dev.lastUpdated,
        lastModelInfoUpdated: dev.lastModelInfoUpdated,
        lastConfigUpdated: dev.lastConfigUpdated,
        onlineStatus: dev.onlineStatus,
        lastSeen: dev.lastSeen,




      });
      nodesById.set(devId, true);
    }

    // ---- gateway node ----
    if (gwId) {
      if (!nodesById.has(gwId)) {

        newNodes.push({
          deviceId: gwId,
          deviceName: dev.gateway.name || gwId,
          onlineStatus: dev.gateway.onlineStatus,
          type: "gateway",
          longitude: dev.gateway.longitude != null ? String(dev.gateway.longitude) : "",
          latitude: dev.gateway.latitude != null ? String(dev.gateway.latitude) : "",
          lastUpdated: dev.gateway.lastSeen || null,
          alerts: [],
          position: { x: 0, y: 0 },


          gatewayEui: dev.gateway.gatewayEui,
          name: dev.gateway.name,
          location: dev.gateway.location,
          altitude: dev.gateway.altitude,
          lastSeen: dev.gateway.lastSeen,

        });
        nodesById.set(gwId, true);
      }

      // ---- gateway → device link ----
      const key = `${gwId}->${devId}`;
      if (!linksKey.has(key)) {
        const id = getNextEdgeId(newLinks);
        newLinks.push({
          id,
          source: gwId,
          target: devId,
          type: "smoothstep",
          animated: true,
        });
        linksKey.add(key);
      }
    }
  });

  return { nodes: newNodes, links: newLinks };
}
