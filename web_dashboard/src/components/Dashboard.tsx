import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { WebSocketClient } from '../services/websocket'
import { formatDateTimeGMT7, getCheckInStatus } from '../utils/dateUtils'

function Dashboard() {
  const [stats, setStats] = useState<any>(null)
  const [recentScans, setRecentScans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
    setupWebSocket()
    
    return () => {
      if (wsClient) {
        wsClient.disconnect()
      }
    }
  }, [])

  let wsClient: WebSocketClient | null = null

  const setupWebSocket = () => {
    const wsUrl = 'ws://localhost:8000/ws'
    wsClient = new WebSocketClient(wsUrl)
    
    wsClient.on('attendance', (data: any) => {
      setRecentScans(prev => [data, ...prev.slice(0, 9)])
      loadStats()
    })
    
    wsClient.connect()
  }

  const loadStats = async () => {
    try {
      const response = await api.get('/api/attendance/stats')
      setStats(response.data)
      setRecentScans(response.data.recent_scans || [])
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-600">Loading...</div>
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-teal-50 text-teal-800 border-teal-200'
      case 'failed':
        return 'bg-red-50 text-red-700 border-red-200'
      case 'unknown':
        return 'bg-yellow-50 text-yellow-800 border-yellow-200'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const getFeedItemClass = (status: string) => {
    switch (status) {
      case 'success':
        return 'border-l-green-500 bg-green-50'
      case 'failed':
        return 'border-l-red-500 bg-red-50'
      case 'unknown':
        return 'border-l-yellow-500 bg-yellow-50'
      default:
        return 'border-l-gray-500 bg-gray-50'
    }
  }

  // Get today's date info
  const today = new Date()
  const todayDate = today.toLocaleDateString('vi-VN', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    timeZone: 'Asia/Ho_Chi_Minh'
  })

  return (
    <div>
      <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-gray-200">
        <div>
          <h1 className="m-0 text-gray-900 text-3xl font-semibold">Live Monitoring</h1>
          <p className="m-0 mt-1 text-sm text-gray-600 font-medium capitalize">{todayDate}</p>
        </div>
        <div className="flex gap-4">
          <div className="flex flex-col items-center gap-1 px-5 py-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-sm border-2 border-blue-300">
            <span className="text-xs text-blue-700 uppercase font-semibold tracking-wide">Tổng số người</span>
            <span className="text-3xl font-bold text-blue-600">{stats?.total_users || 0}</span>
          </div>
          <div className="flex flex-col items-center gap-1 px-5 py-3 bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-sm border-2 border-green-300">
            <span className="text-xs text-green-700 uppercase font-semibold tracking-wide">Đã điểm danh</span>
            <span className="text-3xl font-bold text-green-600">{stats?.checked_in_today || 0}</span>
            {stats?.total_users > 0 && (
              <span className="text-xs text-green-600 font-medium">
                ({Math.round((stats.checked_in_today / stats.total_users) * 100)}%)
              </span>
            )}
          </div>
          <div className="flex flex-col items-center gap-1 px-5 py-3 bg-white rounded-lg shadow-sm border border-gray-200">
            <span className="text-xs text-gray-600 uppercase font-semibold tracking-wide">Chưa điểm danh</span>
            <span className="text-2xl font-bold text-orange-500">
              {stats?.total_users ? (stats.total_users - (stats?.checked_in_today || 0)) : 0}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="m-0 mb-5 text-gray-900 text-xl font-semibold">Danh sách điểm danh</h2>
          
          <div className="mb-6">
            <h3 className="m-0 mb-3 text-gray-800 text-base font-semibold">Đã điểm danh ({stats?.checked_in_users?.length || 0})</h3>
            {stats?.checked_in_users && stats.checked_in_users.length > 0 ? (
              <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
                {stats.checked_in_users.map((userName: string, index: number) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2.5 rounded-md bg-green-50 border border-green-200"
                  >
                    <span className="w-6 h-6 rounded-full bg-green-500 text-white text-xs font-bold flex items-center justify-center">
                      {index + 1}
                    </span>
                    <span className="text-base text-gray-900 font-medium">{userName}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500 text-sm italic">
                Chưa có ai điểm danh
              </div>
            )}
          </div>

          <div>
            <h3 className="m-0 mb-3 text-gray-800 text-base font-semibold">Chưa điểm danh ({stats?.not_checked_in_users?.length || 0})</h3>
            {stats?.not_checked_in_users && stats.not_checked_in_users.length > 0 ? (
              <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
                {stats.not_checked_in_users.map((userName: string, index: number) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2.5 rounded-md bg-orange-50 border border-orange-200"
                  >
                    <span className="w-6 h-6 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center">
                      {index + 1}
                    </span>
                    <span className="text-base text-gray-900 font-medium">{userName}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500 text-sm italic">
                Tất cả đã điểm danh
              </div>
            )}
          </div>
        </div>
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="m-0 mb-5 text-gray-900 text-xl font-semibold">Live Attendance Feed</h2>
          <div className="max-h-[600px] overflow-y-auto">
          {recentScans.length === 0 ? (
            <div className="text-center py-12 text-gray-600 text-base">
              <p className="m-0 italic">No attendance records yet. Waiting for scans...</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {recentScans.map((scan: any) => {
                const checkInInfo = scan.status === 'success' && scan.user_id ? getCheckInStatus(scan.timestamp, 8, 0) : null
                const checkInStatusClass = checkInInfo?.status === 'late' 
                  ? 'text-red-600 font-semibold' 
                  : checkInInfo?.status === 'early'
                  ? 'text-blue-600 font-semibold'
                  : checkInInfo?.status === 'on_time'
                  ? 'text-green-600 font-semibold'
                  : 'text-gray-600'
                
                return (
                  <div
                    key={scan.id}
                    className={`grid grid-cols-[200px_1fr_auto] gap-4 p-3.5 px-4 rounded-md border-l-3 relative transition-opacity hover:opacity-90 ${getFeedItemClass(scan.status)}`}
                  >
                    <div className="flex flex-col gap-1">
                      <div className="text-xs text-gray-500 font-medium">
                        {formatDateTimeGMT7(scan.timestamp)}
                      </div>
                      {checkInInfo && (
                        <div className={`text-xs ${checkInStatusClass}`}>
                          {checkInInfo.status === 'late' ? '⚠️ Muộn' : checkInInfo.status === 'early' ? '✓ Sớm' : '✓ Đúng giờ'}
                        </div>
                      )}
                    </div>
                    <div className="text-base text-gray-900 font-medium">
                      {scan.user_name || 'Unknown'}
                    </div>
                    <div className="flex items-center">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize inline-block border ${getStatusBadgeClass(scan.status)}`}>
                        {scan.status}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
