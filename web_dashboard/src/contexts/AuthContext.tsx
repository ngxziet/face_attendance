import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { api } from '../services/api'

interface AuthContextType {
  isAuthenticated: boolean
  loading: boolean
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token')
      if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`
        try {
          await api.get('/api/settings/public')
          setIsAuthenticated(true)
        } catch (error: any) {
          if (error.response?.status === 401) {
            localStorage.removeItem('token')
            delete api.defaults.headers.common['Authorization']
            setIsAuthenticated(false)
          } else {
            setIsAuthenticated(true)
          }
        }
      }
      setLoading(false)
    }
    checkAuth()
  }, [])

  const login = async (username: string, password: string) => {
    try {
      const response = await api.post('/api/auth/login', { username, password })
      const token = response.data.access_token
      localStorage.setItem('token', token)
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      setIsAuthenticated(true)
      return { success: true }
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || 'Login failed'
      return { success: false, error: errorMsg }
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    delete api.defaults.headers.common['Authorization']
    setIsAuthenticated(false)
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
