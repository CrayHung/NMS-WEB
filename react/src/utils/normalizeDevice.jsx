// src/utils/normalizeDevice.jsx

/** 四捨五入到小數點後兩位（null/undefined 原樣回傳；非數字也原樣回傳） */
export function roundToTwo(value) {
  if (value === null || value === undefined) return value;
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return Math.round(n * 100) / 100;
}

/** 轉為 en-US 的 toLocaleString（若無效日期則回原值） */
export function toLocaleUSString(value) {
  if (value === null || value === undefined) return value;
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return value;
  return d.toLocaleString("en-US");
}

/** 單一 device 物件標準化（處理三個 rf 欄位與幾個時間欄位） */
export function normalizeDevice(device) {
  if (!device || typeof device !== "object") return device;

  return {
    ...device,
    rfInputAvgPower: roundToTwo(device.rfInputAvgPower),
    rfOutputAvgPower: roundToTwo(device.rfOutputAvgPower),
    rfGainAvg: roundToTwo(device.rfGainAvg),

    rfPowerLastUpdated: toLocaleUSString(device.rfPowerLastUpdated),
    lastUpdated: toLocaleUSString(device.lastUpdated),
    lastModelInfoUpdated: toLocaleUSString(device.lastModelInfoUpdated),
    lastConfigUpdated: toLocaleUSString(device.lastConfigUpdated),
    lastSeen: toLocaleUSString(device.lastSeen),
  };
}

/** 若 API 回傳陣列，批次標準化 device */
export function normalizeDevices(devices) {
  if (!Array.isArray(devices)) return devices;
  return devices.map(normalizeDevice);
}

/** 標準化 single chart row（只處理指定欄位） */
export function normalizeChartRow(row) {
  if (!row || typeof row !== "object") return row;

  return {
    ...row,
    avgTemp: roundToTwo(row.avgTemp),
    avgSlope: roundToTwo(row.avgSlope),
    avgVoltage: roundToTwo(row.avgVoltage),
    // 若你想同步把 time 轉成 toLocaleString("en-US")，把下面註解解除：
    // time: toLocaleUSString(row.time),
  };
}

/** 標準化整個 chart 物件（符合你給的格式） */
export function normalizeChart(chart) {
  if (!chart || typeof chart !== "object") return chart;

  const data = Array.isArray(chart.data)
    ? chart.data.map(normalizeChartRow)
    : chart.data;

  return {
    period: chart.period || "",
    deviceEui: chart.deviceEui || "",
    interval: chart.interval || "",
    data,
  };
}
