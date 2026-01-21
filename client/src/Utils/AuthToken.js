const TOKEN_KEY = 'mmsu_jwt_token'

export function setToken(token) {
	try {
		localStorage.setItem(TOKEN_KEY, token)
	} catch (e) {
		// ignore storage errors (e.g., in private mode)
	}
}

export function getToken() {
	try {
		return localStorage.getItem(TOKEN_KEY)
	} catch (e) {
		return null
	}
}

export function clearToken() {
	try {
		localStorage.removeItem(TOKEN_KEY)
	} catch (e) {
		// ignore
	}
}

export async function fetchWithAuth(url, options = {}) {
	const token = getToken()
	const headers = Object.assign({}, options.headers || {})
	if (token) headers['Authorization'] = `Bearer ${token}`
	return fetch(url, Object.assign({}, options, { headers }))
}

const AuthToken = {
	setToken,
	getToken,
	clearToken,
	fetchWithAuth,
	decodeToken,
	getTokenPayload,
	getRoles,
	getExpiry,
	isTokenExpired,
}

export default AuthToken

// --- JWT helpers ---
function base64UrlDecode(str) {
	// base64url -> base64
	let s = str.replace(/-/g, '+').replace(/_/g, '/')
	// pad with '=' to multiple of 4
	while (s.length % 4) s += '='
	try {
		const decoded = atob(s)
		return decoded
	} catch (e) {
		return null
	}
}

export function decodeToken(token) {
	if (!token) return null
	const parts = token.split('.')
	if (parts.length < 2) return null
	const payload = parts[1]
	const json = base64UrlDecode(payload)
	if (!json) return null
	try {
		return JSON.parse(json)
	} catch (e) {
		return null
	}
}

export function getTokenPayload() {
	const t = getToken()
	return decodeToken(t)
}

export function getRoles() {
	const p = getTokenPayload()
	if (!p) return []
	// support both `roles` array or single `role` string
	if (Array.isArray(p.roles)) return p.roles
	if (p.role) return [p.role]
	return []
}

export function getExpiry() {
	const p = getTokenPayload()
	if (!p) return null
	// exp may be numeric (seconds) or an ISO string depending on server
	const exp = p.exp
	if (!exp) return null
	if (typeof exp === 'number') return new Date(exp * 1000)
	// try parse string
	const d = new Date(exp)
	return isNaN(d.getTime()) ? null : d
}

export function isTokenExpired() {
	const expDate = getExpiry()
	if (!expDate) return true
	return Date.now() >= expDate.getTime()
}
