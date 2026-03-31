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
                cache: 'no-store',
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
    async fetchStudent(id) {
        const url = `${StudentHandler.getBase()}/student/${encodeURIComponent(id)}`
        
        try {
            const res = await AuthToken.fetchWithAuth(url, { 
                headers: { 'Accept': 'application/json' },
                cache: 'no-store'
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

    /**
     * Delete single student by UID
     */
    async deleteStudent(id) {
        const url = `${StudentHandler.getBase()}/student/${encodeURIComponent(id)}`
        
        try {
            const res = await fetch(url, {
                method: 'DELETE',
                headers: { 'Accept': 'application/json' }
            })
            
            if (!res.ok) {
                let errorMessage = `Delete failed with status ${res.status}`
                try {
                    const errorData = await res.json()
                    errorMessage = errorData.message || errorMessage
                } catch {
                    const text = await res.text().catch(() => '')
                    errorMessage = text || errorMessage
                }
                
                throw new Error(errorMessage)
            }
            
            return await res.json()
        } catch (err) {
            throw err
        }
    }

    /**
     * Delete multiple students by UIDs
     */
    async bulkDeleteStudents(studentIds) {
        const url = `${StudentHandler.getBase()}/students/bulk-delete`
        
        try {
            const res = await fetch(url, {
                method: 'DELETE',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json' 
                },
                body: JSON.stringify({ student_ids: studentIds })
            })
            
            if (!res.ok) {
                let errorMessage = `Bulk delete failed with status ${res.status}`
                try {
                    const errorData = await res.json()
                    errorMessage = errorData.message || errorMessage
                } catch {
                    const text = await res.text().catch(() => '')
                    errorMessage = text || errorMessage
                }
                
                throw new Error(errorMessage)
            }
            
            return await res.json()
        } catch (err) {
            throw err
        }
    }

    /**
     * Update a student by ID
     * @param {string} id - Student ID
     * @param {Object} data - Data to update
     * @param {File} profileImage - Optional profile image file
     */
    async updateStudent(id, data, profileImage = null) {
        const url = `${StudentHandler.getBase()}/student/${encodeURIComponent(id)}`
        
        try {
            const formData = new FormData()
            
            // Append all data fields
            Object.entries(data).forEach(([key, value]) => {
                if (value !== null && value !== undefined) {
                    formData.append(key, value)
                }
            })
            
            // Append profile image if provided
            if (profileImage) {
                formData.append('profile_image', profileImage)
            }
            
            const res = await fetch(url, {
                method: 'PUT',
                body: formData
            })
            
            if (!res.ok) {
                let errorMessage = `Update failed with status ${res.status}`
                try {
                    const errorData = await res.json()
                    errorMessage = errorData.message || errorMessage
                } catch {
                    const text = await res.text().catch(() => '')
                    errorMessage = text || errorMessage
                }
                
                throw new Error(errorMessage)
            }
            
            return await res.json()
        } catch (err) {
            throw err
        }
    }
    
}
