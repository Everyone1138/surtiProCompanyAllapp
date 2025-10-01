import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../lib/api'

export default function RequestDetail() {
  const { id } = useParams()
  const [data, setData] = useState<any | null>(null)
  const [comment, setComment] = useState('')
  const [users, setUsers] = useState<any[]>([])
  const [assigning, setAssigning] = useState(false)

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

        <h3 className="font-semibold">Activity</h3>
        <div className="space-y-2">
          {data.events?.map((ev: any) => (
            <div key={ev.id} className="bg-white p-2 rounded border text-sm">
              <div className="text-gray-600">
                {new Date(ev.createdAt).toLocaleString()} • {ev.actor?.name}
              </div>
              <pre className="text-xs mt-1">
                {JSON.stringify(JSON.parse(ev.payloadJson || '{}'), null, 2)}
              </pre>
            </div>
          ))}
        </div>

        <form onSubmit={addComment} className="flex gap-2">
          <input
            className="border rounded flex-1 p-2"
            placeholder="Add a comment..."
            value={comment}
            onChange={e=>setComment(e.target.value)}
          />
          <button className="bg-black text-white rounded px-3">Post</button>
        </form>
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