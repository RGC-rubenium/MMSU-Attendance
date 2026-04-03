/**
 * AddFaculty API Handler
 * Handles faculty creation with profile image upload and bulk import
 */

import AuthToken from '../Utils/AuthToken';

export default class AddFaculty {
    /**
     * Add a new faculty member with optional profile image
     * @param {FormData} formData - FormData containing faculty information and optional profile image
     * @returns {Promise<Object>} Response from server
     */
    static async addFaculty(formData) {
        try {
            const response = await AuthToken.fetchWithAuth('/api/faculty', {
                method: 'POST',
                body: formData,
                // Don't set Content-Type header, let the browser set it with boundary for multipart/form-data
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Failed to add faculty member');
            }
            
            return data;
        } catch (error) {
            console.error('Add faculty error:', error);
            throw error;
        }
    }
    
    /**
     * Validate if UID is available
     * @param {string} uid - UID to validate
     * @returns {Promise<boolean>} True if UID is available
     */
    static async validateUID(uid) {
        try {
            if (!uid || uid.trim() === '') {
                return true;
            }
            
            const response = await AuthToken.fetchWithAuth('/api/faculty/validate-uid', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ uid: uid.trim() }),
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                console.error('UID validation error:', data.message);
                return false;
            }
            
            return data.available;
        } catch (error) {
            console.error('UID validation error:', error);
            return false;
        }
    }
    
    /**
     * Validate if faculty ID is available
     * @param {string} facultyId - Faculty ID to validate
     * @returns {Promise<boolean>} True if ID is available
     */
    static async validateFacultyID(facultyId) {
        try {
            if (!facultyId || facultyId.trim() === '') {
                return true;
            }
            
            const response = await AuthToken.fetchWithAuth('/api/faculty/validate-id', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ id: facultyId.trim() }),
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                console.error('Faculty ID validation error:', data.message);
                return false;
            }
            
            return data.available;
        } catch (error) {
            console.error('Faculty ID validation error:', error);
            return false;
        }
    }
    
    /**
     * Bulk import faculty from Excel file
     * @param {File} excelFile - Excel file containing faculty data
     * @returns {Promise<Object>} Import results from server
     */
    static async bulkImportFaculty(excelFile) {
        try {
            const formData = new FormData();
            formData.append('excel_file', excelFile);
            
            const response = await AuthToken.fetchWithAuth('/api/faculty/bulk-import', {
                method: 'POST',
                body: formData,
                // Don't set Content-Type header, let the browser set it with boundary
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Failed to import faculty data');
            }
            
            return data;
        } catch (error) {
            console.error('Bulk import error:', error);
            throw error;
        }
    }
    
    /**
     * Download CSV template for bulk import
     */
    static downloadTemplate() {
        const headers = [
            'uid',
            'id', 
            'first_name',
            'middle_name',
            'last_name',
            'department',
            'gender'
        ];
        
        const sampleData = [
            [
                'FACULTY001',
                'FAC-2024-001',
                'John',
                'Middle',
                'Doe',
                'BSCPE',
                'MALE'
            ],
            [
                'FACULTY002',
                'FAC-2024-002',
                'Jane',
                '',
                'Smith',
                'IT',
                'FEMALE'
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
        a.download = 'faculty_import_template.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }
    
    /**
     * Get department options
     * @returns {Array} Department options for form
     */
    static getDepartmentOptions() {
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
     * Get gender options
     * @returns {Array} Gender options for form
     */
    static getGenderOptions() {
        return [
            { value: 'MALE', label: 'Male' },
            { value: 'FEMALE', label: 'Female' }
        ];
    }
}
