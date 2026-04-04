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
    MdRestartAlt,
    MdPower,
    MdPowerOff,
    MdPlayArrow,
    MdStop
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
            
            if (data.success) {
                setDevices(data.devices);
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

    // Execute the actual command API call
    const executeDeviceCommand = async (deviceId, command, deviceName, isOnline) => {
        const commandNames = {
            'reboot': 'Reboot',
            'shutdown': 'Shutdown',
            'restart_kiosk': 'Restart Kiosk'
        };
        
        try {
            const response = await fetch(`/api/admin/rpi/devices/${deviceId}/command`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    command,
                    admin_user: 'admin'
                })
            });

            const data = await response.json();
            
            if (data.success) {
                const statusMsg = isOnline 
                    ? `Command "${commandNames[command]}" sent to ${deviceName}`
                    : `Command "${commandNames[command]}" queued for ${deviceName} (will execute when online)`;
                alert(statusMsg);
                fetchDevices();
                fetchStats();
            } else {
                alert(`Error: ${data.message}`);
            }
        } catch (error) {
            console.error('Error sending command:', error);
            alert('Error sending command: ' + error.message);
        }
    };

    // Send command to a single device - shows confirmation modal
    const sendDeviceCommand = (deviceId, command, deviceName) => {
        const commandNames = {
            'reboot': 'Reboot',
            'shutdown': 'Shutdown',
            'restart_kiosk': 'Restart Kiosk'
        };
        
        // Find the device to check if it's online
        const device = devices.find(d => d.device_id === deviceId);
        const isOnline = device?.is_online;
        
        const confirmMessage = isOnline 
            ? `Are you sure you want to ${commandNames[command]} "${deviceName}"?`
            : `Device "${deviceName}" is offline. Queue ${commandNames[command]} command? It will execute when the device comes online.`;
        
        const confirmClass = command === 'shutdown' ? 'btn-danger' : 
                            command === 'reboot' ? 'btn-warning' : 'btn-primary';
        
        showConfirmation(
            commandNames[command],
            confirmMessage,
            () => executeDeviceCommand(deviceId, command, deviceName, isOnline),
            isOnline ? 'Execute' : 'Queue Command',
            confirmClass
        );
    };

    // Execute bulk command API call
    const executeBulkCommand = async (command, target) => {
        const commandNames = {
            'reboot': 'Reboot',
            'shutdown': 'Shutdown',
            'restart_kiosk': 'Restart Kiosk'
        };
        
        try {
            const response = await fetch('/api/admin/rpi/devices/bulk/command', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    command,
                    target,
                    admin_user: 'admin'
                })
            });

            const data = await response.json();
            
            if (data.success) {
                alert(`Command "${commandNames[command]}" sent to ${data.affected_devices} devices`);
                fetchDevices();
                fetchStats();
            } else {
                alert(`Error: ${data.message}`);
            }
        } catch (error) {
            console.error('Error sending bulk command:', error);
            alert('Error sending bulk command');
        }
    };

    // Send command to all devices - shows confirmation modal
    const sendBulkCommand = (command, target = 'online') => {
        const commandNames = {
            'reboot': 'Reboot',
            'shutdown': 'Shutdown',
            'restart_kiosk': 'Restart Kiosk'
        };
        
        const targetNames = {
            'online': 'all ONLINE',
            'enabled': 'all ENABLED',
            'all': 'ALL'
        };
        
        const confirmClass = command === 'shutdown' ? 'btn-danger' : 
                            command === 'reboot' ? 'btn-warning' : 'btn-primary';
        
        showConfirmation(
            `${commandNames[command]} All Devices`,
            `Are you sure you want to ${commandNames[command]} ${targetNames[target]} devices?`,
            () => executeBulkCommand(command, target),
            'Execute',
            confirmClass
        );
    };

    // Execute bulk enable/disable API call
    const executeBulkEnable = async (enabled) => {
        try {
            const response = await fetch('/api/admin/rpi/devices/bulk/enable', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ enabled })
            });

            const data = await response.json();
            
            if (data.success) {
                alert(`${enabled ? 'Enabled' : 'Disabled'} ${data.affected_devices} devices`);
                fetchDevices();
                fetchStats();
            } else {
                alert(`Error: ${data.message}`);
            }
        } catch (error) {
            console.error('Error bulk updating devices:', error);
            alert('Error updating devices');
        }
    };

    // Enable or disable all devices - shows confirmation modal
    const bulkEnableDevices = (enabled) => {
        const action = enabled ? 'Enable' : 'Disable';
        
        showConfirmation(
            `${action} All Devices`,
            `Are you sure you want to ${action.toLowerCase()} ALL devices?`,
            () => executeBulkEnable(enabled),
            action,
            enabled ? 'btn-success' : 'btn-secondary'
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

            {/* Bulk Control Panel */}
            <div className="bulk-controls">
                <div className="bulk-control-section">
                    <h3><MdPower /> Power Control (All Online Devices)</h3>
                    <div className="bulk-buttons">
                        <button 
                            className="btn btn-warning"
                            onClick={() => sendBulkCommand('restart_kiosk', 'online')}
                            disabled={stats.online === 0}
                            title="Restart kiosk on all online devices"
                        >
                            <MdRefresh /> Restart Kiosk
                        </button>
                        <button 
                            className="btn btn-info"
                            onClick={() => sendBulkCommand('reboot', 'online')}
                            disabled={stats.online === 0}
                            title="Reboot all online devices"
                        >
                            <MdRestartAlt /> Reboot All
                        </button>
                        <button 
                            className="btn btn-danger"
                            onClick={() => sendBulkCommand('shutdown', 'online')}
                            disabled={stats.online === 0}
                            title="Shutdown all online devices"
                        >
                            <MdPowerOff /> Shutdown All
                        </button>
                    </div>
                </div>
                <div className="bulk-control-section">
                    <h3><MdPowerSettingsNew /> Enable/Disable All</h3>
                    <div className="bulk-buttons">
                        <button 
                            className="btn btn-success"
                            onClick={() => bulkEnableDevices(true)}
                            title="Enable all devices"
                        >
                            <MdPlayArrow /> Enable All
                        </button>
                        <button 
                            className="btn btn-secondary"
                            onClick={() => bulkEnableDevices(false)}
                            title="Disable all devices"
                        >
                            <MdStop /> Disable All
                        </button>
                        <button 
                            className="btn btn-outline"
                            onClick={() => { fetchDevices(); fetchStats(); }}
                            title="Refresh device list"
                        >
                            <MdRefresh /> Refresh
                        </button>
                    </div>
                </div>
            </div>

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
                <div className="devices-list">
                    {devices.length === 0 ? (
                        <div className="empty-state">
                            <MdDevices />
                            <h3>No Devices Paired</h3>
                            <p>No Raspberry Pi devices have been paired yet.</p>
                        </div>
                    ) : (
                        devices.map(device => (
                            <div key={device.id} className={`device-card ${device.is_online ? 'online' : 'offline'} ${!device.is_enabled ? 'disabled' : ''}`}>
                                <div className="device-header">
                                    <div className="device-info">
                                        {getStatusIcon(device)}
                                        <div className="device-details">
                                            <h3>{device.device_name}</h3>
                                            <p className="device-id">ID: {device.device_id}</p>
                                            {device.pending_command && (
                                                <p className="pending-command">
                                                    ⏳ Pending: {device.pending_command}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="device-actions">
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
                                </div>
                                
                                {/* Device Power Controls */}
                                <div className="device-power-controls">
                                    <button
                                        className="btn-sm btn-warning"
                                        onClick={() => sendDeviceCommand(device.device_id, 'restart_kiosk', device.device_name)}
                                        disabled={!device.is_enabled}
                                        title={device.is_online ? "Restart Kiosk" : "Queue restart (device offline)"}
                                    >
                                        <MdRefresh /> Restart Kiosk
                                    </button>
                                    <button
                                        className="btn-sm btn-info"
                                        onClick={() => sendDeviceCommand(device.device_id, 'reboot', device.device_name)}
                                        disabled={!device.is_enabled}
                                        title={device.is_online ? "Reboot Device" : "Queue reboot (device offline)"}
                                    >
                                        <MdRestartAlt /> Reboot
                                    </button>
                                    <button
                                        className="btn-sm btn-danger"
                                        onClick={() => sendDeviceCommand(device.device_id, 'shutdown', device.device_name)}
                                        disabled={!device.is_enabled}
                                        title={device.is_online ? "Shutdown Device" : "Queue shutdown (device offline)"}
                                    >
                                        <MdPowerOff /> Shutdown
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
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
        config: device.config_data || {}
    });

    const handleSave = () => {
        onSave(device.device_id, config);
    };

    return (
        <div className="modal-overlay">
            <div className="modal">
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