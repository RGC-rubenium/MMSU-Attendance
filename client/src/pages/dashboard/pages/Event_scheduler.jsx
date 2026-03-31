import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './Event_scheduler.css';
import EventScheduleHandler from '../../../api/EventScheduleHandler';
import * as MdIcons from "react-icons/md";
import * as IoIcons from "react-icons/io5";
import * as BiIcons from "react-icons/bi";
import LoadingScreen from '../../../components/common/LoadingScreen';

const Event_scheduler = () => {
    const [state, setState] = useState({
        events: [],
        loading: false,
        error: '',
        showModal: false,
        editingEvent: null,
        searchQuery: ''
    });

    const [formData, setFormData] = useState({
        event_name: '',
        event_date: '',
        schedule: {
            time_in: '',
            time_out: '',
            description: '',
            location: ''
        }
    });

    // Memoize handler to prevent recreation on every render
    const handler = useMemo(() => new EventScheduleHandler(), []);

    const fetchEvents = useCallback(async (searchQuery = '') => {
        setState(prev => ({ ...prev, loading: true, error: '' }));
        
        try {
            const params = {};
            
            if (searchQuery.trim()) {
                params.search = searchQuery.trim();
            }
            
            const data = await handler.fetchEventSchedules(params);
            
            setState(prev => ({
                ...prev,
                events: data.items || [],
                loading: false
            }));
        } catch (err) {
            console.error('Failed to fetch events:', err);
            setState(prev => ({
                ...prev,
                error: err.message || 'Failed to load events',
                loading: false
            }));
        }
    }, [handler]);

    // Fetch events on component mount
    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    const handleSearch = useCallback((e) => {
        const query = e.target.value;
        setState(prev => ({ ...prev, searchQuery: query }));
        
        // Debounce search
        const timeoutId = setTimeout(() => {
            fetchEvents(query);
        }, 300);
        
        return () => clearTimeout(timeoutId);
    }, [fetchEvents]);

    const openModal = useCallback((event = null) => {
        if (event) {
            // Edit mode
            setFormData({
                event_name: event.event_name,
                event_date: event.event_date,
                schedule: event.schedule || {
                    time_in: '',
                    time_out: '',
                    description: '',
                    location: ''
                }
            });
            setState(prev => ({ ...prev, editingEvent: event, showModal: true }));
        } else {
            // Add mode
            setFormData({
                event_name: '',
                event_date: '',
                schedule: {
                    time_in: '',
                    time_out: '',
                    description: '',
                    location: ''
                }
            });
            setState(prev => ({ ...prev, editingEvent: null, showModal: true }));
        }
    }, []);

    const closeModal = useCallback(() => {
        setState(prev => ({ ...prev, showModal: false, editingEvent: null }));
        setFormData({
            event_name: '',
            event_date: '',
            schedule: {
                time_in: '',
                time_out: '',
                description: '',
                location: ''
            }
        });
    }, []);

    const handleFormChange = useCallback((field, value) => {
        if (field.startsWith('schedule.')) {
            const scheduleField = field.split('.')[1];
            setFormData(prev => ({
                ...prev,
                schedule: {
                    ...prev.schedule,
                    [scheduleField]: value
                }
            }));
        } else {
            setFormData(prev => ({ ...prev, [field]: value }));
        }
    }, []);

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        
        if (!formData.event_name.trim()) {
            setState(prev => ({ ...prev, error: 'Event name is required' }));
            return;
        }
        
        if (!formData.event_date) {
            setState(prev => ({ ...prev, error: 'Event date is required' }));
            return;
        }
        
        if (!formData.schedule.time_in || !formData.schedule.time_out) {
            setState(prev => ({ ...prev, error: 'Time in and time out are required' }));
            return;
        }
        
        setState(prev => ({ ...prev, loading: true, error: '' }));
        
        try {
            if (state.editingEvent) {
                // Update existing event
                await handler.updateEventSchedule(state.editingEvent.id, formData);
            } else {
                // Create new event
                await handler.createEventSchedule(formData);
            }
            
            // Refresh events list
            await fetchEvents(state.searchQuery);
            
            // Close modal
            closeModal();
            
            setState(prev => ({ ...prev, loading: false }));
        } catch (err) {
            console.error('Failed to save event:', err);
            setState(prev => ({
                ...prev,
                error: err.message || 'Failed to save event',
                loading: false
            }));
        }
    }, [formData, state.editingEvent, state.searchQuery, fetchEvents, closeModal]);

    const handleDelete = useCallback(async (eventId) => {
        if (!window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
            return;
        }
        
        setState(prev => ({ ...prev, loading: true, error: '' }));
        
        try {
            await handler.deleteEventSchedule(eventId);
            
            // Refresh events list
            await fetchEvents(state.searchQuery);
            
            setState(prev => ({ ...prev, loading: false }));
        } catch (err) {
            console.error('Failed to delete event:', err);
            setState(prev => ({
                ...prev,
                error: err.message || 'Failed to delete event',
                loading: false
            }));
        }
    }, [state.searchQuery, fetchEvents]);

    const formatDate = useCallback((dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }, []);

    const formatTime = useCallback((timeString) => {
        if (!timeString) return 'Not set';
        return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    }, []);

    return (
        <div className="event-scheduler-wrapper">
            <div className="event-scheduler-header">
                <div className="header-content">
                    <h1>Event Scheduler</h1>
                    <p>Create and manage attendance events</p>
                </div>
                
                <div className="header-actions">
                    <div className="search-box">
                        <MdIcons.MdSearch className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search events..."
                            value={state.searchQuery}
                            onChange={handleSearch}
                        />
                    </div>
                    
                    <button 
                        className="add-event-btn"
                        onClick={() => openModal()}
                        disabled={state.loading}
                    >
                        <MdIcons.MdAdd />
                        Add Event
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
                <LoadingScreen 
                    message="Loading events" 
                    size="medium"
                />
            )}

            <div className="events-grid">
                {state.events.length === 0 && !state.loading ? (
                    <div className="empty-state">
                        <IoIcons.IoCalendarOutline />
                        <h3>No events scheduled</h3>
                        <p>Create your first event to get started</p>
                        <button 
                            className="empty-add-btn"
                            onClick={() => openModal()}
                        >
                            <MdIcons.MdAdd />
                            Add Event
                        </button>
                    </div>
                ) : (
                    state.events.map(event => (
                        <div key={event.id} className="event-card">
                            <div className="event-header">
                                <h3>{event.event_name}</h3>
                                <div className="event-actions">
                                    <button 
                                        className="edit-btn"
                                        onClick={() => openModal(event)}
                                        title="Edit event"
                                    >
                                        <MdIcons.MdEdit />
                                    </button>
                                    <button 
                                        className="delete-btn"
                                        onClick={() => handleDelete(event.id)}
                                        title="Delete event"
                                    >
                                        <MdIcons.MdDelete />
                                    </button>
                                </div>
                            </div>
                            
                            <div className="event-details">
                                <div className="event-date">
                                    <IoIcons.IoCalendarOutline />
                                    <span>{formatDate(event.event_date)}</span>
                                </div>
                                
                                <div className="event-time">
                                    <IoIcons.IoTimeOutline />
                                    <span>
                                        {formatTime(event.schedule?.time_in)} - {formatTime(event.schedule?.time_out)}
                                    </span>
                                </div>
                                
                                {event.schedule?.location && (
                                    <div className="event-location">
                                        <IoIcons.IoLocationOutline />
                                        <span>{event.schedule.location}</span>
                                    </div>
                                )}
                                
                                {event.schedule?.description && (
                                    <div className="event-description">
                                        <p>{event.schedule.description}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal */}
            {state.showModal && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{state.editingEvent ? 'Edit Event' : 'Add New Event'}</h2>
                            <button className="modal-close" onClick={closeModal}>
                                <MdIcons.MdClose />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="event-form">
                            <div className="form-group">
                                <label>Event Name *</label>
                                <input
                                    type="text"
                                    value={formData.event_name}
                                    onChange={e => handleFormChange('event_name', e.target.value)}
                                    placeholder="Enter event name"
                                    required
                                />
                            </div>
                            
                            <div className="form-group">
                                <label>Event Date *</label>
                                <input
                                    type="date"
                                    value={formData.event_date}
                                    onChange={e => handleFormChange('event_date', e.target.value)}
                                    required
                                />
                            </div>
                            
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Time In *</label>
                                    <input
                                        type="time"
                                        value={formData.schedule.time_in}
                                        onChange={e => handleFormChange('schedule.time_in', e.target.value)}
                                        required
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label>Time Out *</label>
                                    <input
                                        type="time"
                                        value={formData.schedule.time_out}
                                        onChange={e => handleFormChange('schedule.time_out', e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            
                            <div className="form-group">
                                <label>Location</label>
                                <input
                                    type="text"
                                    value={formData.schedule.location}
                                    onChange={e => handleFormChange('schedule.location', e.target.value)}
                                    placeholder="Enter event location"
                                />
                            </div>
                            
                            <div className="form-group">
                                <label>Description</label>
                                <textarea
                                    value={formData.schedule.description}
                                    onChange={e => handleFormChange('schedule.description', e.target.value)}
                                    placeholder="Enter event description"
                                    rows={3}
                                />
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
                                    {state.editingEvent ? 'Update Event' : 'Create Event'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Event_scheduler;