import React, { useState, useEffect } from 'react';
import { 
    MdDevices, 
    MdWifiOff, 
    MdWifi, 
    MdSettings, 
    MdPowerSettingsNew,
    MdDelete,
    MdLocationOn,
    MdSchedule,
    MdCheckCircle,
    MdCancel,
    MdRefresh,
    MdEdit,
    MdAccessTime,
    MdRestartAlt,
    MdSync,
    MdSelectAll,
    MdCheckBox,
    MdCheckBoxOutlineBlank,
    MdVpnKey
} from 'react-icons/md';
import './RpiManagement.css';
import LoadingScreen from '../common/LoadingScreen';

const RpiManagement = () => {
    const [devices, setDevices] = useState([]);
    const [pairingRequests, setPairingRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('devices');
    const [editingDevice, setEditingDevice] = useState(null);
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [stats, setStats] = useState({ total: 0, online: 0, enabled: 0, pending_commands: 0 });
    
    // Selection state for bulk actions
    const [selectedDevices, setSelectedDevices] = useState(new Set());
    const [actionLoading, setActionLoading] = useState(false);
    
    // Confirmation modal state
    const [confirmModal, setConfirmModal] = useState({
        show: false,
        title: '',
        message: '',
        onConfirm: null,
        confirmText: 'Confirm',
        confirmClass: 'btn-primary'
    });

    const showConfirmation = (title, message, onConfirm, confirmText = 'Confirm', confirmClass = 'btn-primary') => {
        setConfirmModal({
            show: true,
            title,
            message,
            onConfirm,
            confirmText,
            confirmClass
        });
    };

    const hideConfirmation = () => {
        setConfirmModal({
            show: false,
            title: '',
            message: '',
            onConfirm: null,
            confirmText: 'Confirm',
            confirmClass: 'btn-primary'
        });
    };

    useEffect(() => {
        fetchDevices();
        fetchPairingRequests();
        fetchStats();
        
        // Set up auto-refresh every 10 seconds for real-time status
        const interval = setInterval(() => {
            fetchDevices();
            fetchPairingRequests();
            fetchStats();
        }, 10000);

        return () => clearInterval(interval);
    }, []);

    const fetchStats = async () => {
        try {
            const response = await fetch('/api/admin/rpi/stats');
            const data = await response.json();
            if (data.success) {
                setStats(data.stats);
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const fetchDevices = async () => {
        try {
            const response = await fetch('/api/admin/rpi/devices');
            const data = await response.json();
            
            console.log('Devices API response:', data);
            
            if (data.success) {
                setDevices(data.devices);
            } else {
                console.error('Failed to fetch devices:', data.message);
            }
        } catch (error) {
            console.error('Error fetching devices:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPairingRequests = async () => {
        try {
            const response = await fetch('/api/admin/rpi/pairing/requests?status=pending');
            const data = await response.json();
            
            if (data.success) {
                setPairingRequests(data.requests);
            }
        } catch (error) {
            console.error('Error fetching pairing requests:', error);
        }
    };

    const approvePairing = async (requestId) => {
        try {
            const response = await fetch('/api/admin/rpi/pairing/approve', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    request_id: requestId,
                    admin_user: 'admin' // This should come from authentication
                })
            });

            const data = await response.json();
            
            if (data.success) {
                alert('Pairing request approved successfully!');
                fetchDevices();
                fetchPairingRequests();
            } else {
                alert(`Error: ${data.message}`);
            }
        } catch (error) {
            console.error('Error approving pairing:', error);
            alert('Error approving pairing request');
        }
    };

    const rejectPairing = async (requestId) => {
        const reason = prompt('Enter rejection reason (optional):') || 'No reason provided';
        
        try {
            const response = await fetch('/api/admin/rpi/pairing/reject', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    request_id: requestId,
                    reason: reason,
                    admin_user: 'admin'
                })
            });

            const data = await response.json();
            
            if (data.success) {
                alert('Pairing request rejected');
                fetchPairingRequests();
            } else {
                alert(`Error: ${data.message}`);
            }
        } catch (error) {
            console.error('Error rejecting pairing:', error);
            alert('Error rejecting pairing request');
        }
    };

    const toggleDevice = async (deviceId, enabled) => {
        try {
            const response = await fetch(`/api/admin/rpi/devices/${deviceId}/enable`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ enabled })
            });

            const data = await response.json();
            
            if (data.success) {
                fetchDevices();
            } else {
                alert(`Error: ${data.message}`);
            }
        } catch (error) {
            console.error('Error toggling device:', error);
            alert('Error updating device status');
        }
    };

    const unpairDevice = async (deviceId, deviceName) => {
        showConfirmation(
            'Unpair Device',
            `Are you sure you want to unpair "${deviceName}"? It will need to be re-paired to access the scanner.`,
            async () => {
                try {
                    const response = await fetch(`/api/admin/rpi/devices/${deviceId}/unpair`, {
                        method: 'POST'
                    });

                    const data = await response.json();
                    
                    if (data.success) {
                        alert('Device unpaired successfully');
                        fetchDevices();
                    } else {
                        alert(`Error: ${data.message}`);
                    }
                } catch (error) {
                    console.error('Error unpairing device:', error);
                    alert('Error unpairing device');
                }
            },
            'Unpair',
            'btn-danger'
        );
    };

    const saveDeviceConfig = async (deviceId, config) => {
        try {
            const response = await fetch(`/api/admin/rpi/devices/${deviceId}/config`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(config)
            });

            const data = await response.json();
            
            if (data.success) {
                setEditingDevice(null);
                setShowConfigModal(false);
                fetchDevices();
                alert('Device configuration updated successfully');
            } else {
                alert(`Error: ${data.message}`);
            }
        } catch (error) {
            console.error('Error saving config:', error);
            alert('Error saving configuration');
        }
    };

    // ==================== SSH Remote Actions ====================
    
    const rebootDevice = async (deviceId, deviceName) => {
        showConfirmation(
            'Reboot Device',
            `Are you sure you want to reboot "${deviceName}"? This will temporarily disconnect the device.`,
            async () => {
                setActionLoading(true);
                try {
                    const response = await fetch(`/api/admin/rpi/devices/${deviceId}/ssh/reboot`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ admin_user: 'admin' })
                    });
                    const data = await response.json();
                    if (data.success) {
                        alert('Reboot command sent successfully');
                        fetchDevices();
                    } else {
                        alert(`Error: ${data.message}`);
                    }
                } catch (error) {
                    console.error('Error rebooting device:', error);
                    alert('Error sending reboot command');
                } finally {
                    setActionLoading(false);
                }
            },
            'Reboot',
            'btn-warning'
        );
    };

    const shutdownDevice = async (deviceId, deviceName) => {
        showConfirmation(
            'Shutdown Device',
            `Are you sure you want to shutdown "${deviceName}"? The device will need to be manually powered on.`,
            async () => {
                setActionLoading(true);
                try {
                    const response = await fetch(`/api/admin/rpi/devices/${deviceId}/ssh/shutdown`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ admin_user: 'admin' })
                    });
                    const data = await response.json();
                    if (data.success) {
                        alert('Shutdown command sent successfully');
                        fetchDevices();
                    } else {
                        alert(`Error: ${data.message}`);
                    }
                } catch (error) {
                    console.error('Error shutting down device:', error);
                    alert('Error sending shutdown command');
                } finally {
                    setActionLoading(false);
                }
            },
            'Shutdown',
            'btn-danger'
        );
    };

    const syncDeviceTime = async (deviceId, deviceName) => {
        setActionLoading(true);
        try {
            const response = await fetch(`/api/admin/rpi/devices/${deviceId}/ssh/sync-time`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();
            if (data.success) {
                alert(`Time synced successfully to ${data.server_time}`);
            } else {
                alert(`Error: ${data.message}`);
            }
        } catch (error) {
            console.error('Error syncing device time:', error);
            alert('Error syncing device time');
        } finally {
            setActionLoading(false);
        }
    };

    // ==================== Selection Functions ====================
    
    const toggleDeviceSelection = (deviceId) => {
        setSelectedDevices(prev => {
            const newSet = new Set(prev);
            if (newSet.has(deviceId)) {
                newSet.delete(deviceId);
            } else {
                newSet.add(deviceId);
            }
            return newSet;
        });
    };

    const selectAllDevices = () => {
        if (selectedDevices.size === devices.length) {
            setSelectedDevices(new Set());
        } else {
            setSelectedDevices(new Set(devices.map(d => d.device_id)));
        }
    };

    const selectDevicesWithSSH = () => {
        const sshDevices = devices.filter(d => d.has_ssh_credentials).map(d => d.device_id);
        setSelectedDevices(new Set(sshDevices));
    };

    // ==================== Bulk Actions ====================
    
    const bulkReboot = () => {
        const selectedCount = selectedDevices.size;
        const devicesWithSSH = devices.filter(d => selectedDevices.has(d.device_id) && d.has_ssh_credentials);
        
        showConfirmation(
            'Bulk Reboot',
            `Are you sure you want to reboot ${selectedCount} device(s)? ${devicesWithSSH.length} device(s) with SSH credentials will be rebooted.`,
            async () => {
                setActionLoading(true);
                try {
                    const response = await fetch('/api/admin/rpi/bulk/reboot', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            device_ids: Array.from(selectedDevices),
                            admin_user: 'admin'
                        })
                    });
                    const data = await response.json();
                    if (data.success) {
                        const { success, skipped, failed } = data.summary;
                        alert(`Bulk reboot: ${success} success, ${skipped} skipped (no SSH), ${failed} failed`);
                        setSelectedDevices(new Set());
                        fetchDevices();
                    } else {
                        alert(`Error: ${data.message}`);
                    }
                } catch (error) {
                    console.error('Error in bulk reboot:', error);
                    alert('Error performing bulk reboot');
                } finally {
                    setActionLoading(false);
                }
            },
            'Reboot All',
            'btn-warning'
        );
    };

    const bulkShutdown = () => {
        const selectedCount = selectedDevices.size;
        const devicesWithSSH = devices.filter(d => selectedDevices.has(d.device_id) && d.has_ssh_credentials);
        
        showConfirmation(
            'Bulk Shutdown',
            `Are you sure you want to shutdown ${selectedCount} device(s)? ${devicesWithSSH.length} device(s) with SSH credentials will be shut down. They will need to be manually powered on.`,
            async () => {
                setActionLoading(true);
                try {
                    const response = await fetch('/api/admin/rpi/bulk/shutdown', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            device_ids: Array.from(selectedDevices),
                            admin_user: 'admin'
                        })
                    });
                    const data = await response.json();
                    if (data.success) {
                        const { success, skipped, failed } = data.summary;
                        alert(`Bulk shutdown: ${success} success, ${skipped} skipped (no SSH), ${failed} failed`);
                        setSelectedDevices(new Set());
                        fetchDevices();
                    } else {
                        alert(`Error: ${data.message}`);
                    }
                } catch (error) {
                    console.error('Error in bulk shutdown:', error);
                    alert('Error performing bulk shutdown');
                } finally {
                    setActionLoading(false);
                }
            },
            'Shutdown All',
            'btn-danger'
        );
    };

    const bulkSyncTime = async () => {
        const selectedCount = selectedDevices.size;
        const devicesWithSSH = devices.filter(d => selectedDevices.has(d.device_id) && d.has_ssh_credentials);
        
        showConfirmation(
            'Bulk Time Sync',
            `Sync server time to ${selectedCount} device(s)? ${devicesWithSSH.length} device(s) with SSH credentials will be synced.`,
            async () => {
                setActionLoading(true);
                try {
                    const response = await fetch('/api/admin/rpi/bulk/sync-time', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            device_ids: Array.from(selectedDevices)
                        })
                    });
                    const data = await response.json();
                    if (data.success) {
                        const { success, skipped, failed } = data.summary;
                        alert(`Time sync: ${success} success, ${skipped} skipped (no SSH), ${failed} failed. Server time: ${data.server_time}`);
                        setSelectedDevices(new Set());
                    } else {
                        alert(`Error: ${data.message}`);
                    }
                } catch (error) {
                    console.error('Error in bulk time sync:', error);
                    alert('Error performing bulk time sync');
                } finally {
                    setActionLoading(false);
                }
            },
            'Sync Time',
            'btn-info'
        );
    };

    const getStatusIcon = (device) => {
        if (!device.is_enabled) {
            return <MdPowerSettingsNew className="status-icon disabled" title="Disabled" />;
        }
        return device.is_online ? 
            <MdWifi className="status-icon online" title="Online" /> : 
            <MdWifiOff className="status-icon offline" title="Offline" />;
    };

    const getLastSeen = (lastHeartbeat) => {
        if (!lastHeartbeat) return 'Never';
        
        const now = new Date();
        const heartbeat = new Date(lastHeartbeat);
        const diffMs = now - heartbeat;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} minutes ago`;
        
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours} hours ago`;
        
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays} days ago`;
    };

    if (loading) {
        return (
            <div className="rpi-management">
                <LoadingScreen 
                    message="Loading devices" 
                    size="large"
                />
            </div>
        );
    }

    return (
        <div className="rpi-management">
            <div className="header">
                <h1>
                    <MdDevices />
                    RPi Device Management
                </h1>
                <div className="header-stats">
                    <div className="stat online">
                        <span className="stat-value">{stats.online}</span>
                        <span className="stat-label">Online</span>
                    </div>
                    <div className="stat">
                        <span className="stat-value">{stats.enabled}</span>
                        <span className="stat-label">Enabled</span>
                    </div>
                    <div className="stat">
                        <span className="stat-value">{stats.total}</span>
                        <span className="stat-label">Total</span>
                    </div>
                    <div className="stat pending">
                        <span className="stat-value">{pairingRequests.length}</span>
                        <span className="stat-label">Pending</span>
                    </div>
                </div>
            </div>

            <div className="header-actions">
                <button 
                    className="btn btn-outline"
                    onClick={() => { fetchDevices(); fetchStats(); }}
                    title="Refresh device list"
                    disabled={actionLoading}
                >
                    <MdRefresh /> Refresh
                </button>
            </div>

            {/* Bulk Action Bar - Show when devices are selected */}
            {selectedDevices.size > 0 && activeTab === 'devices' && (
                <div className="bulk-action-bar">
                    <div className="bulk-info">
                        <span className="selected-count">{selectedDevices.size} device(s) selected</span>
                        <button className="btn btn-sm btn-outline" onClick={() => setSelectedDevices(new Set())}>
                            Clear Selection
                        </button>
                    </div>
                    <div className="bulk-actions">
                        <button 
                            className="btn btn-warning" 
                            onClick={bulkReboot}
                            disabled={actionLoading}
                            title="Reboot selected devices"
                        >
                            <MdRestartAlt /> Reboot All
                        </button>
                        <button 
                            className="btn btn-danger" 
                            onClick={bulkShutdown}
                            disabled={actionLoading}
                            title="Shutdown selected devices"
                        >
                            <MdPowerSettingsNew /> Shutdown All
                        </button>
                        <button 
                            className="btn btn-info" 
                            onClick={bulkSyncTime}
                            disabled={actionLoading}
                            title="Sync time to selected devices"
                        >
                            <MdSync /> Sync Time All
                        </button>
                    </div>
                </div>
            )}

            <div className="tabs">
                <button 
                    className={`tab ${activeTab === 'devices' ? 'active' : ''}`}
                    onClick={() => setActiveTab('devices')}
                >
                    Paired Devices ({devices.length})
                </button>
                <button 
                    className={`tab ${activeTab === 'requests' ? 'active' : ''}`}
                    onClick={() => setActiveTab('requests')}
                >
                    Pairing Requests ({pairingRequests.length})
                </button>
            </div>

            {activeTab === 'devices' && (
                <div className="devices-section">
                    {/* Selection Controls */}
                    {devices.length > 0 && (
                        <div className="selection-controls">
                            <button 
                                className="btn btn-sm btn-outline"
                                onClick={selectAllDevices}
                            >
                                {selectedDevices.size === devices.length ? <MdCheckBox /> : <MdCheckBoxOutlineBlank />}
                                {selectedDevices.size === devices.length ? 'Deselect All' : 'Select All'}
                            </button>
                            <button 
                                className="btn btn-sm btn-outline"
                                onClick={selectDevicesWithSSH}
                                title="Select only devices with SSH credentials configured"
                            >
                                <MdVpnKey /> Select SSH-enabled
                            </button>
                        </div>
                    )}
                    
                    <div className="devices-list">
                        {devices.length === 0 ? (
                            <div className="empty-state">
                                <MdDevices />
                                <h3>No Devices Paired</h3>
                                <p>No Raspberry Pi devices have been paired yet.</p>
                            </div>
                        ) : (
                            devices.map(device => (
                                <div key={device.id} className={`device-card ${device.is_online ? 'online' : 'offline'} ${!device.is_enabled ? 'disabled' : ''} ${selectedDevices.has(device.device_id) ? 'selected' : ''}`}>
                                    <div className="device-header">
                                        <div className="device-info">
                                            <button 
                                                className="selection-checkbox"
                                                onClick={() => toggleDeviceSelection(device.device_id)}
                                            >
                                                {selectedDevices.has(device.device_id) ? <MdCheckBox /> : <MdCheckBoxOutlineBlank />}
                                            </button>
                                            {getStatusIcon(device)}
                                            <div className="device-details">
                                                <h3>
                                                    {device.device_name}
                                                    {device.has_ssh_credentials && (
                                                        <span className="ssh-badge" title="SSH credentials configured">
                                                            <MdVpnKey />
                                                        </span>
                                                    )}
                                                </h3>
                                                <p className="device-id">ID: {device.device_id}</p>
                                            </div>
                                        </div>
                                        <div className="device-actions">
                                            {/* SSH Actions - only show if device has SSH credentials */}
                                            {device.has_ssh_credentials && device.ip_address && (
                                                <>
                                                    <button
                                                        className="btn-icon"
                                                        onClick={() => syncDeviceTime(device.device_id, device.device_name)}
                                                        title="Sync Server Time"
                                                        disabled={actionLoading}
                                                    >
                                                        <MdSync />
                                                    </button>
                                                    <button
                                                        className="btn-icon warning"
                                                        onClick={() => rebootDevice(device.device_id, device.device_name)}
                                                        title="Reboot Device"
                                                        disabled={actionLoading}
                                                    >
                                                        <MdRestartAlt />
                                                    </button>
                                                    <button
                                                        className="btn-icon danger"
                                                        onClick={() => shutdownDevice(device.device_id, device.device_name)}
                                                        title="Shutdown Device"
                                                        disabled={actionLoading}
                                                    >
                                                        <MdPowerSettingsNew />
                                                    </button>
                                                </>
                                            )}
                                            <button
                                                className="btn-icon"
                                                onClick={() => setEditingDevice(device)}
                                                title="Edit Configuration"
                                            >
                                                <MdEdit />
                                            </button>
                                            <button
                                                className={`btn-icon ${device.is_enabled ? 'enabled' : 'disabled'}`}
                                                onClick={() => toggleDevice(device.device_id, !device.is_enabled)}
                                                title={device.is_enabled ? 'Disable Device' : 'Enable Device'}
                                            >
                                                <MdPowerSettingsNew />
                                            </button>
                                            <button
                                                className="btn-icon danger"
                                                onClick={() => unpairDevice(device.device_id, device.device_name)}
                                                title="Unpair Device"
                                            >
                                                <MdDelete />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="device-meta">
                                        {device.location && (
                                            <div className="meta-item">
                                                <MdLocationOn />
                                                <span>{device.location}</span>
                                            </div>
                                        )}
                                        <div className="meta-item">
                                            <MdSchedule />
                                            <span>Last seen: {getLastSeen(device.last_heartbeat)}</span>
                                        </div>
                                        <div className="meta-item">
                                            <MdSettings />
                                            <span>Mode: {device.scanner_mode}</span>
                                        </div>
                                        {device.ip_address && (
                                            <div className="meta-item">
                                                <span>IP: {device.ip_address}</span>
                                            </div>
                                        )}
                                        {device.auto_shutdown_enabled && device.auto_shutdown_time && (
                                            <div className="meta-item auto-shutdown">
                                                <MdAccessTime />
                                                <span>Auto-off: {device.auto_shutdown_time}</span>
                                            </div>
                                        )}
                                        {!device.has_ssh_credentials && (
                                            <div className="meta-item no-ssh">
                                                <MdVpnKey />
                                                <span>No SSH credentials</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'requests' && (
                <div className="requests-list">
                    {pairingRequests.length === 0 ? (
                        <div className="empty-state">
                            <MdCheckCircle />
                            <h3>No Pending Requests</h3>
                            <p>All pairing requests have been processed.</p>
                        </div>
                    ) : (
                        pairingRequests.map(request => (
                            <div key={request.id} className="request-card">
                                <div className="request-header">
                                    <div className="request-info">
                                        <h3>{request.device_name}</h3>
                                        <p className="device-id">ID: {request.device_id}</p>
                                        <p className="pairing-code">Code: {request.pairing_code}</p>
                                    </div>
                                    <div className="request-actions">
                                        <button
                                            className="btn btn-success"
                                            onClick={() => approvePairing(request.id)}
                                        >
                                            <MdCheckCircle /> Approve
                                        </button>
                                        <button
                                            className="btn btn-danger"
                                            onClick={() => rejectPairing(request.id)}
                                        >
                                            <MdCancel /> Reject
                                        </button>
                                    </div>
                                </div>

                                <div className="request-meta">
                                    {request.location && (
                                        <div className="meta-item">
                                            <MdLocationOn />
                                            <span>{request.location}</span>
                                        </div>
                                    )}
                                    {request.ip_address && (
                                        <div className="meta-item">
                                            <span>IP: {request.ip_address}</span>
                                        </div>
                                    )}
                                    {request.mac_address && (
                                        <div className="meta-item">
                                            <span>MAC: {request.mac_address}</span>
                                        </div>
                                    )}
                                    <div className="meta-item">
                                        <MdSchedule />
                                        <span>Requested: {new Date(request.created_at).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {editingDevice && (
                <DeviceConfigModal
                    device={editingDevice}
                    onSave={saveDeviceConfig}
                    onClose={() => setEditingDevice(null)}
                />
            )}

            {/* Confirmation Modal */}
            {confirmModal.show && (
                <div className="modal-overlay" onClick={hideConfirmation}>
                    <div className="modal confirm-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{confirmModal.title}</h2>
                            <button className="close-btn" onClick={hideConfirmation}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <p>{confirmModal.message}</p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={hideConfirmation}>
                                Cancel
                            </button>
                            <button 
                                className={`btn ${confirmModal.confirmClass}`}
                                onClick={() => {
                                    hideConfirmation();
                                    if (confirmModal.onConfirm) {
                                        confirmModal.onConfirm();
                                    }
                                }}
                            >
                                {confirmModal.confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const DeviceConfigModal = ({ device, onSave, onClose }) => {
    const [config, setConfig] = useState({
        device_name: device.device_name,
        location: device.location || '',
        scanner_mode: device.scanner_mode,
        is_enabled: device.is_enabled,
        auto_shutdown_enabled: device.auto_shutdown_enabled || false,
        auto_shutdown_time: device.auto_shutdown_time || '',
        ssh_username: device.ssh_username || '',
        ssh_password: '', // Don't pre-fill password for security
        ssh_port: device.ssh_port || 22,
        config: device.config_data || {}
    });
    
    const [showPassword, setShowPassword] = useState(false);

    const handleSave = () => {
        // Only include ssh_password if it was changed (not empty)
        const saveConfig = { ...config };
        if (!saveConfig.ssh_password) {
            delete saveConfig.ssh_password;
        }
        onSave(device.device_id, saveConfig);
    };

    return (
        <div className="modal-overlay">
            <div className="modal modal-large">
                <div className="modal-header">
                    <h2>Configure Device: {device.device_name}</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <div className="modal-body">
                    <div className="form-group">
                        <label>Device Name</label>
                        <input
                            type="text"
                            value={config.device_name}
                            onChange={(e) => setConfig({...config, device_name: e.target.value})}
                        />
                    </div>

                    <div className="form-group">
                        <label>Location</label>
                        <input
                            type="text"
                            value={config.location}
                            onChange={(e) => setConfig({...config, location: e.target.value})}
                        />
                    </div>

                    <div className="form-group">
                        <label>Scanner Mode</label>
                        <select
                            value={config.scanner_mode}
                            onChange={(e) => setConfig({...config, scanner_mode: e.target.value})}
                        >
                            <option value="both">Both (Time In & Time Out)</option>
                            <option value="time_in">Time In Only</option>
                            <option value="time_out">Time Out Only</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={config.is_enabled}
                                onChange={(e) => setConfig({...config, is_enabled: e.target.checked})}
                            />
                            Device Enabled
                        </label>
                    </div>

                    {/* SSH Credentials Section */}
                    <div className="form-section">
                        <h3><MdVpnKey /> SSH Remote Management</h3>
                        <p className="form-description">
                            Configure SSH credentials to enable remote reboot, shutdown, and time sync. 
                            {device.has_ssh_credentials && <span className="ssh-configured"> ✓ Credentials configured</span>}
                        </p>
                        
                        <div className="form-row">
                            <div className="form-group">
                                <label>SSH Username</label>
                                <input
                                    type="text"
                                    value={config.ssh_username}
                                    onChange={(e) => setConfig({...config, ssh_username: e.target.value})}
                                    placeholder="e.g., pi"
                                />
                            </div>
                            <div className="form-group">
                                <label>SSH Port</label>
                                <input
                                    type="number"
                                    value={config.ssh_port}
                                    onChange={(e) => setConfig({...config, ssh_port: parseInt(e.target.value) || 22})}
                                    placeholder="22"
                                    min="1"
                                    max="65535"
                                />
                            </div>
                        </div>
                        
                        <div className="form-group">
                            <label>SSH Password {device.has_ssh_credentials && '(leave blank to keep existing)'}</label>
                            <div className="password-input-wrapper">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={config.ssh_password}
                                    onChange={(e) => setConfig({...config, ssh_password: e.target.value})}
                                    placeholder={device.has_ssh_credentials ? '••••••••' : 'Enter password'}
                                />
                                <button 
                                    type="button"
                                    className="toggle-password"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? 'Hide' : 'Show'}
                                </button>
                            </div>
                            <span className="form-hint">
                                Required for remote reboot, shutdown, and time sync operations
                            </span>
                        </div>
                    </div>

                    <div className="form-section">
                        <h3><MdAccessTime /> Auto-Shutdown Schedule</h3>
                        <p className="form-description">
                            Configure automatic shutdown time for this device. The device will shut down daily at the specified time.
                        </p>
                        
                        <div className="form-group">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={config.auto_shutdown_enabled}
                                    onChange={(e) => setConfig({...config, auto_shutdown_enabled: e.target.checked})}
                                />
                                Enable Auto-Shutdown
                            </label>
                        </div>

                        {config.auto_shutdown_enabled && (
                            <div className="form-group">
                                <label>Shutdown Time (24-hour format)</label>
                                <input
                                    type="time"
                                    value={config.auto_shutdown_time}
                                    onChange={(e) => setConfig({...config, auto_shutdown_time: e.target.value})}
                                    required={config.auto_shutdown_enabled}
                                />
                                <span className="form-hint">
                                    Device will automatically shut down at this time daily
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                    <button className="btn btn-primary" onClick={handleSave}>
                        Save Configuration
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RpiManagement;