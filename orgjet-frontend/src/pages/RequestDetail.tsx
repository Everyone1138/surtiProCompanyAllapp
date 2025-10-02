import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../lib/api'
import CameraCapture from '../components/CameraCapture'
import { useMemo } from 'react'





export default function RequestDetail() {
  const { id } = useParams()
  const [data, setData] = useState<any | null>(null)
  const [comment, setComment] = useState('')
  const [users, setUsers] = useState<any[]>([])
  const [assigning, setAssigning] = useState(false)
  const [postText, setPostText] = useState('')
  const [postFiles, setPostFiles] = useState<FileList | null>(null)
  const [posting, setPosting] = useState(false)
  const [showCameraPost, setShowCameraPost] = useState(false)
  const [capturedPost, setCapturedPost] = useState<Blob[]>([])
  const [activitySort, setActivitySort] = useState<'desc' | 'asc' | 'attachments'>('desc')



// helper: does this event have images?
function eventHasAttachments(ev: any): boolean {
  try {
    if (ev.eventType === 'attachment_added') return true
    if (ev.eventType === 'post') {
      const p = ev.payloadJson ? JSON.parse(ev.payloadJson) : {}
      return Array.isArray(p.attachments) && p.attachments.length > 0
    }
  } catch {}
  return false
}

const eventsSorted = useMemo(() => {
  const arr = [...(data?.events ?? [])]

  if (activitySort === 'attachments') {
    arr.sort((a: any, b: any) => {
      const ah = eventHasAttachments(a) ? 1 : 0
      const bh = eventHasAttachments(b) ? 1 : 0
      if (ah !== bh) return bh - ah // attachments first
      // tie-breaker: newer first
      const at = new Date(a.createdAt).getTime()
      const bt = new Date(b.createdAt).getTime()
      return bt - at
    })
    return arr
  }

  // date-based sorts
  arr.sort((a: any, b: any) => {
    const at = new Date(a.createdAt).getTime()
    const bt = new Date(b.createdAt).getTime()
    return activitySort === 'asc' ? at - bt : bt - at
  })
  return arr
}, [data?.events, activitySort])

async function submitPost(e: React.FormEvent) {
  e.preventDefault()
  if (!id) return
  if (!postText.trim() && (!postFiles || postFiles.length === 0) && capturedPost.length === 0) return

  setPosting(true)
  try {
    const form = new FormData()
    if (postText.trim()) form.append('text', postText.trim())
    if (postFiles && postFiles.length > 0) {
      Array.from(postFiles).forEach(f => form.append('files', f))
    }
    // include camera-captured blobs as files
    capturedPost.forEach((b, i) =>
      form.append('files', new File([b], `post-photo-${Date.now()}-${i}.jpg`, { type: 'image/jpeg' }))
    )

    await api.post(`/requests/${id}/post`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
    setPostText('')
    setPostFiles(null)
    setCapturedPost([])
    await refresh()
  } finally {
    setPosting(false)
  }
}

  async function refresh() {
    const res = await api.get(`/requests/${id}`)
    setData(res.data)
  }

  useEffect(() => {
    if (!id) return
    refresh()
    api.get('/users').then(res => setUsers(res.data.users))
  }, [id])

  async function addComment(e: React.FormEvent) {
    e.preventDefault()
    if (!comment.trim()) return
    await api.post(`/requests/${id}/comment`, { body: comment })
    setComment('')
    await refresh()
  }

async function assignTo(assigneeId: string) {
  if (!id) return
  setAssigning(true)
  try {
    // convert "" to null so backend truly unassigns
    const payload = assigneeId ? { assigneeId } : { assigneeId: null }
    await api.post(`/requests/${id}/assign`, payload)
    await refresh()
  } finally {
    setAssigning(false)
  }
}

  if (!data) return null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-3">
        <h2 className="text-xl font-semibold">{data.title}</h2>
        <div className="text-sm text-gray-600">
          {data.type?.name} • {data.priority} • {data.currentStatus}
        </div>
        <p className="bg-white p-3 rounded border whitespace-pre-wrap">{data.description}</p>

<div className="bg-white rounded border p-3">
  <div className="font-semibold mb-2">New Post</div>
  <form onSubmit={submitPost} className="space-y-2">
    <textarea
      className="border rounded w-full p-2"
      placeholder="Write an update..."
      rows={3}
      value={postText}
      onChange={e => setPostText(e.target.value)}
    />
    <div className="flex items-center gap-2">
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={e => setPostFiles(e.target.files)}
        className="text-sm"
      />
      <div className="flex items-center gap-2">
  

  {/* NEW: camera button */}
  <button
    type="button"
    onClick={() => setShowCameraPost(true)}
    className="px-3 py-1.5 rounded border text-sm"
  >
    Use camera
  </button>
</div>

{/* NEW: captured thumbnails */}
{capturedPost.length > 0 && (
  <div className="mt-2 grid grid-cols-4 gap-2">
    {capturedPost.map((b, i) => {
      const url = URL.createObjectURL(b)
      return (
        <div key={i} className="relative">
          <img src={url} className="w-full h-24 object-cover rounded border" />
          <button
            type="button"
            onClick={() => setCapturedPost(prev => prev.filter((_, idx) => idx !== i))}
            className="absolute top-1 right-1 text-xs bg-white/90 border rounded px-1"
          >
            ✕
          </button>
        </div>
      )
    })}
  </div>
)}
      {postFiles && postFiles.length > 0 && (
        <span className="text-xs text-gray-600">{postFiles.length} file(s) selected</span>
      )}
    </div>
    <div className="text-sm text-gray-600">
  {data.type?.name} • {data.priority} • {data.currentStatus}
  {(data.company || data.companyId) && (
    <> • {data.company ?? ''}{data.company && data.companyId ? ' — ' : ''}{data.companyId ?? ''}</>
  )}
</div>
    <div className="flex justify-end">
      <button
        className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
        disabled={posting || (!postText.trim() && (!postFiles || postFiles.length === 0))}
      >
        {posting ? 'Posting…' : 'Post'}
      </button>
    </div>
  </form>
</div>

<div className="flex items-center justify-between mt-6">
  <h3 className="font-semibold">Activity</h3>
<label className="text-sm flex items-center gap-2">
  Sort:
  <select
    value={activitySort}
    onChange={e => setActivitySort(e.target.value as 'asc' | 'desc' | 'attachments')}
    className="border rounded p-1 text-sm"
  >
    <option value="desc">Newest first</option>
    <option value="asc">Oldest first</option>
    <option value="attachments">With attachments first</option>
  </select>
</label>

</div>

<div className="space-y-2">
  {eventsSorted.map((ev: any) => {
    const payload = (() => { try { return ev.payloadJson ? JSON.parse(ev.payloadJson) : {} } catch { return {} } })()
    const ts = new Date(ev.createdAt).toLocaleString()

    return (
      <div key={ev.id} className="bg-white p-2 rounded border text-sm">
        <div className="text-gray-600">
          {ts} • {ev.actor?.name} • {ev.eventType}
        </div>

        {ev.eventType === 'comment' && payload?.body && (
          <div className="mt-1 whitespace-pre-wrap">{payload.body}</div>
        )}

        {ev.eventType === 'assigned' && (
          <div className="mt-1">
            Assigned to: <span className="font-medium">{payload?.assigneeId || '—'}</span>
          </div>
        )}

        {ev.eventType === 'created' && (
          <div className="mt-1 text-gray-700">
            {payload?.title ? <>Title: <span className="font-medium">{payload.title}</span></> : null}
            {payload?.dueAt ? <> • Due: {new Date(payload.dueAt).toLocaleDateString()}</> : null}
            {payload?.company ? <> • Company: {payload.company}</> : null}
            {payload?.companyId ? <> • ID: {payload.companyId}</> : null}
          </div>
        )}

        {ev.eventType === 'attachment_added' && Array.isArray(payload?.attachments) && payload.attachments.length > 0 && (
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {payload.attachments.map((a: any) => (
              <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className="block group" title={`${a.name} • ${new Date(a.createdAt).toLocaleString()}`}>
                <img src={a.url} className="w-full h-28 object-cover rounded border group-hover:opacity-90" alt={a.name || 'attachment'} loading="lazy" />
                <div className="mt-1 text-[10px] text-gray-500 truncate">{a.name}</div>
              </a>
            ))}
          </div>
        )}

        {ev.eventType === 'post' && (
          <>
            {payload?.text && <div className="mt-1 whitespace-pre-wrap">{payload.text}</div>}
            {Array.isArray(payload?.attachments) && payload.attachments.length > 0 && (
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {payload.attachments.map((a: any) => (
                  <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className="block group" title={`${a.name} • ${new Date(a.createdAt).toLocaleString()}`}>
                    <img src={a.url} className="w-full h-28 object-cover rounded border group-hover:opacity-90" alt={a.name || 'post image'} loading="lazy" />
                    <div className="mt-1 text-[10px] text-gray-500 truncate">{a.name}</div>
                  </a>
                ))}
              </div>
            )}
          </>
        )}

        {!['comment','assigned','created','attachment_added','post'].includes(ev.eventType) && (
          <pre className="text-xs mt-1">{JSON.stringify(payload, null, 2)}</pre>
        )}
      </div>
    )
  })}
</div>

        {/* <form onSubmit={addComment} className="flex gap-2">
          <input
            className="border rounded flex-1 p-2"
            placeholder="Add a comment..."
            value={comment}
            onChange={e=>setComment(e.target.value)}
          />
          <button className="bg-black text-white rounded px-3">Post</button>
        </form> */}
      </div>

      <div className="space-y-3">
        <div className="bg-white rounded border p-3">
          <div className="font-semibold mb-2">Status & Assignment</div>
          <div className="text-sm text-gray-700 mb-2">
            Current assignee: <strong>{data.assignee?.name ?? '—'}</strong>
          </div>

          <label className="block text-sm text-gray-600 mb-1">Assign to</label>
<select
  className="border rounded w-full p-2"
  value={data.assignee?.id ?? ''}
  onChange={e => assignTo(e.target.value)}
  disabled={assigning}
>
  <option value="">— Unassigned —</option>
  {users.map(u => (
    <option key={u.id} value={u.id}>
      {u.name} {u.team?.name ? `• ${u.team.name}` : ''} ({u.role})
    </option>
  ))}
</select>

          {assigning && <div className="text-xs text-gray-500 mt-2">Assigning…</div>}
        </div>
      </div>
    </div>
  )
}