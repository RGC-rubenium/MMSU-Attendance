import React, { useState, useMemo } from 'react';
import './Student.css';
import { Link } from 'react-router-dom';

const SAMPLE_USERS = [
    { id: 1, studentId: 'S1001', fullName: 'Maria Reyes', avatar: 'https://i.pravatar.cc/150?img=12' },
    { id: 2, studentId: 'S1002', fullName: 'Juan Dela Cruz', avatar: 'https://i.pravatar.cc/150?img=32' },
    { id: 3, studentId: 'S1003', fullName: 'Anne Garcia', avatar: 'https://i.pravatar.cc/150?img=18' },
    { id: 4, studentId: 'S1004', fullName: 'Mark Torres', avatar: 'https://i.pravatar.cc/150?img=24' },
    { id: 5, studentId: 'S1005', fullName: 'Liza Santos', avatar: 'https://i.pravatar.cc/150?img=8' },
    { id: 6, studentId: 'S1006', fullName: 'Rico Lopez', avatar: 'https://i.pravatar.cc/150?img=47' }
];

export default function Student() {
    const [query, setQuery] = useState('');
    const [searching, setSearching] = useState(false);

    const results = useMemo(() => {
        const q = (query || '').trim().toLowerCase();
        if (!q) return SAMPLE_USERS;
        return SAMPLE_USERS.filter(u => (
            (u.fullName && u.fullName.toLowerCase().includes(q)) ||
            (u.studentId && u.studentId.toLowerCase().includes(q))
        ));
    }, [query]);

    const onSearchChange = (value) => {
        setQuery(value);
        setSearching(true);
        // small UI delay to show searching state
        setTimeout(() => setSearching(false), 350);
    };

    return (
        <div className="student-page-wrapper">
            <div className="users-content">
                <div className="user-header">
                    <h1>Student Management</h1>

                    <div className="user-searchbar">
                        <input
                            type="search"
                            value={query}
                            onChange={e => onSearchChange(e.target.value)}
                            placeholder="Search students by name or ID..."
                        />
                        <button type="button" onClick={() => { /* optional: trigger search action */ }}>
                            Search
                        </button>
                    </div>
                </div>

                <div className="users-list">
                    {searching && <div className="user-loading">Searching…</div>}

                    <div className="user-cards">
                        {results.map(u => (
                            <Link className="user-card-button" to={'/dashboard/students/profile'}>
                                <article className="user-card" key={u.id}>
                                    <img className="user-avatar" src={u.avatar} alt={u.fullName} />
                                    <div className="user-info">
                                        <div className="user-name">{u.fullName}</div>
                                        <div className="user-id">{u.studentId}</div>
                                    </div>
                                </article>
                            </Link>
                        ))}
                    </div>

                    {!searching && results.length === 0 && (
                        <div className="user-empty">No students found.</div>
                    )}
                </div>
            </div>
        </div>
    );
}