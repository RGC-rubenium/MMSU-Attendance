import AuthToken from '../Utils/AuthToken';

class ScannerAPI {
    static async scanRFID(uid) {
        try {
            const response = await fetch('/api/scanner/rfid-scan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${AuthToken.getToken()}`
                },
                body: JSON.stringify({ uid })
            });

            // Check if response is actually JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                throw new Error(`Expected JSON response, got: ${text.substring(0, 100)}...`);
            }

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('RFID scan error:', error);
            throw error;
        }
    }

    static async getCurrentSchedule() {
        try {
            const response = await fetch('/api/scanner/current-schedule', {
                headers: {
                    'Authorization': `Bearer ${AuthToken.getToken()}`
                }
            });

            // Check if response is actually JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                throw new Error(`Expected JSON response, got: ${text.substring(0, 100)}...`);
            }

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('Get current schedule error:', error);
            throw error;
        }
    }

    static async getAttendanceLogs(filters = {}) {
        try {
            const queryParams = new URLSearchParams();
            
            if (filters.date) {
                queryParams.append('date', filters.date);
            }
            if (filters.user_type) {
                queryParams.append('user_type', filters.user_type);
            }
            if (filters.limit) {
                queryParams.append('limit', filters.limit);
            }

            const response = await fetch(`/api/scanner/attendance-logs?${queryParams.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${AuthToken.getToken()}`
                }
            });

            // Check if response is actually JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                throw new Error(`Expected JSON response, got: ${text.substring(0, 100)}...`);
            }

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('Get attendance logs error:', error);
            throw error;
        }
    }

    static async testScheduleSystem() {
        try {
            const response = await fetch('/api/scanner/test-schedule', {
                headers: {
                    'Authorization': `Bearer ${AuthToken.getToken()}`
                }
            });

            // Check if response is actually JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                throw new Error(`Expected JSON response, got: ${text.substring(0, 100)}...`);
            }

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('Test schedule system error:', error);
            throw error;
        }
    }

    // Utility methods for RFID handling
    static isValidUID(uid) {
        if (!uid || typeof uid !== 'string') return false;
        const cleanUID = uid.trim();
        return cleanUID.length >= 8 && cleanUID.length <= 36; // Reasonable UID length range
    }

    static formatUID(uid) {
        if (!uid) return '';
        return uid.toString().trim().toUpperCase();
    }

    static parseHIDInput(input) {
        // Parse HID reader input - typically sends facility code + card number
        // This may need adjustment based on your specific HID reader format
        const cleanInput = input.trim();
        
        // Common HID formats:
        // - Decimal: just the card number
        // - Hex: hexadecimal representation
        // - Facility:Card format like "123:45678"
        
        if (cleanInput.includes(':')) {
            // Format: Facility:Card
            const [facility, card] = cleanInput.split(':');
            return {
                facility: facility.trim(),
                card: card.trim(),
                full: cleanInput,
                uid: cleanInput // Use full format as UID
            };
        }
        
        // Single value - treat as card number
        return {
            facility: null,
            card: cleanInput,
            full: cleanInput,
            uid: cleanInput
        };
    }
}

export default ScannerAPI;