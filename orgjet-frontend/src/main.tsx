import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './styles.css'
import App from './pages/App'
import Login from './pages/Login'
import MyWork from './pages/MyWork'
import Board from './pages/Board'
import NewRequest from './pages/NewRequest'
import RequestDetail from './pages/RequestDetail'
import RouteError from './components/RouteError'
import RequestsList from './pages/RequestsList'
import DriverJobs from './pages/DriverJobs'
import JobSearch from './pages/JobSearch'
import { useAuth } from './state/auth'

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <AdminOnly><MyWork /></AdminOnly> },
      { path: 'board', element: <Board /> },
      { path: 'new', element: <AdminOnly><NewRequest /></AdminOnly> },
      { path: 'driver', element: <DriverJobs />, errorElement: <RouteError /> },
      { path: 'job-search', element: <AdminOnly><JobSearch /></AdminOnly>, errorElement: <RouteError /> },
      { path: 'r/:id', element: <RequestDetail /> },
      { path: 'my-work', element: <MyWork />, errorElement: <RouteError /> },
      { path: 'requests', element: <RequestsList />, errorElement: <RouteError /> },
      { path: 'requests/:id', element: <RequestDetail />, errorElement: <RouteError /> },
      { path: '*', element: <RouteError /> },
    ],
  },
  { path: '/login', element: <Login /> },
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)

function AdminOnly({ children }: { children: JSX.Element }) {
  const { user } = useAuth()

  if (!user) return null

  const allowed = user.role === 'ADMIN' || user.role === 'COORDINATOR'

  if (!allowed) return <RouteError />

  return children
}

// admin@orgjet.local


