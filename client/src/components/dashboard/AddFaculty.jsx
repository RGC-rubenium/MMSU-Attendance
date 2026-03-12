import React, { useState, useRef } from 'react';
import AddFacultyAPI from '../../api/AddFaculty';
import { MdPersonAdd, MdImage, MdCloudUpload, MdHourglassEmpty, MdClose } from 'react-icons/md';
import './AddStudent.css';

const AddFaculty = ({ isOpen, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        uid: '',
        id: '',
        first_name: '',
        middle_name: '',
        last_name: '',
        department: '',
        gender: ''
    });
    
    const [profileImage, setProfileImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uidAvailable, setUidAvailable] = useState(true);
    const [idAvailable, setIdAvailable] = useState(true);
    const [checkingUid, setCheckingUid] = useState(false);
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
        
        // Check UID availability
        if (name === 'uid' && value.trim()) {
            checkUidAvailability(value.trim());
        }
        
        // Check faculty ID availability
        if (name === 'id' && value.trim()) {
            checkFacultyIdAvailability(value.trim());
        }
    };
    
    // Check if UID is available
    const checkUidAvailability = async (uid) => {
        if (!uid || uid.trim() === '') {
            setUidAvailable(true);
            return;
        }
        
        setCheckingUid(true);
        try {
            const available = await AddFacultyAPI.validateUID(uid);
            setUidAvailable(available);
        } catch (error) {
            console.error('UID check error:', error);
            setUidAvailable(false);
        } finally {
            setCheckingUid(false);
        }
    };
    
    // Check if faculty ID is available
    const checkFacultyIdAvailability = async (facultyId) => {
        if (!facultyId || facultyId.trim() === '') {
            setIdAvailable(true);
            return;
        }
        
        setCheckingId(true);
        try {
            const available = await AddFacultyAPI.validateFacultyID(facultyId);
            setIdAvailable(available);
        } catch (error) {
            console.error('Faculty ID check error:', error);
            setIdAvailable(false);
        } finally {
            setCheckingId(false);
        }
    };
    
    // Handle profile image selection
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        processImageFile(file);
    };
    
    // Process image file (used by both file input and drag/drop)
    const processImageFile = (file) => {
        if (!file) return;
        
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
            setMessage('Please select a valid image file (JPEG, PNG, or GIF)');
            setMessageType('error');
            return;
        }
        
        // Validate file size (5MB max)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            setMessage('Image size must be less than 5MB');
            setMessageType('error');
            return;
        }
        
        setProfileImage(file);
        
        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => setImagePreview(e.target.result);
        reader.readAsDataURL(file);
        
        setMessage('');
    };
    
    // Drag and drop handlers
    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragOver(true);
    };
    
    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragOver(false);
    };
    
    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
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
        
        // Validate form
        const newErrors = {};
        
        if (!formData.uid.trim()) newErrors.uid = 'UID is required';
        if (!formData.id.trim()) newErrors.id = 'Faculty ID is required';
        if (!formData.first_name.trim()) newErrors.first_name = 'First name is required';
        if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required';
        if (!formData.department.trim()) newErrors.department = 'Department is required';
        if (!formData.gender.trim()) newErrors.gender = 'Gender is required';
        
        if (!uidAvailable) newErrors.uid = 'This UID is already taken';
        if (!idAvailable) newErrors.id = 'This Faculty ID is already taken';
        
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }
        
        setIsSubmitting(true);
        setMessage('');
        
        try {
            const formDataToSend = new FormData();
            
            // Add form data
            Object.keys(formData).forEach(key => {
                if (formData[key]) {
                    formDataToSend.append(key, formData[key]);
                }
            });
            
            // Add profile image if selected
            if (profileImage) {
                formDataToSend.append('profile_image', profileImage);
            }
            
            const result = await AddFacultyAPI.addFaculty(formDataToSend);
            
            setMessage('Faculty member added successfully!');
            setMessageType('success');
            
            // Call success callback
            if (onSuccess) {
                onSuccess(result.faculty);
            }
            
            // Close modal after short delay
            setTimeout(() => {
                handleClose();
            }, 1500);
            
        } catch (error) {
            setMessage(error.message || 'Failed to add faculty member');
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
            gender: ''
        });
        setProfileImage(null);
        setImagePreview(null);
        setErrors({});
        setMessage('');
        setMessageType('');
        setUidAvailable(true);
        setIdAvailable(true);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };
    
    // Handle modal close
    const handleClose = () => {
        resetForm();
        onClose();
    };
    
    if (!isOpen) return null;
    
    return (
        <div className="add-student-modal">
            <div className="add-student-content">
                <div className="add-student-header">
                    <h2 className="add-student-title">
                        <MdPersonAdd className="icon" />
                        Add Faculty Member
                    </h2>
                    <button 
                        className="add-student-close"
                        onClick={handleClose}
                        disabled={isSubmitting}
                    >
                        <MdClose />
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
                                <MdImage className="icon" />
                                <h3>Profile Image (Optional)</h3>
                            </div>
                            <div className="profile-image-upload">
                                {imagePreview ? (
                                    <img src={imagePreview} alt="Profile Preview" className="image-preview" />
                                ) : (
                                    <div className={`image-placeholder ${isDragOver ? 'drag-over' : ''}`}>
                                        {isDragOver ? (
                                            <>
                                                <MdCloudUpload className="icon" />
                                                <span>Drop image here</span>
                                            </>
                                        ) : (
                                            <>
                                                <MdCloudUpload className="icon" />
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
                                        accept="image/*"
                                        onChange={handleImageChange}
                                    />
                                    <button
                                        type="button"
                                        className="file-input-button"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        {imagePreview ? 'Change Photo' : 'Choose Photo'}
                                    </button>
                                </div>
                                
                                {imagePreview && (
                                    <button 
                                        type="button" 
                                        className="remove-image-btn" 
                                        onClick={removeImage}
                                    >
                                        Remove Image
                                    </button>
                                )}
                                
                                <div className="file-info">
                                    Supported formats: PNG, JPG, JPEG, GIF (Max: 5MB)
                                </div>
                            </div>
                        </div>
                        
                        <div className="form-group">
                            <label className="form-label required">
                                UID (RFID)
                                {checkingUid && <MdHourglassEmpty style={{marginLeft: 8, color: '#0d8abc'}} />}
                                {formData.uid && !checkingUid && (
                                    <span style={{marginLeft: 8, color: uidAvailable ? 'green' : 'red'}}>
                                        {uidAvailable ? '✓' : '✗'}
                                    </span>
                                )}
                            </label>
                            <input
                                type="text"
                                name="uid"
                                value={formData.uid}
                                onChange={handleInputChange}
                                className={`form-input ${errors.uid ? 'error' : ''}`}
                                placeholder="Scan or enter UID from RFID card"
                            />
                            {errors.uid && <div className="form-error">{errors.uid}</div>}
                        </div>
                        
                        <div className="form-group">
                            <label className="form-label required">
                                Faculty ID
                                {checkingId && <MdHourglassEmpty style={{marginLeft: 8, color: '#0d8abc'}} />}
                                {formData.id && !checkingId && (
                                    <span style={{marginLeft: 8, color: idAvailable ? 'green' : 'red'}}>
                                        {idAvailable ? '✓' : '✗'}
                                    </span>
                                )}
                            </label>
                            <input
                                type="text"
                                name="id"
                                value={formData.id}
                                onChange={handleInputChange}
                                className={`form-input ${errors.id ? 'error' : ''}`}
                                placeholder="e.g. FAC-2024-001"
                            />
                            {errors.id && <div className="form-error">{errors.id}</div>}
                        </div>
                        
                        <div className="form-group">
                            <label className="form-label required">First Name</label>
                            <input
                                type="text"
                                name="first_name"
                                value={formData.first_name}
                                onChange={handleInputChange}
                                className={`form-input ${errors.first_name ? 'error' : ''}`}
                                placeholder="Enter first name"
                            />
                            {errors.first_name && <div className="form-error">{errors.first_name}</div>}
                        </div>
                        
                        <div className="form-group">
                            <label className="form-label">Middle Name</label>
                            <input
                                type="text"
                                name="middle_name"
                                value={formData.middle_name}
                                onChange={handleInputChange}
                                className="form-input"
                                placeholder="Enter middle name (optional)"
                            />
                        </div>
                        
                        <div className="form-group">
                            <label className="form-label required">Last Name</label>
                            <input
                                type="text"
                                name="last_name"
                                value={formData.last_name}
                                onChange={handleInputChange}
                                className={`form-input ${errors.last_name ? 'error' : ''}`}
                                placeholder="Enter last name"
                            />
                            {errors.last_name && <div className="form-error">{errors.last_name}</div>}
                        </div>
                        
                        <div className="form-group">
                            <label className="form-label required">Department</label>
                            <select
                                name="department"
                                value={formData.department}
                                onChange={handleInputChange}
                                className={`form-select ${errors.department ? 'error' : ''}`}
                            >
                                <option value="">Select Department</option>
                                <option value="BSCpE">BSCpE</option>
                                <option value="BSME">BSME</option>
                                <option value="BSEE">BSEE</option>
                                <option value="BSECE">BSECE</option>
                                <option value="BSCE">BSCE</option>
                                <option value="BSChE">BSChE</option>
                                <option value="BSCerE">BSCerE</option>
                                <option value="BSABE">BSABE</option>
                            </select>
                            {errors.department && <div className="form-error">{errors.department}</div>}
                        </div>
                        
                        <div className="form-group">
                            <label className="form-label required">Gender</label>
                            <select
                                name="gender"
                                value={formData.gender}
                                onChange={handleInputChange}
                                className={`form-select ${errors.gender ? 'error' : ''}`}
                            >
                                <option value="">Select Gender</option>
                                <option value="MALE">Male</option>
                                <option value="FEMALE">Female</option>
                            </select>
                            {errors.gender && <div className="form-error">{errors.gender}</div>}
                        </div>
                    </div>
                    <div className="form-actions">
                        <button type="button" className="btn-cancel" onClick={handleClose}>
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            className="btn-submit" 
                            disabled={isSubmitting || !uidAvailable || !idAvailable}
                        >
                            {isSubmitting ? (
                                <>
                                    <MdHourglassEmpty />
                                    Adding...
                                </>
                            ) : (
                                'Add Faculty'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddFaculty;
