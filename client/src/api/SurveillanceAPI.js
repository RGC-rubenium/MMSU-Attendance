import { getToken } from '../Utils/AuthToken';

const API_BASE = '/api/surveillance';

class SurveillanceAPI {
    /**
     * Get all cameras
     */
    static async getCameras() {
        try {
            const response = await fetch(`${API_BASE}/cameras`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                }
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('Error fetching cameras:', error);
            throw error;
        }
    }

    /**
     * Get a specific camera by ID
     */
    static async getCamera(cameraId) {
        try {
            const response = await fetch(`${API_BASE}/cameras/${cameraId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                }
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('Error fetching camera:', error);
            throw error;
        }
    }

    /**
     * Create a new camera
     */
    static async createCamera(cameraData) {
        try {
            const response = await fetch(`${API_BASE}/cameras`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify(cameraData)
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('Error creating camera:', error);
            throw error;
        }
    }

    /**
     * Update a camera
     */
    static async updateCamera(cameraId, cameraData) {
        try {
            const response = await fetch(`${API_BASE}/cameras/${cameraId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify(cameraData)
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('Error updating camera:', error);
            throw error;
        }
    }

    /**
     * Delete a camera
     */
    static async deleteCamera(cameraId) {
        try {
            const response = await fetch(`${API_BASE}/cameras/${cameraId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                }
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('Error deleting camera:', error);
            throw error;
        }
    }

    /**
     * Test camera connection
     */
    static async testCamera(cameraId) {
        try {
            const response = await fetch(`${API_BASE}/cameras/${cameraId}/test`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                }
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('Error testing camera:', error);
            throw error;
        }
    }

    /**
     * Test an RTSP URL before adding a camera
     */
    static async testRtspUrl(rtspUrl) {
        try {
            const response = await fetch(`${API_BASE}/test-url`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({ rtsp_url: rtspUrl })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('Error testing RTSP URL:', error);
            throw error;
        }
    }

    /**
     * Reorder cameras in the grid
     */
    static async reorderCameras(orderArray) {
        try {
            const response = await fetch(`${API_BASE}/cameras/reorder`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({ order: orderArray })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('Error reordering cameras:', error);
            throw error;
        }
    }

    /**
     * Get the stream URL for a camera
     */
    static getStreamUrl(cameraId) {
        return `${API_BASE}/stream/${cameraId}`;
    }
}

export default SurveillanceAPI;
