import React from 'react'
import { Outlet, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function Layout() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="bg-blue-500 text-white px-8 py-4 flex justify-between items-center shadow-md">
        <div className="text-xl font-semibold tracking-tight">Face Attendance System</div>
        <div className="flex gap-2 items-center">
          <Link to="/" className="text-white no-underline px-4 py-2 rounded-md transition-all text-sm font-medium hover:bg-white/15">
            Live Monitor
          </Link>
          <Link to="/users" className="text-white no-underline px-4 py-2 rounded-md transition-all text-sm font-medium hover:bg-white/15">
            Users
          </Link>
          <Link to="/reports" className="text-white no-underline px-4 py-2 rounded-md transition-all text-sm font-medium hover:bg-white/15">
            Reports
          </Link>
          <Link to="/settings" className="text-white no-underline px-4 py-2 rounded-md transition-all text-sm font-medium hover:bg-white/15">
            Settings
          </Link>
          <button
            onClick={handleLogout}
            className="bg-white/20 text-white border border-white/30 px-4 py-2 rounded-md cursor-pointer text-sm font-medium transition-all hover:bg-white/30"
          >
            Logout
          </button>
        </div>
      </nav>
      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
