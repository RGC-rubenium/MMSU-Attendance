import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as MdIcons from 'react-icons/md';
import * as FaIcons from 'react-icons/fa';
import AttendanceLogsHandler from '../../../api/AttendanceLogsHandler';
import './AttendanceLogs.css';
import LoadingScreen from '../../../components/common/LoadingScreen';

const DEPARTMENTS = ['BSCpE','BSME','BSEE','BSECE','BSCE','BSChE','BSCerE','BSABE'];
const PER_PAGE = 20;

function fmt(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
function fmtDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function duration(inIso, outIso) {
    if (!inIso || !outIso) return '—';
    const ms = new Date(outIso) - new Date(inIso);
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
function todayStr() {
    return new Date().toISOString().slice(0, 10);
}

export default function AttendanceLogs() {
    const [logs, setLogs]         = useState([]);
    const [loading, setLoading]   = useState(false);
    const [error, setError]       = useState('');
    const [meta, setMeta]         = useState({ total: 0, page: 1, totalPages: 1 });
    const [expanded, setExpanded] = useState(null);

    const [deleteLoading, setDeleteLoading] = useState(false);

    // Filters
    const [date, setDate]           = useState(todayStr());
    const [userType, setUserType]   = useState('');
    const [search, setSearch]       = useState('');
    const [department, setDept]     = useState('');
    const [status, setStatus]       = useState('');
    const [page, setPage]           = useState(1);

    // Pending search (debounced)
    const searchRef = useRef('');
    const debounceRef = useRef(null);

    const fetchLogs = useCallback(async (params) => {
        setLoading(true);
        setError('');
        try {
            const data = await AttendanceLogsHandler.getLogs(params);
            if (data.success) {
                setLogs(data.logs);
                setMeta({ total: data.total, page: data.page, totalPages: data.total_pages });
            } else {
                setError(data.message || 'Failed to fetch logs');
            }
        } catch (e) {
            setError('Connection error. Please try again.');
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch whenever filter/page changes
    useEffect(() => {
        fetchLogs({ date, userType, search, department, status, page, perPage: PER_PAGE });
    }, [date, userType, department, status, page, fetchLogs]);

    // Debounced search
    const handleSearchChange = (e) => {
        const val = e.target.value;
        setSearch(val);
        searchRef.current = val;
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setPage(1);
            fetchLogs({ date, userType, search: searchRef.current, department, status, page: 1, perPage: PER_PAGE });
        }, 400);
    };

    const handleFilterChange = (setter) => (e) => {
        setter(e.target.value);
        setPage(1);
    };

    const clearFilters = () => {
        setDate(todayStr());
        setUserType('');
        setSearch('');
        setDept('');
        setStatus('');
        setPage(1);
    };

    const toggleExpand = (id) => setExpanded(prev => prev === id ? null : id);

    // Delete log handler
    const handleDelete = async (logId) => {
        if (!window.confirm('Are you sure you want to delete this log?')) return;
        setDeleteLoading(true);
        setError('');
        try {
            await AttendanceLogsHandler.deleteLog(logId);
            setLogs((prev) => prev.filter((log) => log.id !== logId));
        } catch (err) {
            setError('Failed to delete log.');
        } finally {
            setDeleteLoading(false);
        }
    };

    const statusBadge = (s) => {
        const map = { incomplete: 'badge-incomplete', complete: 'badge-complete' };
        return <span className={`badge ${map[s] || 'badge-incomplete'}`}>{s || 'incomplete'}</span>;
    };

    const typeBadge = (t) => (
        <span className={`type-badge ${t === 'student' ? 'type-student' : 'type-faculty'}`}>
            {t === 'student' ? <MdIcons.MdSchool /> : <MdIcons.MdPerson />}
            {t}
        </span>
    );

    return (
        <div className="alog-wrapper">
            {/* ── Header ── */}
            <div className="alog-header">
                <div className="alog-title-row">
                    <div className="alog-title-block">
                        <MdIcons.MdFactCheck className="alog-title-icon" />
                        <div>
                            <h1>Attendance Logs</h1>
                            <p>Track and review all time-in / time-out records</p>
                        </div>
                    </div>
                    <div className="alog-meta-chips">
                        <span className="meta-chip">
                            <MdIcons.MdListAlt />
                            {meta.total.toLocaleString()} records
                        </span>
                        <button className="alog-refresh-btn" onClick={() =>
                            fetchLogs({ date, userType, search, department, status, page, perPage: PER_PAGE })
                        } title="Refresh">
                            <MdIcons.MdRefresh />
                        </button>
                    </div>
                </div>

                {/* ── Filter bar ── */}
                <div className="alog-filters">
                    {/* Date */}
                    <div className="filter-group">
                        <label><MdIcons.MdCalendarToday /> Date</label>
                        <input type="date" value={date} onChange={handleFilterChange(setDate)} />
                    </div>

                    {/* Search */}
                    <div className="filter-group filter-search">
                        <label><MdIcons.MdSearch /> Search</label>
                        <div className="search-wrap">
                            <MdIcons.MdSearch className="search-icon" />
                            <input
                                type="text"
                                placeholder="Name, UID, ID, Department…"
                                value={search}
                                onChange={handleSearchChange}
                            />
                            {search && (
                                <button className="clear-search" onClick={() => {
                                    setSearch(''); searchRef.current = '';
                                    setPage(1);
                                    fetchLogs({ date, userType, search: '', department, status, page: 1, perPage: PER_PAGE });
                                }}><MdIcons.MdClose /></button>
                            )}
                        </div>
                    </div>

                    {/* User type */}
                    <div className="filter-group">
                        <label><FaIcons.FaUsers /> Type</label>
                        <select value={userType} onChange={handleFilterChange(setUserType)}>
                            <option value="">All Types</option>
                            <option value="student">Student</option>
                            <option value="faculty">Faculty</option>
                        </select>
                    </div>

                    {/* Department */}
                    <div className="filter-group">
                        <label><MdIcons.MdBusiness /> Department</label>
                        <select value={department} onChange={handleFilterChange(setDept)}>
                            <option value="">All Departments</option>
                            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>

                    {/* Status */}
                    <div className="filter-group">
                        <label><MdIcons.MdCircle /> Status</label>
                        <select value={status} onChange={handleFilterChange(setStatus)}>
                            <option value="">All Statuses</option>
                            <option value="incomplete">Incomplete</option>
                            <option value="complete">Complete</option>
                        </select>
                    </div>

                    <button className="alog-clear-btn" onClick={clearFilters}>
                        <MdIcons.MdFilterAltOff /> Clear
                    </button>
                </div>
            </div>

            {/* ── Table ── */}
            <div className="alog-body">
                {error && (
                    <div className="alog-error">
                        <MdIcons.MdErrorOutline /> {error}
                    </div>
                )}

                {loading ? (
                    <LoadingScreen 
                        message="Loading attendance records" 
                        size="medium"
                    />
                ) : logs.length === 0 ? (
                    <div className="alog-empty">
                        <MdIcons.MdInbox className="empty-icon" />
                        <p>No attendance records found for the selected filters.</p>
                        <button className="alog-clear-btn" onClick={clearFilters}>Clear Filters</button>
                    </div>
                ) : (
                    <div className="alog-table-wrap">
                        <table className="alog-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Name</th>
                                    <th>Type</th>
                                    <th>Department</th>
                                    <th>Date</th>
                                    <th>Time In</th>
                                    <th>Time Out</th>
                                    <th>Duration</th>
                                    <th>Status</th>
                                    <th>Schedule</th>
                                    <th>Details</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((log, idx) => (
                                    <React.Fragment key={log.id}>
                                        <tr className={expanded === log.id ? 'row-expanded' : ''}>
                                            <td className="col-num">{(meta.page - 1) * PER_PAGE + idx + 1}</td>
                                            <td className="col-name">
                                                <div className="name-cell">
                                                    <div className="name-avatar">
                                                        {log.user_type === 'student'
                                                            ? <MdIcons.MdSchool />
                                                            : <MdIcons.MdPerson />}
                                                    </div>
                                                    <div>
                                                        <span className="name-text">{log.full_name}</span>
                                                        <span className="uid-text">UID: {log.uid}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>{typeBadge(log.user_type)}</td>
                                            <td className="col-dept">{log.department || '—'}</td>
                                            <td className="col-date">{fmtDate(log.time_in)}</td>
                                            <td className="col-time time-in">{fmt(log.time_in)}</td>
                                            <td className="col-time time-out">{fmt(log.time_out)}</td>
                                            <td className="col-dur">{duration(log.time_in, log.time_out)}</td>
                                            <td>{statusBadge(log.status)}</td>
                                            <td className="col-sched">
                                                <span className={`sched-tag sched-${log.schedule_type}`}>
                                                    {log.schedule_type}
                                                </span>
                                            </td>
                                            <td>
                                                <button
                                                    className="expand-btn"
                                                    onClick={() => toggleExpand(log.id)}
                                                    title="Details"
                                                >
                                                    {expanded === log.id
                                                        ? <MdIcons.MdExpandLess />
                                                        : <MdIcons.MdExpandMore />}
                                                </button>
                                            </td>
                                            <td>
                                                <button
                                                    className="alog-delete-btn"
                                                    onClick={() => handleDelete(log.id)}
                                                    title="Delete log"
                                                    disabled={deleteLoading}
                                                >
                                                    <MdIcons.MdDelete />
                                                </button>
                                            </td>
                                        </tr>

                                        {/* Expanded detail row */}
                                        {expanded === log.id && (
                                            <tr className="detail-row">
                                                <td colSpan={11}>
                                                    <div className="detail-panel">
                                                        <div className="detail-grid">
                                                            <div className="detail-item">
                                                                <span className="detail-label">Log ID</span>
                                                                <span className="detail-value">#{log.id}</span>
                                                            </div>
                                                            <div className="detail-item">
                                                                <span className="detail-label">User ID</span>
                                                                <span className="detail-value">{log.user_id || '—'}</span>
                                                            </div>
                                                            <div className="detail-item">
                                                                <span className="detail-label">Schedule Name</span>
                                                                <span className="detail-value">{log.schedule_name || '—'}</span>
                                                            </div>
                                                            <div className="detail-item">
                                                                <span className="detail-label">Notes</span>
                                                                <span className="detail-value">{log.notes || '—'}</span>
                                                            </div>
                                                        </div>

                                                        {log.subjects_attended && log.subjects_attended.length > 0 && (
                                                            <div className="subjects-section">
                                                                <h4><MdIcons.MdBook /> Subjects Attended</h4>
                                                                <div className="subjects-list">
                                                                    {log.subjects_attended.map((s, i) => (
                                                                        <div key={i} className="subject-chip">
                                                                            <span className="subj-name">{s.subject}</span>
                                                                            <span className="subj-time">{s.start_time} – {s.end_time}</span>
                                                                            {s.room && <span className="subj-room">{s.room}</span>}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* ── Pagination ── */}
                {!loading && meta.totalPages > 1 && (
                    <div className="alog-pagination">
                        <button disabled={meta.page <= 1} onClick={() => setPage(p => p - 1)}>
                            <MdIcons.MdChevronLeft /> Prev
                        </button>
                        <span>Page {meta.page} of {meta.totalPages}</span>
                        <button disabled={meta.page >= meta.totalPages} onClick={() => setPage(p => p + 1)}>
                            Next <MdIcons.MdChevronRight />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
