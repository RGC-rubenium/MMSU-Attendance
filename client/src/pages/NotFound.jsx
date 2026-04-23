import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './NotFound.css'

export default function NotFound() {
  const auth = useAuth()
  const navigate = useNavigate()

  function handlePrimary() {
    if (auth && auth.isAuthenticated) navigate('/dashboard', { replace: true })
    else navigate('/login', { replace: true })
  }

  // If authenticated, render a wrapper so the card can fill the dashboard main area
  if (auth && auth.isAuthenticated) {
    return (
      <div className="notfound-in-dashboard">
        <div className="notfound-card">
          <h1 className="nf-title">404 — Page Not Found</h1>
          <p className="nf-desc">
            We couldn't find the page you're looking for. The URL may be incorrect or the page may have been moved.
          </p>
        </div>
      </div>
    )
  }

  // Not authenticated — simple centered page
  return (
    <main className="notfound-page">
      <div className="notfound-card notfound-center">
        <h1 className="nf-title">404 — Page Not Found</h1>
        <p className="nf-desc">We couldn't find the page you're looking for. The URL may be incorrect or the page may have been moved.</p>

        <div className="nf-actions">
          <button className="btn btn-primary" onClick={handlePrimary}>
            Go to {auth && auth.isAuthenticated ? 'Dashboard' : 'Login'}
          </button>
        </div>
      </div>
    </main>
  )
}
