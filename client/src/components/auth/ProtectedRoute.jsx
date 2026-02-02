import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function ProtectedRoute({ allowedRoles = ['admin'], children }) {
  const navigate = useNavigate()
  const auth = useAuth()

  useEffect(() => {
    if (!auth) return
    
    // Redirect unauthenticated users to login without calling auth.logout()
    if (!auth.isAuthenticated) {
      navigate('/', { replace: true })
      return
    }

    const roles = auth.roles || []
    const hasAllowed = allowedRoles.length === 0 || roles.some(r => allowedRoles.includes(r))
    if (!hasAllowed) {
      if (roles.includes('faculty')) {
        navigate('/dashboard/faculty', { replace: true })
      } else if (roles.includes('student')) {
        navigate('/dashboard/students', { replace: true })
      } else {
        navigate('/', { replace: true })
      }
    }
  }, [auth?.isAuthenticated, auth?.roles, navigate, allowedRoles])

  // Don't render children if not authenticated
  if (!auth || !auth.isAuthenticated) {
    return null
  }

  return React.Children.only(children)
}
