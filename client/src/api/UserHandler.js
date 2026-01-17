import AuthToken from '../Utils/AuthToken'

const API_BASE = (import.meta && import.meta.env && import.meta.env.VITE_API_BASE) || 'http://localhost:5000'

export default class UserHandler {
    static getBase() {
        return API_BASE.replace(/\/$/, '') + '/api'
    }

    /**
     * Fetch students from backend `/api/student` (protected)
     * Returns array of users or throws an Error.
     */
    async fetchStudents() {
        const url = `${UserHandler.getBase()}/student`
        try {
            // use fetchWithAuth so Authorization header is automatically attached
            const res = await AuthToken.fetchWithAuth(url, { headers: { 'Accept': 'application/json' } })
            if (!res.ok) {
                const text = await res.text().catch(() => '')
                if (res.status === 401) {
                    // token invalid/expired - clear and surface error
                    AuthToken.clearToken()
                }
                throw new Error(text || `Request failed with status ${res.status}`)
            }

            const data = await res.json()
            return data
        } catch (err) {
            // bubble up the error for the caller to handle
            throw err
        }
    }
}
