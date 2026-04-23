import React, { useEffect, useState } from 'react'
import AuthToken from '../../Utils/AuthToken'
import { useAuth } from '../../contexts/AuthContext'
import UserFormModal from '../../components/common/UserFormModal'
import './UserManagement.css'

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
    <main className="dashboard-main user-mgmt-main">
      <header className="user-mgmt-header">
        <div>
          <h1 id="user-management-title">User Management</h1>
          <p className="dashboard-sub">Create and manage admin accounts</p>
        </div>
        <div className="user-mgmt-actions">
          <button className="btn btn-primary" onClick={openCreate}>Add User</button>
        </div>
      </header>

      {loading && <div>Loading...</div>}
      {error && <div style={{color: 'var(--danger-color, #ef4444)'}}>{error}</div>}

      <UserFormModal
        show={showForm}
        editingUser={editingUser}
        username={formUsername}
        password={formPassword}
        setUsername={setFormUsername}
        setPassword={setFormPassword}
        onConfirm={submitForm}
        onCancel={() => setShowForm(false)}
        loading={loading}
      />

      <div className="user-mgmt-content">
        <div className="user-mgmt-table-wrap user-mgmt-table">
          <table className="recent-table enhanced" style={{width: '100%'}}>
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
            <tr key={u.id} className="" style={{borderTop: '1px solid rgba(255,255,255,0.06)'}}>
              <td style={{padding: 12}}>{u.username}</td>
              <td style={{padding: 12}}>{(u.roles || []).join(', ')}</td>
              <td style={{padding: 12}}>{u.created_at || ''}</td>
              <td style={{padding: 12}}>
                <button className="btn btn-secondary" onClick={() => openEdit(u)} style={{marginRight: 8}}>Edit</button>
                <button className="btn btn-danger" onClick={() => handleDelete(u.id, u.roles)} disabled={(u.roles || []).includes('superadmin')}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
        </table>
      </div>
    </div>
    </main>
  )
}
