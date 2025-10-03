import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Link } from 'react-router-dom'

const LANES = ['NEW','TRIAGE','ASSIGNED','IN_PROGRESS','BLOCKED','REVIEW','DONE','CANCELLED'] as const

export default function Board() {
  const [data, setData] = useState<Record<string, any[]>>({})

  useEffect(() => {
    api.get('/board').then(res => setData(res.data))
  }, [])

  return (
    <div className="overflow-x-auto">
      <div className="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-7 gap-4 min-w-[1000px]">
        {LANES.map(lane => (
          <div key={lane} className="bg-gray-100 rounded p-2">
            <div className="font-semibold text-sm mb-2">{lane}</div>
            <div className="space-y-2">
              {(data[lane] || []).map(card => (
                <Link to={`/r/${card.id}`} key={card.id} className="block bg-white rounded p-2 border">
                  <div className="text-sm font-medium">{card.title}</div>
                  <div className="text-xs text-gray-600">{card.type?.name} • {card.priority} • {card.assignee?.name ?? '—'}</div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
