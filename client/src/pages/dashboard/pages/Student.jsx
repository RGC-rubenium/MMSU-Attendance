import React, { useState, useMemo } from 'react';
import './Student.css';
import { Link, useNavigate } from 'react-router-dom'; // Added useNavigate
import * as MdIcons from "react-icons/md";
import * as CiIcons from "react-icons/ci";

// ... (SAMPLE_USERS remains the same)
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
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [searching, setSearching] = useState(false);
    const [filters, setFilters] = useState({ department: '', yearlevel: '' });
    const [mode, setMode] = useState('');
    
    // NEW: State for selected cards
    const [selectedIds, setSelectedIds] = useState([]);

    const onFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const applyFilters = (users) => {
        return users.filter(u => (
            (filters.department === '' || u.department === filters.department) &&
            (filters.yearlevel === '' || u.yearlevel === filters.yearlevel)
        ));
    };

    const results = useMemo(() => {
        const q = (query || '').trim().toLowerCase();
        const base = applyFilters(SAMPLE_USERS);
        if (!q) return base;
        return base.filter(u => (
            u.fullName?.toLowerCase().includes(q) ||
            u.studentId?.toLowerCase().includes(q) ||
            u.department?.toLowerCase().includes(q)
        ));
    }, [query, filters]);

    // NEW: Toggle Selection Logic
    const toggleSelection = (id) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    // NEW: Handle Card Click
    const handleCardClick = (e, user) => {
        if (mode === 'edit') {
            e.preventDefault(); // Stop Link navigation
            toggleSelection(user.id);
        }
    };

    const onClearFilters = () => {
        // Logic for "Delete" action in edit mode
        console.log("Deleting IDs:", selectedIds);
        setSelectedIds([]);
        setMode('');
    };

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
                        {mode === '' && (
                            <button className='setDelMode' onClick={() => setMode('edit')}>
                                <CiIcons.CiEdit />
                            </button>
                        )}
                        {mode === 'edit' && (
                            <div className='editMode'>
                                <span>{selectedIds.length} selected</span>
                                <button 
                                    className='delete-user' 
                                    onClick={onClearFilters}
                                    disabled={selectedIds.length === 0}
                                >
                                    <MdIcons.MdDelete />
                                </button>
                                <button className='closeEditMode' onClick={() => {setMode(''); setSelectedIds([]);}}>
                                    <MdIcons.MdClose />
                                </button>
                            </div>
                        )}
                        <input
                            type="search"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Search students..."
                        />
                    </div>
                </div>

                <div className="users-list">
                    <div className="user-cards">
                        {results.map(u => {
                            const isSelected = selectedIds.includes(u.id);
                            return (
                                <Link 
                                    key={u.id} 
                                    className={`user-card-button ${isSelected ? 'selected' : ''}`} 
                                    to={'/dashboard/students/profile?id=' + u.id}
                                    onClick={(e) => handleCardClick(e, u)}
                                >
                                    <article className={`user-card ${isSelected ? 'card-active' : ''}`}>

                                        {mode === 'edit' && (
                                            <div className="select-indicator">
                                                {isSelected ? <MdIcons.MdCheckBox /> : <MdIcons.MdCheckBoxOutlineBlank />}
                                            </div>
                                        )}
                                        <img className="user-avatar" src={u.avatar} alt={u.fullName} />
                                        <div className="user-info">
                                            <div className="user-name">{u.fullName}</div>
                                            <div className="user-id">{u.studentId}</div>
                                            <div className="user-section">{`${u.department} - ${u.yearlevel}${u.section}`}</div>
                                        </div>
                                    </article>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}