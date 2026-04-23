import React, { useEffect, useState } from 'react'
import AuthToken from '../../Utils/AuthToken'
import { useAuth } from '../../contexts/AuthContext'

export default function UserManagement() {
  const auth = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

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

  return (
    <div style={{padding: 20}}>
      <h2>User Management</h2>
      {loading && <div>Loading...</div>}
      {error && <div style={{color: 'red'}}>{error}</div>}
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
                <button onClick={() => alert('Edit flow not implemented yet')} style={{marginRight: 8}}>Edit</button>
                <button onClick={() => handleDelete(u.id, u.roles)} disabled={(u.roles || []).includes('superadmin')}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
