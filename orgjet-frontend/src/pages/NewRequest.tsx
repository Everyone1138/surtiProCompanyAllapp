import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useNavigate } from 'react-router-dom'

export default function NewRequest() {
  const [types, setTypes] = useState<any[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [typeId, setTypeId] = useState('')
  const [priority, setPriority] = useState('MEDIUM')
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/requests').then(res => {
      // infer types from returned items; in real app we'd fetch /catalog/types
      const tset = new Map<string, any>()
      res.data.items.forEach((r:any)=> tset.set(r.type.id, r.type))
      setTypes(Array.from(tset.values()))
      if (!typeId && Array.from(tset.values())[0]) setTypeId(Array.from(tset.values())[0].id)
    })
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const { data } = await api.post('/requests', { title, description, typeId, priority })
    navigate(`/r/${data.id}`)
  }

  return (
    <form onSubmit={submit} className="space-y-3 max-w-xl">
      <h2 className="text-xl font-semibold">Submit a Request</h2>
      <input className="border rounded w-full p-2" placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)} />
      <textarea className="border rounded w-full p-2" placeholder="Description" rows={5} value={description} onChange={e=>setDescription(e.target.value)} />
      <div className="flex gap-2">
        <select className="border rounded p-2" value={typeId} onChange={e=>setTypeId(e.target.value)}>
          {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select className="border rounded p-2" value={priority} onChange={e=>setPriority(e.target.value)}>
          {['LOW','MEDIUM','HIGH','URGENT'].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <button className="bg-black text-white rounded px-4 py-2">Create</button>
    </form>
  )
}
