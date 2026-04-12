import AuthToken from '../Utils/AuthToken'

export async function getAccountSettings() {
    const response = await AuthToken.fetchWithAuth('/api/account-settings')

    if (!response.ok) {
        const text = await response.text()
        throw new Error(text || response.statusText || 'Failed to load account settings')
    }

    return response.json()
}

export async function updateAccountSettings(payload) {
    const response = await AuthToken.fetchWithAuth('/api/account-settings', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    })

    const data = await response.json().catch(() => null)

    if (!response.ok) {
        throw new Error(data?.message || response.statusText || 'Failed to update account settings')
    }

    return data
}