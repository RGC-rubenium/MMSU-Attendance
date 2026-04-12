
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../contexts/AuthContext'
import { getAccountSettings, updateAccountSettings } from '../../../api/AccountSettings'
import ConfirmModal from '../../../components/common/ConfirmModal'
import './Settings.css'

const initialFormState = {
    username: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
}

function getErrorMessage(error, fallbackMessage) {
    if (!error) return fallbackMessage
    if (typeof error.message === 'string' && error.message.trim()) {
        return error.message
    }
    return fallbackMessage
}

export default function Settings() {
    const auth = useAuth()
    const [account, setAccount] = useState(null)
    const [formData, setFormData] = useState(initialFormState)
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [message, setMessage] = useState({ type: '', text: '' })
    const [logoutModal, setLogoutModal] = useState({ show: false, message: '' })

    const currentUsername = useMemo(() => {
        return account?.username || auth?.user?.sub || ''
    }, [account?.username, auth?.user?.sub])

    useEffect(() => {
        let isMounted = true

        const loadAccount = async () => {
            try {
                const response = await getAccountSettings()
                if (!isMounted) return

                const nextAccount = response?.account || null
                setAccount(nextAccount)
                setFormData((previous) => ({
                    ...previous,
                    username: nextAccount?.username || auth?.user?.sub || '',
                }))
            } catch (error) {
                if (!isMounted) return

                setFormData((previous) => ({
                    ...previous,
                    username: auth?.user?.sub || '',
                }))
                setMessage({
                    type: 'error',
                    text: getErrorMessage(error, 'Unable to load account settings.'),
                })
            } finally {
                if (isMounted) {
                    setIsLoading(false)
                }
            }
        }

        loadAccount()

        return () => {
            isMounted = false
        }
    }, [auth?.user?.sub])

    const handleChange = (event) => {
        const { name, value } = event.target
        setFormData((previous) => ({ ...previous, [name]: value }))
        setMessage({ type: '', text: '' })
    }

    const handleForcedLogout = () => {
        setLogoutModal({ show: false, message: '' })
        auth?.logout?.()
    }

    const handleSubmit = async (event) => {
        event.preventDefault()
        setMessage({ type: '', text: '' })

        const trimmedUsername = formData.username.trim()
        const usernameChanged = trimmedUsername !== currentUsername
        const wantsPasswordChange = formData.newPassword.trim().length > 0

        if (!usernameChanged && !wantsPasswordChange) {
            setMessage({ type: 'error', text: 'Update the username or enter a new password first.' })
            return
        }

        if (!formData.currentPassword) {
            setMessage({ type: 'error', text: 'Enter your current password to save changes.' })
            return
        }

        if (wantsPasswordChange && formData.newPassword !== formData.confirmPassword) {
            setMessage({ type: 'error', text: 'New password and confirmation do not match.' })
            return
        }

        if (wantsPasswordChange && formData.newPassword.length < 8) {
            setMessage({ type: 'error', text: 'New password must be at least 8 characters long.' })
            return
        }

        setIsSaving(true)

        try {
            const response = await updateAccountSettings({
                username: usernameChanged ? trimmedUsername : '',
                current_password: formData.currentPassword,
                new_password: wantsPasswordChange ? formData.newPassword : '',
            })

            const updatedAccount = response?.account || null
            setAccount(updatedAccount)
            setFormData({
                username: updatedAccount?.username || trimmedUsername,
                currentPassword: '',
                newPassword: '',
                confirmPassword: '',
            })
            setLogoutModal({
                show: true,
                message: response?.message || 'Account updated. Please sign in again.',
            })
        } catch (error) {
            setMessage({
                type: 'error',
                text: getErrorMessage(error, 'Failed to update account settings.'),
            })
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="settings-page">
            <div className="settings-card">
                <div className="settings-header">
                    <div>
                        <p className="settings-eyebrow">Account Settings</p>
                        <h1>Admin account</h1>
                        <p className="settings-subtitle">
                            Update the admin username and password used to sign in.
                        </p>
                    </div>
                    <div className="settings-account-meta">
                        <span className="settings-meta-label">Current username</span>
                        <strong>{currentUsername || '—'}</strong>
                    </div>
                </div>

                {message.text ? (
                    <div className={`settings-alert ${message.type === 'success' ? 'success' : 'error'}`}>
                        {message.text}
                    </div>
                ) : null}

                <form className="settings-form" onSubmit={handleSubmit}>
                    <div className="settings-grid">
                        <label className="settings-field">
                            <span>Username</span>
                            <input
                                type="text"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                placeholder="Enter a new username"
                                autoComplete="username"
                                disabled={isLoading || isSaving}
                            />
                        </label>

                        <label className="settings-field">
                            <span>Current password</span>
                            <input
                                type="password"
                                name="currentPassword"
                                value={formData.currentPassword}
                                onChange={handleChange}
                                placeholder="Required to confirm changes"
                                autoComplete="current-password"
                                disabled={isLoading || isSaving}
                            />
                        </label>

                        <label className="settings-field">
                            <span>New password</span>
                            <input
                                type="password"
                                name="newPassword"
                                value={formData.newPassword}
                                onChange={handleChange}
                                placeholder="Leave blank to keep current password"
                                autoComplete="new-password"
                                disabled={isLoading || isSaving}
                            />
                        </label>

                        <label className="settings-field">
                            <span>Confirm new password</span>
                            <input
                                type="password"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                placeholder="Re-enter the new password"
                                autoComplete="new-password"
                                disabled={isLoading || isSaving}
                            />
                        </label>
                    </div>

                    <div className="settings-hint">
                        Use your current password to confirm any username or password update.
                    </div>

                    <div className="settings-actions">
                        <button type="submit" disabled={isLoading || isSaving}>
                            {isSaving ? 'Saving...' : 'Save changes'}
                        </button>
                    </div>
                </form>
            </div>

            <ConfirmModal
                show={logoutModal.show}
                title="Changes saved"
                message={`${logoutModal.message}\n\nYou need to sign in again to continue.`}
                confirmText="Sign in again"
                cancelText="Close"
                confirmClass="btn-primary"
                onConfirm={handleForcedLogout}
                onCancel={handleForcedLogout}
            />
        </div>
    )
}