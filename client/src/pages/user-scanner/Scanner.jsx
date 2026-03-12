import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
    MdRadar, 
    MdPerson, 
    MdSchool,
    MdAccessTime,
    MdCheckCircle,
    MdError,
    MdLogin,
    MdLogout
} from 'react-icons/md';
import ScannerAPI from '../../api/ScannerAPI';
import './Scanner.css';

const Scanner = () => {
    const [scanInput, setScanInput] = useState('');
    const [lastScanResult, setLastScanResult] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isLoading, setIsLoading] = useState(false);
    const [networkStatus, setNetworkStatus] = useState('online'); // online, offline, error
    
    const scanInputRef = useRef(null);
    const scanTimeoutRef = useRef(null);

    // Live clock update
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        
        return () => clearInterval(timer);
    }, []);

    // Auto-focus input when component mounts and keep it focused
    useEffect(() => {
        if (scanInputRef.current && !isLoading) {
            scanInputRef.current.focus();
        }
        
        // Keep input focused at all times (except when processing)
        const focusInterval = setInterval(() => {
            if (scanInputRef.current && !isLoading && document.activeElement !== scanInputRef.current) {
                scanInputRef.current.focus();
            }
        }, 100);
        
        return () => clearInterval(focusInterval);
    }, [isLoading]);

    // Cleanup pending scan timeouts when loading state changes
    useEffect(() => {
        if (isLoading && scanTimeoutRef.current) {
            clearTimeout(scanTimeoutRef.current);
            scanTimeoutRef.current = null;
        }
    }, [isLoading]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (scanTimeoutRef.current) {
                clearTimeout(scanTimeoutRef.current);
            }
        };
    }, []);

    // Keep input focused
    const handleInputBlur = useCallback(() => {
        // Don't refocus if we're currently processing
        if (isLoading) return;
        
        setTimeout(() => {
            if (scanInputRef.current && !isLoading) {
                scanInputRef.current.focus();
            }
        }, 10);
    }, [isLoading]);



    const handleScan = async (uid) => {
        if (!uid || uid.trim() === '') return;
        
        // Prevent multiple scans during processing
        if (isLoading) return;
        
        // Validate and format UID
        const formattedUID = ScannerAPI.formatUID(uid);
        if (!ScannerAPI.isValidUID(formattedUID)) {
            setLastScanResult({
                error: 'Invalid RFID card format. Please try scanning again.',
                timestamp: new Date().toISOString()
            });
            playSound('error');
            
            setTimeout(() => {
                setLastScanResult(null);
            }, 5000);
            return;
        }
        
        setIsLoading(true);

        try {
            const data = await ScannerAPI.scanRFID(formattedUID);

            if (data.success) {
                setLastScanResult({
                    ...data,
                    timestamp: new Date().toISOString()
                });
                
                // Play success sound
                playSound('success');
                
                // Show result for 5 seconds
                setTimeout(() => {
                    setLastScanResult(null);
                }, 5000);
                
            } else {
                // Display detailed error message from backend
                const errorMessage = data.message || 'Scan failed. Please try again.';
                setLastScanResult({ 
                    error: errorMessage,
                    user: data.user || null,
                    details: data.details || null,
                    timestamp: new Date().toISOString()
                });
                playSound('error');
                
                setTimeout(() => {
                    setLastScanResult(null);
                }, 7000); // Show error longer for reading
            }
        } catch (error) {
            console.error('Scan error:', error);
            
            // Handle different types of network errors
            let errorMessage = 'Connection error. Please check your network and try again.';
            
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                errorMessage = 'Unable to connect to server. Please check your internet connection.';
            } else if (error.status === 500) {
                errorMessage = 'Server error. Please contact system administrator.';
            } else if (error.status === 404) {
                errorMessage = 'Service not found. Please contact system administrator.';
            } else if (error.message) {
                errorMessage = `Network error: ${error.message}`;
            }
            
            setLastScanResult({
                error: errorMessage,
                timestamp: new Date().toISOString()
            });
            playSound('error');
            
            setTimeout(() => {
                setLastScanResult(null);
            }, 7000); // Show error longer for reading
        } finally {
            setIsLoading(false);
            
            // Clear any pending scan timeout since we just processed
            if (scanTimeoutRef.current) {
                clearTimeout(scanTimeoutRef.current);
                scanTimeoutRef.current = null;
            }
        }
    };

    const playSound = (type) => {
        // Create audio feedback for scans
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        if (type === 'success') {
            oscillator.frequency.value = 800;
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        } else {
            oscillator.frequency.value = 300;
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        }

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    };

    const handleInputChange = (e) => {
        // Prevent input changes during processing
        if (isLoading) return;
        
        const value = e.target.value;
        setScanInput(value);

        // Clear existing timeout
        if (scanTimeoutRef.current) {
            clearTimeout(scanTimeoutRef.current);
        }

        // Set timeout for auto-scan (simulating RFID reader behavior)
        if (value.length >= 8) { // Minimum UID length
            scanTimeoutRef.current = setTimeout(() => {
                handleScan(value);
                setScanInput(''); // Clear input after scan
            }, 300); // 300ms delay to allow for complete RFID read
        }
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return '--:--';
        return new Date(timestamp).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const formatClock = () => {
        return currentTime.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
    };

    const formatDate = () => {
        return currentTime.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div className="scanner-container">
            {/* Header with School Name and Live Clock */}
            <div className="scanner-header">
                <div className="school-info">
                    <h1>Mariano Marcos State University</h1>
                    <p>Attendance Scanner System</p>
                </div>
                
                <div className="live-clock">
                    <div className="time-display">
                        <MdAccessTime className="clock-icon" />
                        {formatClock()}
                    </div>
                    <div className="date-display">
                        {formatDate()}
                    </div>
                </div>
            </div>

            {/* Scanner Status */}
            <div className="scanner-status">
                <div className={`status-indicator ${isLoading ? 'processing' : 'active'}`}>
                    <MdRadar className="radar-icon" />
                    <span>{isLoading ? 'Processing Scan...' : 'Scanner Active - Ready to Scan'}</span>
                </div>
            </div>

            {/* Hidden Input for RFID Detection */}
            <input
                ref={scanInputRef}
                type="text"
                value={scanInput}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                className="hidden-input"
                autoComplete="off"
                autoFocus
                disabled={isLoading}
                style={{ pointerEvents: isLoading ? 'none' : 'auto' }}
            />

            {/* Last Scan Result */}
            {lastScanResult && (
                <div className={`scan-result ${lastScanResult.error ? 'error' : 'success'}`}>
                    {lastScanResult.error ? (
                        <div className="scan-result-content">
                            <MdError className="result-icon error-icon" />
                            <div className="result-info">
                                <h2>⚠️ Scan Failed</h2>
                                <div className="error-message">
                                    <div className="main-error-container">
                                        <p className="main-error">{lastScanResult.error}</p>
                                    </div>
                                    {lastScanResult.details && (
                                        <div className="error-details">
                                            <h4>📋 Additional Information:</h4>
                                            <p>{lastScanResult.details}</p>
                                        </div>
                                    )}
                                </div>
                                {lastScanResult.user && (
                                    <div className="user-brief">
                                        <h4>👤 Card Information:</h4>
                                        <div className="user-info-brief">
                                            <div className="user-avatar-small">
                                                {lastScanResult.user.avatar ? (
                                                    <img src={lastScanResult.user.avatar} alt="Profile" />
                                                ) : (
                                                    <div className="avatar-placeholder">
                                                        {lastScanResult.user.type === 'student' ? <MdSchool /> : <MdPerson />}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="user-details-brief">
                                                <p className="user-name">📛 {lastScanResult.user.name}</p>
                                                <p className="user-type">🏫 {lastScanResult.user.type?.toUpperCase()}</p>
                                                <p className="user-id">🆔 {lastScanResult.user.id}</p>
                                                {lastScanResult.user.department && (
                                                    <p className="user-department">🏢 {lastScanResult.user.department}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div className="scan-timestamp">
                                    <MdAccessTime />
                                    <span>⏰ Scan attempted at: {formatTime(lastScanResult.timestamp)}</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="scan-result-content">
                            <div className="result-icon">
                                {lastScanResult.action === 'time_in' ? 
                                    <MdLogin className="time-in-icon" /> : 
                                    <MdLogout className="time-out-icon" />
                                }
                            </div>
                            <div className="result-info">
                                <h2>{lastScanResult.action === 'time_in' ? 'TIME IN' : 'TIME OUT'}</h2>
                                <div className="user-profile">
                                    <div className="user-avatar">
                                        {lastScanResult.user.avatar ? (
                                            <img src={lastScanResult.user.avatar} alt="Profile" />
                                        ) : (
                                            <div className="avatar-placeholder">
                                                {lastScanResult.user.type === 'student' ? <MdSchool /> : <MdPerson />}
                                            </div>
                                        )}
                                    </div>
                                    <div className="user-details">
                                        <h3>{lastScanResult.user.name}</h3>
                                        <p>{lastScanResult.user.type?.toUpperCase()}</p>
                                        <p>ID: {lastScanResult.user.id}</p>
                                    </div>
                                </div>
                                <div className="scan-time">
                                    <MdAccessTime />
                                    <span>{formatTime(lastScanResult.timestamp)}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Default Message */}
            {!lastScanResult && !isLoading && (
                <div className="default-message">
                    <MdRadar className="scanning-icon" />
                    <h2>Ready to Scan</h2>
                    <p>Tap your RFID card or ID to record attendance</p>
                </div>
            )}

            {/* Loading State */}
            {isLoading && (
                <div className="loading-state">
                    <div className="loading-spinner"></div>
                    <h2>Processing...</h2>
                    <p>Please wait while we process your attendance</p>
                </div>
            )}
        </div>
    );
};

export default Scanner;
