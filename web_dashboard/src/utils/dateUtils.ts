export function formatTimeGMT7(timestamp: string | null | undefined): string {
  if (!timestamp) {
    return '--:--:--'
  }
  
  try {
    // Handle both string and object timestamps
    let date: Date
    if (typeof timestamp === 'string') {
      date = new Date(timestamp)
    } else if (timestamp instanceof Date) {
      date = timestamp
    } else {
      // Try to parse as ISO string
      date = new Date(String(timestamp))
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return '--:--:--'
    }
    
    const gmt7Date = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(date)
    return gmt7Date
  } catch (error) {
    return '--:--:--'
  }
}

export function formatDateGMT7(timestamp: string | null | undefined): string {
  if (!timestamp) {
    return '--/--/---- --:--:--'
  }
  
  try {
    // Handle both string and object timestamps
    let date: Date
    if (typeof timestamp === 'string') {
      date = new Date(timestamp)
    } else if (timestamp instanceof Date) {
      date = timestamp
    } else {
      // Try to parse as ISO string
      date = new Date(String(timestamp))
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return '--/--/---- --:--:--'
    }
    
    const gmt7Date = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(date)
    return gmt7Date.replace(',', '')
  } catch (error) {
    return '--/--/---- --:--:--'
  }
}

export function formatDateOnlyGMT7(timestamp: string | null | undefined): string {
  if (!timestamp) {
    return '----/--/--'
  }
  
  try {
    // Handle both string and object timestamps
    let date: Date
    if (typeof timestamp === 'string') {
      date = new Date(timestamp)
    } else if (timestamp instanceof Date) {
      date = timestamp
    } else {
      // Try to parse as ISO string
      date = new Date(String(timestamp))
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return '----/--/--'
    }
    
    const gmt7Date = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date)
    return gmt7Date
  } catch (error) {
    return '----/--/--'
  }
}

export function formatDateTimeGMT7(timestamp: string | null | undefined): string {
  if (!timestamp) {
    return '--/--/---- --:--:--'
  }
  
  try {
    let date: Date
    if (typeof timestamp === 'string') {
      date = new Date(timestamp)
    } else if (timestamp instanceof Date) {
      date = timestamp
    } else {
      date = new Date(String(timestamp))
    }
    
    if (isNaN(date.getTime())) {
      return '--/--/---- --:--:--'
    }
    
    // Format: DD/MM/YYYY HH:MM:SS
    const gmt7Date = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(date)
    
    return gmt7Date.replace(',', '')
  } catch (error) {
    return '--/--/---- --:--:--'
  }
}

export function getCheckInStatus(timestamp: string | null | undefined, requiredHour: number = 8, requiredMinute: number = 0): { status: 'on_time' | 'late' | 'early', time: string } {
  if (!timestamp) {
    return { status: 'on_time', time: '--:--:--' }
  }
  
  try {
    let date: Date
    if (typeof timestamp === 'string') {
      date = new Date(timestamp)
    } else if (timestamp instanceof Date) {
      date = timestamp
    } else {
      date = new Date(String(timestamp))
    }
    
    if (isNaN(date.getTime())) {
      return { status: 'on_time', time: '--:--:--' }
    }
    
    // Get time in GMT+7
    const gmt7Time = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(date)
    
    const [hours, minutes] = gmt7Time.split(':').map(Number)
    const checkInMinutes = hours * 60 + minutes
    const requiredMinutes = requiredHour * 60 + requiredMinute
    
    let status: 'on_time' | 'late' | 'early'
    if (checkInMinutes <= requiredMinutes + 15) { // Allow 15 minutes grace period
      status = checkInMinutes < requiredMinutes ? 'early' : 'on_time'
    } else {
      status = 'late'
    }
    
    return { status, time: gmt7Time }
  } catch (error) {
    return { status: 'on_time', time: '--:--:--' }
  }
}
