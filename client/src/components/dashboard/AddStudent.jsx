import React, { useState, useRef } from 'react';
import './AddStudent.css';
import AddStudentHandler from '../../api/AddStudent';
import * as MdIcons from 'react-icons/md';
import * as IoIcons from 'react-icons/io5';
import * as BiIcons from 'react-icons/bi';

const AddStudent = ({ isOpen, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        uid: '',
        id: '',
        first_name: '',
        middle_name: '',
        last_name: '',
        department: '',
        year_level: '',
        section: '',
        gender: ''
    });
    
    const [profileImage, setProfileImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [idAvailable, setIdAvailable] = useState(true);
    const [checkingId, setCheckingId] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    
    const fileInputRef = useRef(null);
    
    // Handle form input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        
        // Clear error for this field
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
        
        // Check ID availability for student ID field
        if (name === 'id') {
            checkStudentIdAvailability(value);
        }
    };
    
    // Check if student ID is available
    const checkStudentIdAvailability = async (studentId) => {
        if (!studentId || studentId.trim() === '') {
            setIdAvailable(true);
            return;
        }
        
        setCheckingId(true);
        try {
            const available = await AddStudentHandler.validateStudentId(studentId);
            setIdAvailable(available);
            
            if (!available) {
                setErrors(prev => ({
                    ...prev,
                    id: 'Student ID already exists'
                }));
            }
        } catch (error) {
            console.error('ID validation error:', error);
        } finally {
            setCheckingId(false);
        }
    };
    
    // Handle profile image selection
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            processImageFile(file);
        }
    };
    
    // Process image file (used by both file input and drag/drop)
    const processImageFile = (file) => {
        // Validate file type
        const allowedTypes = ['image/png', 'image/jpg', 'image/jpeg', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
            setMessage('Please select a valid image file (PNG, JPG, JPEG, GIF)');
            setMessageType('error');
            return;
        }
        
        // Validate file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
            setMessage('Image file size must be less than 5MB');
            setMessageType('error');
            return;
        }
        
        setProfileImage(file);
        
        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
            setImagePreview(e.target.result);
        };
        reader.readAsDataURL(file);
        
        // Clear any previous messages
        setMessage('');
    };
    
    // Drag and drop handlers
    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    };
    
    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    };
    
    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        
        const files = e.dataTransfer.files;
        if (files && files[0]) {
            processImageFile(files[0]);
        }
    };
    
    // Remove selected image
    const removeImage = () => {
        setProfileImage(null);
        setImagePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };
    
    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Clear previous messages
        setMessage('');
        setMessageType('');
        
        // Validate form data
        const validation = AddStudentHandler.validateStudentData(formData);
        if (!validation.isValid) {
            setErrors(validation.errors);
            setMessage('Please fix the errors below');
            setMessageType('error');
            return;
        }
        
        // Check if ID is available (if provided)
        if (formData.id && !idAvailable) {
            setMessage('Student ID is not available');
            setMessageType('error');
            return;
        }
        
        setIsSubmitting(true);
        
        try {
            const result = await AddStudentHandler.addStudent(formData, profileImage);
            
            setMessage('Student added successfully!');
            setMessageType('success');
            
            // Reset form after short delay
            setTimeout(() => {
                resetForm();
                onSuccess && onSuccess(result.student);
                onClose();
            }, 1500);
            
        } catch (error) {
            setMessage(error.message || 'Failed to add student');
            setMessageType('error');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    // Reset form data
    const resetForm = () => {
        setFormData({
            uid: '',
            id: '',
            first_name: '',
            middle_name: '',
            last_name: '',
            department: '',
            year_level: '',
            section: '',
            gender: ''
        });
        setProfileImage(null);
        setImagePreview(null);
        setErrors({});
        setMessage('');
        setIdAvailable(true);
        setIsDragOver(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };
    
    // Handle modal close
    const handleClose = () => {
        if (!isSubmitting) {
            resetForm();
            onClose();
        }
    };
    
    if (!isOpen) return null;
    
    return (
        <div className="add-student-modal" onClick={(e) => e.target === e.currentTarget && handleClose()}>
            <div className="add-student-content">
                <div className="add-student-header">
                    <h2 className="add-student-title">
                        <IoIcons.IoPersonAdd className="icon" />
                        Add New Student
                    </h2>
                    <button 
                        className="add-student-close"
                        onClick={handleClose}
                        disabled={isSubmitting}
                    >
                        <MdIcons.MdClose />
                    </button>
                </div>
                
                <form className="add-student-form" onSubmit={handleSubmit}>
                    {message && (
                        <div className={`message ${messageType}`}>
                            {message}
                        </div>
                    )}
                    
                    <div className="form-grid">
                        {/* Profile Image Upload */}
                        <div className={`profile-image-section ${isDragOver ? 'drag-over' : ''}`}
                             onDragOver={handleDragOver}
                             onDragLeave={handleDragLeave}
                             onDrop={handleDrop}
                        >
                            <div className="profile-image-header">
                                <MdIcons.MdCameraAlt className="icon" />
                                <h3>Profile Photo (Optional)</h3>
                            </div>
                            <div className="profile-image-upload">
                                {imagePreview ? (
                                    <img src={imagePreview} alt="Profile Preview" className="image-preview" />
                                ) : (
                                    <div className={`image-placeholder ${isDragOver ? 'drag-over' : ''}`}>
                                        {isDragOver ? (
                                            <>
                                                <MdIcons.MdCloudUpload className="icon" />
                                                <span>Drop image here</span>
                                            </>
                                        ) : (
                                            <>
                                                <MdIcons.MdPerson className="icon" />
                                                <span>Drag & drop image here or click to browse</span>
                                            </>
                                        )}
                                    </div>
                                )}
                                
                                <div className="file-input-wrapper">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        className="file-input"
                                        accept="image/png,image/jpg,image/jpeg,image/gif"
                                        onChange={handleImageChange}
                                    />
                                    <button
                                        type="button"
                                        className="file-input-button"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        {profileImage ? 'Change Photo' : 'Choose Photo'}
                                    </button>
                                </div>
                                
                                {profileImage && (
                                    <button
                                        type="button"
                                        className="remove-image-btn"
                                        onClick={removeImage}
                                    >
                                        Remove Photo
                                    </button>
                                )}
                                
                                <div className="file-info">
                                    Supported formats: PNG, JPG, JPEG, GIF (Max: 5MB)
                                </div>
                            </div>
                        </div>
                        
                        {/* UID (RFID) */}
                        <div className="form-group">
                            <label className="form-label required">UID (RFID)</label>
                            <input
                                type="text"
                                name="uid"
                                className={`form-input ${errors.uid ? 'error' : ''}`}
                                value={formData.uid}
                                onChange={handleInputChange}
                                placeholder="Scan or enter UID from RFID card"
                            />
                            {errors.uid && <div className="form-error">{errors.uid}</div>}
                        </div>
                        
                        {/* Student ID */}
                        <div className="form-group">
                            <label className="form-label required">Student ID</label>
                            <input
                                type="text"
                                name="id"
                                className={`form-input ${errors.id ? 'error' : ''}`}
                                value={formData.id}
                                onChange={handleInputChange}
                                placeholder="e.g. 2024-1234"
                            />
                            {checkingId && <div className="form-error">Checking availability...</div>}
                            {errors.id && <div className="form-error">{errors.id}</div>}
                        </div>
                        
                        {/* First Name */}
                        <div className="form-group">
                            <label className="form-label required">First Name</label>
                            <input
                                type="text"
                                name="first_name"
                                className={`form-input ${errors.first_name ? 'error' : ''}`}
                                value={formData.first_name}
                                onChange={handleInputChange}
                                placeholder="Enter first name"
                            />
                            {errors.first_name && <div className="form-error">{errors.first_name}</div>}
                        </div>
                        
                        {/* Middle Name */}
                        <div className="form-group">
                            <label className="form-label">Middle Name</label>
                            <input
                                type="text"
                                name="middle_name"
                                className={`form-input ${errors.middle_name ? 'error' : ''}`}
                                value={formData.middle_name}
                                onChange={handleInputChange}
                                placeholder="Enter middle name (optional)"
                            />
                            {errors.middle_name && <div className="form-error">{errors.middle_name}</div>}
                        </div>
                        
                        {/* Last Name */}
                        <div className="form-group">
                            <label className="form-label required">Last Name</label>
                            <input
                                type="text"
                                name="last_name"
                                className={`form-input ${errors.last_name ? 'error' : ''}`}
                                value={formData.last_name}
                                onChange={handleInputChange}
                                placeholder="Enter last name"
                            />
                            {errors.last_name && <div className="form-error">{errors.last_name}</div>}
                        </div>
                        
                        {/* Department */}
                        <div className="form-group">
                            <label className="form-label required">Department</label>
                            <select
                                name="department"
                                className={`form-select ${errors.department ? 'error' : ''}`}
                                value={formData.department}
                                onChange={handleInputChange}
                            >
                                <option value="">Select Department</option>
                                {AddStudentHandler.getDepartmentOptions().map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                            {errors.department && <div className="form-error">{errors.department}</div>}
                        </div>
                        
                        {/* Year Level */}
                        <div className="form-group">
                            <label className="form-label required">Year Level</label>
                            <select
                                name="year_level"
                                className={`form-select ${errors.year_level ? 'error' : ''}`}
                                value={formData.year_level}
                                onChange={handleInputChange}
                            >
                                <option value="">Select Year Level</option>
                                {AddStudentHandler.getYearLevelOptions().map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                            {errors.year_level && <div className="form-error">{errors.year_level}</div>}
                        </div>
                        
                        {/* Section */}
                        <div className="form-group">
                            <label className="form-label required">Section</label>
                            <select
                                name="section"
                                className={`form-select ${errors.section ? 'error' : ''}`}
                                value={formData.section}
                                onChange={handleInputChange}
                            >
                                <option value="">Select Section</option>
                                {AddStudentHandler.getSectionOptions().map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                            {errors.section && <div className="form-error">{errors.section}</div>}
                        </div>
                        
                        {/* Gender */}
                        <div className="form-group">
                            <label className="form-label required">Gender</label>
                            <select
                                name="gender"
                                className={`form-select ${errors.gender ? 'error' : ''}`}
                                value={formData.gender}
                                onChange={handleInputChange}
                            >
                                <option value="">Select Gender</option>
                                {AddStudentHandler.getGenderOptions().map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                            {errors.gender && <div className="form-error">{errors.gender}</div>}
                        </div>
                    </div>
                    
                    <div className="form-actions">
                        <button
                            type="button"
                            className="btn-cancel"
                            onClick={handleClose}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn-submit"
                            disabled={isSubmitting || !idAvailable}
                        >
                            {isSubmitting ? 'Adding Student...' : 'Add Student'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddStudent;