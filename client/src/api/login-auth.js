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
