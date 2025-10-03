import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../state/auth'
import { useEffect } from 'react'

export default function App() {
  const { user, fetchMe, logout } = useAuth()
  const loc = useLocation()

  useEffect(() => { fetchMe() }, [])

  if (!user) return null

  const tab = (to: string, label: string) => (
    <Link to={to} className={`px-3 py-2 rounded ${loc.pathname===to ? 'bg-black text-white' : 'bg-white text-black border'}`}>
      {label}
    </Link>
  )

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link to="/" className="font-bold">OrgJet</Link>
          <nav className="flex gap-2">
            {tab('/', 'My Work')}
            {tab('/board', 'Dispatch Board')}
            {tab('/new', 'Submit Request')}
          </nav>
          <div className="ml-auto text-sm flex items-center gap-3">
            <span className="text-gray-600">{user.name} • {user.role}{user.team ? ` • ${user.team.name}` : ''}</span>
            <button onClick={logout} className="text-red-600 underline">Logout</button>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
