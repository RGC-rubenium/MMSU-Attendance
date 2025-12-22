import { use, useEffect } from "react";

class UserHandler {
    static API_BASE = 'http://127.0.0.1:5000/api';
    async fetchStudents() {
        const response = await fetch(`${this.API_BASE}/student`);
        if (!response.ok) {
            throw new Error('Failed to fetch students');
        }
        return await response.json();
    }

    async fetchLogs() {
        const response = await fetch(`${this.API_BASE}/logs`);
        if (!response.ok) {
            throw new Error('Failed to fetch logs');
        }
        return response.json(); 
    }
}

export default new UserHandler();
