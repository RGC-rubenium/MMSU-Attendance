import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './Device.css';

const DeviceCheck = () => {
    const [status, setStatus] = useState('checking');
    const [message, setMessage] = useState('Checking device status...');
    const [deviceInfo, setDeviceInfo] = useState(null);
    const [countdown, setCountdown] = useState(30);
    const [currentTime, setCurrentTime] = useState(new Date());
    
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    
    // Get device ID from URL or localStorage
    const getDeviceId = () => {
        const urlDeviceId = searchParams.get('device_id');
        if (urlDeviceId) {
            localStorage.setItem('mmsu_device_id', urlDeviceId);
            return urlDeviceId;
        }
        return localStorage.getItem('mmsu_device_id');
    };

    // Update clock
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Countdown timer for auto-refresh
    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    checkDeviceEligibility();
                    return 30;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Initial check
    useEffect(() => {
        checkDeviceEligibility();
    }, []);

    const checkDeviceEligibility = async () => {
        setStatus('checking');
        setMessage('Checking device status...');

        const deviceId = getDeviceId();

        if (!deviceId) {
            setStatus('register');
            setMessage('Device registration required');
            return;
        }

        try {
            const response = await fetch(`/api/device/check-eligibility?device_id=${deviceId}`);
            const data = await response.json();

            if (data.eligible) {
                setStatus('approved');
                setMessage('Device approved! Redirecting to scanner...');
                setDeviceInfo(data.device);

                // Redirect to the appropriate scanner
                setTimeout(() => {
                    const redirectUrl = data.redirect || '/scanner/time-in';
                    navigate(`${redirectUrl}?device_id=${deviceId}`);
                }, 2000);
            } else {
                handleEligibilityFailure(data, deviceId);
            }
        } catch (error) {
            console.error('Error checking eligibility:', error);
            setStatus('error');
            setMessage('Unable to connect to server');
        }
    };

    const handleEligibilityFailure = async (data, deviceId) => {
        switch (data.reason) {
            case 'no_device_id':
            case 'not_registered':
                setStatus('register');
                setMessage('Device registration required');
                break;

            case 'pending_approval':
                setStatus('pending');
                setMessage('Awaiting admin approval');
                setDeviceInfo({
                    device_id: deviceId,
                    pairing_code: data.pairing_code
                });
                break;

            case 'disabled':
                setStatus('disabled');
                setMessage('Device has been disabled');
                break;

            case 'not_paired':
                // Check detailed status
                try {
                    const statusResponse = await fetch(`/api/device/status/${deviceId}`);
                    const statusData = await statusResponse.json();

                    if (statusData.status === 'pending') {
                        setStatus('pending');
                        setMessage('Awaiting admin approval');
                        setDeviceInfo({
                            device_id: deviceId,
                            pairing_code: statusData.pairing_code
                        });
                    } else if (statusData.status === 'rejected') {
                        setStatus('rejected');
                        setMessage(statusData.reason || 'Registration rejected');
                    } else {
                        setStatus('register');
                        setMessage('Device registration required');
                    }
                } catch {
                    setStatus('register');
                    setMessage('Device registration required');
                }
                break;

            default:
                setStatus('error');
                setMessage(data.message || 'Unknown error');
        }
    };

    const goToRegistration = () => {
        navigate('/pairing');
    };

    const resetAndRegister = () => {
        localStorage.removeItem('mmsu_device_id');
        localStorage.removeItem('mmsu_pairing_code');
        navigate('/pairing');
    };

    const getStatusIcon = () => {
        switch (status) {
            case 'checking': return '🔄';
            case 'approved': return '✅';
            case 'pending': return '⏳';
            case 'disabled': return '🔒';
            case 'rejected': return '❌';
            case 'error': return '⚠️';
            case 'register': return '📝';
            default: return '❓';
        }
    };

    return (
        <div className="device-check-container">
            <div className="device-check-header">
                <div className="clock">{currentTime.toLocaleTimeString()}</div>
                {status !== 'approved' && (
                    <div className="refresh-indicator">
                        Auto-refresh in {countdown}s
                    </div>
                )}
            </div>

            <div className="device-check-content">
                <div className="logo">📱</div>
                <h1>MMSU Attendance System</h1>
                <p className="subtitle">Scanner Device</p>

                <div className={`status-card status-${status}`}>
                    <div className="status-icon">{getStatusIcon()}</div>
                    
                    {status === 'checking' && (
                        <div className="spinner"></div>
                    )}
                    
                    <div className="status-text">{message}</div>

                    {status === 'pending' && deviceInfo && (
                        <div className="pairing-info">
                            <div className="pairing-code-container">
                                <div className="pairing-code-label">Your Pairing Code</div>
                                <div className="pairing-code">{deviceInfo.pairing_code || '------'}</div>
                                <div className="pairing-instructions">
                                    Share this code with an administrator to approve your device.
                                </div>
                            </div>
                            <div className="device-info">
                                <div className="device-info-row">
                                    <span className="device-info-label">Device ID:</span>
                                    <span className="device-info-value">{deviceInfo.device_id}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {(status === 'register' || status === 'rejected') && (
                        <button className="btn btn-primary" onClick={status === 'rejected' ? resetAndRegister : goToRegistration}>
                            {status === 'rejected' ? 'Submit New Request' : 'Register Device'}
                        </button>
                    )}

                    {(status === 'error' || status === 'disabled') && (
                        <button className="btn btn-secondary" onClick={checkDeviceEligibility}>
                            Check Again
                        </button>
                    )}

                    {status === 'approved' && (
                        <div className="progress-container">
                            <div className="progress-bar"></div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DeviceCheck;
