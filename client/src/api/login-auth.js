// Simple login helper that calls the backend API.
// Sends `{ username, password }` (username is the email field in the UI),
// stores returned JWT in localStorage via `AuthToken`, and returns parsed JSON.
import * as AuthToken from '../Utils/AuthToken'

export async function login({ email, password }) {
	if (!email || !password) {
		throw new Error('Email and password are required')
	}

	const url = '/api/login'

	const res = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		// backend expects `username` key; UI uses `email` field
		body: JSON.stringify({ username: email, password }),
	})

	if (!res.ok) {
		const text = await res.text()
		throw new Error(text || res.statusText || 'Login failed')
	}

	const data = await res.json()
	// store token for future requests if present
	if (data && data.token) {
		AuthToken.setToken(data.token)
	}

	return data
}

export async function register({ username, password }) {
	if (!username || !password) {
		throw new Error('Username and password are required')
	}

	const url = '/api/register'

	const res = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ username, password }),
	})

	if (!res.ok) {
		let message = 'Registration failed'
		try {
			const data = await res.json()
			message = data?.message || message
		} catch {
			const text = await res.text()
			message = text || res.statusText || message
		}
		throw new Error(message)
	}

	return res.json()
}
