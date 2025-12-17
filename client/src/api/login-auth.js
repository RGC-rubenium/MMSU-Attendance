// Simple login helper that calls the backend API.
// Returns parsed JSON on success or throws an Error on failure.
export async function login({ email, password }) {
	if (!email || !password) {
		throw new Error('Email and password are required')
	}

	const res = await fetch('/api/login', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ email, password }),
	})

	if (!res.ok) {
		const text = await res.text()
		throw new Error(text || res.statusText || 'Login failed')
	}

	return res.json()
}
