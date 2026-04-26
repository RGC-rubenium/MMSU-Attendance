import { useState } from 'react'  
import React from 'react'
import './ConfirmModal.css'

export default function UserFormModal({ show, editingUser, username, password, setUsername, setPassword, onConfirm, onCancel, loading }) {
  if (!show) return null

  const title = editingUser ? 'Edit User' : 'Create User'
  const [showPassword, setShowPassword] = useState(false)
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onCancel()
  }

  return (
    <div className="confirm-modal-overlay" onClick={handleOverlayClick}>
      <div className="confirm-modal" onClick={e => e.stopPropagation()} style={{maxWidth: 520}}>
        <div className="confirm-modal-header">
          <h2>{title}</h2>
          <button className="confirm-modal-close" onClick={onCancel}>&times;</button>
        </div>
        <div className="confirm-modal-body" style={{textAlign: 'left'}}>
          <div style={{marginBottom: 12}}>
            <label style={{color: '#cbd5e1'}}>Username</label>
            <input value={username} onChange={e => setUsername(e.target.value)} style={{width: '100%', padding: '10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: '#e2e8f0'}} />
          </div>
          <div style={{marginBottom: 12}}>
            <label style={{color: '#cbd5e1'}}>Password</label>
            <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} style={{width: '100%', padding: '10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: '#e2e8f0'}} placeholder={editingUser ? 'Leave blank to keep current password' : ''} />
          </div>
          <div>
            <input type="checkbox" checked={showPassword} onChange={e => setShowPassword(e.target.checked)} />
            <label style={{color: '#cbd5e1'}}> Show Password</label>
          </div>
        </div>
        <div className="confirm-modal-footer">
          <button className="btn btn-secondary" onClick={onCancel} disabled={loading}>Cancel</button>
          <button className="btn btn-primary" onClick={onConfirm} disabled={loading || !username || (!editingUser && !password)}>{loading ? 'Saving…' : (editingUser ? 'Save' : 'Create')}</button>
        </div>
      </div>
    </div>
  )
}
