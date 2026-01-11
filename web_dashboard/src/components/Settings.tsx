import React, { useState, useEffect } from 'react'
import { api } from '../services/api'

function Settings() {
  const [settings, setSettings] = useState({ threshold: 0.6, camera_id: 0 })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const response = await api.get('/api/settings')
      const data = response.data
      // Ensure threshold and camera_id are valid numbers
      setSettings({
        threshold: typeof data.threshold === 'number' ? data.threshold : 0.6,
        camera_id: typeof data.camera_id === 'number' ? data.camera_id : 0
      })
    } catch (error) {
      console.error('Error loading settings:', error)
      setMessage('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    try {
      await api.put('/api/settings', settings)
      setMessage('Settings saved successfully!')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('Error saving settings:', error)
      setMessage('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-600">Loading settings...</div>
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="mb-6 text-gray-900 text-3xl font-semibold pb-4 border-b-2 border-gray-200">System Settings</h1>

      {message && (
        <div className={`p-3.5 rounded-md mb-6 text-sm ${
          message.includes('success') 
            ? 'bg-teal-50 text-teal-800 border border-teal-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
        <div className="mb-8">
          <label htmlFor="threshold" className="block mb-2 text-gray-700">
            <strong className="block mb-1 text-base font-semibold text-gray-900">Face Recognition Threshold</strong>
            <span className="block text-sm text-gray-600 font-normal mt-1 leading-relaxed">
              Lower value = more strict (0.4 = very accurate, 0.6 = normal, 0.8 = lenient)
            </span>
          </label>
          <div className="flex items-center gap-4 my-4">
            <input
              type="range"
              id="threshold"
              min="0.3"
              max="0.9"
              step="0.05"
              value={settings.threshold || 0.6}
              onChange={(e) => {
                const newValue = parseFloat(e.target.value)
                if (!isNaN(newValue)) {
                  setSettings({ ...settings, threshold: newValue })
                }
              }}
              onInput={(e) => {
                const newValue = parseFloat((e.target as HTMLInputElement).value)
                if (!isNaN(newValue)) {
                  setSettings({ ...settings, threshold: newValue })
                }
              }}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((settings.threshold || 0.6) - 0.3) / (0.9 - 0.3) * 100}%, #e5e7eb ${((settings.threshold || 0.6) - 0.3) / (0.9 - 0.3) * 100}%, #e5e7eb 100%)`
              }}
            />
            <span className="text-lg font-bold text-blue-500 min-w-[60px] text-center">
              {(settings.threshold || 0.6).toFixed(2)}
            </span>
          </div>
          <style>{`
            .slider::-webkit-slider-thumb {
              appearance: none;
              width: 18px;
              height: 18px;
              border-radius: 50%;
              background: #3b82f6;
              cursor: pointer;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            }
            .slider::-moz-range-thumb {
              width: 18px;
              height: 18px;
              border-radius: 50%;
              background: #3b82f6;
              cursor: pointer;
              border: 0;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            }
          `}</style>
          <div className="flex justify-between text-sm text-gray-500 mt-2">
            <span className="px-2 py-1 bg-gray-100 rounded">0.3 - Very Strict</span>
            <span className="px-2 py-1 bg-gray-100 rounded">0.6 - Normal (Recommended)</span>
            <span className="px-2 py-1 bg-gray-100 rounded">0.9 - Lenient</span>
          </div>
        </div>

        <div className="mb-8">
          <label htmlFor="camera_id" className="block mb-2 text-gray-700">
            <strong className="block mb-1 text-base font-semibold text-gray-900">Default Camera ID</strong>
            <span className="block text-sm text-gray-600 font-normal mt-1 leading-relaxed">
              Camera device ID for desktop client (usually 0)
            </span>
          </label>
          <input
            type="number"
            id="camera_id"
            min="0"
            value={settings.camera_id}
            onChange={(e) => setSettings({ ...settings, camera_id: parseInt(e.target.value) || 0 })}
            className="w-full max-w-xs px-3 py-2.5 border border-gray-300 rounded-md text-base transition-all focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <button
            type="submit"
            className="px-7 py-2.5 bg-blue-500 text-white rounded-md text-base font-semibold cursor-pointer transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default Settings
