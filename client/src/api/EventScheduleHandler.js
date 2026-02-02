const API_BASE = (import.meta && import.meta.env && import.meta.env.VITE_API_BASE) || 'http://localhost:5000'

export default class EventScheduleHandler {
    static getBase() {
        return API_BASE.replace(/\/$/, '') + '/api'
    }

    async fetchEventSchedules(params = {}) {
        const baseUrl = `${EventScheduleHandler.getBase()}/event-schedule`
        const usp = new URLSearchParams()

        // Add all valid params to query string
        Object.entries(params).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '') {
                usp.set(key, value.toString())
            }
        })

        const url = usp.toString() ? `${baseUrl}?${usp.toString()}` : baseUrl

        try {
            const res = await fetch(url, {
                headers: { 'Accept': 'application/json' },
                timeout: 10000
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
                throw new Error(errorMessage)
            }
            
            const data = await res.json()
            
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

    async createEventSchedule(eventData) {
        const url = `${EventScheduleHandler.getBase()}/event-schedule`
        
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(eventData)
            })
            
            if (!res.ok) {
                let errorMessage = `Create failed with status ${res.status}`
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

    async updateEventSchedule(eventId, eventData) {
        const url = `${EventScheduleHandler.getBase()}/event-schedule/${eventId}`
        
        try {
            const res = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(eventData)
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

    async deleteEventSchedule(eventId) {
        const url = `${EventScheduleHandler.getBase()}/event-schedule/${eventId}`
        
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

    async fetchEventSchedule(eventId) {
        const url = `${EventScheduleHandler.getBase()}/event-schedule/${eventId}`
        
        try {
            const res = await fetch(url, {
                headers: { 'Accept': 'application/json' }
            })
            
            if (!res.ok) {
                if (res.status === 404) {
                    throw new Error('Event schedule not found')
                }
                throw new Error(`Failed to fetch event schedule: ${res.status}`)
            }
            
            return await res.json()
        } catch (err) {
            throw err
        }
    }
}