import { useState, useEffect } from 'react'
import './Login.css'
import { login } from '../../../api/login-auth'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'

export default function Login({ onModeChange }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  // per-field errors
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const navigate = useNavigate()
  const auth = useAuth()

  useEffect(() => {
    if (auth && auth.isAuthenticated) {
      // user already logged in — redirect based on role
      if (auth.hasRole && auth.hasRole('admin')) {
        navigate('/dashboard', { replace: true })
      } else if (auth.hasRole && auth.hasRole('faculty')) {
        navigate('/dashboard/faculty', { replace: true })
      } else if (auth.hasRole && auth.hasRole('student')) {
        navigate('/dashboard/students', { replace: true })
      } else {
        navigate('/dashboard', { replace: true })
      }
    }
  }, [auth, navigate])

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

    if (!validateFields()) {
      return
    }

    setLoading(true)
    try {
      const data = await login({ email, password })
      // update AuthContext state from stored token
      if (auth && auth.loginComplete) auth.loginComplete()
      setSuccess(data?.message || 'Login successful')
      // redirect to dashboard after successful login
      // prefer admin dashboard if role present
      const roles = auth?.roles || []
      if (roles.includes('admin')) navigate('/dashboard', { replace: true })
      else if (roles.includes('faculty')) navigate('/dashboard/faculty', { replace: true })
      else if (roles.includes('student')) navigate('/dashboard/students', { replace: true })
      else navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err?.message || 'Login failed')
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

        <p className="login-help">Need an account? Contact the administrator.</p>
      </form>
    </div>
  )
}
