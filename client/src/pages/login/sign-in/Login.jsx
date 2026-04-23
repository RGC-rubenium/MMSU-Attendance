import { useState, useEffect } from 'react'
import './Login.css'
import { login } from '../../../api/login-auth'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'

export default function Login({ onModeChange }) {
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(location.state?.registrationSuccess || '')
  const [loading, setLoading] = useState(false)

  // per-field errors
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const navigate = useNavigate()
  const auth = useAuth()

  useEffect(() => {
    if (auth && auth.isAuthenticated) {
      navigate('/dashboard', { replace: true })
      // Only redirect to admin dashboard automatically when the user has 'admin' or 'administrator' role
      // if (auth.hasRole || (auth.hasRole('admin') || auth.hasRole('administrator'))) {
      //   navigate('/dashboard', { replace: true })
      // }
      // otherwise stay on login (user may not have access to admin area)
    }
  }, [auth, navigate])

  useEffect(() => {
    if (location.state?.registrationSuccess) {
      setSuccess(location.state.registrationSuccess)
    }
  }, [location.state])

  function validateFields() {
    let valid = true

    if (!email) {
      setEmailError('* Username or email is required.')
      valid = false
    } else if (email.includes('@') && !/\S+@\S+\.\S+/.test(email)) {
      setEmailError('* Enter a valid email.')
      valid = false
    } else {
      setEmailError('')
    }

    if (!password) {
      setPasswordError('* Password is required.')
      valid = false
    } else if (password.length < 6) {
      setPasswordError('* Password must be at least 6 characters.')
      valid = false
    } else {
      setPasswordError('')
    }

    return valid
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    // clear any previous field errors
    setEmailError('')
    setPasswordError('')

    if (!validateFields()) {
      return
    }

    setLoading(true)
    try {
      const data = await login({ email, password })
      // update AuthContext state from stored token
      if (auth && auth.loginComplete) auth.loginComplete()
      setSuccess(data?.message || 'Login successful')
      // redirect based on roles returned by the login response (avoid race with auth state update)
      const respRoles = (data && data.roles) || []
      const normalized = Array.isArray(respRoles)
        ? respRoles.map(r => (r || '').toString().trim().toLowerCase())
        : String(respRoles).split(',').map(r => r.trim().toLowerCase()).filter(Boolean)

      if (normalized.includes('admin')) {
        navigate('/dashboard', { replace: true })
      } else {
        // user has no admin access — stay on landing/login or show message
        navigate('/', { replace: true })
      }
    } catch (err) {
      // Prefer backend validation/auth messages; if there's no backend response treat as network error
      let backendMsg = null
      let backendErrors = null
      let isNetworkError = false

      if (err && typeof err === 'object') {
        // Axios-style errors expose `response` with `data`
        if (err.response) {
          const data = err.response.data || {}
          backendMsg = data.message || data.error || null
          backendErrors = data.errors || null
        } else {
          // Generic Error object (fetch, axios without response, etc.)
          backendMsg = err.error || err.message || null
        }
      } else if (typeof err === 'string') {
        backendMsg = err
      }

      // Detect common network error messages
      const errMsg = (err && (err.message || err.error)) || (typeof err === 'string' ? err : '')
      if (errMsg && (errMsg.toLowerCase().includes('network') || errMsg.toLowerCase().includes('failed to fetch') || errMsg.toLowerCase().includes('networkerror'))) {
        isNetworkError = true
      }

      // If backend returned a stringified JSON (e.g. '{"message":"Invalid credentials"}'),
      // try to parse it so we can show the inner message and field errors.
      if (!backendErrors && typeof backendMsg === 'string' && backendMsg.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(backendMsg)
          if (parsed) {
            backendErrors = (parsed.errors !== undefined) ? parsed.errors : backendErrors
            backendMsg = parsed.message || parsed.error || backendMsg
          }
        } catch (parseErr) {
          // ignore parse error and fall back to raw message
        }
      }

      if (isNetworkError) {
        setError('Network error: Cannot reach authentication server. Please check your connection.')
      } else if (backendErrors) {
        // Show per-field validation errors from backend when available
        setEmailError(backendErrors.email || '')
        setPasswordError(backendErrors.password || '')
        setError(backendMsg || 'Invalid username or password.')
      } else if (backendMsg) {
        setError(backendMsg)
      } else {
        setError('An unexpected error occurred during login. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }
  // Accept either a username (non-empty) or a valid email address
  const emailValid = email && (email.includes('@') ? /\S+@\S+\.\S+/.test(email) : email.trim().length > 0)
  const passwordValid = password.length >= 6

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>

        <h2 className="login-title">Sign in</h2>

        {error && (
          <div className="login-error" role="alert" aria-live="assertive">
            {error}
          </div>
        )}
        {success && (
          <div className="login-success" role="status" aria-live="polite">
            {success}
          </div>
        )}

        <label className="login-label">
          Username or Email
          <input
            type="text"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (emailError) setEmailError('')
            }}
            className="login-input"
            placeholder="name@example.com or username"
            autoComplete="username"
            aria-invalid={!!emailError}
          />
          <div className="input-error">{emailError}</div>
        </label>

        <label className="login-label">
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              if (passwordError) setPasswordError('')
            }}
            className="login-input"
            placeholder="••••••••"
            autoComplete="current-password"
            aria-invalid={!!passwordError}
          />
          <div className="input-error">{passwordError}</div>
        </label>

        <button
          className="login-button"
          type="submit"
          disabled={loading || !emailValid || !passwordValid}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="login-help">
          Don&apos;t have an account? Contact your administrator to create one.
        </p>
      </form>
    </div>
  )
}
