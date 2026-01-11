import React, { useRef, useState } from 'react'
import { api } from '../services/api'
import axios from 'axios'

interface User {
  id: number
  name: string
}

interface FaceEnrollmentProps {
  user: User
  onComplete: () => void
  onCancel: () => void
}

function FaceEnrollment({ user, onComplete, onCancel }: FaceEnrollmentProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [captured, setCaptured] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [videoReady, setVideoReady] = useState(false)
  const [mode, setMode] = useState<'camera' | 'upload'>('camera')
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const startCamera = async () => {
    try {
      setVideoReady(false)
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 }
      })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (err: any) {
      setError('Failed to access camera: ' + err.message)
      setVideoReady(false)
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) {
      setError('Camera or canvas not ready')
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current

    if (video.readyState !== video.HAVE_ENOUGH_DATA || video.videoWidth === 0 || video.videoHeight === 0) {
      setError('Video not ready. Please wait for camera to load.')
      return
    }

    try {
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      setCaptured(true)
      stopCamera()
      setError('')
    } catch (err: any) {
      setError('Failed to capture photo: ' + err.message)
    }
  }

  const retakePhoto = () => {
    setCaptured(false)
    setVideoReady(false)
    startCamera()
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      setError('No file selected')
      return
    }

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPG, PNG, etc.)')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File size too large. Please select an image smaller than 10MB')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    const reader = new FileReader()
    reader.onerror = () => {
      setError('Failed to read file')
    }
    reader.onload = (event) => {
      try {
        const img = new Image()
        img.onerror = () => {
          setError('Invalid image file')
        }
        img.onload = () => {
          if (canvasRef.current) {
            const canvas = canvasRef.current
            const ctx = canvas.getContext('2d')
            if (ctx) {
              canvas.width = img.width
              canvas.height = img.height
              ctx.drawImage(img, 0, 0)
            }
          }
          
          setPreviewImage(event.target?.result as string)
          setSelectedFile(file)
          setCaptured(true)
          setError('')
          setSuccess(false)
        }
        img.src = event.target?.result as string
      } catch (err: any) {
        setError('Failed to load image: ' + err.message)
      }
    }
    reader.readAsDataURL(file)
  }

  const uploadPhoto = async () => {
    setUploading(true)
    setError('')

    try {
      let blob: Blob | null = null
      
      if (mode === 'camera' && canvasRef.current) {
        await new Promise<void>((resolve) => {
          canvasRef.current!.toBlob((b) => {
            blob = b
            resolve()
          }, 'image/jpeg', 0.95)
        })
      } else if (mode === 'upload') {
        if (selectedFile) {
          blob = selectedFile
        } else if (fileInputRef.current?.files?.[0]) {
          blob = fileInputRef.current.files[0]
        } else {
          setError('No image available. Please select an image file.')
          setUploading(false)
          return
        }
      } else {
        setError('No image available')
        setUploading(false)
        return
      }

      if (!blob) {
        setError('Failed to create image blob')
        setUploading(false)
        return
      }

      const formData = new FormData()
      let filename = 'face.jpg'
      if (mode === 'upload') {
        if (selectedFile?.name) {
          filename = selectedFile.name
        } else if (fileInputRef.current?.files?.[0]?.name) {
          filename = fileInputRef.current.files[0].name
        }
      }
      formData.append('file', blob, filename)

      try {
        const token = localStorage.getItem('token')
        const baseURL = api.defaults.baseURL || 'http://localhost:8000'
        
        const headers: any = {}
        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }
        
        const response = await axios.post(
          `${baseURL}/api/users/${user.id}/enroll`,
          formData,
          { headers }
        )
        
        if (response.status === 200) {
          setError('')
          setSuccess(true)
          setTimeout(() => {
            onComplete()
          }, 1500)
        }
      } catch (err: any) {
        let errorMsg = 'Upload failed'
        
        if (err.response?.status === 400) {
          const detail = err.response.data.detail || ''
          if (detail.includes('face') || detail.includes('khuôn mặt') || detail.includes('Không phát hiện')) {
            errorMsg = '⚠️ Ảnh chưa hợp lệ để phát hiện khuôn mặt!\n\n' +
                      'Vui lòng kiểm tra:\n' +
                      '• Khuôn mặt có rõ ràng và nhìn thẳng vào camera không?\n' +
                      '• Ánh sáng có đủ và không bị ngược sáng không?\n' +
                      '• Có đeo kính râm hoặc che khuất khuôn mặt không?\n' +
                      '• Ảnh có độ phân giải đủ (tối thiểu 200x200 pixels) không?'
          } else {
            errorMsg = detail || 'Yêu cầu không hợp lệ'
          }
        } else if (err.response?.status === 401) {
          errorMsg = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
        } else if (err.response?.status === 404) {
          errorMsg = 'Không tìm thấy người dùng'
        } else if (err.response?.status === 500) {
          errorMsg = 'Lỗi server. Vui lòng thử lại sau.'
        } else if (!err.response) {
          errorMsg = 'Lỗi kết nối. Vui lòng kiểm tra kết nối mạng.'
        } else if (err.response?.data?.detail) {
          errorMsg = err.response.data.detail
        } else if (err.response?.data?.message) {
          errorMsg = err.response.data.message
        } else if (err.message) {
          errorMsg = err.message
        }
        
        setError(errorMsg)
      } finally {
        setUploading(false)
      }
    } catch (err: any) {
      setError('Failed to process image: ' + err.message)
      setUploading(false)
    }
  }

  React.useEffect(() => {
    if (mode === 'camera') {
      startCamera()
      return () => {
        stopCamera()
      }
    } else {
      stopCamera()
    }
  }, [mode])

  const switchMode = (newMode: 'camera' | 'upload') => {
    setMode(newMode)
    setCaptured(false)
    setPreviewImage(null)
    setSelectedFile(null)
    setError('')
    setSuccess(false)
    if (newMode === 'camera') {
      startCamera()
    } else {
      stopCamera()
    }
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-gray-200">
        <h1 className="m-0 text-gray-900 text-3xl font-semibold">Enroll Face for {user.name}</h1>
        <button
          onClick={onCancel}
          className="px-5 py-2.5 bg-gray-500 text-white rounded-md text-sm font-medium transition-all hover:bg-gray-600"
        >
          Cancel
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md mb-4 border border-red-200 text-sm whitespace-pre-line leading-relaxed">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 text-green-800 p-3.5 rounded-md mb-4 border border-green-200 text-sm">
          ✓ Đăng ký khuôn mặt thành công! Đang chuyển hướng...
        </div>
      )}

      <div className="flex gap-2 mb-6 border-b-2 border-gray-200">
        <button
          className={`px-6 py-3 bg-none border-none border-b-3 border-transparent cursor-pointer text-sm text-gray-600 font-medium transition-all hover:text-gray-900 ${
            mode === 'camera' ? 'text-blue-500 border-b-blue-500 font-semibold' : ''
          }`}
          onClick={() => switchMode('camera')}
        >
          Webcam
        </button>
        <button
          className={`px-6 py-3 bg-none border-none border-b-3 border-transparent cursor-pointer text-sm text-gray-600 font-medium transition-all hover:text-gray-900 ${
            mode === 'upload' ? 'text-blue-500 border-b-blue-500 font-semibold' : ''
          }`}
          onClick={() => switchMode('upload')}
        >
          Upload Image
        </button>
      </div>

      <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 mb-6">
        {mode === 'camera' ? (
          <div className={`flex flex-col items-center gap-6 ${captured ? 'preview-view' : 'camera-view'}`}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`max-w-full rounded-lg shadow-lg border-2 border-gray-200 ${captured ? 'hidden' : 'block'}`}
              onLoadedMetadata={() => {
                setVideoReady(true)
                if (error && error.includes('not ready')) {
                  setError('')
                }
              }}
              onLoadedData={() => {
                setVideoReady(true)
              }}
            />
            <canvas
              ref={canvasRef}
              className={`max-w-full rounded-lg shadow-lg border-2 border-gray-200 ${captured ? 'block' : 'hidden'}`}
            />
            
            {!captured ? (
              <div className="flex gap-3">
                <button
                  onClick={capturePhoto}
                  className="px-7 py-3 bg-blue-500 text-white rounded-md text-base font-semibold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={!videoReady}
                >
                  {videoReady ? 'Capture Photo' : 'Loading Camera...'}
                </button>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={retakePhoto}
                  className="px-5 py-2.5 bg-gray-500 text-white rounded-md text-sm font-medium transition-all hover:bg-gray-600"
                >
                  Retake
                </button>
                <button
                  onClick={uploadPhoto}
                  disabled={uploading}
                  className="px-5 py-2.5 bg-blue-500 text-white rounded-md text-sm font-medium transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Uploading...' : 'Upload & Enroll'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6">
            {!captured ? (
              <div className="w-full max-w-md">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center bg-gray-50 transition-all hover:border-blue-500 hover:bg-blue-50">
                  <p className="mb-4 text-gray-600 text-base">Click to select an image file</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-5 py-2.5 bg-blue-500 text-white rounded-md text-sm font-medium transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
                  >
                    Choose File
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-6">
                {previewImage ? (
                  <img src={previewImage} alt="Preview" className="max-w-full max-h-[500px] rounded-lg shadow-md" />
                ) : (
                  <div className="text-gray-600">Loading preview...</div>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setCaptured(false)
                      setPreviewImage(null)
                      setSelectedFile(null)
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                    className="px-5 py-2.5 bg-gray-500 text-white rounded-md text-sm font-medium transition-all hover:bg-gray-600"
                  >
                    Change Image
                  </button>
                  <button
                    onClick={uploadPhoto}
                    disabled={uploading || !previewImage}
                    className="px-5 py-2.5 bg-blue-500 text-white rounded-md text-sm font-medium transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {uploading ? 'Uploading...' : 'Upload & Enroll'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
        <h3 className="mt-0 mb-3 text-gray-900 text-base font-semibold">Hướng dẫn chụp ảnh:</h3>
        <ul className="m-0 pl-6 text-gray-600 text-sm leading-relaxed">
          <li>Đặt khuôn mặt ở giữa khung hình</li>
          <li>Đảm bảo ánh sáng đủ và không bị ngược sáng</li>
          <li>Nhìn thẳng vào camera, không nghiêng đầu</li>
          <li>Không đeo kính râm hoặc che khuất khuôn mặt</li>
          <li>Ảnh phải có độ phân giải đủ (tối thiểu 200x200 pixels)</li>
          <li>Khuôn mặt phải rõ ràng, không bị mờ</li>
        </ul>
      </div>
    </div>
  )
}

export default FaceEnrollment
