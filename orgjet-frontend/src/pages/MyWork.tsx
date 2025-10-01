import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import { Link } from 'react-router-dom'

type ReqItem = {
  id: string
  title: string
  priority: 'LOW'|'MEDIUM'|'HIGH'|'URGENT'|string
  currentStatus: string
  dueAt?: string
  updatedAt?: string
  type?: { name: string }
  assignee?: { id: string; name: string }
}

const DONE_SET = new Set(['DONE', 'CANCELLED'])
const PRIORITY_WEIGHT: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }

function fmtDate(iso?: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString()
}
function isOverdue(iso?: string) {
  if (!iso) return false
  return new Date(iso).getTime() < Date.now()
}
function isDueToday(iso?: string) {
  if (!iso) return false
  const d = new Date(iso)
  const now = new Date()
  return d.getFullYear()===now.getFullYear()
    && d.getMonth()===now.getMonth()
    && d.getDate()===now.getDate()
}

type SortBy = 'due' | 'priority' | 'updated'
function compareDue(a: ReqItem, b: ReqItem) {
  const ad = a.dueAt ? new Date(a.dueAt).getTime() : Number.POSITIVE_INFINITY
  const bd = b.dueAt ? new Date(b.dueAt).getTime() : Number.POSITIVE_INFINITY
  if (ad !== bd) return ad - bd
  const aw = PRIORITY_WEIGHT[a.priority] ?? 9
  const bw = PRIORITY_WEIGHT[b.priority] ?? 9
  return aw - bw
}
function comparePriority(a: ReqItem, b: ReqItem) {
  const aw = PRIORITY_WEIGHT[a.priority] ?? 9
  const bw = PRIORITY_WEIGHT[b.priority] ?? 9
  if (aw !== bw) return aw - bw
  const ad = a.dueAt ? new Date(a.dueAt).getTime() : Number.POSITIVE_INFINITY
  const bd = b.dueAt ? new Date(b.dueAt).getTime() : Number.POSITIVE_INFINITY
  return ad - bd
}
function compareUpdated(a: ReqItem, b: ReqItem) {
  const au = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
  const bu = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
  return bu - au // most recently updated first
}

export default function MyWork() {
  const [raw, setRaw] = useState<ReqItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showCompleted, setShowCompleted] = useState(false)
  const [sortBy, setSortBy] = useState<SortBy>('due')
  const [busyId, setBusyId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const res = await api.get('/requests', { params: { mine: '1' } })
    setRaw((res.data.items || []) as ReqItem[])
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

  const items = useMemo(() => {
    let list = raw
    if (!showCompleted) list = list.filter(r => !DONE_SET.has(r.currentStatus))
    const copy = [...list]
    if (sortBy === 'due') copy.sort(compareDue)
    else if (sortBy === 'priority') copy.sort(comparePriority)
    else copy.sort(compareUpdated)
    return copy
  }, [raw, showCompleted, sortBy])

  async function startWork(id: string) {
    try {
      setBusyId(id)
      await api.patch(`/requests/${id}`, { status: 'IN_PROGRESS' })
      await load()
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return <div>Loading…</div>

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 justify-between mb-4">
        <h2 className="text-xl font-semibold">My Work</h2>
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 text-sm">
            <span>Sort by</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortBy)}
              className="border rounded p-1 text-sm"
            >
              <option value="due">Due date</option>
              <option value="priority">Priority</option>
              <option value="updated">Recently updated</option>
            </select>
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="accent-black"
              checked={showCompleted}
              onChange={e => setShowCompleted(e.target.checked)}
            />
            Show completed
          </label>
          <button onClick={load} className="text-sm underline">Refresh</button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-gray-600">Nothing to show.</div>
      ) : (
        <ul className="space-y-2">
          {items.map(r => {
            const dueToday = isDueToday(r.dueAt)
            const overdue = isOverdue(r.dueAt)
            return (
              <li
                key={r.id}
                className={`bg-white rounded border p-3 ${dueToday ? 'ring-2 ring-yellow-400' : ''}`}
                title={dueToday ? 'Due today' : undefined}
              >
                <div className="flex items-center justify-between">
                  <Link to={`/r/${r.id}`} className="font-medium underline">
                    {r.title}
                  </Link>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 rounded bg-gray-100 border">{r.currentStatus}</span>
                    {r.currentStatus === 'ASSIGNED' && (
                      <button
                        onClick={() => startWork(r.id)}
                        disabled={busyId === r.id}
                        className="text-xs px-2 py-1 rounded bg-black text-white disabled:opacity-50"
                      >
                        {busyId === r.id ? 'Starting…' : 'Start work'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="text-sm text-gray-600 mt-1">
                  {r.type?.name} • {r.priority} • {r.assignee?.name ?? 'Unassigned'}
                </div>

                <div className="text-sm mt-1">
                  <span className="text-gray-600">Due: </span>
                  <span className={
                    overdue ? 'text-red-600 font-medium'
                      : dueToday ? 'text-yellow-700 font-medium'
                      : 'text-gray-800'
                  }>
                    {fmtDate(r.dueAt)}
                  </span>
                  {r.dueAt && !overdue && !dueToday && (
                    <span className="text-xs text-gray-500 ml-2">
                      {(() => {
                        const ms = new Date(r.dueAt!).getTime() - Date.now()
                        const hrs = Math.max(0, Math.floor(ms / 36e5))
                        return hrs <= 48 ? `due in ${hrs}h` : ''
                      })()}
                    </span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}