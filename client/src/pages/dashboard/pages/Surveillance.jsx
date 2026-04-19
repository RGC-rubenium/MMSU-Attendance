import React, { useState, useEffect } from 'react';
import './Surveillance.css';
import SurveillanceAPI from '../../../api/SurveillanceAPI';
import * as MdIcons from "react-icons/md";
import * as IoIcons from "react-icons/io5";
import * as BiIcons from "react-icons/bi";
import * as FaIcons from "react-icons/fa";
import LoadingScreen from '../../../components/common/LoadingScreen';

const Surveillance = () => {
    // State management
    const [cameras, setCameras] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [gridLayout, setGridLayout] = useState(4); // 1, 2, 4, 6, or 9 cameras per view
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedCamera, setSelectedCamera] = useState(null);
    const [fullscreenCamera, setFullscreenCamera] = useState(null);
    const [toast, setToast] = useState(null);
    
    // Form state
    const [formData, setFormData] = useState({
        name: '',
        rtsp_url: '',
        location: '',
        description: ''
    });

    const [testingConnection, setTestingConnection] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    // Fetch cameras on mount
    useEffect(() => {
        fetchCameras();
    }, []);

    const fetchCameras = async () => {
        try {
            setLoading(true);
            const response = await SurveillanceAPI.getCameras();
            if (response.success) {
                setCameras(response.cameras || []);
            }
        } catch (err) {
            console.error('Error fetching cameras:', err);
            setError('Failed to load cameras');
        } finally {
            setLoading(false);
        }
    };

    // Show toast notification
    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    // Form handlers
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (name === 'rtsp_url') {
            setTestResult(null);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            rtsp_url: '',
            location: '',
            description: ''
        });
        setTestResult(null);
    };

    // Test RTSP connection
    const handleTestConnection = async () => {
        if (!formData.rtsp_url.trim()) return;
        
        setTestingConnection(true);
        setTestResult(null);
        
        try {
            const response = await SurveillanceAPI.testRtspUrl(formData.rtsp_url);
            setTestResult({
                success: response.is_accessible,
                message: response.message
            });
        } catch (err) {
            setTestResult({
                success: false,
                message: err.message || 'Connection test failed'
            });
        } finally {
            setTestingConnection(false);
        }
    };

    // Add new camera
    const handleAddCamera = async (e) => {
        e.preventDefault();
        
        if (!formData.name.trim() || !formData.rtsp_url.trim()) {
            showToast('Name and RTSP URL are required', 'error');
            return;
        }
        
        setSubmitting(true);
        
        try {
            const response = await SurveillanceAPI.createCamera(formData);
            if (response.success) {
                setCameras(prev => [...prev, response.camera]);
                setShowAddModal(false);
                resetForm();
                showToast('Camera added successfully');
            }
        } catch (err) {
            showToast(err.message || 'Failed to add camera', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    // Edit camera
    const openEditModal = (camera) => {
        setSelectedCamera(camera);
        setFormData({
            name: camera.name,
            rtsp_url: camera.rtsp_url,
            location: camera.location || '',
            description: camera.description || ''
        });
        setTestResult(null);
        setShowEditModal(true);
    };

    const handleUpdateCamera = async (e) => {
        e.preventDefault();
        
        if (!selectedCamera) return;
        
        setSubmitting(true);
        
        try {
            const response = await SurveillanceAPI.updateCamera(selectedCamera.id, formData);
            if (response.success) {
                setCameras(prev => prev.map(cam => 
                    cam.id === selectedCamera.id ? response.camera : cam
                ));
                setShowEditModal(false);
                setSelectedCamera(null);
                resetForm();
                showToast('Camera updated successfully');
            }
        } catch (err) {
            showToast(err.message || 'Failed to update camera', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    // Delete camera
    const openDeleteModal = (camera) => {
        setSelectedCamera(camera);
        setShowDeleteModal(true);
    };

    const handleDeleteCamera = async () => {
        if (!selectedCamera) return;
        
        setSubmitting(true);
        
        try {
            const response = await SurveillanceAPI.deleteCamera(selectedCamera.id);
            if (response.success) {
                setCameras(prev => prev.filter(cam => cam.id !== selectedCamera.id));
                setShowDeleteModal(false);
                setSelectedCamera(null);
                showToast('Camera deleted successfully');
            }
        } catch (err) {
            showToast(err.message || 'Failed to delete camera', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    // Camera Card Component for MJPEG streaming
    const CameraCard = ({ camera, isFullscreen = false }) => {
        const [imgKey, setImgKey] = useState(0);
        const [streamError, setStreamError] = useState(false);
        const [streamLoading, setStreamLoading] = useState(true);

        // Use the API helper for stream URL
        const streamUrl = SurveillanceAPI.getStreamUrl(camera.id) + `?t=${Date.now()}&key=${imgKey}`;

        return (
            <div className={`camera-card ${isFullscreen ? 'expanded' : ''}`}>
                <div className={`camera-video-container ${streamLoading ? 'loading' : ''}`}>
                    {camera.is_active ? (
                        <>
                            <img
                                src={streamUrl}
                                alt={camera.name}
                                onLoad={() => {
                                    setStreamLoading(false);
                                    setStreamError(false);
                                }}
                                onError={() => {
                                    setStreamLoading(false);
                                    setStreamError(true);
                                }}
                                style={{ display: streamError ? 'none' : 'block', width: '100%', height: '100%', objectFit: 'cover' }}
                                draggable={false}
                            />
                            {streamError && (
                                <div className="camera-placeholder">
                                    <MdIcons.MdVideocamOff />
                                    <span>Stream unavailable</span>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="camera-placeholder">
                            <MdIcons.MdVideocamOff />
                            <span>Camera disabled</span>
                        </div>
                    )}

                    <div className={`camera-status ${camera.is_online ? 'online' : 'offline'}`}>
                        <span className="status-dot"></span>
                        {camera.is_online ? 'Live' : 'Offline'}
                    </div>

                    <div className="camera-actions-overlay">
                        <button
                            className="camera-action-btn"
                            onClick={() => setImgKey(k => k + 1)}
                            title="Reload Stream"
                        >
                            <MdIcons.MdRefresh />
                        </button>
                        <button
                            className="camera-action-btn"
                            onClick={() => setFullscreenCamera(isFullscreen ? null : camera)}
                            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                        >
                            {isFullscreen ? <MdIcons.MdFullscreenExit /> : <MdIcons.MdFullscreen />}
                        </button>
                        <button
                            className="camera-action-btn"
                            onClick={() => openEditModal(camera)}
                            title="Edit Camera"
                        >
                            <MdIcons.MdEdit />
                        </button>
                        <button
                            className="camera-action-btn delete"
                            onClick={() => openDeleteModal(camera)}
                            title="Delete Camera"
                        >
                            <MdIcons.MdDelete />
                        </button>
                    </div>
                </div>
                <div className="camera-info">
                    <h3>{camera.name}</h3>
                    <p>{camera.location || 'No location specified'}</p>
                </div>
            </div>
        );
    };

    // Render loading state
    if (loading) {
        return (
            <div className="surveillance-wrapper">
                <LoadingScreen 
                    message="Loading cameras" 
                    size="large" 
                    variant="surveillance"
                />
            </div>
        );
    }

    return (
        <div className="surveillance-wrapper">
            {/* Header */}
            <div className="surveillance-header">
                <div className="header-content">
                    <h1>Surveillance</h1>
                    <p>Monitor live camera feeds in real-time</p>
                </div>
                
                <div className="header-actions">
                    {/* Grid Layout Controls */}
                    <div className="layout-controls">
                        <button 
                            className={`layout-btn ${gridLayout === 1 ? 'active' : ''}`}
                            onClick={() => setGridLayout(1)}
                            title="1 Camera"
                        >
                            <MdIcons.MdCropSquare />
                        </button>
                        <button 
                            className={`layout-btn ${gridLayout === 2 ? 'active' : ''}`}
                            onClick={() => setGridLayout(2)}
                            title="2 Cameras"
                        >
                            <MdIcons.MdViewStream />
                        </button>
                        <button 
                            className={`layout-btn ${gridLayout === 4 ? 'active' : ''}`}
                            onClick={() => setGridLayout(4)}
                            title="4 Cameras"
                        >
                            <MdIcons.MdGridView />
                        </button>
                        <button 
                            className={`layout-btn ${gridLayout === 6 ? 'active' : ''}`}
                            onClick={() => setGridLayout(6)}
                            title="6 Cameras"
                        >
                            <MdIcons.MdApps />
                        </button>
                    </div>
                    
                    {/* Add Camera Button */}
                    <button 
                        className="add-camera-btn"
                        onClick={() => {
                            resetForm();
                            setShowAddModal(true);
                        }}
                    >
                        <MdIcons.MdAddCircleOutline />
                        Add Camera
                    </button>
                </div>
            </div>
            
            {/* Main Content */}
            <div className="surveillance-content">
                {cameras.length === 0 ? (
                    <div className="empty-state">
                        <MdIcons.MdVideocam className="empty-state-icon" />
                        <h2>No Cameras Added</h2>
                        <p>Start monitoring by adding your first RTSP camera. You can add IP cameras, DVR/NVR streams, or any RTSP-compatible video source.</p>
                        <button 
                            className="add-camera-btn"
                            onClick={() => {
                                resetForm();
                                setShowAddModal(true);
                            }}
                        >
                            <MdIcons.MdAddCircleOutline />
                            Add Your First Camera
                        </button>
                    </div>
                ) : (
                    <div className={`camera-grid grid-${gridLayout}`}>
                        {cameras.slice(0, gridLayout === 1 ? 1 : gridLayout).map(camera => (
                            <CameraCard key={camera.id} camera={camera} />
                        ))}
                    </div>
                )}
            </div>
            
            {/* Fullscreen View */}
            {fullscreenCamera && (
                <>
                    <div className="fullscreen-overlay" onClick={() => setFullscreenCamera(null)} />
                    <CameraCard camera={fullscreenCamera} isFullscreen={true} />
                </>
            )}
            
            {/* Add Camera Modal */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Add New Camera</h2>
                            <button className="modal-close" onClick={() => setShowAddModal(false)}>
                                <MdIcons.MdClose />
                            </button>
                        </div>
                        
                        <div className="modal-body">
                            <form onSubmit={handleAddCamera}>
                                <div className="form-group">
                                    <label>Camera Name <span className="required">*</span></label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        placeholder="e.g., Front Entrance, Hallway Camera 1"
                                        required
                                    />
                                </div>
                                
                                <div className="test-connection-row">
                                    <div className="form-group">
                                        <label>RTSP URL <span className="required">*</span></label>
                                        <input
                                            type="text"
                                            name="rtsp_url"
                                            value={formData.rtsp_url}
                                            onChange={handleInputChange}
                                            placeholder="rtsp://username:password@ip:port/stream"
                                            required
                                        />
                                        <span className="helper-text">
                                            Example: rtsp://admin:password@192.168.1.100:554/stream1
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        className={`test-btn ${testResult ? (testResult.success ? 'success' : 'error') : ''}`}
                                        onClick={handleTestConnection}
                                        disabled={!formData.rtsp_url.trim() || testingConnection}
                                    >
                                        {testingConnection ? 'Testing...' : testResult ? (testResult.success ? '✓ Connected' : '✗ Failed') : 'Test'}
                                    </button>
                                </div>
                                
                                <div className="form-group">
                                    <label>Location</label>
                                    <input
                                        type="text"
                                        name="location"
                                        value={formData.location}
                                        onChange={handleInputChange}
                                        placeholder="e.g., Building A - Ground Floor"
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label>Description</label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        placeholder="Additional notes about this camera..."
                                    />
                                </div>
                                
                                <div className="form-actions">
                                    <button 
                                        type="button" 
                                        className="btn-cancel"
                                        onClick={() => setShowAddModal(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit" 
                                        className="btn-submit"
                                        disabled={submitting}
                                    >
                                        {submitting ? 'Adding...' : 'Add Camera'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Edit Camera Modal */}
            {showEditModal && selectedCamera && (
                <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Edit Camera</h2>
                            <button className="modal-close" onClick={() => setShowEditModal(false)}>
                                <MdIcons.MdClose />
                            </button>
                        </div>
                        
                        <div className="modal-body">
                            <form onSubmit={handleUpdateCamera}>
                                <div className="form-group">
                                    <label>Camera Name <span className="required">*</span></label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        placeholder="e.g., Front Entrance, Hallway Camera 1"
                                        required
                                    />
                                </div>
                                
                                <div className="test-connection-row">
                                    <div className="form-group">
                                        <label>RTSP URL <span className="required">*</span></label>
                                        <input
                                            type="text"
                                            name="rtsp_url"
                                            value={formData.rtsp_url}
                                            onChange={handleInputChange}
                                            placeholder="rtsp://username:password@ip:port/stream"
                                            required
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        className={`test-btn ${testResult ? (testResult.success ? 'success' : 'error') : ''}`}
                                        onClick={handleTestConnection}
                                        disabled={!formData.rtsp_url.trim() || testingConnection}
                                    >
                                        {testingConnection ? 'Testing...' : testResult ? (testResult.success ? '✓ Connected' : '✗ Failed') : 'Test'}
                                    </button>
                                </div>
                                
                                <div className="form-group">
                                    <label>Location</label>
                                    <input
                                        type="text"
                                        name="location"
                                        value={formData.location}
                                        onChange={handleInputChange}
                                        placeholder="e.g., Building A - Ground Floor"
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label>Description</label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        placeholder="Additional notes about this camera..."
                                    />
                                </div>
                                
                                <div className="form-actions">
                                    <button 
                                        type="button" 
                                        className="btn-cancel"
                                        onClick={() => setShowEditModal(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit" 
                                        className="btn-submit"
                                        disabled={submitting}
                                    >
                                        {submitting ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Delete Confirmation Modal */}
            {showDeleteModal && selectedCamera && (
                <div className="modal-overlay delete-modal" onClick={() => setShowDeleteModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-body">
                            <div className="delete-icon">
                                <MdIcons.MdDelete />
                            </div>
                            <h3>Delete Camera?</h3>
                            <p>Are you sure you want to delete "{selectedCamera.name}"? This action cannot be undone.</p>
                            <div className="form-actions">
                                <button 
                                    type="button" 
                                    className="btn-cancel"
                                    onClick={() => setShowDeleteModal(false)}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="button" 
                                    className="btn-delete"
                                    onClick={handleDeleteCamera}
                                    disabled={submitting}
                                >
                                    {submitting ? 'Deleting...' : 'Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Toast Notification */}
            {toast && (
                <div className={`toast ${toast.type}`}>
                    {toast.type === 'success' ? <MdIcons.MdCheckCircle /> : <MdIcons.MdError />}
                    {toast.message}
                </div>
            )}
        </div>
    );
};

export default Surveillance;