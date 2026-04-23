import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function ProtectedRoute({ allowedRoles = ['admin'], children }) {
  const auth = useAuth()
  const location = useLocation()

  // Wait for auth provider to initialize
  if (!auth) return null
  if (auth.loading) return null

  // debug info (visible in browser console)
  try {
    // eslint-disable-next-line no-console
    console.debug('[ProtectedRoute] auth:', { loading: auth.loading, isAuthenticated: auth.isAuthenticated, roles: auth.roles })
    // eslint-disable-next-line no-console
    console.debug('[ProtectedRoute] location.pathname:', location && location.pathname)
  } catch (e) {
    // ignore
  }



  // If allowedRoles is specified (non-empty), require that the user has at least one of them
  if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    let roles = auth.roles || []

    // normalize roles into lowercase string array
    if (typeof roles === 'string') {
      roles = roles.split(',').map(r => r.trim().toLowerCase()).filter(Boolean)
    } else if (Array.isArray(roles)) {
      roles = roles.map(r => (r || '').toString().trim().toLowerCase()).filter(Boolean)
    } else {
      roles = []
    }

    const allowed = allowedRoles.map(r => (r || '').toString().trim().toLowerCase())
    const hasAllowed = roles.some(r => allowed.includes(r))
    if (!hasAllowed) {
      // eslint-disable-next-line no-console
      console.debug('[ProtectedRoute] user does not have allowed role', { roles, allowed })
      // avoid redirect loop if already on '/'
      if (location && location.pathname === '/') return null
      return <Navigate to="/" replace />
    }
  }
  
    // Not authenticated -> redirect to login
  if (!auth.isAuthenticated) {
    // avoid redirect loop if we're already at '/'
    // eslint-disable-next-line no-console
    console.debug('[ProtectedRoute] redirecting to / because not authenticated', { pathname: location && location.pathname })
    if (location && location.pathname === '/') return null
    return <Navigate to="/" replace state={{ from: location }} />
  }
  return React.Children.only(children)
}
