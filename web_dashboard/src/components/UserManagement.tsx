import React, { useState, useEffect } from 'react'
import { api } from '../services/api'
import FaceEnrollment from './FaceEnrollment'

interface User {
  id: number
  name: string
  code: string
  image_path?: string
  updated_at?: string
  has_encoding: boolean
}

function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({ name: '', code: '' })
  const [enrollingUser, setEnrollingUser] = useState<User | null>(null)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const response = await api.get('/api/users')
      setUsers(response.data)
    } catch (error) {
      alert('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setFormData({ name: '', code: '' })
    setEditingUser(null)
    setShowAddForm(true)
  }

  const handleEdit = (user: User) => {
    setFormData({ name: user.name, code: user.code })
    setEditingUser(user)
    setShowAddForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return
    }

    try {
      await api.delete(`/api/users/${id}`)
      loadUsers()
    } catch (error) {
      alert('Failed to delete user')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.name.includes(',')) {
      alert('Tên người dùng không được chứa dấu phẩy (,)')
      return
    }
    
    try {
      if (editingUser) {
        await api.put(`/api/users/${editingUser.id}`, formData)
      } else {
        await api.post('/api/users', formData)
      }
      setShowAddForm(false)
      setEditingUser(null)
      loadUsers()
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to save user')
    }
  }

  const handleEnroll = (user: User) => {
    setEnrollingUser(user)
  }

  const handleEnrollmentComplete = () => {
    setEnrollingUser(null)
    loadUsers()
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-600">Loading users...</div>
  }

  if (enrollingUser) {
    return (
      <FaceEnrollment
        user={enrollingUser}
        onComplete={handleEnrollmentComplete}
        onCancel={() => setEnrollingUser(null)}
      />
    )
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-gray-200">
        <h1 className="m-0 text-gray-900 text-3xl font-semibold">User Management</h1>
        <button
          onClick={handleAdd}
          className="bg-blue-500 text-white border-none px-5 py-2.5 rounded-md cursor-pointer text-sm font-medium transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
        >
          Add User
        </button>
      </div>

      {showAddForm && (
        <div
          className="fixed inset-0 bg-black/50 flex justify-center items-center z-[1000]"
          onClick={() => setShowAddForm(false)}
        >
          <div
            className="bg-white p-8 rounded-xl w-[90%] max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mt-0 mb-6 text-gray-900 text-2xl">{editingUser ? 'Edit User' : 'Add User'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-5">
                <label className="block mb-2 text-gray-700 font-medium text-sm">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    const value = e.target.value
                    if (!value.includes(',')) {
                      setFormData({ ...formData, name: value })
                    }
                  }}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-base transition-all focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  required
                />
              </div>
              <div className="mb-5">
                <label className="block mb-2 text-gray-700 font-medium text-sm">Code (MSSV/ID)</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-base transition-all focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  required
                />
              </div>
              <div className="flex gap-4 justify-end">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-500 text-white rounded-md text-sm font-medium transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
                >
                  {editingUser ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-5 py-2.5 bg-gray-500 text-white rounded-md text-sm font-medium transition-all hover:bg-gray-600 hover:-translate-y-0.5"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <table className="w-full border-collapse bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200">
        <thead>
          <tr>
            <th className="bg-blue-500 text-white px-4 py-3.5 text-left font-semibold text-sm uppercase tracking-wide">ID</th>
            <th className="bg-blue-500 text-white px-4 py-3.5 text-left font-semibold text-sm uppercase tracking-wide">Image</th>
            <th className="bg-blue-500 text-white px-4 py-3.5 text-left font-semibold text-sm uppercase tracking-wide">Name</th>
            <th className="bg-blue-500 text-white px-4 py-3.5 text-left font-semibold text-sm uppercase tracking-wide">Code</th>
            <th className="bg-blue-500 text-white px-4 py-3.5 text-left font-semibold text-sm uppercase tracking-wide">Face Enrolled</th>
            <th className="bg-blue-500 text-white px-4 py-3.5 text-left font-semibold text-sm uppercase tracking-wide">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 ? (
            <tr>
              <td colSpan={6} className="p-8 text-center text-gray-600 italic">
                No users found. Click "Add User" to create one.
              </td>
            </tr>
          ) : (
            users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-4 py-3.5 text-sm border-b border-gray-100">{user.id}</td>
                <td className="px-4 py-3.5 text-sm border-b border-gray-100">
                  {user.image_path ? (
                    <img
                      src={`http://localhost:8000${user.image_path}?t=${user.updated_at || Date.now()}`}
                      alt={user.name}
                      className="w-[50px] h-[50px] object-cover rounded-full border-2 border-gray-200 cursor-pointer transition-transform hover:scale-110"
                      key={`${user.id}-${user.updated_at || Date.now()}`}
                      onError={(e: any) => {
                        e.target.onerror = null
                        e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="50" height="50"%3E%3Crect width="50" height="50" fill="%23e9ecef"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%236c757d" font-size="10"%3ENo image%3C/text%3E%3C/svg%3E'
                      }}
                    />
                  ) : (
                    <div className="w-[50px] h-[50px] rounded-full border-2 border-gray-200 bg-gray-100 flex items-center justify-center text-[0.7rem] text-gray-600 text-center">
                      No image
                    </div>
                  )}
                </td>
                <td className="px-4 py-3.5 text-sm border-b border-gray-100">{user.name}</td>
                <td className="px-4 py-3.5 text-sm border-b border-gray-100">{user.code}</td>
                <td className="px-4 py-3.5 text-sm border-b border-gray-100">
                  {user.has_encoding ? (
                    <span className="px-3 py-1.5 rounded-full text-xs font-semibold inline-block border bg-teal-50 text-teal-800 border-teal-200">
                      Yes
                    </span>
                  ) : (
                    <span className="px-3 py-1.5 rounded-full text-xs font-semibold inline-block border bg-yellow-50 text-yellow-800 border-yellow-200">
                      No
                    </span>
                  )}
                </td>
                <td className="px-4 py-3.5 text-sm border-b border-gray-100">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(user)}
                      className="px-3 py-1.5 border-none rounded-md cursor-pointer text-xs font-medium transition-all hover:-translate-y-0.5 hover:shadow-md bg-blue-500 text-white"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleEnroll(user)}
                      className="px-3 py-1.5 border-none rounded-md cursor-pointer text-xs font-medium transition-all hover:-translate-y-0.5 hover:shadow-md bg-purple-500 text-white"
                    >
                      {user.has_encoding ? 'Re-enroll' : 'Enroll Face'}
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="px-3 py-1.5 border-none rounded-md cursor-pointer text-xs font-medium transition-all hover:-translate-y-0.5 hover:shadow-md bg-red-500 text-white"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

export default UserManagement
