import AuthToken from '../Utils/AuthToken'

const API_BASE = (import.meta && import.meta.env && import.meta.env.VITE_API_BASE) || 'http://localhost:5000'

export default class StudentHandler {
    static getBase() {
        return API_BASE.replace(/\/$/, '') + '/api'
    }

    async fetchStudents(params = {}) {
        const baseUrl = `${StudentHandler.getBase()}/student`
        const usp = new URLSearchParams()

        // Add all valid params to query string
        Object.entries(params).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '') {
                usp.set(key, value.toString())
            }
        })

        const url = usp.toString() ? `${baseUrl}?${usp.toString()}` : baseUrl

        try {
            const res = await AuthToken.fetchWithAuth(url, { 
                headers: { 'Accept': 'application/json' },
                timeout: 10000 // 10 second timeout
            })
            
            if (!res.ok) {
                let errorMessage = `Request failed with status ${res.status}`
                try {
                    const errorData = await res.json()
                    errorMessage = errorData.message || errorMessage
                } catch {
                    const text = await res.text().catch(() => '')
                    errorMessage = text || errorMessage
                }
                
                if (res.status === 401) {
                    AuthToken.clearToken()
                    throw new Error('Authentication required. Please login again.')
                }
                
                throw new Error(errorMessage)
            }
            
            const data = await res.json()
            
            // Validate response structure
            if (!data || typeof data !== 'object') {
                throw new Error('Invalid response format from server')
            }
            
            return {
                items: Array.isArray(data.items) ? data.items : [],
                meta: data.meta || { total: 0, page: 1, totalPages: 0, hasNext: false, hasPrev: false }
            }
            
        } catch (err) {
            if (err.name === 'AbortError') {
                throw new Error('Request timeout. Please try again.')
            }
            throw err
        }
    }

    /**
     * Fetch single student by UID
     */
    async fetchStudent(uid) {
        const url = `${StudentHandler.getBase()}/student/${encodeURIComponent(uid)}`
        
        try {
            const res = await AuthToken.fetchWithAuth(url, { 
                headers: { 'Accept': 'application/json' } 
            })
            
            if (!res.ok) {
                if (res.status === 404) {
                    throw new Error('Student not found')
                }
                if (res.status === 401) {
                    AuthToken.clearToken()
                    throw new Error('Authentication required')
                }
                throw new Error(`Failed to fetch student: ${res.status}`)
            }
            
            return await res.json()
        } catch (err) {
            throw err
        }
    }
}
