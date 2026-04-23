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
		// Read the body once as text, then try to parse JSON from it.
		const bodyText = await res.text()
		try {
			const data = JSON.parse(bodyText)
			// throw an object similar to axios error shape: { response: { data } }
			throw { response: { data } }
		} catch (e) {
			const message = bodyText || res.statusText || 'Login failed'
			throw new Error(message)
		}
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
		const bodyText = await res.text()
		try {
			const data = JSON.parse(bodyText)
			message = data?.message || message
		} catch {
			message = bodyText || res.statusText || message
		}
		throw new Error(message)
	}

	return res.json()
}
