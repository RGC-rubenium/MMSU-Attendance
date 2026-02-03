/**
 * AddStudent API Handler
 * Handles student creation with profile image upload
 */

const API_BASE = 'http://localhost:5000';

class AddStudentHandler {
    /**
     * Add a new student with optional profile image
     * @param {Object} studentData - Student information
     * @param {File} profileImage - Optional profile image file
     * @returns {Promise<Object>} Response from server
     */
    async addStudent(studentData, profileImage = null) {
        try {
            const formData = new FormData();
            
            // Add student data to form
            Object.keys(studentData).forEach(key => {
                if (studentData[key] !== null && studentData[key] !== undefined && studentData[key] !== '') {
                    formData.append(key, studentData[key]);
                }
            });
            
            // Add profile image if provided
            if (profileImage && profileImage instanceof File) {
                formData.append('profile_image', profileImage);
            }
            
            const response = await fetch(`${API_BASE}/api/students`, {
                method: 'POST',
                body: formData,
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Failed to add student');
            }
            
            return data;
        } catch (error) {
            console.error('Add student error:', error);
            throw error;
        }
    }
    
    /**
     * Validate if student ID is available
     * @param {string} studentId - Student ID to validate
     * @returns {Promise<boolean>} True if ID is available
     */
    async validateStudentId(studentId) {
        try {
            if (!studentId || studentId.trim() === '') {
                return true;
            }
            
            const response = await fetch(`${API_BASE}/api/students/validate-id`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ id: studentId.trim() }),
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                console.error('ID validation error:', data.message);
                return false;
            }
            
            return data.available;
        } catch (error) {
            console.error('ID validation error:', error);
            return false;
        }
    }
    
    /**
     * Validate required fields
     * @param {Object} studentData - Student data to validate
     * @returns {Object} Validation result with errors
     */
    validateStudentData(studentData) {
        const errors = {};
        const requiredFields = {
            uid: 'UID (RFID)',
            id: 'Student ID',
            first_name: 'First Name',
            last_name: 'Last Name', 
            department: 'Department',
            year_level: 'Year Level',
            gender: 'Gender',
            section: 'Section'
        };
        
        // Check required fields
        Object.keys(requiredFields).forEach(field => {
            if (!studentData[field] || studentData[field].toString().trim() === '') {
                errors[field] = `${requiredFields[field]} is required`;
            }
        });
        
        // Validate year level
        if (studentData.year_level) {
            const yearLevel = parseInt(studentData.year_level);
            if (isNaN(yearLevel) || yearLevel < 1 || yearLevel > 5) {
                errors.year_level = 'Year Level must be between 1-5';
            }
        }
        
        // Validate names (no numbers or special characters)
        const nameFields = ['first_name', 'middle_name', 'last_name'];
        nameFields.forEach(field => {
            if (studentData[field] && !/^[a-zA-Z\s]*$/.test(studentData[field])) {
                errors[field] = `${requiredFields[field] || field.replace('_', ' ')} should contain only letters`;
            }
        });
        
        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }
    
    /**
     * Get department options
     * @returns {Array} Department options for form
     */
    getDepartmentOptions() {
        return [
            { value: 'BSCPE', label: 'BSCPE' },
            { value: 'HR', label: 'Human Resources' },
            { value: 'Finance', label: 'Finance' },
            { value: 'IT', label: 'Information Technology' },
            { value: 'Engineering', label: 'Engineering' },
            { value: 'Business', label: 'Business Administration' }
        ];
    }
    
    /**
     * Get year level options
     * @returns {Array} Year level options for form
     */
    getYearLevelOptions() {
        return [
            { value: '1', label: '1st Year' },
            { value: '2', label: '2nd Year' },
            { value: '3', label: '3rd Year' },
            { value: '4', label: '4th Year' },
            { value: '5', label: '5th Year' }
        ];
    }
    
    /**
     * Get section options
     * @returns {Array} Section options for form
     */
    getSectionOptions() {
        return [
            { value: 'A', label: 'Section A' },
            { value: 'B', label: 'Section B' },
            { value: 'C', label: 'Section C' },
            { value: 'D', label: 'Section D' },
            { value: 'E', label: 'Section E' }
        ];
    }
    
    /**
     * Get gender options
     * @returns {Array} Gender options for form
     */
    getGenderOptions() {
        return [
            { value: 'MALE', label: 'Male' },
            { value: 'FEMALE', label: 'Female' }
        ];
    }
}

export default new AddStudentHandler();