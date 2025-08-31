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

const router = createBrowserRouter([
  { path: '/', element: <App />, children: [
    { index: true, element: <MyWork /> },
    { path: 'board', element: <Board /> },
    { path: 'new', element: <NewRequest /> },
    { path: 'r/:id', element: <RequestDetail /> },
  ]},
  { path: '/login', element: <Login /> },
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)
