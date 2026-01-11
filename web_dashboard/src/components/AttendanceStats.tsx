import React, { useState, useEffect } from 'react'
import { api } from '../services/api'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { formatDateOnlyGMT7 } from '../utils/dateUtils'

function AttendanceStats() {
  const [stats, setStats] = useState<any>(null)
  const [dailyData, setDailyData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    loadStats()
    loadDailyData()
  }, [dateRange])

  const loadStats = async () => {
    try {
      const response = await api.get('/api/attendance/stats')
      setStats(response.data)
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadDailyData = async () => {
    try {
      const response = await api.get('/api/attendance', {
        params: {
          start_date: dateRange.start,
          end_date: dateRange.end,
          limit: 1000
        }
      })

      const grouped: any = {}
      response.data.forEach((record: any) => {
        const dateObj = new Date(record.timestamp)
        const gmt7Date = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Ho_Chi_Minh',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).format(dateObj)
        
        if (!grouped[gmt7Date]) {
          grouped[gmt7Date] = { date: gmt7Date, count: 0, success: 0, failed: 0, unknown: 0 }
        }
        grouped[gmt7Date].count++
        if (record.status === 'success') grouped[gmt7Date].success++
        else if (record.status === 'failed') grouped[gmt7Date].failed++
        else grouped[gmt7Date].unknown++
      })

      const daily = Object.values(grouped).sort((a: any, b: any) => a.date.localeCompare(b.date))
      setDailyData(daily)
    } catch (error) {
      console.error('Error loading daily data:', error)
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-600">Loading statistics...</div>
  }

  return (
    <div>
      <h1 className="mb-6 text-gray-900 text-3xl font-semibold pb-4 border-b-2 border-gray-200">Attendance Statistics</h1>

      <div className="flex gap-4 mb-6 bg-white p-5 rounded-lg shadow-sm border border-gray-200">
        <label className="flex flex-col gap-2 text-gray-700 font-medium text-sm">
          Start Date:
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="px-2.5 py-2.5 border border-gray-300 rounded-md text-sm transition-all focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </label>
        <label className="flex flex-col gap-2 text-gray-700 font-medium text-sm">
          End Date:
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="px-2.5 py-2.5 border border-gray-300 rounded-md text-sm transition-all focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </label>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4 mb-6">
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 text-center transition-all hover:-translate-y-0.5 hover:shadow-md">
          <h3 className="text-gray-600 text-xs mb-2 uppercase font-semibold tracking-wide">Today</h3>
          <p className="text-4xl font-bold text-blue-500 m-0">{stats?.total_today || 0}</p>
        </div>
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 text-center transition-all hover:-translate-y-0.5 hover:shadow-md">
          <h3 className="text-gray-600 text-xs mb-2 uppercase font-semibold tracking-wide">This Week</h3>
          <p className="text-4xl font-bold text-blue-500 m-0">{stats?.total_this_week || 0}</p>
        </div>
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 text-center transition-all hover:-translate-y-0.5 hover:shadow-md">
          <h3 className="text-gray-600 text-xs mb-2 uppercase font-semibold tracking-wide">This Month</h3>
          <p className="text-4xl font-bold text-blue-500 m-0">{stats?.total_this_month || 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(500px,1fr))] gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="mt-0 mb-4 text-gray-900 text-xl font-semibold">Daily Attendance</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="count" stroke="#3498db" name="Total" />
              <Line type="monotone" dataKey="success" stroke="#2ecc71" name="Success" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="mt-0 mb-4 text-gray-900 text-xl font-semibold">Status Breakdown</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="success" stackId="a" fill="#2ecc71" name="Success" />
              <Bar dataKey="failed" stackId="a" fill="#e74c3c" name="Failed" />
              <Bar dataKey="unknown" stackId="a" fill="#f39c12" name="Unknown" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

export default AttendanceStats
