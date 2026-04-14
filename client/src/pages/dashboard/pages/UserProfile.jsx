import './UserProfile.css';
import StudentHandler from '../../../api/StudentHandler.js';
import FacultyHandler from '../../../api/FacultyHandler.js';
import React from 'react';
import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from 'react-router-dom';
import AttendanceLogsHandler from '../../../api/AttendanceLogsHandler.js';
import * as MdIcons from 'react-icons/md';

const studentHandler = new StudentHandler();
const facultyHandler = new FacultyHandler();

function maskUid(uid = '') {
    if (!uid) return ''
    const s = uid.toString()
    const keep = 4
    if (s.length <= keep) return '*'.repeat(s.length)
    return '*'.repeat(Math.max(0, s.length - keep)) + s.slice(-keep)
}

function fmt(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function fmtDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function duration(inIso, outIso) {
    if (!inIso || !outIso) return '—';
    const ms = new Date(outIso) - new Date(inIso);
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function UserProfile() {
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(window.location.search);
    const userId = queryParams.get('id');
    const [user, setUser] = useState(null);
    const [userType, setUserType] = useState(null); // 'student' | 'faculty'
    const [error, setError] = useState(null);
    const [attendanceLogs, setAttendanceLogs] = useState([]);
    const [attendanceLoading, setAttendanceLoading] = useState(false);
    const [attendanceError, setAttendanceError] = useState(null);
    const [expanded, setExpanded] = useState(null);
    // Filters for attendance records
    const [filterDateFrom, setFilterDateFrom] = useState('')
    const [filterDateTo, setFilterDateTo] = useState('')
    const [filterTimeFrom, setFilterTimeFrom] = useState('')
    const [filterTimeTo, setFilterTimeTo] = useState('')
    
    // Edit mode state
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({});
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState({ type: '', text: '' });
    const [profileImage, setProfileImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const fileInputRef = useRef(null);
    
    // Delete confirmation state
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Memoized filtered attendance logs (keep hooks at top-level)
    const filteredAttendanceLogs = useMemo(() => {
        if (!attendanceLogs || attendanceLogs.length === 0) return []
        return attendanceLogs.filter(l => {
            if (!l.time_in) return false
            const t = new Date(l.time_in)
            if (isNaN(t)) return false

            // Date range checks with time support
            if (filterDateFrom) {
                const df = new Date(filterDateFrom)
                if (filterTimeFrom) {
                    const [h, m] = filterTimeFrom.split(':').map(Number)
                    if (!isNaN(h) && !isNaN(m)) {
                        df.setHours(h, m, 0, 0)
                    }
                } else {
                    df.setHours(0, 0, 0, 0)
                }
                if (!isNaN(df) && t < df) return false
            }
            if (filterDateTo) {
                const dt = new Date(filterDateTo)
                if (filterTimeTo) {
                    const [h, m] = filterTimeTo.split(':').map(Number)
                    if (!isNaN(h) && !isNaN(m)) {
                        dt.setHours(h, m, 59, 999)
                    }
                } else {
                    dt.setHours(23, 59, 59, 999)
                }
                if (!isNaN(dt) && t > dt) return false
            }

            return true
        })
    }, [attendanceLogs, filterDateFrom, filterDateTo, filterTimeFrom, filterTimeTo])

    const toggleExpand = (id) => setExpanded(prev => prev === id ? null : id);

    const statusBadge = (s) => {
        const map = { incomplete: 'badge-incomplete', complete: 'badge-complete' };
        return <span className={`badge ${map[s] || 'badge-incomplete'}`}>{s || 'incomplete'}</span>;
    };

    const typeBadge = (t) => (
        <span className={`type-badge ${t === 'student' ? 'type-student' : 'type-faculty'}`}>
            {t === 'student' ? <MdIcons.MdSchool /> : <MdIcons.MdPerson />}
            {t}
        </span>
    );

    // Start editing - populate editData with current user data
    const handleStartEdit = () => {
        setEditData({
            first_name: user.first_name || '',
            middle_name: user.middle_name || '',
            last_name: user.last_name || '',
            department: user.department || '',
            gender: user.gender || '',
            uid: user.uid || user.Uid || user.card_uid || '',
            id: user.id || user.student_id || user.employee_id || '',
            ...(userType === 'student' && {
                year_level: user.year_level || user.yearlevel || '',
                section: user.section || '',
                parent_contact: user.parent_contact || ''
            })
        });
        setImagePreview(user.avatar || null);
        setProfileImage(null);
        setSaveMessage({ type: '', text: '' });
        setIsEditing(true);
    };

    // Cancel editing
    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditData({});
        setProfileImage(null);
        setImagePreview(null);
        setSaveMessage({ type: '', text: '' });
    };

    // Handle form field changes
    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setEditData(prev => ({ ...prev, [name]: value }));
    };

    // Handle profile image selection
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const allowedTypes = ['image/png', 'image/jpg', 'image/jpeg', 'image/gif'];
            if (!allowedTypes.includes(file.type)) {
                setSaveMessage({ type: 'error', text: 'Please select a valid image file (PNG, JPG, JPEG, GIF)' });
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                setSaveMessage({ type: 'error', text: 'Image file size must be less than 5MB' });
                return;
            }
            setProfileImage(file);
            const reader = new FileReader();
            reader.onload = (e) => setImagePreview(e.target.result);
            reader.readAsDataURL(file);
            setSaveMessage({ type: '', text: '' });
        }
    };

    // Remove profile image
    const handleRemoveImage = () => {
        setProfileImage(null);
        setImagePreview(null);
        setEditData(prev => ({ ...prev, remove_profile_image: 'true' }));
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // Save edited profile
    const handleSaveEdit = async () => {
        setIsSaving(true);
        setSaveMessage({ type: '', text: '' });
        
        try {
            const idToUpdate = user.id || user.uid;
            let result;
            
            if (userType === 'student') {
                result = await studentHandler.updateStudent(idToUpdate, editData, profileImage);
            } else {
                result = await facultyHandler.updateFaculty(idToUpdate, editData, profileImage);
            }
            
            if (result.success) {
                // Update local user state with new data
                const updatedUser = result.student || result.faculty;
                setUser(prev => ({ ...prev, ...updatedUser }));
                setSaveMessage({ type: 'success', text: 'Profile updated successfully!' });
                setTimeout(() => {
                    setIsEditing(false);
                    setSaveMessage({ type: '', text: '' });
                }, 1500);
            } else {
                setSaveMessage({ type: 'error', text: result.message || 'Failed to update profile' });
            }
        } catch (err) {
            setSaveMessage({ type: 'error', text: err.message || 'Failed to update profile' });
        } finally {
            setIsSaving(false);
        }
    };

    // Delete user
    const handleDelete = async () => {
        setIsDeleting(true);
        
        try {
            const idToDelete = user.id || user.uid;
            
            if (userType === 'student') {
                await studentHandler.deleteStudent(idToDelete);
            } else {
                await facultyHandler.deleteFaculty(idToDelete);
            }
            
            // Navigate back to the appropriate list page
            navigate(userType === 'student' ? '/dashboard/students' : '/dashboard/faculty');
        } catch (err) {
            setSaveMessage({ type: 'error', text: err.message || 'Failed to delete profile' });
            setShowDeleteConfirm(false);
        } finally {
            setIsDeleting(false);
        }
    };

    useEffect(() => {
        if (!userId) return

        const load = async () => {
            try {
                // Try fetching as student (search by id)
                const studentResp = await studentHandler.fetchStudents({ q: userId, per_page: 1 })
                if (studentResp && Array.isArray(studentResp.items) && studentResp.items.length > 0) {
                    setUser(studentResp.items[0])
                    setUserType('student')
                    return
                }

                // Try fetching as faculty
                const facultyResp = await facultyHandler.fetchFaculties({ q: userId, per_page: 1 })
                if (facultyResp && Array.isArray(facultyResp.items) && facultyResp.items.length > 0) {
                    setUser(facultyResp.items[0])
                    setUserType('faculty')
                    return
                }

                setError('User not found')
            } catch (err) {
                setError(err.message || 'Failed to load user')
            }
        }

        load()
    }, [userId])

    // Fetch attendance logs for both student and faculty users and compute simple analytics
    useEffect(() => {
        if (!user || !(userType === 'student' || userType === 'faculty')) return

        const fetchAttendance = async () => {
            setAttendanceLoading(true)
            setAttendanceError(null)
            try {
                // Prefer searching by uid if available, otherwise use id or full name
                const searchTerm = user.uid || user.id || (user.full_name || user.fullName || '')
                const resp = await AttendanceLogsHandler.getLogs({ search: searchTerm, userType: userType, perPage: 200 })
                // API returns { success, logs, count, total, ... }
                const logs = resp && (resp.logs || resp.items || [])
                setAttendanceLogs(logs || [])
            } catch (err) {
                setAttendanceError(err.message || 'Failed to load attendance')
            } finally {
                setAttendanceLoading(false)
            }
        }

        fetchAttendance()
    }, [user, userType])

    if (error) {
        return <div className="user-profile-page">{error}</div>
    }

    if (!user) {
        return <div className="user-profile-page">Loading...</div>
    }

    const fullName = user.full_name || [user.first_name, user.middle_name, user.last_name].filter(Boolean).join(' ')
    const gender = user.gender || user.sex || ''
    const uidMasked = maskUid(user.uid || user.Uid || user.card_uid || '')
    const id = user.id || user.student_id || user.employee_id || ''
    const course = user.department || user.course || ''
    const section = user.section || ''
    const year = user.yearlevel || user.year || user.year_level || ''
    
    // Department options
    const departmentOptions = ['BSCpE', 'BSME', 'BSEE', 'BSECE', 'BSCE', 'BSChE', 'BSCerE', 'BSABE'];
    const yearLevelOptions = ['1', '2', '3', '4', '5'];
    const sectionOptions = ['A', 'B', 'C', 'D', 'E'];
    const genderOptions = ['MALE', 'FEMALE'];
    
    return (
        <div className="user-profile-page">
            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="modal-overlay">
                    <div className="modal-content delete-confirm-modal">
                        <div className="modal-icon delete-icon">
                            <MdIcons.MdWarning />
                        </div>
                        <h3>Delete {userType === 'student' ? 'Student' : 'Faculty'}</h3>
                        <p>Are you sure you want to delete <strong>{fullName}</strong>?</p>
                        <p className="warning-text">This action cannot be undone. All associated data will be permanently removed.</p>
                        <div className="modal-actions">
                            <button 
                                className="btn-cancel" 
                                onClick={() => setShowDeleteConfirm(false)}
                                disabled={isDeleting}
                            >
                                Cancel
                            </button>
                            <button 
                                className="btn-delete" 
                                onClick={handleDelete}
                                disabled={isDeleting}
                            >
                                {isDeleting ? (
                                    <>
                                        <MdIcons.MdRefresh className="spin" />
                                        Deleting...
                                    </>
                                ) : (
                                    <>
                                        <MdIcons.MdDelete />
                                        Delete
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            <div className="profile-grid">
                <aside className="profile-left">
                    {/* Profile Avatar */}
                    <div className="profile-avatar-wrap">
                        {isEditing ? (
                            <div className="avatar-edit-container">
                                {imagePreview ? (
                                    <img src={imagePreview} alt="Preview" className="profile-avatar" />
                                ) : (
                                    <div className="profile-avatar placeholder">
                                        {(editData.first_name || fullName || 'U').split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase()}
                                    </div>
                                )}
                                <div className="avatar-edit-actions">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleImageChange}
                                        accept="image/png, image/jpeg, image/jpg, image/gif"
                                        style={{ display: 'none' }}
                                    />
                                    <button 
                                        type="button" 
                                        className="btn-avatar-action"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <MdIcons.MdCameraAlt />
                                    </button>
                                    {imagePreview && (
                                        <button 
                                            type="button" 
                                            className="btn-avatar-action btn-remove"
                                            onClick={handleRemoveImage}
                                        >
                                            <MdIcons.MdClose />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            user.avatar ? (
                                <img src={user.avatar} alt={`${fullName} avatar`} className="profile-avatar" />
                            ) : (
                                <div className="profile-avatar placeholder">{(fullName || 'U').split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase()}</div>
                            )
                        )}
                    </div>
                    
                    {/* Name and Meta */}
                    {!isEditing && (
                        <>
                            <h2 className="profile-name">{fullName}</h2>
                            <div className="profile-meta">
                                <div><span className="meta-label">Gender:</span> {gender || '—'}</div>
                                <div><span className="meta-label">UID:</span> <span aria-hidden>{uidMasked}</span></div>
                                <div><span className="meta-label">ID:</span> {id || '—'}</div>
                            </div>
                        </>
                    )}
                    
                    {/* Action Buttons */}
                    <div className="profile-actions">
                        {isEditing ? (
                            <>
                                <button 
                                    className="btn-action btn-save" 
                                    onClick={handleSaveEdit}
                                    disabled={isSaving}
                                >
                                    {isSaving ? (
                                        <>
                                            <MdIcons.MdRefresh className="spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <MdIcons.MdSave />
                                            Save Changes
                                        </>
                                    )}
                                </button>
                                <button 
                                    className="btn-action btn-cancel-edit" 
                                    onClick={handleCancelEdit}
                                    disabled={isSaving}
                                >
                                    <MdIcons.MdClose />
                                    Cancel
                                </button>
                            </>
                        ) : (
                            <>
                                <button className="btn-action btn-edit" onClick={handleStartEdit}>
                                    <MdIcons.MdEdit />
                                    Edit Profile
                                </button>
                                <button className="btn-action btn-delete-profile" onClick={() => setShowDeleteConfirm(true)}>
                                    <MdIcons.MdDelete />
                                    Delete
                                </button>
                            </>
                        )}
                    </div>
                    
                    {/* Save Message */}
                    {saveMessage.text && (
                        <div className={`save-message ${saveMessage.type}`}>
                            {saveMessage.type === 'success' ? <MdIcons.MdCheckCircle /> : <MdIcons.MdError />}
                            {saveMessage.text}
                        </div>
                    )}
                </aside>

                <section className="profile-right">
                    <div className="profile-section">
                        <h3>{isEditing ? 'Edit Profile' : 'Profile Details'}</h3>
                        
                        {isEditing ? (
                            <div className="edit-form">
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>UID</label>
                                        <input
                                            type="text"
                                            name="uid"
                                            value={editData.uid || ''}
                                            onChange={handleEditChange}
                                            placeholder="UID (RFID Card)"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>{userType === 'student' ? 'Student ID' : 'Employee ID'}</label>
                                        <input
                                            type="text"
                                            name="id"
                                            value={editData.id || ''}
                                            onChange={handleEditChange}
                                            placeholder={userType === 'student' ? 'Student ID' : 'Employee ID'}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>First Name</label>
                                        <input
                                            type="text"
                                            name="first_name"
                                            value={editData.first_name || ''}
                                            onChange={handleEditChange}
                                            placeholder="First Name"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Middle Name</label>
                                        <input
                                            type="text"
                                            name="middle_name"
                                            value={editData.middle_name || ''}
                                            onChange={handleEditChange}
                                            placeholder="Middle Name"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Last Name</label>
                                        <input
                                            type="text"
                                            name="last_name"
                                            value={editData.last_name || ''}
                                            onChange={handleEditChange}
                                            placeholder="Last Name"
                                        />
                                    </div>
                                </div>
                                
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Department</label>
                                        <select
                                            name="department"
                                            value={editData.department || ''}
                                            onChange={handleEditChange}
                                        >
                                            <option value="">Select Department</option>
                                            {departmentOptions.map(d => (
                                                <option key={d} value={d}>{d}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Gender</label>
                                        <select
                                            name="gender"
                                            value={editData.gender || ''}
                                            onChange={handleEditChange}
                                        >
                                            <option value="">Select Gender</option>
                                            {genderOptions.map(g => (
                                                <option key={g} value={g}>{g}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                
                                {userType === 'student' && (
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Year Level</label>
                                            <select
                                                name="year_level"
                                                value={editData.year_level || ''}
                                                onChange={handleEditChange}
                                            >
                                                <option value="">Select Year</option>
                                                {yearLevelOptions.map(y => (
                                                    <option key={y} value={y}>{y}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Section</label>
                                            <select
                                                name="section"
                                                value={editData.section || ''}
                                                onChange={handleEditChange}
                                            >
                                                <option value="">Select Section</option>
                                                {sectionOptions.map(s => (
                                                    <option key={s} value={s}>{s}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Parent Contact</label>
                                            <input
                                                type="text"
                                                name="parent_contact"
                                                value={editData.parent_contact || ''}
                                                onChange={handleEditChange}
                                                placeholder="Parent Contact Number"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <dl>
                                {userType === 'student' && (
                                    <>
                                        <dt>Course</dt><dd>{course || '—'}</dd>
                                        <dt>Section</dt><dd>{section || '—'}</dd>
                                        <dt>Year</dt><dd>{year || '—'}</dd>
                                    </>
                                )}

                                {userType === 'faculty' && (
                                    <>
                                        <dt>Department</dt><dd>{course || '—'}</dd>
                                        <dt>Position</dt><dd>{user.position || user.title || '—'}</dd>
                                    </>
                                )}

                                {user.contact_number && (<><dt>Contact</dt><dd>{user.contact_number}</dd></>)}
                                {user.email && (<><dt>Email</dt><dd>{user.email}</dd></>)}
                                {user.address && (<><dt>Address</dt><dd>{user.address}</dd></>)}
                            </dl>
                        )}
                    </div>

                    {(userType === 'student' || userType === 'faculty') && (
                        <>
                        <div className="profile-section">
                            <h3>Attendance Analytics</h3>
                            {attendanceLoading ? (
                                <div>Loading attendance...</div>
                            ) : attendanceError ? (
                                <div className="error">{attendanceError}</div>
                            ) : (
                                <>
                                    {(() => {
                                        const total = attendanceLogs.length

                                        // Total hours: sum of (time_out - time_in) in hours for logs that have both
                                        const totalHours = attendanceLogs.reduce((acc, l) => {
                                            if (l.time_in && l.time_out) {
                                                const tin = new Date(l.time_in)
                                                const tout = new Date(l.time_out)
                                                const diff = (tout - tin) / (1000 * 60 * 60)
                                                if (!isNaN(diff) && diff > 0) acc += diff
                                            }
                                            return acc
                                        }, 0)

                                        // Distinct days with records (based on time_in date)
                                        const daysSet = new Set(attendanceLogs.map(l => {
                                            if (!l.time_in) return null
                                            const d = new Date(l.time_in)
                                            if (isNaN(d)) return null
                                            return d.toISOString().slice(0,10)
                                        }).filter(Boolean))
                                        const days = daysSet.size

                                        const avgHoursPerDay = days > 0 ? (totalHours / days) : 0
                                        const avgRecordsPerDay = days > 0 ? (total / days) : 0

                                        const fmt = (n) => (Math.round(n * 100) / 100)

                                        return (
                                            <dl className="attendance-grid">
                                                <dt>Total Records</dt><dd>{total}</dd>
                                                <dt>Total Hours</dt><dd>{fmt(totalHours)} h</dd>
                                                <dt>Average Hours / Day</dt><dd>{fmt(avgHoursPerDay)} h</dd>
                                                <dt>Average Records / Day</dt><dd>{fmt(avgRecordsPerDay)}</dd>
                                            </dl>
                                        )
                                    })()}
                                </>
                            )}
                        </div>
                        <div className='profile-section'>
                            <h3 style={{marginTop:16}}>Attendance Records</h3>
                                    {attendanceLoading ? (
                                        <div className="alog-loading">
                                            <MdIcons.MdRefresh className="alog-spinner" />
                                            Loading attendance records...
                                        </div>
                                    ) : attendanceError ? (
                                        <div className="alog-error">
                                            <MdIcons.MdError />
                                            {attendanceError}
                                        </div>
                                    ) : attendanceLogs.length === 0 ? (
                                        <div className="alog-empty">
                                            <MdIcons.MdEventNote className="empty-icon" />
                                            <p>No attendance records found.</p>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Filters */}
                                            <div className="alog-filters" style={{marginBottom:16}}>
                                                <div className="filter-group">
                                                    <label>From Date</label>
                                                    <input 
                                                        type="date" 
                                                        value={filterDateFrom} 
                                                        onChange={e => setFilterDateFrom(e.target.value)} 
                                                    />
                                                </div>
                                                <div className="filter-group">
                                                    <label>From Time</label>
                                                    <input 
                                                        type="time" 
                                                        value={filterTimeFrom} 
                                                        onChange={e => setFilterTimeFrom(e.target.value)} 
                                                    />
                                                </div>
                                                <div className="filter-group">
                                                    <label>To Date</label>
                                                    <input 
                                                        type="date" 
                                                        value={filterDateTo} 
                                                        onChange={e => setFilterDateTo(e.target.value)} 
                                                    />
                                                </div>
                                                <div className="filter-group">
                                                    <label>To Time</label>
                                                    <input 
                                                        type="time" 
                                                        value={filterTimeTo} 
                                                        onChange={e => setFilterTimeTo(e.target.value)} 
                                                    />
                                                </div>
                                                <button 
                                                    type="button" 
                                                    className="alog-clear-btn"
                                                    onClick={() => { 
                                                        setFilterDateFrom(''); 
                                                        setFilterDateTo(''); 
                                                        setFilterTimeFrom(''); 
                                                        setFilterTimeTo(''); 
                                                    }}
                                                >
                                                    <MdIcons.MdClearAll />
                                                    Clear
                                                </button>
                                            </div>

                                            {filteredAttendanceLogs.length === 0 ? (
                                                <div className="alog-empty">
                                                    <MdIcons.MdFilterList className="empty-icon" />
                                                    <p>No records match the current filters.</p>
                                                </div>
                                            ) : (
                                                <div className="alog-table-wrap">
                                                    <table className="alog-table">
                                                        <thead>
                                                            <tr>
                                                                <th className="col-num">#</th>
                                                                <th>Date</th>
                                                                <th>Time In</th>
                                                                <th>Time Out</th>
                                                                <th>Duration</th>
                                                                <th>Status</th>
                                                                <th>Schedule</th>
                                                                <th>Type</th>
                                                                <th></th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {filteredAttendanceLogs.map((log, idx) => (
                                                                <React.Fragment key={log.id}>
                                                                    <tr 
                                                                        className={expanded === log.id ? 'row-expanded' : ''}
                                                                        onClick={() => toggleExpand(log.id)}
                                                                        style={{ cursor: 'pointer' }}
                                                                    >
                                                                        <td className="col-num">{idx + 1}</td>
                                                                        <td>{fmtDate(log.time_in)}</td>
                                                                        <td>{fmt(log.time_in)}</td>
                                                                        <td>{fmt(log.time_out)}</td>
                                                                        <td>{duration(log.time_in, log.time_out)}</td>
                                                                        <td>{statusBadge(log.status)}</td>
                                                                        <td>{log.schedule_name || log.subject_name || '—'}</td>
                                                                        <td>{typeBadge(userType)}</td>
                                                                        <td>
                                                                            {expanded === log.id ? <MdIcons.MdExpandLess /> : <MdIcons.MdExpandMore />}
                                                                        </td>
                                                                    </tr>
                                                                    {expanded === log.id && (
                                                                        <tr className="expanded-row">
                                                                            <td colSpan="9">
                                                                                <div className="expanded-content" style={{
                                                                                    padding: '12px 16px',
                                                                                    background: 'rgba(255,255,255,0.02)',
                                                                                    borderRadius: '6px',
                                                                                    fontSize: '0.85rem'
                                                                                }}>
                                                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                                                                                        <div>
                                                                                            <strong>Schedule Details:</strong><br />
                                                                                            Type: {log.schedule_type || '—'}<br />
                                                                                            Name: {log.schedule_name || log.subject_name || '—'}<br />
                                                                                            Location: {log.location || log.room || '—'}
                                                                                        </div>
                                                                                        <div>
                                                                                            <strong>Attendance Info:</strong><br />
                                                                                            Status: {log.status || 'incomplete'}<br />
                                                                                            Method: {log.method || 'RFID'}<br />
                                                                                            Scanner: {log.scanner_name || '—'}
                                                                                        </div>
                                                                                        <div>
                                                                                            <strong>Additional:</strong><br />
                                                                                            Notes: {log.notes || '—'}<br />
                                                                                            Subjects: {log.subjects_attended ? 
                                                                                                (Array.isArray(log.subjects_attended) ? 
                                                                                                    log.subjects_attended.join(', ') : 
                                                                                                    log.subjects_attended
                                                                                                ) : '—'
                                                                                            }
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                    )}
                                                                </React.Fragment>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </>
                                    )}
                        </div>
                        </>
                    )}
                </section>
            </div>
        </div>
    )
}