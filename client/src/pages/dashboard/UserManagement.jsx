import React, { useEffect, useState } from 'react'
import AuthToken from '../../Utils/AuthToken'
import { useAuth } from '../../contexts/AuthContext'

export default function UserManagement() {
  const auth = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [formUsername, setFormUsername] = useState('')
  const [formPassword, setFormPassword] = useState('')

  useEffect(() => {
    fetchUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchUsers() {
    setLoading(true)
    setError(null)
    try {
      const res = await AuthToken.fetchWithAuth('/api/users')
      if (!res.ok) throw new Error(`Status ${res.status}`)
      const data = await res.json()
      setUsers(data.users || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id, roles) {
    if (roles && roles.includes('superadmin')) {
      alert('Cannot delete a superadmin account')
      return
    }
    if (!window.confirm('Delete this user?')) return
    try {
      const res = await AuthToken.fetchWithAuth(`/api/users/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message || `Status ${res.status}`)
      }
      await fetchUsers()
    } catch (e) {
      alert('Delete failed: ' + e.message)
    }
  }

  function openCreate() {
    setEditingUser(null)
    setFormUsername('')
    setFormPassword('')
    setShowForm(true)
  }

  function openEdit(u) {
    setEditingUser(u)
    setFormUsername(u.username || '')
    setFormPassword('')
    setShowForm(true)
  }

  async function submitForm(e) {
    e && e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      if (editingUser) {
        // update
        const body = { username: formUsername }
        if (formPassword) body.password = formPassword
        const res = await AuthToken.fetchWithAuth(`/api/users/${editingUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })
        if (!res.ok) throw new Error('Update failed')
      } else {
        // create (only admin role allowed)
        const body = { username: formUsername, password: formPassword, roles: ['admin'] }
        const res = await AuthToken.fetchWithAuth('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })
        if (!res.ok) {
          const bodyText = await res.text().catch(() => '')
          throw new Error(bodyText || 'Create failed')
        }
      }
      await fetchUsers()
      setShowForm(false)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{padding: 20}}>
      <h2>User Management</h2>
      <div style={{marginBottom: 12}}>
        <button onClick={openCreate}>Add User</button>
      </div>
      {loading && <div>Loading...</div>}
      {error && <div style={{color: 'red'}}>{error}</div>}
      {showForm && (
        <form onSubmit={submitForm} style={{marginBottom: 12, border: '1px solid #ddd', padding: 12}}>
          <div style={{marginBottom: 8}}>
            <label>Username: <input value={formUsername} onChange={e => setFormUsername(e.target.value)} /></label>
          </div>
          <div style={{marginBottom: 8}}>
            <label>Password: <input type="password" value={formPassword} onChange={e => setFormPassword(e.target.value)} placeholder={editingUser ? 'Leave blank to keep current password' : ''} /></label>
          </div>
          <div>
            <button type="submit" disabled={loading || !formUsername || (!editingUser && !formPassword)}>{editingUser ? 'Save' : 'Create'}</button>
            <button type="button" onClick={() => setShowForm(false)} style={{marginLeft: 8}}>Cancel</button>
          </div>
        </form>
      )}
      <table style={{width: '100%', borderCollapse: 'collapse'}}>
        <thead>
          <tr>
            <th style={{textAlign: 'left', padding: 8}}>Username</th>
            <th style={{textAlign: 'left', padding: 8}}>Roles</th>
            <th style={{textAlign: 'left', padding: 8}}>Created</th>
            <th style={{textAlign: 'left', padding: 8}}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id} style={{borderTop: '1px solid #eee'}}>
              <td style={{padding: 8}}>{u.username}</td>
              <td style={{padding: 8}}>{(u.roles || []).join(', ')}</td>
              <td style={{padding: 8}}>{u.created_at || ''}</td>
              <td style={{padding: 8}}>
                <button onClick={() => openEdit(u)} style={{marginRight: 8}}>Edit</button>
                <button onClick={() => handleDelete(u.id, u.roles)} disabled={(u.roles || []).includes('superadmin')}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
