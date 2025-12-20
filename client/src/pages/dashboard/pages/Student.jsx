import React, { useState, useMemo } from 'react';
import './Student.css';
import { Link } from 'react-router-dom';
import * as MdIcons from "react-icons/md";
import * as CiIcons from "react-icons/ci";

const SAMPLE_USERS = [
    { id: 1, studentId: 'S1001', fullName: 'Maria Reyes', avatar: 'https://i.pravatar.cc/150?img=12',yearlevel: '1', section: 'A', department: 'BSCPE' },
    { id: 2, studentId: 'S1002', fullName: 'Juan Dela Cruz', avatar: 'https://i.pravatar.cc/150?img=32',yearlevel: '2', section: 'B', department: 'HR' },
    { id: 3, studentId: 'S1003', fullName: 'Anne Garcia', avatar: 'https://i.pravatar.cc/150?img=18',yearlevel: '3', section: 'C', department: 'Finance' },
    { id: 4, studentId: 'S1004', fullName: 'Mark Torres', avatar: 'https://i.pravatar.cc/150?img=24',yearlevel: '4', section: 'D', department:'IT' },
    { id: 5, studentId: 'S1005', fullName: 'Liza Santos', avatar: 'https://i.pravatar.cc/150?img=8',yearlevel:'5' ,section:'E' ,department:'HR'},
    { id: 6, studentId: 'S1006', fullName: 'Rico Lopez', avatar: 'https://i.pravatar.cc/150?img=47' ,yearlevel:'6' ,section:'F', department:'Finance' },
    { id: 7, studentId: 'S1007', fullName: 'Cathy Mendoza', avatar: 'https://i.pravatar.cc/150?img=52' ,yearlevel:'1' ,section:'A', department:'HR' },
    { id: 8, studentId: 'S1008', fullName: 'James Villanueva', avatar: 'https://i.pravatar.cc/150?img=15' ,yearlevel:'2' ,section:'B', department:'Finance' },
];

export default function Student() {
    const [query, setQuery] = useState('');
    const [searching, setSearching] = useState(false);
    const [filters, setFilters] = useState({
        department: '',
        yearlevel: '',
    });
    const [mode, setMode] = useState('');
    const onFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };
    const applyFilters = (users) => {
        return users.filter(u => {
            return (
                (filters.department === '' || u.department === filters.department) &&
                (filters.yearlevel === '' || u.yearlevel === filters.yearlevel)
            );
        });
    };
    //Temporary search system
    const results = useMemo(() => {
        const q = (query || '').trim().toLowerCase();
        if (!q) return applyFilters(SAMPLE_USERS);
        return applyFilters(SAMPLE_USERS).filter(u => (
            (u.fullName && u.fullName.toLowerCase().includes(q)) ||
            (u.studentId && u.studentId.toLowerCase().includes(q)) ||
            (u.yearlevel && u.yearlevel.toLowerCase().includes(q)) ||
            ((u.yearlevel + u.section) && (u.yearlevel + u.section).toLowerCase().includes(q)) ||
            (u.department && u.department.toLowerCase().includes(q))
        ));
    }, [query]);
    const onSearchChange = (value) => {
        setQuery(value);
        setSearching(true);
        // small UI delay to show searching state
        setTimeout(() => setSearching(false), 350);
    };
    const clearFilters = () => {
        setFilters({
            department: '',
            yearlevel: '',
        });
        setQuery('');
    };
    const onClearFilters = () => {
        clearFilters();
    };
    const onSearch = () => {
        // Implement search action if needed
    }

    return (
        <div className="student-page-wrapper">
            <div className='user-filter-content'>
                <div className='user-filter'>
                    <h2>Students</h2>
                    <div className='filter-options'>
                        <label>Department:
                            <select onChange={e => onFilterChange('department',e.target.value)}>
                                <option value="" key="">All</option>
                                <option value="BSCPE" key="BSCPE">BSCPE</option>
                                <option value="HR" key="HR">HR</option>
                                <option value="Finance" key="Finance">Finance</option>
                                <option value="IT" key="IT">IT</option>
                            </select>
                        </label>
                        <label>Year Level:
                            <select onChange={e => onFilterChange('yearlevel', e.target.value)}>
                                <option value="" key="">All</option>
                                <option value="1" key="1">1st Year</option>
                                <option value="2" key="2">2nd Year</option>
                                <option value="3" key="3">3rd Year</option>
                                <option value="4" key="4">4th Year</option>
                            </select>
                        </label>
                    </div>
                    <button className='search-filtered'>Search</button>
                </div>
            </div>
            <div className="users-content">
                <div className="user-header">
                    <h1>Student Management</h1>
                    <div className="user-searchbar">
                        {mode === '' && <button className='setDelMode' onClick={() => setMode('edit')}><CiIcons.CiEdit /></button>}
                        {mode === 'edit' &&
                            <div className='editMode'>
                                <button className='delete-user' onClick={onClearFilters}><MdIcons.MdDelete /></button>
                                <button className='closeEditMode' onClick={() => setMode('')}><MdIcons.MdClose /></button>
                            </div>
                        }
                        <input
                            type="search"
                            value={query}
                            onChange={e => onSearchChange(e.target.value)}
                            placeholder="Search students by name or ID..."
                        />
                        <button type="button" onClick={() => { /* optional: trigger search action */ }}>Search</button>
                    </div>
                </div>

                <div className="users-list">
                    {searching && <div className="user-loading">Searching…</div>}

                    <div className="user-cards">
                        {results.map(u => (
                            <Link key={u.id} className="user-card-button" to={'/dashboard/students/profile'}>
                                <article className="user-card" key={u.id}>
                                    <img className="user-avatar" src={u.avatar} alt={u.fullName} />
                                    <div className="user-info">
                                        <div className="user-name">{u.fullName}</div>
                                        <div className="user-id">{u.studentId}</div>
                                        <div className="user-section">{u.department + ' - ' + u.yearlevel + u.section}</div>
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