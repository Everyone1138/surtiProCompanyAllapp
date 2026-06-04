import { Outlet, Link, useLocation, Navigate } from 'react-router-dom'
import { useAuth } from '../state/auth'
import { useEffect } from 'react'

export default function App() {
  const { user, fetchMe, logout } = useAuth()
  const loc = useLocation()

  useEffect(() => { fetchMe() }, [])

  if (!user) return null

  const isAdmin = user.role === 'ADMIN'
  const isCoordinator = user.role === 'COORDINATOR'
  const isEmployee = !isAdmin && !isCoordinator

  const tab = (to: string, label: string) => (
    <Link
      to={to}
      className={`px-3 py-2 rounded ${
        loc.pathname === to ? 'bg-black text-white' : 'bg-white text-black border'
      }`}
    >
      {label}
    </Link>
  )

  // Employees should not land on the admin-style home page.
  // Send them to their assigned jobs.
  if (isEmployee && loc.pathname === '/') {
    return <Navigate to="/driver" replace />
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link to={isEmployee ? '/driver' : '/'} className="font-bold">
            OrgJet
          </Link>

          <nav className="flex gap-2 flex-wrap">
            {isAdmin || isCoordinator ? (
              <>
                {tab('/', 'My Work')}
                {tab('/board', 'Dispatch Board')}
                {tab('/new', 'Submit Request')}
                {tab('/driver', 'Driver Jobs')}
                {tab('/job-search', 'Job Search')}
              </>
            ) : (
              <>
                {tab('/board', 'Dispatch Board')}
                {tab('/driver', 'My Assigned Jobs')}
              </>
            )}
          </nav>

          <div className="ml-auto text-sm flex items-center gap-3">
            <span className="text-gray-600">
              {user.name} • {user.role}{user.team ? ` • ${user.team.name}` : ''}
            </span>
            <button onClick={logout} className="text-red-600 underline">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}