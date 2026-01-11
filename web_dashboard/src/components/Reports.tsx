import React, { useState, useEffect } from 'react'
import { api } from '../services/api'
import { formatDateGMT7 } from '../utils/dateUtils'

function Reports() {
  const [attendance, setAttendance] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    user_id: '',
    user_name: '',
    status: ''
  })
  const [filteredAttendance, setFilteredAttendance] = useState<any[]>([])

  const loadAttendance = async () => {
    setLoading(true)
    try {
      const params: any = {
        start_date: filters.start_date,
        end_date: filters.end_date,
        limit: 10000
      }
      if (filters.user_id) params.user_id = parseInt(filters.user_id)
      if (filters.status) params.status = filters.status

      const response = await api.get('/api/attendance', { params })
      setAttendance(response.data)
      applyNameFilter(response.data)
    } catch (error) {
      console.error('Error loading attendance:', error)
      alert('Failed to load attendance records')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAttendance()
  }, [])

  useEffect(() => {
    applyNameFilter(attendance)
  }, [attendance])

  const handleFilterChange = (field: string, value: string) => {
    const newFilters = { ...filters, [field]: value }
    setFilters(newFilters)
    if (field === 'user_name') {
      applyNameFilter(attendance, newFilters.user_name)
    }
  }

  const applyNameFilter = (data: any[], nameFilter = filters.user_name) => {
    if (!nameFilter || nameFilter.trim() === '') {
      setFilteredAttendance(data)
      return
    }
    const filtered = data.filter(record => 
      record.user_name?.toLowerCase().includes(nameFilter.toLowerCase())
    )
    setFilteredAttendance(filtered)
  }

  const handleExportCSV = () => {
    const dataToExport = filteredAttendance.length > 0 ? filteredAttendance : attendance
    const csv = convertToCSV(dataToExport)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance_${filters.start_date}_${filters.end_date}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const convertToCSV = (data: any[]) => {
    const headers = ['ID', 'User ID', 'User Name', 'Timestamp', 'Status', 'Device ID']
    const rows = data.map(record => [
      record.id,
      record.user_id || '',
      record.user_name || '',
      formatDateGMT7(record.timestamp),
      record.status,
      record.device_id || ''
    ])
    return [headers, ...rows].map(row => row.join(',')).join('\n')
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

  return (
    <div>
      <h1 className="mb-6 text-gray-900 text-3xl font-semibold pb-4 border-b-2 border-gray-200">Attendance Reports</h1>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4 items-end">
        <div className="flex flex-col gap-2">
          <label className="text-gray-700 font-medium text-sm mb-1">Start Date</label>
          <input
            type="date"
            value={filters.start_date}
            onChange={(e) => handleFilterChange('start_date', e.target.value)}
            className="px-2.5 py-2.5 border border-gray-300 rounded-md text-sm transition-all focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-gray-700 font-medium text-sm mb-1">End Date</label>
          <input
            type="date"
            value={filters.end_date}
            onChange={(e) => handleFilterChange('end_date', e.target.value)}
            className="px-2.5 py-2.5 border border-gray-300 rounded-md text-sm transition-all focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-gray-700 font-medium text-sm mb-1">User Name</label>
          <input
            type="text"
            value={filters.user_name}
            onChange={(e) => handleFilterChange('user_name', e.target.value)}
            placeholder="Search by name"
            className="px-2.5 py-2.5 border border-gray-300 rounded-md text-sm transition-all focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-gray-700 font-medium text-sm mb-1">User ID</label>
          <input
            type="number"
            value={filters.user_id}
            onChange={(e) => handleFilterChange('user_id', e.target.value)}
            placeholder="Filter by ID"
            className="px-2.5 py-2.5 border border-gray-300 rounded-md text-sm transition-all focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-gray-700 font-medium text-sm mb-1">Status</label>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="px-2.5 py-2.5 border border-gray-300 rounded-md text-sm transition-all focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          >
            <option value="">All</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="unknown">Unknown</option>
          </select>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={loadAttendance}
            className="px-5 py-2.5 bg-blue-500 text-white rounded-md text-sm font-semibold cursor-pointer transition-all hover:bg-blue-600"
          >
            Apply Filters
          </button>
          <button
            onClick={handleExportCSV}
            className="px-5 py-2.5 bg-gray-500 text-white rounded-md text-sm font-semibold cursor-pointer transition-all hover:bg-gray-600"
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="mb-4 text-gray-600 text-sm font-medium">
        <p>Showing {filteredAttendance.length} of {attendance.length} records</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-600">Loading...</div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="bg-blue-500 text-white px-4 py-3.5 text-left font-semibold text-sm uppercase tracking-wide sticky top-0">ID</th>
                <th className="bg-blue-500 text-white px-4 py-3.5 text-left font-semibold text-sm uppercase tracking-wide sticky top-0">User ID</th>
                <th className="bg-blue-500 text-white px-4 py-3.5 text-left font-semibold text-sm uppercase tracking-wide sticky top-0">User Name</th>
                <th className="bg-blue-500 text-white px-4 py-3.5 text-left font-semibold text-sm uppercase tracking-wide sticky top-0">Timestamp</th>
                <th className="bg-blue-500 text-white px-4 py-3.5 text-left font-semibold text-sm uppercase tracking-wide sticky top-0">Status</th>
                <th className="bg-blue-500 text-white px-4 py-3.5 text-left font-semibold text-sm uppercase tracking-wide sticky top-0">Device ID</th>
              </tr>
            </thead>
            <tbody>
              {(filteredAttendance.length === 0 && attendance.length > 0) ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-600 italic">
                    No records match the filters
                  </td>
                </tr>
              ) : attendance.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-600 italic">
                    No records found
                  </td>
                </tr>
              ) : (
                (filteredAttendance.length > 0 ? filteredAttendance : attendance).map((record: any) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm border-b border-gray-100">{record.id}</td>
                    <td className="px-4 py-3 text-sm border-b border-gray-100">{record.user_id || '-'}</td>
                    <td className="px-4 py-3 text-sm border-b border-gray-100">{record.user_name || 'Unknown'}</td>
                    <td className="px-4 py-3 text-sm border-b border-gray-100">{formatDateGMT7(record.timestamp)}</td>
                    <td className="px-4 py-3 text-sm border-b border-gray-100">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize inline-block border ${getStatusBadgeClass(record.status)}`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm border-b border-gray-100">{record.device_id || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default Reports
