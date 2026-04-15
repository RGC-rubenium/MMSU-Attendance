/**
 * AddStudent API Handler
 * Handles student creation with profile image upload
 */

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
            
            const response = await fetch('/api/students', {
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
            
            const response = await fetch('/api/students/validate-id', {
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
            id: 'Student ID',
            first_name: 'First Name',
            last_name: 'Last Name', 
            department: 'Department',
            year_level: 'Year Level'
            // uid, gender, section are now optional
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
        
        // Validate phone numbers (basic validation)
        const phoneFields = ['parent_contact', 'contact_number'];
        phoneFields.forEach(field => {
            if (studentData[field] && studentData[field].trim() !== '') {
                // Allow digits, spaces, dashes, parentheses, and plus sign
                if (!/^[\d\s\-\(\)\+]+$/.test(studentData[field])) {
                    errors[field] = 'Please enter a valid phone number';
                }
            }
        });
        
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
            { value: 'BSCpE', label: 'BSCpE' },
            { value: 'BSME', label: 'BSME' },
            { value: 'BSEE', label: 'BSEE' },
            { value: 'BSECE', label: 'BSECE' },
            { value: 'BSCE', label: 'BSCE' },
            { value: 'BSChE', label: 'BSChE' },
            { value: 'BSCerE', label: 'BSCerE' },
            { value: 'BSABE', label: 'BSABE' }
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

// Add bulk import methods
AddStudentHandler.prototype.bulkImportStudents = async function(excelFile) {
    try {
        const formData = new FormData();
        formData.append('excel_file', excelFile);
        
        const response = await fetch('/api/students/bulk-import', {
            method: 'POST',
            body: formData,
            // Don't set Content-Type header, let the browser set it with boundary
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Failed to import students');
        }
        
        return data;
    } catch (error) {
        console.error('Bulk import error:', error);
        throw error;
    }
};

AddStudentHandler.prototype.downloadTemplate = function() {
    const headers = [
        'uid',
        'id', 
        'first_name',
        'middle_name',
        'last_name',
        'department',
        'year_level',
        'section',
        'gender',
        'parent_contact', // Optional
        'contact_number'
    ];
    
    const sampleData = [
        [
            'SAMPLE001',
            '2024-1001',
            'John',
            'Middle',
            'Doe',
            'BSCPE',
            '1',
            'A',
            'MALE',
            '09123456789',
            '09987654321'
        ],
        [
            'SAMPLE002',
            '2024-1002',
            'Jane',
            '',
            'Smith',
            'IT',
            '2',
            'B',
            'FEMALE',
            '09111222333',
            ''
        ]
    ];
    
    // Create CSV content
    const csvContent = [headers, ...sampleData]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_import_template.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
};