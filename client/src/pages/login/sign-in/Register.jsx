import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register } from '../../../api/login-auth'
import { useAuth } from '../../../contexts/AuthContext'
import './Login.css'

export default function Register() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const [usernameError, setUsernameError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [confirmPasswordError, setConfirmPasswordError] = useState('')
  const navigate = useNavigate()
    const auth = useAuth()

    useEffect(() => {
        if (auth && auth.isAuthenticated) {
            navigate('/dashboard', { replace: true })
        }
    }, [auth, navigate])

  function validateFields() {
    let valid = true

    if (!username.trim()) {
      setUsernameError('* Username is required.')
      valid = false
    } else {
      setUsernameError('')
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

    if (!confirmPassword) {
      setConfirmPasswordError('* Confirm your password.')
      valid = false
    } else if (confirmPassword !== password) {
      setConfirmPasswordError('* Passwords do not match.')
      valid = false
    } else {
      setConfirmPasswordError('')
    }

    return valid
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!validateFields()) {
      return
    }

    setLoading(true)
    try {
      const data = await register({ username: username.trim(), password })
      setSuccess(data?.message || 'Account created successfully')
      setTimeout(() => {
        navigate('/login', {
          replace: true,
          state: { registrationSuccess: data?.message || 'Account created successfully. Please sign in.' },
        })
      }, 1200)
    } catch (err) {
      setError(err?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const usernameValid = username.trim().length > 0
  const passwordValid = password.length >= 6
  const confirmPasswordValid = confirmPassword.length > 0 && confirmPassword === password

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <h2 className="login-title">Create account</h2>
        <p className="login-subtitle">Register a new account to access the attendance system.</p>

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
          Username
          <input
            type="text"
            value={username}
            onChange={(event) => {
              setUsername(event.target.value)
              if (usernameError) setUsernameError('')
            }}
            className="login-input"
            placeholder="Choose a username"
            autoComplete="username"
            aria-invalid={!!usernameError}
          />
          <div className="input-error">{usernameError}</div>
        </label>

        <label className="login-label">
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value)
              if (passwordError) setPasswordError('')
            }}
            className="login-input"
            placeholder="Create a password"
            autoComplete="new-password"
            aria-invalid={!!passwordError}
          />
          <div className="input-error">{passwordError}</div>
        </label>

        <label className="login-label">
          Confirm password
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value)
              if (confirmPasswordError) setConfirmPasswordError('')
            }}
            className="login-input"
            placeholder="Re-enter your password"
            autoComplete="new-password"
            aria-invalid={!!confirmPasswordError}
          />
          <div className="input-error">{confirmPasswordError}</div>
        </label>

        <button
          className="login-button"
          type="submit"
          disabled={loading || !usernameValid || !passwordValid || !confirmPasswordValid}
        >
          {loading ? 'Creating account…' : 'Register'}
        </button>

        <p className="login-help">
          Already have an account?{' '}
          <Link to="/login" className="login-link">Go to sign in</Link>
        </p>
      </form>
    </div>
  )
}