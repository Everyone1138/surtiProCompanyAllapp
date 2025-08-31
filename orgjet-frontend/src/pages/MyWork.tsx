import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Link } from 'react-router-dom'

export default function MyWork() {
  const [items, setItems] = useState<any[]>([])

  useEffect(() => {
    api.get('/requests?status=IN_PROGRESS').then(res => setItems(res.data.items))
  }, [])

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">My Work (in progress)</h2>
      <ul className="space-y-2">
        {items.map(r => (
          <li key={r.id} className="bg-white rounded border p-3">
            <Link to={`/r/${r.id}`} className="font-medium underline">{r.title}</Link>
            <div className="text-sm text-gray-600">{r.type?.name} • {r.priority} • {r.assignee?.name ?? 'Unassigned'}</div>
          </li>
        ))}
      </ul>
    </div>
  )
}
