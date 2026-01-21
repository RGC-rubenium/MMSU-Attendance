import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function ProtectedRoute({ allowedRoles = ['admin'], children }) {
  const navigate = useNavigate()
  const auth = useAuth()

  useEffect(() => {
    if (!auth) return
    if (!auth.isAuthenticated) {
      auth.logout()
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
  }, [auth, navigate, allowedRoles])

  return React.Children.only(children)
}
