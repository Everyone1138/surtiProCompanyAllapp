import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Link } from 'react-router-dom'

type ReqItem = {
  id: string
  title: string
  priority: string
  currentStatus: string
  type?: { name: string }
  assignee?: { id: string; name: string }
}

function fmtDate(iso?: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString()
}

function isOverdue(iso?: string) {
  if (!iso) return false
  return new Date(iso).getTime() < Date.now()
}

const HIDE_STATUSES = new Set(['DONE','CANCELLED'])

export default function MyWork() {
  const [items, setItems] = useState<ReqItem[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const res = await api.get('/requests', { params: { mine: '1' } })
    const all = (res.data.items || []) as ReqItem[]
    // hide completed/cancelled by default
    setItems(all.filter(r => !HIDE_STATUSES.has(r.currentStatus)))
    setLoading(false)
  }

  useEffect(() => {
    load()
    const onFocus = () => load()
    document.addEventListener('visibilitychange', onFocus)
    window.addEventListener('focus', onFocus)
    return () => {
      document.removeEventListener('visibilitychange', onFocus)
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  if (loading) return <div>Loading…</div>

  return (
    
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">My Work</h2>
        <button onClick={load} className="text-sm underline">Refresh</button>
      </div>

      {items.length === 0 ? (
        <div className="text-gray-600">Nothing assigned yet. 🎉</div>
      ) : (
        <ul className="space-y-2">
          {items.map(r => (
            <li key={r.id} className="bg-white rounded border p-3">
              <div className="flex items-center justify-between">
                <Link to={`/r/${r.id}`} className="font-medium underline">{r.title}</Link>
                <span className="text-xs px-2 py-1 rounded bg-gray-100 border">{r.currentStatus}</span>
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {r.type?.name} • {r.priority} • {r.assignee?.name ?? 'Unassigned'}
                
              </div>
              <div className="text-sm mt-1">
  <span className="text-gray-600">Due: </span>
  <span className={isOverdue(r.dueAt) ? 'text-red-600 font-medium' : 'text-gray-800'}>
    {fmtDate(r.dueAt)}
  </span>
</div>
            </li>
          ))}
        </ul>
      )}
    </div>
    
  )
}
