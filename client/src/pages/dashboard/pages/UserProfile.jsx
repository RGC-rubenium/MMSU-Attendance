import './UserProfile.css';
import StudentHandler from '../../../api/StudentHandler.js';
import FacultyHandler from '../../../api/FacultyHandler.js';
import React from 'react';
import { useEffect, useState } from "react";

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
                         {userType === 'student' && (
                                <>
                                    <div><span className="meta-label">Course: </span> {course || '—'}</div>
                                    <div><span>Section: </span>{section || '—'}</div>
                                    <div><span>Year: </span>{year || '—'}</div>
                                </>
                            )}

                            {userType === 'faculty' && (
                                <>
                                    <div><span>Department: </span>{course || '—'}</div>
                                    <div><span>Position: </span>{user.position || user.title || '—'}</div>
                                </>
                            )}
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
                </section>
            </div>
        </div>
    )
}