import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
    MdRadar, 
    MdPerson, 
    MdSchool,
    MdAccessTime,
    MdCheckCircle,
    MdError,
    MdInfo,
    MdLogout,
    MdArrowBack,
    MdPermIdentity,
    MdBusiness,
    MdWarningAmber
} from 'react-icons/md';
import ScannerAPI from '../../api/ScannerAPI';
import { queueSMS } from '../../api/SmsAPI';
import './Scanner.css';

// Detect low-end device based on screen size or navigator hints
const isLowEndDevice = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    // Pi Zero typically runs at 800x600 or lower
    if (width <= 800 || height <= 600) return true;
    // Check for device memory if available (Chrome)
    if (navigator.deviceMemory && navigator.deviceMemory < 2) return true;
    // Check for hardware concurrency (low CPU cores)
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) return true;
    return false;
};

// Return a naive local ISO-like string (no timezone offset), e.g. "2026-04-21T03:33:00"
const naiveLocalIso = (d = new Date()) => {
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

const formatTimeForSMS = (timestamp) => {
    const d = new Date(timestamp);
    return d.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}


const TimeOutScanner = () => {
    // Configurable set of messages that should be treated as notices
    const NOTICE_MESSAGES = useMemo(() => new Set([
        'You already have an active time-in session',
        'No active time-in session found'
    ]), []);

    const isNoticeMessage = (msg) => {
        if (!msg) return false;
        return NOTICE_MESSAGES.has(msg);
    };
    const [scanInput, setScanInput] = useState('');
    const [lastScanResult, setLastScanResult] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isLoading, setIsLoading] = useState(false);
    const [networkStatus, setNetworkStatus] = useState('online');
    
    // Memoize low-end device check
    const lowEndMode = useMemo(() => isLowEndDevice(), []);
    
    const scanInputRef = useRef(null);
    const scanTimeoutRef = useRef(null);
    const displayTimeoutRef = useRef(null);
    const keyBufferRef = useRef('');
    const keyTimeoutRef = useRef(null);

    // Live clock update - slower interval on low-end devices
    useEffect(() => {
        const clockInterval = lowEndMode ? 1000 : 1000; // 1s for both low-end and normal devices
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, clockInterval);
        
        return () => clearInterval(timer);
    }, [lowEndMode]);

    // Sync with server time when device comes online
    // useEffect(() => {
    //     const syncWithServerTime = async () => {
    //         try {
    //             const res = await fetch('/api/rpi/heartbeat', {
    //                 method: 'POST',
    //                 headers: { 'Content-Type': 'application/json' },
    //                 body: JSON.stringify({ device_id: window.DEVICE_ID || 'web-client' })
    //             });
    //             const data = await res.json();
    //             if (data.success && data.server_time) {
    //                 setCurrentTime(new Date(data.server_time));
    //             }
    //         } catch (e) {
    //             // fallback: do nothing, use local time
    //         }
    //     };
    //     syncWithServerTime();
    // }, []);

    // Global keyboard capture for kiosk mode - captures input even without focus
    useEffect(() => {
        const handleGlobalKeyDown = (e) => {
            // Ignore if loading or if typing in an actual input field (other than our hidden one)
            if (isLoading) return;
            if (e.target.tagName === 'INPUT' && e.target !== scanInputRef.current) return;
            if (e.target.tagName === 'TEXTAREA') return;
            
            // Handle Enter key - process buffer immediately
            if (e.key === 'Enter') {
                e.preventDefault();
                if (keyBufferRef.current.length >= 8) {
                    handleTimeOutScan(keyBufferRef.current);
                    keyBufferRef.current = '';
                    setScanInput('');
                }
                return;
            }
            
            // Only capture alphanumeric characters for RFID
            if (e.key.length === 1 && /[a-zA-Z0-9]/.test(e.key)) {
                e.preventDefault();
                keyBufferRef.current += e.key;
                setScanInput(keyBufferRef.current);
                
                // Clear previous timeout
                if (keyTimeoutRef.current) {
                    clearTimeout(keyTimeoutRef.current);
                }
                
                // Auto-submit after brief pause (RFID scanners send data quickly)
                if (keyBufferRef.current.length >= 8) {
                    keyTimeoutRef.current = setTimeout(() => {
                        if (keyBufferRef.current.length >= 8) {
                            handleTimeOutScan(keyBufferRef.current);
                            keyBufferRef.current = '';
                            setScanInput('');
                        }
                    }, 300);
                }
            }
        };
        
        // Add global listener
        window.addEventListener('keydown', handleGlobalKeyDown, true);
        
        return () => {
            window.removeEventListener('keydown', handleGlobalKeyDown, true);
            if (keyTimeoutRef.current) {
                clearTimeout(keyTimeoutRef.current);
            }
        };
    }, [isLoading]);

    // Auto-focus input when component mounts and keep it focused
    useEffect(() => {
        // Immediate focus on mount
        const focusInput = () => {
            if (scanInputRef.current && !isLoading) {
                scanInputRef.current.focus();
            }
        };
        
        // Focus immediately
        focusInput();
        
        // Also focus after a short delay (for initial page load)
        const initialFocusTimeout = setTimeout(focusInput, 100);
        const secondFocusTimeout = setTimeout(focusInput, 500);
        
        // Keep input focused - less frequent on low-end devices
        const focusIntervalTime = lowEndMode ? 100 : 100;
        const focusInterval = setInterval(focusInput, focusIntervalTime);
        
        // Handle window focus events (when user clicks on browser window)
        const handleWindowFocus = () => {
            setTimeout(focusInput, 50);
        };
        
        // Handle visibility change (when tab becomes active)
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                setTimeout(focusInput, 50);
            }
        };
        
        // Handle click anywhere on document to refocus
        const handleDocumentClick = () => {
            setTimeout(focusInput, 10);
        };
        
        window.addEventListener('focus', handleWindowFocus);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        document.addEventListener('click', handleDocumentClick);
        
        return () => {
            clearInterval(focusInterval);
            clearTimeout(initialFocusTimeout);
            clearTimeout(secondFocusTimeout);
            window.removeEventListener('focus', handleWindowFocus);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            document.removeEventListener('click', handleDocumentClick);
        };
    }, [isLoading, lowEndMode]);

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
                timestamp: naiveLocalIso()
            });
            playSound('error');
            
            displayTimeoutRef.current = setTimeout(() => {
                setLastScanResult(null);
            }, 5000);
            return;
        }
        
        setIsLoading(true);

        try {
            // Call specific time-out API, pass client time (naive local, no timezone)
            const clientTime = naiveLocalIso();
            const data = await ScannerAPI.scanTimeOut(formattedUID, clientTime);

            if (data.success) {
                if (displayTimeoutRef.current) {
                    clearTimeout(displayTimeoutRef.current);
                }
                // Debug: Log the avatar URL
                console.log('🖼️ Debug - Received user data:', data.user);
                console.log('🖼️ Debug - Avatar URL:', data.user?.avatar);

                setLastScanResult({
                    ...data,
                    action: 'time_out',
                    timestamp: naiveLocalIso()
                });

                // --- SMS queueing if parent/guardian contact exists ---
                if (data.user && data.user.parent_contact) {
                    queueSMS({
                        mobile_num: data.user.parent_contact,
                        student_name: data.user.name,
                        attendance_type: 'timed-out',
                        attendance_time: formatTimeForSMS(naiveLocalIso())
                    });
                }
                console.log('📱 SMS queued for time-out (if applicable) with data:', {
                    mobile_num: data.user.parent_contact,
                    student_name: data.user.name,
                    attendance_type: 'timed-out',
                    attendance_time: formatTimeForSMS(naiveLocalIso())
                });
                // --- End SMS queueing ---

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
                    timestamp: naiveLocalIso()
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
                errorMessage = `${error.message}`;
            }
            
            setLastScanResult({
                error: errorMessage,
                timestamp: naiveLocalIso()
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
            // second: '2-digit'
        });
    };

    const formatClock = () => {
        return currentTime.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            // second: '2-digit',
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

    const calculateDuration = (timeIn, timeOut) => {
        if (!timeIn || !timeOut) return 'Unknown';
        
        try {
            const start = new Date(timeIn);
            const end = new Date(timeOut);
            const diffMs = end - start;
            
            if (diffMs < 0) return 'Invalid duration';
            
            const hours = Math.floor(diffMs / (1000 * 60 * 60));
            const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            
            if (hours > 0) {
                return `${hours}h ${minutes}m`;
            } else {
                return `${minutes}m`;
            }
        } catch (error) {
            return 'Unknown';
        }
    };

    const navigateToTimeIn = () => {
        window.location.href = '/scanner/time-in';
    };

    // Compute result level for rendering: 'success' | 'notice' | 'error' | null
    const resultLevel = lastScanResult ? (lastScanResult.error ? (isNoticeMessage(lastScanResult.error) ? 'notice' : 'error') : 'success') : null;

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
                <div className={resultLevel === 'success' ? 'scan-result success time-out' : `scan-result ${resultLevel} time-out`}>
                    {resultLevel !== 'success' ? (
                        <div className="scan-result-content">
                            {resultLevel === 'notice' ? (
                                <MdInfo className="result-icon notice" />
                            ) : (
                                <MdError className="result-icon error-icon" />
                            )}
                            <div className="result-info">
                                <h2>{resultLevel === 'notice' ? (<><MdInfo className="inline-icon notice" /> Notice</>) : (<><MdError className="inline-icon error-icon" /> Time-Out Failed</>)}</h2>
                                <div className="error-message">
                                    <div className="main-error-container">
                                        <p className="main-error">{lastScanResult.error}</p>
                                    </div>
                                    {lastScanResult.details && (
                                        <div className="error-details">
                                            <h4><MdInfo /> Additional Information:</h4>
                                            <p>{lastScanResult.details}</p>
                                        </div>
                                    )}
                                </div>
                                {lastScanResult.user && (
                                    <div className="user-brief enhanced">
                                        <h4><MdPerson /> Recognized User:</h4>
                                        <div className="user-info-brief">
                                            <div className="user-avatar-medium">
                                                {lastScanResult.user.avatar ? (
                                                    <img 
                                                        src={lastScanResult.user.avatar} 
                                                        alt={`${lastScanResult.user.name} Profile Photo`}
                                                        className="profile-photo"
                                                        onError={(e) => {
                                                            e.target.style.display = 'none';
                                                            e.target.nextSibling.style.display = 'flex';
                                                        }}
                                                    />
                                                ) : null}
                                                <div className="avatar-placeholder" style={{display: lastScanResult.user.avatar ? 'none' : 'flex'}}>
                                                    {lastScanResult.user.type === 'student' ? <MdSchool /> : <MdPerson />}
                                                </div>
                                            </div>
                                            <div className="user-details-brief">
                                                <p className="user-name"><MdPermIdentity /> {lastScanResult.user.name}</p>
                                                <div className="user-badges">
                                                    <span className={`user-type-badge-small ${lastScanResult.user.type}`}>
                                                        {lastScanResult.user.type === 'student' ? (<><MdSchool /> STUDENT</>) : (<><MdPerson /> FACULTY</>)}
                                                    </span>
                                                </div>
                                                <p className="user-id"><MdPermIdentity /> {lastScanResult.user.id}</p>
                                                {lastScanResult.user.department && (
                                                    <p className="user-department"><MdBusiness /> {lastScanResult.user.department}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div className="scan-timestamp">
                                    <MdAccessTime />
                                    <span>Scan attempted at: {formatTime(lastScanResult.timestamp)}</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="scan-result-content">
                            <div className="result-icon">
                                <MdLogout className="time-out-icon" />
                            </div>
                            <div className="result-info">
                                <h2><MdCheckCircle className="inline-icon success" /> TIME OUT SUCCESSFUL</h2>
                                <div className="user-profile enhanced">
                                    <div className="user-avatar-large">
                                        {lastScanResult.user.avatar ? (
                                            <>
                                                <img 
                                                    src={lastScanResult.user.avatar} 
                                                    alt={`${lastScanResult.user.name} Profile Photo`}
                                                    className="profile-photo"
                                                    onLoad={() => console.log('✅ Image loaded successfully:', lastScanResult.user.avatar)}
                                                    onError={(e) => {
                                                        console.error('❌ Image failed to load:', lastScanResult.user.avatar);
                                                        console.error('Error details:', e);
                                                        e.target.style.display = 'none';
                                                        const placeholder = e.target.parentElement.querySelector('.avatar-placeholder');
                                                        if (placeholder) {
                                                            placeholder.style.display = 'flex';
                                                        }
                                                    }}
                                                    style={{display: 'block'}}
                                                />
                                                <div className="avatar-placeholder" style={{display: 'none'}}>
                                                    {lastScanResult.user.type === 'student' ? <MdSchool /> : <MdPerson />}
                                                </div>
                                            </>
                                        ) : (
                                            <div className="avatar-placeholder">
                                                {lastScanResult.user.type === 'student' ? <MdSchool /> : <MdPerson />}
                                            </div>
                                        )}
                                    </div>
                                        <div className="user-details">
                                        <h3>{lastScanResult.user.name}</h3>
                                        <div className="user-badges">
                                            <span className={`user-type-badge ${lastScanResult.user.type}`}>
                                                {lastScanResult.user.type === 'student' ? (<><MdSchool /> STUDENT</>) : (<><MdPerson /> FACULTY</>)}
                                            </span>
                                        </div>
                                        <p className="user-id"><MdPermIdentity /> {lastScanResult.user.id}</p>
                                        {lastScanResult.user.department && (
                                            <p className="user-department"><MdBusiness /> {lastScanResult.user.department}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="scan-time">
                                    <MdAccessTime />
                                    <span>Recorded at: {formatTime(lastScanResult.timestamp)}</span>
                                </div>
                                {lastScanResult.time_in && (
                                    <div className="duration-info">
                                        <h4><MdAccessTime /> Session Duration:</h4>
                                        <p>Time In: {formatTime(lastScanResult.time_in)}</p>
                                        <p>Duration: {calculateDuration(lastScanResult.time_in, lastScanResult.timestamp)}</p>
                                    </div>
                                )}
                                {lastScanResult.subjects_attended && lastScanResult.subjects_attended.length > 0 && (
                                    <div className="subjects-info">
                                        <h4><MdSchool /> Subjects Attended:</h4>
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
                        <p><MdInfo /> Finished your day? Use this scanner to check out!</p>
                    </div>
                </div>
            )}

            {/* Loading State */}
            {isLoading && (
                <div className="loading-state time-out">
                    <div className="loading-spinner time-out"><span></span></div>
                    <h2>Processing Time-Out...</h2>
                    <p>Please wait while we record your departure and calculate attendance</p>
                </div>
            )}
        </div>
    );
}

export default TimeOutScanner;