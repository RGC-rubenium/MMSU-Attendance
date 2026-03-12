class ClassScheduleHandler {
    constructor() {
        this.baseURL = 'http://localhost:5000/api';
    }

    // Helper method to handle API responses
    async handleResponse(response) {
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || `HTTP error! status: ${response.status}`);
        }
        return data;
    }

    // Get all class schedules with optional filters
    async fetchClassSchedules(params = {}) {
        try {
            const queryParams = new URLSearchParams();
            
            if (params.department) queryParams.append('department', params.department);
            if (params.year_level) queryParams.append('year_level', params.year_level);
            if (params.section) queryParams.append('section', params.section);
            if (params.is_active !== undefined) queryParams.append('is_active', params.is_active);
            if (params.search) queryParams.append('search', params.search);

            const response = await fetch(`${this.baseURL}/class-schedule?${queryParams}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            return await this.handleResponse(response);
        } catch (error) {
            console.error('Error fetching class schedules:', error);
            throw error;
        }
    }

    // Create a new class schedule
    async createClassSchedule(scheduleData) {
        try {
            const response = await fetch(`${this.baseURL}/class-schedule`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(scheduleData),
            });

            return await this.handleResponse(response);
        } catch (error) {
            console.error('Error creating class schedule:', error);
            throw error;
        }
    }

    // Update an existing class schedule
    async updateClassSchedule(scheduleId, scheduleData) {
        try {
            const response = await fetch(`${this.baseURL}/class-schedule/${scheduleId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(scheduleData),
            });

            return await this.handleResponse(response);
        } catch (error) {
            console.error('Error updating class schedule:', error);
            throw error;
        }
    }

    // Delete a class schedule
    async deleteClassSchedule(scheduleId) {
        try {
            const response = await fetch(`${this.baseURL}/class-schedule/${scheduleId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            return await this.handleResponse(response);
        } catch (error) {
            console.error('Error deleting class schedule:', error);
            throw error;
        }
    }

    // Apply a class schedule to students
    async applyScheduleToStudents(scheduleId, criteria) {
        try {
            const response = await fetch(`${this.baseURL}/class-schedule/${scheduleId}/apply`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(criteria),
            });

            return await this.handleResponse(response);
        } catch (error) {
            console.error('Error applying schedule to students:', error);
            throw error;
        }
    }

    // Clear schedules for students
    async clearStudentSchedules(criteria) {
        try {
            const response = await fetch(`${this.baseURL}/class-schedule/clear-students`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(criteria),
            });

            return await this.handleResponse(response);
        } catch (error) {
            console.error('Error clearing student schedules:', error);
            throw error;
        }
    }

    // Get students with their current schedules
    async getStudentsWithSchedules(params = {}) {
        try {
            const queryParams = new URLSearchParams();
            
            if (params.department) queryParams.append('department', params.department);
            if (params.year_level) queryParams.append('year_level', params.year_level);
            if (params.section) queryParams.append('section', params.section);
            if (params.has_schedule !== undefined) queryParams.append('has_schedule', params.has_schedule);

            const response = await fetch(`${this.baseURL}/students-with-schedules?${queryParams}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            return await this.handleResponse(response);
        } catch (error) {
            console.error('Error fetching students with schedules:', error);
            throw error;
        }
    }

    // Helper method to create schedule data structure
    createScheduleData() {
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const scheduleData = {};
        
        days.forEach(day => {
            scheduleData[day] = [];
        });
        
        return scheduleData;
    }

    // Helper method to add a time slot to schedule data
    addTimeSlot(scheduleData, day, startTime, endTime, subject, room = '', instructor = '') {
        if (!scheduleData[day]) {
            scheduleData[day] = [];
        }
        
        scheduleData[day].push({
            start_time: startTime,
            end_time: endTime,
            subject: subject,
            room: room,
            instructor: instructor,
            id: Date.now() + Math.random() // Simple unique ID
        });
        
        // Sort time slots by start time
        scheduleData[day].sort((a, b) => a.start_time.localeCompare(b.start_time));
        
        return scheduleData;
    }

    // Helper method to validate schedule data
    validateScheduleData(scheduleData) {
        const errors = [];
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        for (const day of days) {
            if (scheduleData[day]) {
                for (let i = 0; i < scheduleData[day].length; i++) {
                    const slot = scheduleData[day][i];
                    
                    // Check required fields
                    if (!slot.start_time || !slot.end_time || !slot.subject) {
                        errors.push(`${day}: Time slot ${i + 1} is missing required fields`);
                        continue;
                    }
                    
                    // Check time format
                    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
                    if (!timeRegex.test(slot.start_time) || !timeRegex.test(slot.end_time)) {
                        errors.push(`${day}: Invalid time format in slot ${i + 1}`);
                        continue;
                    }
                    
                    // Check if start time is before end time
                    if (slot.start_time >= slot.end_time) {
                        errors.push(`${day}: Start time must be before end time in slot ${i + 1}`);
                    }
                    
                    // Check for overlapping slots on the same day
                    for (let j = i + 1; j < scheduleData[day].length; j++) {
                        const nextSlot = scheduleData[day][j];
                        if (this.timeSlotsOverlap(slot, nextSlot)) {
                            errors.push(`${day}: Time slots ${i + 1} and ${j + 1} overlap`);
                        }
                    }
                }
            }
        }
        
        return errors;
    }

    // Helper method to check if two time slots overlap
    timeSlotsOverlap(slot1, slot2) {
        return (slot1.start_time < slot2.end_time && slot2.start_time < slot1.end_time);
    }

    // Helper method to format time for display
    formatTime(timeString) {
        if (!timeString) return '';
        
        try {
            const [hours, minutes] = timeString.split(':');
            const hour = parseInt(hours, 10);
            const minute = parseInt(minutes, 10);
            
            if (isNaN(hour) || isNaN(minute)) return timeString;
            
            const period = hour >= 12 ? 'PM' : 'AM';
            const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
            
            return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
        } catch {
            return timeString;
        }
    }

    // Helper method to get available departments
    getAvailableDepartments() {
        return ['BSCpE', 'BSME', 'BSEE', 'BSECE', 'BSCE', 'BSChE', 'BSCerE', 'BSABE'];
    }

    // Helper method to get available year levels
    getAvailableYearLevels() {
        return [1, 2, 3, 4, 5];
    }

    // Helper method to get available sections
    getAvailableSections() {
        return ['A', 'B', 'C', 'D', 'E'];
    }
}

export default ClassScheduleHandler;