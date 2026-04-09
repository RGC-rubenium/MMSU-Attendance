import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import AuthToken from '../Utils/AuthToken'
import { useNavigate } from 'react-router-dom'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const navigate = useNavigate()
  const [token, setToken] = useState(() => AuthToken.getToken())
  const [user, setUser] = useState(() => AuthToken.getTokenPayload() || null)
  const [roles, setRoles] = useState(() => AuthToken.getRoles() || [])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // keep user/roles in sync with token changes (e.g., on page load)
    const t = AuthToken.getToken()
    setToken(t)
    setUser(AuthToken.getTokenPayload() || null)
    setRoles(AuthToken.getRoles() || [])
  }, [])

  const loginComplete = useCallback(() => {
    const t = AuthToken.getToken()
    setToken(t)
    setUser(AuthToken.getTokenPayload() || null)
    setRoles(AuthToken.getRoles() || [])
  }, [])

  const logout = useCallback(() => {
    AuthToken.clearToken()
    setToken(null)
    setUser(null)
    setRoles([])
    navigate('/', { replace: true })
  }, [navigate])

  const value = {
    token,
    user,
    roles,
    loading,
    loginComplete,
    logout,
    isAuthenticated: !!token,
    hasRole: (r) => (roles || []).includes(r),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}

export default AuthContext
