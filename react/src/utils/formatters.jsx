import { format, parseISO, isValid } from 'date-fns'

// Format date and time
export const formatDateTime = (dateString) => {
  if (!dateString) return '-'
  
  try {
    // parse ISO 8601 format 的時間字串, 含 time zone
    let date
    if (typeof dateString === 'string') {
      // parseISO to process ISO string with time zone
      date = parseISO(dateString)
    } else if (dateString instanceof Date) {
      date = dateString
    } else {
      date = new Date(dateString)
    }
    
    if (!isValid(date)) {
      console.warn('Invalid date:', dateString)
      return dateString
    }
    
    // format => use browser local time
    return format(date, 'yyyy-MM-dd HH:mm:ss')
  } catch (error) {
    console.error('Date formatting error:', error, 'Input:', dateString)
    return dateString
  }
}

// Format short date and time
export const formatShortDateTime = (dateString) => {
  if (!dateString) return '-'
  
  try {
    const date = typeof dateString === 'string' 
      ? parseISO(dateString) 
      : new Date(dateString)
    
    return format(date, 'MM/dd HH:mm')
  } catch (error) {
    return dateString
  }
}

// Format a number with a specific number of decimals
export const formatNumber = (value, decimals = 1) => {
  if (value === null || value === undefined) return '-'
  
  const num = parseFloat(value)
  if (isNaN(num)) return value
  
  return num.toFixed(decimals)
}

// Format temperature
export const formatTemperature = (value) => {
  if (value === null || value === undefined) return '-'
  return `${formatNumber(value, 1)}°C`
}

// Format voltage
export const formatVoltage = (value) => {
  if (value === null || value === undefined) return '-'
  return `${formatNumber(value, 1)}V`
}

// Format current
export const formatCurrent = (value) => {
  if (value === null || value === undefined) return '-'
  return `${formatNumber(value, 2)}A`
}

// Format power
export const formatPower = (value) => {
  if (value === null || value === undefined) return '-'
  return `${formatNumber(value, 1)} dBmV`
}

// Format gain
export const formatGain = (value) => {
  if (value === null || value === undefined) return '-'
  return `${formatNumber(value, 1)} dB`
}

// Get CSS class for a status tag
export const getStatusClass = (status) => {
  if (status === true || status === 'online' || status === 1) {
    return 'status-online'
  } else if (status === false || status === 'offline' || status === 0) {
    return 'status-offline'
  } else if (status === 'normal') {
    return 'status-normal'
  } else if (status === 'alarm' || status === 2) {
    return 'status-alarm'
  }
  return ''
}

// Get text for a status
export const getStatusText = (status) => {
  if (status === true || status === 'online' || status === 1) {
    return 'online'
  } else if (status === false || status === 'offline' || status === 0) {
    return 'offline'
  } else if (status === 'normal') {
    return 'normal'
  } else if (status === 'alarm' || status === 2) {
    return 'alarm'
  }
  return 'unknown'
}

// Get text for an alarm level
export const getAlarmLevelText = (level) => {
  switch (level) {
    case 0:
      return 'Normal'
    case 1:
      return 'Warning'
    case 2:
      return 'Critical'
    default:
      return 'Unknown'
  }
}

// Get CSS class for an alarm level
export const getAlarmLevelClass = (level) => {
  switch (level) {
    case 0:
      return 'text-success'
    case 1:
      return 'text-warning'
    case 2:
      return 'text-danger'
    default:
      return 'text-secondary'
  }
}

// Format working mode
export const formatWorkingMode = (mode) => {
  switch (mode) {
    case 0:
      return 'Standby'
    case 1:
      return 'Operating'
    case 2:
      return 'Maintenance'
    default:
      return 'Unknown'
  }
}

// Format DFU type
export const formatDfuType = (type) => {
  switch (type) {
    case 0:
      return 'Standard'
    case 1:
      return 'Enhanced'
    case 2:
      return 'Custom'
    default:
      return 'Unknown'
  }
}

// Calculate time difference (for displaying last update time)
export const getTimeDifference = (dateString) => {
  if (!dateString) return 'Never'
  
  try {
    const date = typeof dateString === 'string' 
      ? parseISO(dateString) 
      : new Date(dateString)
    
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`
    
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  } catch (error) {
    return dateString
  }
}