import { useEffect, useRef, useState } from 'react'

type Props = {
  onCapture: (blob: Blob) => void
  onClose?: () => void
}

export default function CameraCapture({ onCapture, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let alive = true
    async function start() {
      try {
        setError(null)
        // Ask for camera permission (rear camera if available)
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        })
        if (!alive) return
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
          setReady(true)
        }
      } catch (e: any) {
        setError(e?.message || 'Camera access denied')
      }
    }
    start()
    return () => {
      alive = false
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
        streamRef.current = null
      }
    }
  }, [])

  function takePhoto() {
    const video = videoRef.current
    if (!video) return
    const w = video.videoWidth || 1280
    const h = video.videoHeight || 720
    const canvas = document.createElement('canvas')
    canvas.width = w; canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, w, h)
    canvas.toBlob((blob) => {
      if (blob) onCapture(blob)
    }, 'image/jpeg', 0.92)
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow max-w-lg w-full p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Take a photo</h3>
          <button onClick={onClose} className="text-sm underline">Close</button>
        </div>

        {error && <div className="text-red-600 text-sm mb-2">{error}</div>}

        <div className="rounded overflow-hidden bg-black aspect-video">
          <video ref={videoRef} playsInline muted className="w-full h-full object-contain" />
        </div>

        <div className="flex gap-2 mt-3">
          <button
            onClick={takePhoto}
            disabled={!ready}
            className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {ready ? 'Capture' : 'Starting camera…'}
          </button>
          <button onClick={onClose} className="px-4 py-2 rounded border">Cancel</button>
        </div>

        <p className="text-xs text-gray-500 mt-2">
          Tip: camera access requires localhost or HTTPS, and must be triggered by a user action.
        </p>
      </div>
    </div>
  )
}