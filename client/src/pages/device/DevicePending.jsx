import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './Device.css';

const DevicePending = () => {
    const [deviceId, setDeviceId] = useState(null);
    const [pairingCode, setPairingCode] = useState(null);
    const [countdown, setCountdown] = useState(10);
    const [currentTime, setCurrentTime] = useState(new Date());
    
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Update clock
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Load device info
    useEffect(() => {
        const urlDeviceId = searchParams.get('device_id');
        const storedDeviceId = localStorage.getItem('mmsu_device_id');
        const storedPairingCode = localStorage.getItem('mmsu_pairing_code');

        setDeviceId(urlDeviceId || storedDeviceId);
        setPairingCode(storedPairingCode);

        // If we have a device ID from URL, store it
        if (urlDeviceId) {
            localStorage.setItem('mmsu_device_id', urlDeviceId);
        }
    }, [searchParams]);

    // Auto-check status
    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    checkStatus();
                    return 10;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [deviceId]);

    const checkStatus = async () => {
        if (!deviceId) return;

        try {
            const response = await fetch(`/api/device/check-eligibility?device_id=${deviceId}`);
            const data = await response.json();

            if (data.eligible) {
                // Approved! Redirect to scanner
                const redirectUrl = data.redirect || '/scanner/time-in';
                navigate(`${redirectUrl}?device_id=${deviceId}`);
            } else if (data.reason === 'pending_approval' && data.pairing_code) {
                setPairingCode(data.pairing_code);
                localStorage.setItem('mmsu_pairing_code', data.pairing_code);
            } else if (data.reason === 'disabled') {
                navigate(`/device/disabled?device_id=${deviceId}`);
            }
        } catch (error) {
            console.error('Error checking status:', error);
        }
    };

    const goToRegister = () => {
        localStorage.removeItem('mmsu_device_id');
        localStorage.removeItem('mmsu_pairing_code');
        navigate('/pairing');
    };

    return (
        <div className="device-check-container">
            <div className="device-check-header">
                <div className="clock">{currentTime.toLocaleTimeString()}</div>
                <div className="refresh-indicator">
                    Checking in {countdown}s
                </div>
            </div>

            <div className="device-check-content">
                <div className="logo">⏳</div>
                <h1>Awaiting Approval</h1>
                <p className="subtitle">Your device registration is pending</p>

                <div className="status-card status-pending">
                    <div className="status-icon">⏳</div>
                    <div className="status-text">Waiting for Administrator Approval</div>

                    {pairingCode && (
                        <div className="pairing-info">
                            <div className="pairing-code-container">
                                <div className="pairing-code-label">Your Pairing Code</div>
                                <div className="pairing-code">{pairingCode}</div>
                                <div className="pairing-instructions">
                                    Share this code with an administrator to approve your device.
                                </div>
                            </div>
                        </div>
                    )}

                    {deviceId && (
                        <div className="device-info">
                            <div className="device-info-row">
                                <span className="device-info-label">Device ID:</span>
                                <span className="device-info-value">{deviceId}</span>
                            </div>
                            <div className="device-info-row">
                                <span className="device-info-label">Status:</span>
                                <span className="device-info-value">Pending Approval</span>
                            </div>
                        </div>
                    )}

                    <div className="btn-group">
                        <button className="btn btn-secondary" onClick={checkStatus}>
                            Check Status Now
                        </button>
                        <button className="btn btn-secondary" onClick={goToRegister}>
                            New Request
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DevicePending;
