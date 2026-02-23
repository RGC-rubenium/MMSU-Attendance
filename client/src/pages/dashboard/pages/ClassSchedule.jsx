import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './ClassSchedule.css';
import ClassScheduleHandler from '../../../api/ClassScheduleHandler';
import * as MdIcons from "react-icons/md";
import * as IoIcons from "react-icons/io5";
import * as BiIcons from "react-icons/bi";
import * as FaIcons from "react-icons/fa";

const ClassSchedule = () => {
    const [state, setState] = useState({
        schedules: [],
        loading: false,
        error: '',
        showModal: false,
        showApplyModal: false,
        showClearModal: false,
        editingSchedule: null,
        searchQuery: '',
        selectedScheduleForApply: null
    });

    const [formData, setFormData] = useState({
        schedule_name: '',
        department: '',
        year_level: '',
        section: '',
        description: '',
        schedule_data: {},
        is_active: true
    });

    const [applyData, setApplyData] = useState({
        method: 'criteria', // 'criteria' or 'student_ids'
        department: '',
        year_level: '',
        section: '',
        student_ids: [],
        student_ids_text: '' // Raw text for textarea
    });

    const [clearData, setClearData] = useState({
        method: 'criteria',
        department: '',
        year_level: '',
        section: '',
        student_ids: [],
        student_ids_text: '' // Raw text for textarea
    });

    const [scheduleEditor, setScheduleEditor] = useState({
        selectedDay: 'Monday',
        timeSlot: {
            start_time: '',
            end_time: '',
            subject: '',
            room: '',
            instructor: ''
        }
    });

    const handler = useMemo(() => new ClassScheduleHandler(), []);
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Initialize schedule data structure
    useEffect(() => {
        if (!formData.schedule_data || Object.keys(formData.schedule_data).length === 0) {
            setFormData(prev => ({
                ...prev,
                schedule_data: handler.createScheduleData()
            }));
        }
    }, []);

    const fetchSchedules = useCallback(async (searchQuery = '') => {
        setState(prev => ({ ...prev, loading: true, error: '' }));
        
        try {
            const params = {};
            if (searchQuery.trim()) {
                params.search = searchQuery.trim();
            }
            
            const data = await handler.fetchClassSchedules(params);
            
            setState(prev => ({
                ...prev,
                schedules: data.items || [],
                loading: false
            }));
        } catch (err) {
            console.error('Failed to fetch schedules:', err);
            setState(prev => ({
                ...prev,
                error: err.message || 'Failed to load schedules',
                loading: false
            }));
        }
    }, [handler]);

    // Fetch schedules on component mount
    useEffect(() => {
        fetchSchedules();
    }, [fetchSchedules]);

    const handleSearch = useCallback((e) => {
        const query = e.target.value;
        setState(prev => ({ ...prev, searchQuery: query }));
        
        const timeoutId = setTimeout(() => {
            fetchSchedules(query);
        }, 300);
        
        return () => clearTimeout(timeoutId);
    }, [fetchSchedules]);

    const openModal = useCallback((schedule = null) => {
        if (schedule) {
            // Edit mode
            setFormData({
                schedule_name: schedule.schedule_name,
                department: schedule.department || '',
                year_level: schedule.year_level || '',
                section: schedule.section || '',
                description: schedule.description || '',
                schedule_data: schedule.schedule_data || handler.createScheduleData(),
                is_active: schedule.is_active
            });
            setState(prev => ({ ...prev, editingSchedule: schedule, showModal: true }));
        } else {
            // Add mode
            setFormData({
                schedule_name: '',
                department: '',
                year_level: '',
                section: '',
                description: '',
                schedule_data: handler.createScheduleData(),
                is_active: true
            });
            setState(prev => ({ ...prev, editingSchedule: null, showModal: true }));
        }
    }, [handler]);

    const closeModal = useCallback(() => {
        setState(prev => ({ 
            ...prev, 
            showModal: false, 
            showApplyModal: false, 
            showClearModal: false,
            editingSchedule: null,
            selectedScheduleForApply: null 
        }));
        setFormData({
            schedule_name: '',
            department: '',
            year_level: '',
            section: '',
            description: '',
            schedule_data: handler.createScheduleData(),
            is_active: true
        });
        setApplyData({
            method: 'criteria',
            department: '',
            year_level: '',
            section: '',
            student_ids: [],
            student_ids_text: ''
        });
        setClearData({
            method: 'criteria',
            department: '',
            year_level: '',
            section: '',
            student_ids: [],
            student_ids_text: ''
        });
    }, [handler]);

    const addTimeSlot = useCallback(() => {
        const { selectedDay, timeSlot } = scheduleEditor;
        
        if (!timeSlot.start_time || !timeSlot.end_time || !timeSlot.subject) {
            setState(prev => ({ ...prev, error: 'Please fill in all required fields for the time slot' }));
            return;
        }

        if (timeSlot.start_time >= timeSlot.end_time) {
            setState(prev => ({ ...prev, error: 'Start time must be before end time' }));
            return;
        }

        const updatedScheduleData = { ...formData.schedule_data };
        handler.addTimeSlot(
            updatedScheduleData, 
            selectedDay, 
            timeSlot.start_time, 
            timeSlot.end_time, 
            timeSlot.subject, 
            timeSlot.room, 
            timeSlot.instructor
        );

        setFormData(prev => ({ ...prev, schedule_data: updatedScheduleData }));
        setScheduleEditor(prev => ({
            ...prev,
            timeSlot: {
                start_time: '',
                end_time: '',
                subject: '',
                room: '',
                instructor: ''
            }
        }));
        setState(prev => ({ ...prev, error: '' }));
    }, [scheduleEditor, formData.schedule_data, handler]);

    const removeTimeSlot = useCallback((day, index) => {
        const updatedScheduleData = { ...formData.schedule_data };
        updatedScheduleData[day].splice(index, 1);
        setFormData(prev => ({ ...prev, schedule_data: updatedScheduleData }));
    }, [formData.schedule_data]);

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        
        if (!formData.schedule_name.trim()) {
            setState(prev => ({ ...prev, error: 'Schedule name is required' }));
            return;
        }
        
        // Validate schedule data
        const validationErrors = handler.validateScheduleData(formData.schedule_data);
        if (validationErrors.length > 0) {
            setState(prev => ({ ...prev, error: validationErrors[0] }));
            return;
        }
        
        setState(prev => ({ ...prev, loading: true, error: '' }));
        
        try {
            if (state.editingSchedule) {
                await handler.updateClassSchedule(state.editingSchedule.id, formData);
            } else {
                await handler.createClassSchedule(formData);
            }
            
            await fetchSchedules(state.searchQuery);
            closeModal();
            setState(prev => ({ ...prev, loading: false }));
        } catch (err) {
            console.error('Failed to save schedule:', err);
            setState(prev => ({
                ...prev,
                error: err.message || 'Failed to save schedule',
                loading: false
            }));
        }
    }, [formData, state.editingSchedule, state.searchQuery, handler, fetchSchedules, closeModal]);

    const handleDelete = useCallback(async (scheduleId) => {
        if (!window.confirm('Are you sure you want to delete this schedule? This action cannot be undone.')) {
            return;
        }
        
        setState(prev => ({ ...prev, loading: true, error: '' }));
        
        try {
            await handler.deleteClassSchedule(scheduleId);
            await fetchSchedules(state.searchQuery);
            setState(prev => ({ ...prev, loading: false }));
        } catch (err) {
            console.error('Failed to delete schedule:', err);
            setState(prev => ({
                ...prev,
                error: err.message || 'Failed to delete schedule',
                loading: false
            }));
        }
    }, [state.searchQuery, handler, fetchSchedules]);

    const openApplyModal = useCallback((schedule) => {
        setState(prev => ({ ...prev, selectedScheduleForApply: schedule, showApplyModal: true }));
    }, []);

    const handleApplySchedule = useCallback(async (e) => {
        e.preventDefault();
        
        if (!state.selectedScheduleForApply) return;
        
        setState(prev => ({ ...prev, loading: true, error: '' }));
        
        try {
            // Prepare data with converted student_ids array
            const submitData = { ...applyData };
            if (applyData.method === 'student_ids' && applyData.student_ids_text) {
                submitData.student_ids = applyData.student_ids_text
                    .split(',')
                    .map(id => id.trim())
                    .filter(id => id);
            }
            
            await handler.applyScheduleToStudents(state.selectedScheduleForApply.id, submitData);
            closeModal();
            setState(prev => ({ ...prev, loading: false }));
            alert('Schedule applied successfully to students!');
        } catch (err) {
            console.error('Failed to apply schedule:', err);
            setState(prev => ({
                ...prev,
                error: err.message || 'Failed to apply schedule',
                loading: false
            }));
        }
    }, [state.selectedScheduleForApply, applyData, handler, closeModal]);

    const handleClearSchedules = useCallback(async (e) => {
        e.preventDefault();
        
        if (!window.confirm('Are you sure you want to clear schedules for the selected students?')) {
            return;
        }
        
        setState(prev => ({ ...prev, loading: true, error: '' }));
        
        try {
            // Prepare data with converted student_ids array
            const submitData = { ...clearData };
            if (clearData.method === 'student_ids' && clearData.student_ids_text) {
                submitData.student_ids = clearData.student_ids_text
                    .split(',')
                    .map(id => id.trim())
                    .filter(id => id);
            }
            
            await handler.clearStudentSchedules(submitData);
            closeModal();
            setState(prev => ({ ...prev, loading: false }));
            alert('Student schedules cleared successfully!');
        } catch (err) {
            console.error('Failed to clear schedules:', err);
            setState(prev => ({
                ...prev,
                error: err.message || 'Failed to clear schedules',
                loading: false
            }));
        }
    }, [clearData, handler, closeModal]);

    return (
        <div className="class-schedule-wrapper">
            <div className="class-schedule-header">
                <div className="header-content">
                    <h1>Class Schedule Management</h1>
                    <p>Create and manage class schedules for students</p>
                </div>
                
                <div className="header-actions">
                    <div className="search-box">
                        <MdIcons.MdSearch className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search schedules..."
                            value={state.searchQuery}
                            onChange={handleSearch}
                        />
                    </div>
                    
                    <button 
                        className="add-schedule-btn"
                        onClick={() => openModal()}
                        disabled={state.loading}
                    >
                        <MdIcons.MdAdd />
                        Create Schedule
                    </button>
                    
                    <button 
                        className="clear-schedules-btn"
                        onClick={() => setState(prev => ({ ...prev, showClearModal: true }))}
                        disabled={state.loading}
                    >
                        <MdIcons.MdClear />
                        Clear Schedules
                    </button>
                </div>
            </div>

            {state.error && (
                <div className="error-message">
                    <MdIcons.MdError />
                    {state.error}
                </div>
            )}

            {state.loading && (
                <div className="loading-spinner">
                    <div className="loading-content">
                        <div className="loading-dots">
                            <div className="loading-dot"></div>
                            <div className="loading-dot"></div>
                            <div className="loading-dot"></div>
                        </div>
                        <div className="loading-text">Loading schedules...</div>
                    </div>
                </div>
            )}

            <div className="schedules-grid">
                {state.schedules.length === 0 && !state.loading ? (
                    <div className="empty-state">
                        <FaIcons.FaCalendarAlt />
                        <h3>No class schedules found</h3>
                        <p>Create your first class schedule to get started</p>
                        <button 
                            className="empty-add-btn"
                            onClick={() => openModal()}
                        >
                            <MdIcons.MdAdd />
                            Create Schedule
                        </button>
                    </div>
                ) : (
                    state.schedules.map(schedule => (
                        <div key={schedule.id} className="schedule-card">
                            <div className="schedule-header">
                                <h3>{schedule.schedule_name}</h3>
                                <div className="schedule-status">
                                    <span className={`status-badge ${schedule.is_active ? 'active' : 'inactive'}`}>
                                        {schedule.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                                <div className="schedule-actions">
                                    <button 
                                        className="apply-btn"
                                        onClick={() => openApplyModal(schedule)}
                                        title="Apply to students"
                                    >
                                        <FaIcons.FaUsers />
                                    </button>
                                    <button 
                                        className="edit-btn"
                                        onClick={() => openModal(schedule)}
                                        title="Edit schedule"
                                    >
                                        <MdIcons.MdEdit />
                                    </button>
                                    <button 
                                        className="delete-btn"
                                        onClick={() => handleDelete(schedule.id)}
                                        title="Delete schedule"
                                    >
                                        <MdIcons.MdDelete />
                                    </button>
                                </div>
                            </div>
                            
                            <div className="schedule-details">
                                {schedule.department && (
                                    <div className="detail-item">
                                        <IoIcons.IoSchoolOutline />
                                        <span>Department: {schedule.department}</span>
                                    </div>
                                )}
                                
                                {schedule.year_level && (
                                    <div className="detail-item">
                                        <MdIcons.MdSchool />
                                        <span>Year {schedule.year_level}</span>
                                    </div>
                                )}
                                
                                {schedule.section && (
                                    <div className="detail-item">
                                        <MdIcons.MdGroup />
                                        <span>Section {schedule.section}</span>
                                    </div>
                                )}
                                
                                {schedule.description && (
                                    <div className="schedule-description">
                                        <p>{schedule.description}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Create/Edit Schedule Modal */}
            {state.showModal && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content large-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{state.editingSchedule ? 'Edit Schedule' : 'Create New Schedule'}</h2>
                            <button className="modal-close" onClick={closeModal}>
                                <MdIcons.MdClose />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="schedule-form">
                            {/* Basic Information */}
                            <div className="form-section">
                                <h3>Basic Information</h3>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Schedule Name *</label>
                                        <input
                                            type="text"
                                            value={formData.schedule_name}
                                            onChange={e => setFormData(prev => ({ ...prev, schedule_name: e.target.value }))}
                                            placeholder="Enter schedule name"
                                            required
                                        />
                                    </div>
                                    
                                    <div className="form-group">
                                        <label>Department</label>
                                        <select
                                            value={formData.department}
                                            onChange={e => setFormData(prev => ({ ...prev, department: e.target.value }))}
                                        >
                                            <option value="">Select Department</option>
                                            {handler.getAvailableDepartments().map(dept => (
                                                <option key={dept} value={dept}>{dept}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Year Level</label>
                                        <select
                                            value={formData.year_level}
                                            onChange={e => setFormData(prev => ({ ...prev, year_level: e.target.value }))}
                                        >
                                            <option value="">Select Year</option>
                                            {handler.getAvailableYearLevels().map(year => (
                                                <option key={year} value={year}>Year {year}</option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                    <div className="form-group">
                                        <label>Section</label>
                                        <select
                                            value={formData.section}
                                            onChange={e => setFormData(prev => ({ ...prev, section: e.target.value }))}
                                        >
                                            <option value="">Select Section</option>
                                            {handler.getAvailableSections().map(section => (
                                                <option key={section} value={section}>Section {section}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                
                                <div className="form-group">
                                    <label>Description</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                        placeholder="Enter schedule description"
                                        rows={3}
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label className="checkbox-label">
                                        <input
                                            type="checkbox"
                                            checked={formData.is_active}
                                            onChange={e => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                                        />
                                        <span>Active Schedule</span>
                                    </label>
                                </div>
                            </div>

                            {/* Schedule Builder */}
                            <div className="form-section">
                                <h3>Schedule Builder</h3>
                                
                                {/* Add Time Slot */}
                                <div className="schedule-editor">
                                    <div className="editor-header">
                                        <h4>Add Time Slot</h4>
                                        <select
                                            value={scheduleEditor.selectedDay}
                                            onChange={e => setScheduleEditor(prev => ({ ...prev, selectedDay: e.target.value }))}
                                            className="day-selector"
                                        >
                                            {days.map(day => (
                                                <option key={day} value={day}>{day}</option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                    <div className="time-slot-editor">
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label>Start Time *</label>
                                                <input
                                                    type="time"
                                                    value={scheduleEditor.timeSlot.start_time}
                                                    onChange={e => setScheduleEditor(prev => ({
                                                        ...prev,
                                                        timeSlot: { ...prev.timeSlot, start_time: e.target.value }
                                                    }))}
                                                />
                                            </div>
                                            
                                            <div className="form-group">
                                                <label>End Time *</label>
                                                <input
                                                    type="time"
                                                    value={scheduleEditor.timeSlot.end_time}
                                                    onChange={e => setScheduleEditor(prev => ({
                                                        ...prev,
                                                        timeSlot: { ...prev.timeSlot, end_time: e.target.value }
                                                    }))}
                                                />
                                            </div>
                                        </div>
                                        
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label>Subject *</label>
                                                <input
                                                    type="text"
                                                    value={scheduleEditor.timeSlot.subject}
                                                    onChange={e => setScheduleEditor(prev => ({
                                                        ...prev,
                                                        timeSlot: { ...prev.timeSlot, subject: e.target.value }
                                                    }))}
                                                    placeholder="Subject name"
                                                />
                                            </div>
                                            
                                            <div className="form-group">
                                                <label>Room</label>
                                                <input
                                                    type="text"
                                                    value={scheduleEditor.timeSlot.room}
                                                    onChange={e => setScheduleEditor(prev => ({
                                                        ...prev,
                                                        timeSlot: { ...prev.timeSlot, room: e.target.value }
                                                    }))}
                                                    placeholder="Room number"
                                                />
                                            </div>
                                        </div>
                                        
                                        <div className="form-group">
                                            <label>Instructor</label>
                                            <input
                                                type="text"
                                                value={scheduleEditor.timeSlot.instructor}
                                                onChange={e => setScheduleEditor(prev => ({
                                                    ...prev,
                                                    timeSlot: { ...prev.timeSlot, instructor: e.target.value }
                                                }))}
                                                placeholder="Instructor name"
                                            />
                                        </div>
                                        
                                        <button type="button" onClick={addTimeSlot} className="add-slot-btn">
                                            <MdIcons.MdAdd />
                                            Add Time Slot
                                        </button>
                                    </div>
                                </div>

                                {/* Schedule Preview */}
                                <div className="schedule-preview">
                                    <h4>Schedule Preview</h4>
                                    <div className="preview-grid">
                                        {days.map(day => (
                                            <div key={day} className="day-column">
                                                <h5>{day}</h5>
                                                <div className="time-slots">
                                                    {formData.schedule_data[day]?.map((slot, index) => (
                                                        <div key={index} className="time-slot">
                                                            <div className="slot-header">
                                                                <span className="slot-time">
                                                                    {handler.formatTime(slot.start_time)} - {handler.formatTime(slot.end_time)}
                                                                </span>
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => removeTimeSlot(day, index)}
                                                                    className="remove-slot-btn"
                                                                    title="Remove time slot"
                                                                >
                                                                    <MdIcons.MdClose />
                                                                </button>
                                                            </div>
                                                            <div className="slot-details">
                                                                <strong>{slot.subject}</strong>
                                                                {slot.room && <div>Room: {slot.room}</div>}
                                                                {slot.instructor && <div>Instructor: {slot.instructor}</div>}
                                                            </div>
                                                        </div>
                                                    )) || <div className="no-slots">No classes scheduled</div>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="form-actions">
                                <button type="button" onClick={closeModal} className="cancel-btn">
                                    Cancel
                                </button>
                                <button type="submit" className="submit-btn" disabled={state.loading}>
                                    {state.loading ? (
                                        <BiIcons.BiLoaderAlt className="spin" />
                                    ) : (
                                        <MdIcons.MdSave />
                                    )}
                                    {state.editingSchedule ? 'Update Schedule' : 'Create Schedule'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Apply Schedule Modal */}
            {state.showApplyModal && state.selectedScheduleForApply && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Apply Schedule: {state.selectedScheduleForApply.schedule_name}</h2>
                            <button className="modal-close" onClick={closeModal}>
                                <MdIcons.MdClose />
                            </button>
                        </div>
                        
                        <form onSubmit={handleApplySchedule} className="apply-form">
                            <div className="form-group">
                                <label>Application Method</label>
                                <select
                                    value={applyData.method}
                                    onChange={e => setApplyData(prev => ({ ...prev, method: e.target.value }))}
                                >
                                    <option value="criteria">By Criteria (Department/Year/Section)</option>
                                    <option value="student_ids">By Student IDs</option>
                                </select>
                            </div>

                            {applyData.method === 'criteria' ? (
                                <div className="criteria-form">
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Department</label>
                                            <select
                                                value={applyData.department}
                                                onChange={e => setApplyData(prev => ({ ...prev, department: e.target.value }))}
                                            >
                                                <option value="">Select Department</option>
                                                {handler.getAvailableDepartments().map(dept => (
                                                    <option key={dept} value={dept}>{dept}</option>
                                                ))}
                                            </select>
                                        </div>
                                        
                                        <div className="form-group">
                                            <label>Year Level</label>
                                            <select
                                                value={applyData.year_level}
                                                onChange={e => setApplyData(prev => ({ ...prev, year_level: e.target.value }))}
                                            >
                                                <option value="">Select Year</option>
                                                {handler.getAvailableYearLevels().map(year => (
                                                    <option key={year} value={year}>Year {year}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <div className="form-group">
                                        <label>Section</label>
                                        <select
                                            value={applyData.section}
                                            onChange={e => setApplyData(prev => ({ ...prev, section: e.target.value }))}
                                        >
                                            <option value="">Select Section</option>
                                            {handler.getAvailableSections().map(section => (
                                                <option key={section} value={section}>Section {section}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            ) : (
                                <div className="form-group">
                                    <label>Student IDs (comma-separated)</label>
                                    <textarea
                                        value={applyData.student_ids_text}
                                        onChange={e => setApplyData(prev => ({ 
                                            ...prev, 
                                            student_ids_text: e.target.value
                                        }))}
                                        placeholder="Enter student IDs separated by commas"
                                        rows={3}
                                    />
                                </div>
                            )}
                            
                            <div className="form-actions">
                                <button type="button" onClick={closeModal} className="cancel-btn">
                                    Cancel
                                </button>
                                <button type="submit" className="submit-btn" disabled={state.loading}>
                                    {state.loading ? (
                                        <BiIcons.BiLoaderAlt className="spin" />
                                    ) : (
                                        <FaIcons.FaUsers />
                                    )}
                                    Apply Schedule
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Clear Schedules Modal */}
            {state.showClearModal && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Clear Student Schedules</h2>
                            <button className="modal-close" onClick={closeModal}>
                                <MdIcons.MdClose />
                            </button>
                        </div>
                        
                        <form onSubmit={handleClearSchedules} className="clear-form">
                            <div className="form-group">
                                <label>Clear Method</label>
                                <select
                                    value={clearData.method}
                                    onChange={e => setClearData(prev => ({ ...prev, method: e.target.value }))}
                                >
                                    <option value="criteria">By Criteria (Department/Year/Section)</option>
                                    <option value="student_ids">By Student IDs</option>
                                </select>
                            </div>

                            {clearData.method === 'criteria' ? (
                                <div className="criteria-form">
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Department</label>
                                            <select
                                                value={clearData.department}
                                                onChange={e => setClearData(prev => ({ ...prev, department: e.target.value }))}
                                            >
                                                <option value="">Select Department</option>
                                                {handler.getAvailableDepartments().map(dept => (
                                                    <option key={dept} value={dept}>{dept}</option>
                                                ))}
                                            </select>
                                        </div>
                                        
                                        <div className="form-group">
                                            <label>Year Level</label>
                                            <select
                                                value={clearData.year_level}
                                                onChange={e => setClearData(prev => ({ ...prev, year_level: e.target.value }))}
                                            >
                                                <option value="">Select Year</option>
                                                {handler.getAvailableYearLevels().map(year => (
                                                    <option key={year} value={year}>Year {year}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <div className="form-group">
                                        <label>Section</label>
                                        <select
                                            value={clearData.section}
                                            onChange={e => setClearData(prev => ({ ...prev, section: e.target.value }))}
                                        >
                                            <option value="">Select Section</option>
                                            {handler.getAvailableSections().map(section => (
                                                <option key={section} value={section}>Section {section}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            ) : (
                                <div className="form-group">
                                    <label>Student IDs (comma-separated)</label>
                                    <textarea
                                        value={clearData.student_ids_text}
                                        onChange={e => setClearData(prev => ({ 
                                            ...prev, 
                                            student_ids_text: e.target.value
                                        }))}
                                        placeholder="Enter student IDs separated by commas"
                                        rows={3}
                                    />
                                </div>
                            )}
                            
                            <div className="form-actions">
                                <button type="button" onClick={closeModal} className="cancel-btn">
                                    Cancel
                                </button>
                                <button type="submit" className="submit-btn danger" disabled={state.loading}>
                                    {state.loading ? (
                                        <BiIcons.BiLoaderAlt className="spin" />
                                    ) : (
                                        <MdIcons.MdClear />
                                    )}
                                    Clear Schedules
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClassSchedule;