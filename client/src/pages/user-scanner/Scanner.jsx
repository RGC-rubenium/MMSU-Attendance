import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
    MdRadar, 
    MdSchedule, 
    MdPerson, 
    MdSchool,
    MdAccessTime,
    MdCheckCircle,
    MdError,
    MdWarning,
    MdRefresh,
    MdLogin,
    MdLogout,
    MdInfo
} from 'react-icons/md';
import ScannerAPI from '../../api/ScannerAPI';
import './Scanner.css';

const Scanner = () => {
    const [isScanning, setIsScanning] = useState(false);
    const [scanInput, setScanInput] = useState('');
    const [lastScanResult, setLastScanResult] = useState(null);
    const [currentSchedule, setCurrentSchedule] = useState(null);
    const [recentLogs, setRecentLogs] = useState([]);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
    const [scanHistory, setScanHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    
    const scanInputRef = useRef(null);
    const scanTimeoutRef = useRef(null);

    // Focus input for RFID scanning
    useEffect(() => {
        if (scanInputRef.current && isScanning) {
            scanInputRef.current.focus();
        }
    }, [isScanning]);

    // Auto-focus input when component mounts
    useEffect(() => {
        if (scanInputRef.current) {
            scanInputRef.current.focus();
        }
    }, []);

    // Keep input focused
    const handleInputBlur = useCallback(() => {
        if (isScanning && scanInputRef.current) {
            setTimeout(() => {
                if (scanInputRef.current) {
                    scanInputRef.current.focus();
                }
            }, 10);
        }
    }, [isScanning]);

    // Get current schedule on component mount
    useEffect(() => {
        fetchCurrentSchedule();
        fetchRecentLogs();
        
        // Auto-refresh every 30 seconds
        const interval = setInterval(() => {
            fetchCurrentSchedule();
        }, 30000);
        
        return () => clearInterval(interval);
    }, []);

    const fetchCurrentSchedule = async () => {
        try {
            const data = await ScannerAPI.getCurrentSchedule();
            
            if (data.success) {
                setCurrentSchedule(data.schedule);
            } else {
                setCurrentSchedule(null);
            }
        } catch (error) {
            console.error('Error fetching current schedule:', error);
            setCurrentSchedule(null);
        }
    };

    const fetchRecentLogs = async () => {
        try {
            const today = new Date().toISOString().split('T')[0];
            const data = await ScannerAPI.getAttendanceLogs({
                date: today,
                limit: 10
            });
            
            if (data.success) {
                setRecentLogs(data.logs);
            }
        } catch (error) {
            console.error('Error fetching recent logs:', error);
        }
    };

    const handleScan = async (uid) => {
        if (!uid || uid.trim() === '') return;
        
        // Validate and format UID
        const formattedUID = ScannerAPI.formatUID(uid);
        if (!ScannerAPI.isValidUID(formattedUID)) {
            setMessage('Invalid RFID format');
            setMessageType('error');
            return;
        }
        
        setIsLoading(true);
        setMessage('Processing RFID scan...');
        setMessageType('info');

        try {
            const data = await ScannerAPI.scanRFID(formattedUID);

            if (data.success) {
                setLastScanResult(data);
                setMessage(`${data.action === 'time_in' ? 'Time In' : 'Time Out'} successful for ${data.user.name}`);
                setMessageType('success');
                
                // Add to scan history
                setScanHistory(prev => [{
                    ...data,
                    timestamp: new Date().toISOString()
                }, ...prev.slice(0, 4)]);
                
                // Refresh recent logs
                fetchRecentLogs();
                
                // Play success sound (optional)
                playSound('success');
                
                // Show result for 3 seconds
                setTimeout(() => {
                    setLastScanResult(null);
                }, 3000);
                
            } else {
                setMessage(data.message || 'Scan failed');
                setMessageType('error');
                setLastScanResult({ error: data.message, user: data.user });
                playSound('error');
                
                setTimeout(() => {
                    setLastScanResult(null);
                }, 3000);
            }
        } catch (error) {
            console.error('Scan error:', error);
            // Display the actual error message instead of generic "Network error"
            const errorMessage = error.message || 'Network error. Please try again.';
            setMessage(errorMessage);
            setMessageType('error');
            playSound('error');
        } finally {
            setIsLoading(false);
            setTimeout(() => {
                setMessage('');
                setMessageType('');
            }, 5000);
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

    const handleManualScan = () => {
        if (scanInput.trim()) {
            handleScan(scanInput.trim());
            setScanInput('');
        }
    };

    const toggleScanning = () => {
        setIsScanning(!isScanning);
        if (!isScanning) {
            setTimeout(() => {
                if (scanInputRef.current) {
                    scanInputRef.current.focus();
                }
            }, 100);
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

    const formatDate = (timestamp) => {
        if (!timestamp) return '';
        return new Date(timestamp).toLocaleDateString();
    };

    return (
        <div className="scanner-container">
            <div className="scanner-header">
                <h1>
                    <MdRadar className="icon" />
                    RFID Attendance Scanner
                </h1>
                <div className="scanner-status">
                    <span className={`status-indicator ${isScanning ? 'active' : 'inactive'}`}>
                        {isScanning ? 'Scanner Active' : 'Scanner Inactive'}
                    </span>
                    <button 
                        className={`toggle-btn ${isScanning ? 'stop' : 'start'}`}
                        onClick={toggleScanning}
                    >
                        {isScanning ? 'Stop Scanner' : 'Start Scanner'}
                    </button>
                </div>
            </div>

            {/* Current Schedule Display */}
            <div className="current-schedule">
                <h3>
                    <MdSchedule className="icon" />
                    Current Schedule
                    <button 
                        className="refresh-btn"
                        onClick={fetchCurrentSchedule}
                        title="Refresh Schedule"
                    >
                        <MdRefresh />
                    </button>
                </h3>
                {currentSchedule ? (
                    <div className="schedule-info">
                        <div className="schedule-details">
                            <span className={`schedule-type ${currentSchedule.type}`}>
                                {currentSchedule.type.toUpperCase()}
                            </span>
                            <span className="schedule-name">{currentSchedule.name}</span>
                            <span className="schedule-time">
                                <MdAccessTime />
                                {currentSchedule.current_slot?.start_time} - {currentSchedule.current_slot?.end_time}
                            </span>
                        </div>
                        {currentSchedule.current_slot?.description && (
                            <div className="schedule-description">
                                {currentSchedule.current_slot.description}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="no-schedule">
                        <MdInfo />
                        No active schedule found for current time
                    </div>
                )}
            </div>

            {/* Scanner Input Area */}
            <div className="scanner-input-area">
                <div className="scan-input-container">
                    <input
                        ref={scanInputRef}
                        type="text"
                        value={scanInput}
                        onChange={handleInputChange}
                        onBlur={handleInputBlur}
                        placeholder="Tap RFID card or enter UID manually"
                        className={`scan-input ${isScanning ? 'active' : ''}`}
                        disabled={!isScanning || isLoading}
                        autoComplete="off"
                        autoFocus
                    />
                    <button 
                        className="manual-scan-btn"
                        onClick={handleManualScan}
                        disabled={!isScanning || !scanInput.trim() || isLoading}
                    >
                        {isLoading ? 'Processing...' : 'Manual Scan'}
                    </button>
                </div>

                {message && (
                    <div className={`scan-message ${messageType}`}>
                        {messageType === 'success' && <MdCheckCircle />}
                        {messageType === 'error' && <MdError />}
                        {messageType === 'warning' && <MdWarning />}
                        {messageType === 'info' && <MdInfo />}
                        {message}
                    </div>
                )}
            </div>

            {/* Last Scan Result */}
            {lastScanResult && (
                <div className={`last-scan-result ${lastScanResult.error ? 'error' : 'success'}`}>
                    <div className="scan-result-header">
                        {lastScanResult.error ? (
                            <>
                                <MdError className="result-icon error" />
                                <span>Scan Failed</span>
                            </>
                        ) : (
                            <>
                                {lastScanResult.action === 'time_in' ? 
                                    <MdLogin className="result-icon time-in" /> : 
                                    <MdLogout className="result-icon time-out" />
                                }
                                <span>{lastScanResult.action === 'time_in' ? 'Time In' : 'Time Out'}</span>
                            </>
                        )}
                    </div>
                    
                    {lastScanResult.user && (
                        <div className="user-info">
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
                                <h4>{lastScanResult.user.name}</h4>
                                <p>{lastScanResult.user.type?.toUpperCase()} | {lastScanResult.user.department}</p>
                                <p>ID: {lastScanResult.user.id}</p>
                            </div>
                        </div>
                    )}
                    
                    {lastScanResult.attendance && (
                        <div className="attendance-info">
                            <p><strong>Time:</strong> {formatTime(lastScanResult.attendance.time_in)}</p>
                            <p><strong>Schedule:</strong> {lastScanResult.schedule?.name}</p>
                        </div>
                    )}
                    
                    {lastScanResult.warning && (
                        <div className="warning-message">
                            <MdWarning />
                            {lastScanResult.warning}
                        </div>
                    )}
                </div>
            )}

            {/* Scan History */}
            <div className="scan-history">
                <h3>Recent Scans</h3>
                {scanHistory.length > 0 ? (
                    <div className="history-list">
                        {scanHistory.map((scan, index) => (
                            <div key={index} className={`history-item ${scan.error ? 'error' : 'success'}`}>
                                <div className="history-user">
                                    {scan.user?.type === 'student' ? <MdSchool /> : <MdPerson />}
                                    <span>{scan.user?.name || 'Unknown User'}</span>
                                </div>
                                <div className="history-details">
                                    <span className="history-time">{formatTime(scan.timestamp)}</span>
                                    <span className={`history-action ${scan.action || 'failed'}`}>
                                        {scan.action === 'time_in' ? 'IN' : scan.action === 'time_out' ? 'OUT' : 'FAILED'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="no-history">No recent scans</p>
                )}
            </div>

            {/* Today's Attendance Summary */}
            <div className="attendance-summary">
                <h3>Today's Attendance ({formatDate(new Date())})</h3>
                {recentLogs.length > 0 ? (
                    <div className="logs-list">
                        {recentLogs.map((log) => (
                            <div key={log.id} className="log-item">
                                <div className="log-user">
                                    {log.user_type === 'student' ? <MdSchool /> : <MdPerson />}
                                    <div>
                                        <strong>{log.full_name}</strong>
                                        <small>{log.user_type?.toUpperCase()} | {log.department}</small>
                                    </div>
                                </div>
                                <div className="log-times">
                                    <span className="time-in">
                                        <MdLogin />
                                        {formatTime(log.time_in)}
                                    </span>
                                    {log.time_out && (
                                        <span className="time-out">
                                            <MdLogout />
                                            {formatTime(log.time_out)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="no-logs">No attendance records today</p>
                )}
            </div>
        </div>
    );
};

export default Scanner;
