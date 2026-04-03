import AuthToken from '../Utils/AuthToken'

export default class FacultyHandler {
    static getBase() {
        return '/api'
    }

    async fetchFaculties(params = {}) {
        const baseUrl = `${FacultyHandler.getBase()}/faculty`
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
     * Fetch single faculty by UID
     */
    async fetchFaculty(uid) {
        const url = `${FacultyHandler.getBase()}/faculty/${encodeURIComponent(uid)}`
        
        try {
            const res = await AuthToken.fetchWithAuth(url, { 
                headers: { 'Accept': 'application/json' },
                cache: 'no-store'
            })
            
            if (!res.ok) {
                if (res.status === 404) {
                    throw new Error('Faculty not found')
                }
                if (res.status === 401) {
                    AuthToken.clearToken()
                    throw new Error('Authentication required')
                }
                throw new Error(`Failed to fetch faculty: ${res.status}`)
            }
            
            return await res.json()
        } catch (err) {
            throw err
        }
    }

    /**
     * Delete single faculty by UID
     */
    async deleteFaculty(uid) {
        const url = `${FacultyHandler.getBase()}/faculty/${encodeURIComponent(uid)}`
        
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
     * Delete multiple faculties     by UIDs
     */
    async bulkDeleteFaculty(facultyIds) {
        const url = `${FacultyHandler.getBase()}/faculty/bulk-delete`
        
        try {
            const res = await fetch(url, {
                method: 'DELETE',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json' 
                },
                body: JSON.stringify({ faculty_ids: facultyIds })
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
     * Update a faculty member by ID
     * @param {string} id - Faculty ID
     * @param {Object} data - Data to update
     * @param {File} profileImage - Optional profile image file
     */
    async updateFaculty(id, data, profileImage = null) {
        const url = `${FacultyHandler.getBase()}/faculty/${encodeURIComponent(id)}`
        
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
