import React, { useState, useEffect } from 'react'
import './Dashboard.css'
import { MdPeople, MdOutlineCalendarToday, MdSchool, MdAssignment, MdTrendingUp, MdAccessTime } from 'react-icons/md'
import { FaUsers, FaChalkboardTeacher, FaClipboardList } from 'react-icons/fa'
import AnalyticsAPI from '../../../api/AnalyticsAPI'
import LoadingScreen from '../../../components/common/LoadingScreen'

export default function Dashboard() {
    const [dashboardStats, setDashboardStats] = useState({
        total_records: 0,
        total_students: 0,
        total_faculty: 0,
        present_today: 0,
        attendance_rate: 0,
        today_attendance: 0
    });

    const [recentAttendance, setRecentAttendance] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);

    // Fetch dashboard statistics
    const fetchDashboardStats = async () => {
        try {
            const response = await AnalyticsAPI.getDashboardStats();
            if (response.success) {
                setDashboardStats(response.data);
                setLastUpdated(new Date(response.data.last_updated));
            } else {
                throw new Error(response.error || 'Failed to fetch stats');
            }
        } catch (err) {
            console.error('Error fetching dashboard stats:', err);
            setError('Failed to load dashboard statistics');
        }
    };

    // Fetch recent attendance (only 5 records)
    const fetchRecentAttendance = async () => {
        try {
            const response = await AnalyticsAPI.getRecentAttendance(5);
            if (response.success) {
                setRecentAttendance(response.data);
            } else {
                throw new Error(response.error || 'Failed to fetch attendance');
            }
        } catch (err) {
            console.error('Error fetching recent attendance:', err);
            setError('Failed to load recent attendance');
        }
    };

    // Initial data load
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            await Promise.all([fetchDashboardStats(), fetchRecentAttendance()]);
            setLoading(false);
        };
        loadData();
    }, []);

    // Auto-refresh data every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            fetchDashboardStats();
            fetchRecentAttendance();
        }, 30000); // 30 seconds

        return () => clearInterval(interval);
    }, []);

    // Stats configuration
    const stats = [
        {
            id: 1,
            title: 'Total Records',
            value: dashboardStats.total_records.toLocaleString(),
            icon: <MdAssignment size={28} />,
            color: 'primary',
            description: 'All attendance logs'
        },
        {
            id: 2,
            title: 'Total Students',
            value: dashboardStats.total_students.toLocaleString(),
            icon: <FaUsers size={28} />,
            color: 'success',
            description: 'Registered students'
        },
        {
            id: 3,
            title: 'Total Faculty',
            value: dashboardStats.total_faculty.toLocaleString(),
            icon: <FaChalkboardTeacher size={28} />,
            color: 'info',
            description: 'Registered faculty members'
        },
        {
            id: 4,
            title: 'Present Today',
            value: dashboardStats.present_today.toLocaleString(),
            icon: <MdOutlineCalendarToday size={28} />,
            color: 'warning',
            description: `${dashboardStats.attendance_rate}% attendance rate`
        },
        {
            id: 5,
            title: "Today's Logs",
            value: dashboardStats.today_attendance.toLocaleString(),
            icon: <MdTrendingUp size={28} />,
            color: 'secondary',
            description: 'Check-ins & check-outs'
        }
    ];

    // Format time for display
    const formatTime = (timeStr) => {
        if (!timeStr) return 'N/A';
        return timeStr;
    };

    // Get status color class
    const getStatusClass = (statusClass, action) => {
        if (statusClass) return statusClass;
        return action === 'time_in' ? 'success' : action === 'time_out' ? 'warning' : 'error';
    };

    if (loading) {
        return (
            <main className="dashboard-main" aria-labelledby="dashboard-title">
                <LoadingScreen 
                    message="Loading dashboard analytics" 
                    size="large" 
                    variant="dashboard"
                />
            </main>
        );
    }

    return (
        <main className="dashboard-main" aria-labelledby="dashboard-title">
            <header className="dashboard-top">
                <div className="dashboard-header-content">
                    <div>
                        <h1 id="dashboard-title">Overview</h1>
                        <p className="dashboard-sub">Real-time attendance analytics and system overview</p>
                    </div>
                    <div className="dashboard-refresh-info">
                        {lastUpdated && (
                            <div className="last-updated">
                                <MdAccessTime size={16} />
                                <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
                            </div>
                        )}
                        <button 
                            className="refresh-btn"
                            onClick={() => {
                                fetchDashboardStats();
                                fetchRecentAttendance();
                            }}
                            title="Refresh data"
                        >
                            🔄
                        </button>
                    </div>
                </div>
            </header>

            {error && (
                <div className="error-banner">
                    <span>⚠️ {error}</span>
                    <button onClick={() => setError(null)}>×</button>
                </div>
            )}

            <section className="stats-grid enhanced" aria-label="Key statistics">
                {stats.map((stat) => (
                    <article key={stat.id} className={`stat-card ${stat.color}`}>
                        <div className="stat-icon" aria-hidden="true">
                            {stat.icon}
                        </div>
                        <div className="stat-body">
                            <div className="stat-value">{stat.value}</div>
                            <div className="stat-title">{stat.title}</div>
                            <div className="stat-description">{stat.description}</div>
                        </div>
                    </article>
                ))}
            </section>

            <section className="recent enhanced" aria-label="Recent attendance">
                <div className="section-header">
                    <h2 className="section-title">
                        <FaClipboardList size={20} />
                        Recent Attendance
                        <span className="record-count">({recentAttendance.length} latest records)</span>
                    </h2>
                    <div className="auto-refresh-indicator">
                        <span className="pulse-dot"></span>
                        Auto-updating
                    </div>
                </div>
                
                <div className="table-wrap">
                    {recentAttendance.length === 0 ? (
                        <div className="no-data">
                            <MdAssignment size={48} />
                            <p>No recent attendance records found</p>
                            <small>New attendance records will appear here automatically</small>
                        </div>
                    ) : (
                        <table className="recent-table enhanced">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Type</th>
                                    <th>Status</th>
                                    <th>Time</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentAttendance.map((record, index) => (
                                    <tr key={record.id || index} className={index === 0 ? 'latest-record' : ''}>
                                        <td className="name-cell">
                                            <div className="person-info">
                                                <span className="person-name">{record.name}</span>
                                                {record.additional_info && record.additional_info !== 'N/A' && (
                                                    <small className="person-details">{record.additional_info}</small>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`person-type ${record.person_type.toLowerCase()}`}>
                                                {record.person_type}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`status ${getStatusClass(record.status_class, record.action)}`}>
                                                {record.status}
                                            </span>
                                        </td>
                                        <td className="time-cell">{formatTime(record.time)}</td>
                                        <td className="date-cell">{record.date}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                
                {recentAttendance.length > 0 && (
                    <div className="table-footer">
                        <small>
                            📊 Showing latest 5 records • New entries automatically replace oldest
                        </small>
                    </div>
                )}
            </section>
        </main>
    );
}