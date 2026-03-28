import './UserProfile.css';
import StudentHandler from '../../../api/StudentHandler.js';
import FacultyHandler from '../../../api/FacultyHandler.js';
import React from 'react';
import { useEffect, useState, useMemo } from "react";
import AttendanceLogsHandler from '../../../api/AttendanceLogsHandler.js';

const studentHandler = new StudentHandler();
const facultyHandler = new FacultyHandler();

function maskUid(uid = '') {
    if (!uid) return ''
    const s = uid.toString()
    const keep = 4
    if (s.length <= keep) return '*'.repeat(s.length)
    return '*'.repeat(Math.max(0, s.length - keep)) + s.slice(-keep)
}

export default function UserProfile() {
    const queryParams = new URLSearchParams(window.location.search);
    const userId = queryParams.get('id');
    const [user, setUser] = useState(null);
    const [userType, setUserType] = useState(null); // 'student' | 'faculty'
    const [error, setError] = useState(null);
    const [attendanceLogs, setAttendanceLogs] = useState([]);
    const [attendanceLoading, setAttendanceLoading] = useState(false);
    const [attendanceError, setAttendanceError] = useState(null);
    // Filters for attendance records
    const [filterDateFrom, setFilterDateFrom] = useState('')
    const [filterDateTo, setFilterDateTo] = useState('')
    const [filterTimeFrom, setFilterTimeFrom] = useState('')
    const [filterTimeTo, setFilterTimeTo] = useState('')

    // Memoized filtered attendance logs (keep hooks at top-level)
    const filteredAttendanceLogs = useMemo(() => {
        if (!attendanceLogs || attendanceLogs.length === 0) return []
        return attendanceLogs.filter(l => {
            if (!l.time_in) return false
            const t = new Date(l.time_in)
            if (isNaN(t)) return false

            // Date range checks
            if (filterDateFrom) {
                const df = new Date(filterDateFrom)
                df.setHours(0,0,0,0)
                if (t < df) return false
            }
            if (filterDateTo) {
                const dt = new Date(filterDateTo)
                dt.setHours(23,59,59,999)
                if (t > dt) return false
            }

            // Time-only checks (compare hh:mm)
            if (filterTimeFrom) {
                const [hf, mf] = filterTimeFrom.split(':').map(Number)
                if (!Number.isNaN(hf) && !Number.isNaN(mf)) {
                    const minutes = t.getHours()*60 + t.getMinutes()
                    const fromMinutes = hf*60 + mf
                    if (minutes < fromMinutes) return false
                }
            }
            if (filterTimeTo) {
                const [ht, mt] = filterTimeTo.split(':').map(Number)
                if (!Number.isNaN(ht) && !Number.isNaN(mt)) {
                    const minutes = t.getHours()*60 + t.getMinutes()
                    const toMinutes = ht*60 + mt
                    if (minutes > toMinutes) return false
                }
            }

            return true
        })
    }, [attendanceLogs, filterDateFrom, filterDateTo, filterTimeFrom, filterTimeTo])

    useEffect(() => {
        if (!userId) return

        const load = async () => {
            try {
                // Try fetching as student (search by id)
                const studentResp = await studentHandler.fetchStudents({ q: userId, per_page: 1 })
                if (studentResp && Array.isArray(studentResp.items) && studentResp.items.length > 0) {
                    setUser(studentResp.items[0])
                    setUserType('student')
                    return
                }

                // Try fetching as faculty
                const facultyResp = await facultyHandler.fetchFaculties({ q: userId, per_page: 1 })
                if (facultyResp && Array.isArray(facultyResp.items) && facultyResp.items.length > 0) {
                    setUser(facultyResp.items[0])
                    setUserType('faculty')
                    return
                }

                setError('User not found')
            } catch (err) {
                setError(err.message || 'Failed to load user')
            }
        }

        load()
    }, [userId])

    // Fetch attendance logs for both student and faculty users and compute simple analytics
    useEffect(() => {
        if (!user || !(userType === 'student' || userType === 'faculty')) return

        const fetchAttendance = async () => {
            setAttendanceLoading(true)
            setAttendanceError(null)
            try {
                // Prefer searching by uid if available, otherwise use id or full name
                const searchTerm = user.uid || user.id || (user.full_name || user.fullName || '')
                const resp = await AttendanceLogsHandler.getLogs({ search: searchTerm, userType: userType, perPage: 200 })
                // API returns { success, logs, count, total, ... }
                const logs = resp && (resp.logs || resp.items || [])
                setAttendanceLogs(logs || [])
            } catch (err) {
                setAttendanceError(err.message || 'Failed to load attendance')
            } finally {
                setAttendanceLoading(false)
            }
        }

        fetchAttendance()
    }, [user, userType])

    if (error) {
        return <div className="user-profile-page">{error}</div>
    }

    if (!user) {
        return <div className="user-profile-page">Loading...</div>
    }

    const fullName = user.full_name || [user.first_name, user.middle_name, user.last_name].filter(Boolean).join(' ')
    const gender = user.gender || user.sex || ''
    const uidMasked = maskUid(user.uid || user.Uid || user.card_uid || '')
    const id = user.id || user.student_id || user.employee_id || ''
    const course = user.department || user.course || ''
    const section = user.section || ''
    const year = user.yearlevel || user.year || user.year_level || ''
    return (
        <div className="user-profile-page">
            <div className="profile-grid">
                <aside className="profile-left">
                    <div className="profile-avatar-wrap">
                        {user.avatar ? (
                            <img src={user.avatar} alt={`${fullName} avatar`} className="profile-avatar" />
                        ) : (
                            <div className="profile-avatar placeholder">{(fullName || 'U').split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase()}</div>
                        )}
                    </div>
                    <h2 className="profile-name">{fullName}</h2>
                    <div className="profile-meta">
                        <div><span className="meta-label">Gender:</span> {gender || '—'}</div>
                        <div><span className="meta-label">UID:</span> <span aria-hidden>{uidMasked}</span></div>
                        <div><span className="meta-label">ID:</span> {id || '—'}</div>
                    </div>
                </aside>

                <section className="profile-right">
                    <div className="profile-section">
                        <h3>Profile Details</h3>
                        <dl>
                            {userType === 'student' && (
                                <>
                                    <dt>Course</dt><dd>{course || '—'}</dd>
                                    <dt>Section</dt><dd>{section || '—'}</dd>
                                    <dt>Year</dt><dd>{year || '—'}</dd>
                                </>
                            )}

                            {userType === 'faculty' && (
                                <>
                                    <dt>Department</dt><dd>{course || '—'}</dd>
                                    <dt>Position</dt><dd>{user.position || user.title || '—'}</dd>
                                </>
                            )}

                            {user.contact_number && (<><dt>Contact</dt><dd>{user.contact_number}</dd></>)}
                            {user.email && (<><dt>Email</dt><dd>{user.email}</dd></>)}
                            {user.address && (<><dt>Address</dt><dd>{user.address}</dd></>)}
                        </dl>
                    </div>

                    {(userType === 'student' || userType === 'faculty') && (
                        <>
                        <div className="profile-section">
                            <h3>Attendance Analytics</h3>
                            {attendanceLoading ? (
                                <div>Loading attendance...</div>
                            ) : attendanceError ? (
                                <div className="error">{attendanceError}</div>
                            ) : (
                                <>
                                    {(() => {
                                        const total = attendanceLogs.length

                                        // Total hours: sum of (time_out - time_in) in hours for logs that have both
                                        const totalHours = attendanceLogs.reduce((acc, l) => {
                                            if (l.time_in && l.time_out) {
                                                const tin = new Date(l.time_in)
                                                const tout = new Date(l.time_out)
                                                const diff = (tout - tin) / (1000 * 60 * 60)
                                                if (!isNaN(diff) && diff > 0) acc += diff
                                            }
                                            return acc
                                        }, 0)

                                        // Distinct days with records (based on time_in date)
                                        const daysSet = new Set(attendanceLogs.map(l => {
                                            if (!l.time_in) return null
                                            const d = new Date(l.time_in)
                                            if (isNaN(d)) return null
                                            return d.toISOString().slice(0,10)
                                        }).filter(Boolean))
                                        const days = daysSet.size

                                        const avgHoursPerDay = days > 0 ? (totalHours / days) : 0
                                        const avgRecordsPerDay = days > 0 ? (total / days) : 0

                                        const fmt = (n) => (Math.round(n * 100) / 100)

                                        return (
                                            <dl className="attendance-grid">
                                                <dt>Total Records</dt><dd>{total}</dd>
                                                <dt>Total Hours</dt><dd>{fmt(totalHours)} h</dd>
                                                <dt>Average Hours / Day</dt><dd>{fmt(avgHoursPerDay)} h</dd>
                                                <dt>Average Records / Day</dt><dd>{fmt(avgRecordsPerDay)}</dd>
                                            </dl>
                                        )
                                    })()}
                                </>
                            )}
                        </div>
                        <div className='profile-section'>
                            <h3 style={{marginTop:16}}>Attendance Records</h3>
                                    {attendanceLogs.length === 0 ? (
                                        <div>No attendance records found.</div>
                                    ) : (
                                        <>
                                            <div className="attendance-filters" style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center',marginBottom:12}}>
                                                <label style={{display:'flex',flexDirection:'column',fontSize:12}}>From Date
                                                    <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} />
                                                </label>
                                                <label style={{display:'flex',flexDirection:'column',fontSize:12}}>To Date
                                                    <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} />
                                                </label>
                                                <label style={{display:'flex',flexDirection:'column',fontSize:12}}>From Time
                                                    <input type="time" value={filterTimeFrom} onChange={e => setFilterTimeFrom(e.target.value)} />
                                                </label>
                                                <label style={{display:'flex',flexDirection:'column',fontSize:12}}>To Time
                                                    <input type="time" value={filterTimeTo} onChange={e => setFilterTimeTo(e.target.value)} />
                                                </label>
                                                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                                                    <button type="button" onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); setFilterTimeFrom(''); setFilterTimeTo('') }}>Clear</button>
                                                </div>
                                            </div>
                                            {filteredAttendanceLogs.length === 0 ? (
                                                <div>No records match the current filters.</div>
                                            ) : (
                                                <div className="attendance-table-wrap">
                                                    <table className="attendance-table">
                                                        <thead>
                                                            <tr>
                                                                <th>Date</th>
                                                                <th>Time In</th>
                                                                <th>Status</th>
                                                                <th>Schedule</th>
                                                                <th>Notes</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {filteredAttendanceLogs.map((log) => (
                                                                <tr key={log.id}>
                                                                    <td>{log.time_in ? new Date(log.time_in).toLocaleDateString() : '—'}</td>
                                                                    <td>{log.time_in ? new Date(log.time_in).toLocaleTimeString() : '—'}</td>
                                                                    <td>{log.status || 'present'}</td>
                                                                    <td>{log.schedule_name || log.schedule_type || '—'}</td>
                                                                    <td>{log.notes || (log.subjects_attended ? (Array.isArray(log.subjects_attended) ? log.subjects_attended.join(', ') : JSON.stringify(log.subjects_attended)) : '—')}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </>
                                    )}
                        </div>
                        </>
                    )}
                </section>
            </div>
        </div>
    )
}