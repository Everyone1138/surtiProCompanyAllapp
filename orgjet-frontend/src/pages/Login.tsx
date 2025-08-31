import { useState } from 'react'
import { useAuth } from '../state/auth'

export default function Login() {
  const [email, setEmail] = useState('admin@orgjet.local')
  const [password, setPassword] = useState('password123')
  const [err, setErr] = useState<string | null>(null)
  const { login } = useAuth()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    try {
      await login(email, password)
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Login failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={submit} className="bg-white p-8 rounded-xl shadow w-full max-w-sm space-y-3">
        <h1 className="text-2xl font-bold">OrgJet Login</h1>
        <input className="border rounded w-full p-2" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="border rounded w-full p-2" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        {err && <div className="text-red-600 text-sm">{err}</div>}
        <button className="bg-black text-white w-full py-2 rounded">Sign in</button>
      </form>
    </div>
  )
}
