import axios from 'axios'

// Create an axios instance with basic configuration
const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor - authentication tokens can be added here
api.interceptors.request.use(
  config => {
    // If needed, add the authentication token here
    // config.headers.Authorization = `Bearer ${token}`
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// Response interceptor - for centralized error handling
api.interceptors.response.use(
  response => response.data,
  error => {
    console.error('API Error:', error)
    return Promise.reject(error)
  }
)

// Gateway related APIs
export const gatewayAPI = {
  // Get all Gateways
  getAllGateways: () => api.get('/gateways'),
  
  // Get a single Gateway
  getGateway: (gatewayEui) => api.get(`/gateways/${gatewayEui}`),
  
  // Get devices under a Gateway
  getGatewayDevices: (gatewayEui) => api.get(`/gateways/${gatewayEui}/devices`),
  
  // Get Gateway details (including devices)
  getGatewayDetails: (gatewayEui) => api.get(`/gateways/${gatewayEui}/details`)
}

// Amplifier (Device) related APIs
export const amplifierAPI = {
  // Get all devices
  getAllDevices: () => api.get('/amplifier/devices'),
  
  // Get online devices
  getOnlineDevices: () => api.get('/amplifier/devices/online'),
  
  // Get the current status of a device
  getCurrentStatus: (deviceEui) => api.get(`/amplifier/status/${deviceEui}/current`),
  
  // Get the status history of a device
  getStatusHistory: (deviceEui, params = {}) => 
    api.get(`/amplifier/status/${deviceEui}/history`, { params }),
  
  // Get chart data
  getChartData: (deviceEui, hours = 24, interval = '1 hour') => 
    api.get(`/amplifier/status/${deviceEui}/chart`, { params: { hours, interval } }), // 將 interval 加入請求參數中
  
  // Query device model information
  queryModelInfo: (deviceEui) => api.post(`/amplifier/query/${deviceEui}/model`),
  
  // Query device status
  queryStatus: (deviceEui) => api.post(`/amplifier/query/${deviceEui}/status`),
  
  // Query device settings
  querySettings: (deviceEui) => api.post(`/amplifier/query/${deviceEui}/settings`),
  
  // RF Power related
  getCurrentRFPower: (deviceEui) => api.get(`/amplifier/rf-power/${deviceEui}/current`),
  
  getRFPowerHistory: (deviceEui, hours = 24) => 
    api.get(`/amplifier/rf-power/${deviceEui}/history`, { params: { hours } }),
  
  getRFPowerSpectrum: (deviceEui) => api.get(`/amplifier/rf-power/${deviceEui}/spectrum`),
  
  queryAllRFPower: (deviceEui) => api.post(`/amplifier/query/${deviceEui}/rf-power-all`),
  
  // alarm log
  getAlarmLogs: (params = {}) => 
    api.get('/amplifier/alarms', { params }),
  
  getAlarmStatistics: (params = {}) =>
    api.get('/amplifier/alarms/statistics', { params }),

  // Get system statistics
  getStatistics: () => api.get('/amplifier/statistics')
}

export default api