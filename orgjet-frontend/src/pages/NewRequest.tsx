import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useNavigate } from 'react-router-dom'
import CameraCapture from '../components/CameraCapture'

export default function NewRequest() {
  const [types, setTypes] = useState<any[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [typeId, setTypeId] = useState('')
  const [priority, setPriority] = useState('MEDIUM')
  const [dueDate, setDueDate] = useState('')
  const [files, setFiles] = useState<FileList | null>(null)
  const [captured, setCaptured] = useState<Blob[]>([])      // ← new: photos from camera
  const [showCamera, setShowCamera] = useState(false)       // ← new: modal toggle
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()
  const [company, setCompany] = useState('')
  const [companyId, setCompanyId] = useState('')
  

  useEffect(() => {
    api.get('/requests').then(res => {
      const tset = new Map<string, any>()
      res.data.items.forEach((r:any)=> tset.set(r.type.id, r.type))
      const arr = Array.from(tset.values())
      setTypes(arr)
      if (!typeId && arr[0]) setTypeId(arr[0].id)
    })
  }, [])

  function toISOEndOfDay(localYMD: string) {
    if (!localYMD) return null
    const dt = new Date(`${localYMD}T23:59:59`)
    return dt.toISOString()
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload: any = { title, description, typeId, priority }
      const iso = toISOEndOfDay(dueDate)
      if (iso) payload.dueAt = iso
      if (company.trim()) payload.company = company.trim()
      if (companyId.trim()) payload.companyId = companyId.trim()
      

      // 1) create request
      const { data } = await api.post('/requests', payload)

      // 2) upload attachments (file input + captured)
      const hasFiles = (files && files.length > 0) || captured.length > 0
      if (hasFiles) {
        const form = new FormData()
        if (files) Array.from(files).forEach(f => form.append('files', f))
        // name blobs for server (multer) friendliness
        captured.forEach((b, i) => form.append('files', new File([b], `photo-${Date.now()}-${i}.jpg`, { type: 'image/jpeg' })))
        await api.post(`/requests/${data.id}/attachments`, form, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      }

      navigate(`/r/${data.id}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <form onSubmit={submit} className="space-y-3 max-w-xl">
        <h2 className="text-xl font-semibold">Submit a Request</h2>
        <input className="border rounded w-full p-2" placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)} />
        <textarea className="border rounded w-full p-2" placeholder="Description" rows={5} value={description} onChange={e=>setDescription(e.target.value)} />



        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <select className="border rounded p-2" value={typeId} onChange={e=>setTypeId(e.target.value)}>
            {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select className="border rounded p-2" value={priority} onChange={e=>setPriority(e.target.value)}>
            {['LOW','MEDIUM','HIGH','URGENT'].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <input type="date" className="border rounded p-2" value={dueDate} onChange={e=>setDueDate(e.target.value)} aria-label="Due date" />
        </div>
 <input
    className="border rounded p-2 md:col-span-2"
    placeholder="Company"
    value={company}
    onChange={e=>setCompany(e.target.value)}
  />
  <input
    className="border rounded p-2"
    placeholder="ID number"
    value={companyId}
    onChange={e=>setCompanyId(e.target.value)}
  />

        {/* Files from disk (also supports mobile camera via file picker) */}
        <div className="space-y-1">
          <label className="block text-sm text-gray-700">Add photos</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={e => setFiles(e.target.files)}
            className="block w-full text-sm"
          />
          {files && files.length > 0 && (
            <div className="text-xs text-gray-600">{files.length} file(s) selected</div>
          )}
        </div>

        {/* New: use camera with explicit permission */}
        <div className="space-y-1">
          <button type="button" onClick={() => setShowCamera(true)} className="px-3 py-2 rounded border">
            Use camera
          </button>
          {captured.length > 0 && (
            <div className="mt-2 grid grid-cols-4 gap-2">
              {captured.map((b, i) => {
                const url = URL.createObjectURL(b)
                return (
                  <div key={i} className="relative">
                    <img src={url} className="w-full h-24 object-cover rounded border" />
                    <button
                      type="button"
                      onClick={() => setCaptured(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-1 right-1 text-xs bg-white/90 border rounded px-1"
                    >
                      ✕
                    </button>
                  </div>
                )
              })}
            </div>
          )}
          {captured.length > 0 && (
            <div className="text-xs text-gray-600">{captured.length} photo(s) captured</div>
          )}
        </div>

        <button disabled={submitting} className="bg-black text-white rounded px-4 py-2 disabled:opacity-50">
          {submitting ? 'Submitting…' : 'Create'}
        </button>
      </form>

      {showCamera && (
        <CameraCapture
          onClose={() => setShowCamera(false)}
          onCapture={(blob) => {
            setCaptured(prev => [...prev, blob])
            // keep the camera open for multiple shots; close if you prefer:
            // setShowCamera(false)
          }}
        />
      )}
    </>
  )
}