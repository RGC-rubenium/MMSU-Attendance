import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
    MdRadar, 
    MdPerson, 
    MdSchool,
    MdAccessTime,
    MdCheckCircle,
    MdError,
    MdLogout,
    MdArrowBack
} from 'react-icons/md';
import ScannerAPI from '../../api/ScannerAPI';
import './Scanner.css';

const TimeOutScanner = () => {
    const [scanInput, setScanInput] = useState('');
    const [lastScanResult, setLastScanResult] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isLoading, setIsLoading] = useState(false);
    const [networkStatus, setNetworkStatus] = useState('online');
    
    const scanInputRef = useRef(null);
    const scanTimeoutRef = useRef(null);
    const displayTimeoutRef = useRef(null);

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
            if (displayTimeoutRef.current) {
                clearTimeout(displayTimeoutRef.current);
            }
        };
    }, []);

    // Keep input focused
    const handleInputBlur = useCallback(() => {
        if (isLoading) return;
        
        setTimeout(() => {
            if (scanInputRef.current && !isLoading) {
                scanInputRef.current.focus();
            }
        }, 10);
    }, [isLoading]);

    const handleTimeOutScan = async (uid) => {
        if (!uid || uid.trim() === '') return;
        
        // Prevent multiple scans during processing
        if (isLoading) return;
        
        // Validate and format UID
        const formattedUID = ScannerAPI.formatUID(uid);
        if (!ScannerAPI.isValidUID(formattedUID)) {
            if (displayTimeoutRef.current) {
                clearTimeout(displayTimeoutRef.current);
            }
            
            setLastScanResult({
                error: 'Invalid RFID card format. Please try scanning again.',
                timestamp: new Date().toISOString()
            });
            playSound('error');
            
            displayTimeoutRef.current = setTimeout(() => {
                setLastScanResult(null);
            }, 5000);
            return;
        }
        
        setIsLoading(true);

        try {
            // Call specific time-out API
            const data = await ScannerAPI.scanTimeOut(formattedUID);

            if (data.success) {
                if (displayTimeoutRef.current) {
                    clearTimeout(displayTimeoutRef.current);
                }
                
                setLastScanResult({
                    ...data,
                    action: 'time_out',
                    timestamp: new Date().toISOString()
                });
                
                playSound('success');
                
                displayTimeoutRef.current = setTimeout(() => {
                    setLastScanResult(null);
                }, 5000);
                
            } else {
                if (displayTimeoutRef.current) {
                    clearTimeout(displayTimeoutRef.current);
                }
                
                const errorMessage = data.message || 'Time-out failed. Please try again.';
                setLastScanResult({ 
                    error: errorMessage,
                    user: data.user || null,
                    details: data.details || null,
                    timestamp: new Date().toISOString()
                });
                playSound('error');
                
                displayTimeoutRef.current = setTimeout(() => {
                    setLastScanResult(null);
                }, 7000);
            }
        } catch (error) {
            console.error('Time-out scan error:', error);
            
            if (displayTimeoutRef.current) {
                clearTimeout(displayTimeoutRef.current);
            }
            
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
            
            displayTimeoutRef.current = setTimeout(() => {
                setLastScanResult(null);
            }, 7000);
        } finally {
            setIsLoading(false);
            
            if (scanTimeoutRef.current) {
                clearTimeout(scanTimeoutRef.current);
                scanTimeoutRef.current = null;
            }
        }
    };

    const playSound = (type) => {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            if (type === 'success') {
                oscillator.frequency.value = 600; // Different frequency for time-out
                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            } else {
                oscillator.frequency.value = 300;
                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            }

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (error) {
            console.warn('Audio playback failed:', error);
        }
    };

    const handleInputChange = (e) => {
        if (isLoading) return;
        
        const value = e.target.value;
        setScanInput(value);

        if (scanTimeoutRef.current) {
            clearTimeout(scanTimeoutRef.current);
        }

        if (value.length >= 8) { // Minimum UID length
            scanTimeoutRef.current = setTimeout(() => {
                handleTimeOutScan(value);
                setScanInput(''); // Clear input after scan
            }, 300);
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

    const navigateToTimeIn = () => {
        window.location.href = '/scanner/time-in';
    };

    const calculateDuration = (timeIn, timeOut) => {
        if (!timeIn || !timeOut) return '';
        
        const inTime = new Date(timeIn);
        const outTime = new Date(timeOut);
        const diffMs = outTime - inTime;
        
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    };

    return (
        <div className="scanner-container time-out-scanner">
            {/* Header with School Name and Live Clock */}
            <div className="scanner-header">
                <div className="school-info">
                    <h1>Mariano Marcos State University</h1>
                    <p>TIME-OUT Scanner System</p>
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

            {/* Scanner Mode Indicator */}
            <div className="scanner-mode">
                <button 
                    className="switch-mode-btn" 
                    onClick={navigateToTimeIn}
                    title="Switch to Time-In Scanner"
                >
                    <MdArrowBack />
                    <span>Switch to TIME-IN</span>
                </button>
                <div className="mode-indicator time-out">
                    <MdLogout className="mode-icon" />
                    <span>TIME-OUT MODE</span>
                </div>
            </div>

            {/* Scanner Status */}
            <div className="scanner-status">
                <div className={`status-indicator ${isLoading ? 'processing' : 'active'} time-out`}>
                    <MdRadar className="radar-icon" />
                    <span>{isLoading ? 'Processing Time-Out...' : 'Scanner Active - Ready for Time-Out'}</span>
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
                <div className={`scan-result ${lastScanResult.error ? 'error' : 'success time-out'}`}>
                    {lastScanResult.error ? (
                        <div className="scan-result-content">
                            <MdError className="result-icon error-icon" />
                            <div className="result-info">
                                <h2>⚠️ Time-Out Failed</h2>
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
                                <MdLogout className="time-out-icon" />
                            </div>
                            <div className="result-info">
                                <h2>✅ TIME OUT SUCCESSFUL</h2>
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
                                        {lastScanResult.user.department && (
                                            <p>Department: {lastScanResult.user.department}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="scan-time">
                                    <MdAccessTime />
                                    <span>Recorded at: {formatTime(lastScanResult.timestamp)}</span>
                                </div>
                                {lastScanResult.time_in && (
                                    <div className="duration-info">
                                        <h4>⏱️ Session Duration:</h4>
                                        <p>Time In: {formatTime(lastScanResult.time_in)}</p>
                                        <p>Duration: {calculateDuration(lastScanResult.time_in, lastScanResult.timestamp)}</p>
                                    </div>
                                )}
                                {lastScanResult.subjects_attended && lastScanResult.subjects_attended.length > 0 && (
                                    <div className="subjects-info">
                                        <h4>📚 Subjects Attended:</h4>
                                        <ul>
                                            {lastScanResult.subjects_attended.map((subject, index) => (
                                                <li key={index}>{subject.subject} ({subject.start_time} - {subject.end_time})</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Default Message */}
            {!lastScanResult && !isLoading && (
                <div className="default-message time-out">
                    <MdLogout className="scanning-icon time-out" />
                    <h2>Ready for Time-Out</h2>
                    <p>Tap your RFID card or ID to record your departure time</p>
                    <div className="instruction-text">
                        <p>👋 Finished your day? Use this scanner to check out!</p>
                    </div>
                </div>
            )}

            {/* Loading State */}
            {isLoading && (
                <div className="loading-state time-out">
                    <div className="loading-spinner time-out"></div>
                    <h2>Processing Time-Out...</h2>
                    <p>Please wait while we record your departure and calculate attendance</p>
                </div>
            )}
        </div>
    );
};

export default TimeOutScanner;