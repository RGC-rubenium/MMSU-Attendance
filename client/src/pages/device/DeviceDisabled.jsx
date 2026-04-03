import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import './Device.css';

const DeviceDisabled = () => {
    const [deviceId, setDeviceId] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [countdown, setCountdown] = useState(60);
    
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
        setDeviceId(urlDeviceId || storedDeviceId);
    }, [searchParams]);

    // Auto-check status every minute
    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    checkStatus();
                    return 60;
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
                // Re-enabled! Redirect to scanner
                const redirectUrl = data.redirect || '/scanner/time-in';
                window.location.href = `${redirectUrl}?device_id=${deviceId}`;
            }
        } catch (error) {
            console.error('Error checking status:', error);
        }
    };

    return (
        <div className="device-check-container device-disabled-bg">
            <div className="device-check-header">
                <div className="clock">{currentTime.toLocaleTimeString()}</div>
                <div className="refresh-indicator">
                    Checking in {countdown}s
                </div>
            </div>

            <div className="device-check-content">
                <div className="logo">🔒</div>
                <h1>Device Disabled</h1>
                <p className="subtitle">This scanner has been temporarily disabled</p>

                <div className="status-card status-disabled">
                    <div className="status-icon">🔒</div>
                    <div className="status-text">Scanner Offline</div>
                    <div className="status-detail">
                        This device has been disabled by an administrator.
                    </div>

                    {deviceId && (
                        <div className="device-info">
                            <div className="device-info-row">
                                <span className="device-info-label">Device ID:</span>
                                <span className="device-info-value">{deviceId}</span>
                            </div>
                            <div className="device-info-row">
                                <span className="device-info-label">Status:</span>
                                <span className="device-info-value" style={{color: '#dc3545'}}>Disabled</span>
                            </div>
                        </div>
                    )}

                    <div className="contact-info">
                        <p>Please contact the system administrator for assistance.</p>
                    </div>

                    <button className="btn btn-secondary" onClick={checkStatus}>
                        Check Status
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeviceDisabled;
