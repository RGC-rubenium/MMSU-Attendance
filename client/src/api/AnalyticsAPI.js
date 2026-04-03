// Analytics API handler
const API_BASE_URL = '/api';

class AnalyticsAPI {
    static async getDashboardStats() {
        try {
            const response = await fetch(`${API_BASE_URL}/dashboard-stats`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            throw error;
        }
    }

    static async getRecentAttendance(limit = 5) {
        try {
            const response = await fetch(`${API_BASE_URL}/recent-attendance?limit=${limit}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching recent attendance:', error);
            throw error;
        }
    }

    static async getAttendanceTrends(days = 7) {
        try {
            const response = await fetch(`${API_BASE_URL}/attendance-trends?days=${days}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching attendance trends:', error);
            throw error;
        }
    }

    static async getLiveStats() {
        try {
            const response = await fetch(`${API_BASE_URL}/live-stats`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching live stats:', error);
            throw error;
        }
    }
}

export default AnalyticsAPI;