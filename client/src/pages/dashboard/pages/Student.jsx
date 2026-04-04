import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './Member.css';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import * as MdIcons from "react-icons/md";
import * as CiIcons from "react-icons/ci";
import * as IoIcons from "react-icons/io5";
import * as FaIcons from "react-icons/fa";
import StudentHandler from '../../../api/StudentHandler';
import AddStudent from '../../../components/dashboard/AddStudent';
import BulkImportStudents from '../../../components/dashboard/BulkImportStudents';
import UserAvatar from '../../../components/UserAvatar';
import ConfirmModal from '../../../components/common/ConfirmModal';

// Constants
const DEFAULT_PER_PAGE = 20;
const MAX_PER_PAGE = 100;
const FILTER_KEYS = ['department', 'yearlevel', 'section','gender']; // Define filter keys here

// Filter configurations
const FILTER_OPTIONS = {
    department: [
        { value: '', label: 'All Departments' },
        { value: 'BSCpE', label: 'BSCpE' },
        { value: 'BSME', label: 'BSME' },
        { value: 'BSEE', label: 'BSEE' },
        { value: 'BSECE', label: 'BSECE' },
        { value: 'BSCE', label: 'BSCE' },
        { value: 'BSChE', label: 'BSChE' },
        { value: 'BSCerE', label: 'BSCerE' },
        { value: 'BSABE', label: 'BSABE' }
    ],
    yearlevel: [
        { value: '', label: 'All Years' },
        { value: '1', label: '1st Year' },
        { value: '2', label: '2nd Year' },
        { value: '3', label: '3rd Year' },
        { value: '4', label: '4th Year' },
        { value: '5', label: '5th Year' }
    ],
    section: [
        { value: '', label: 'All Sections' },
        { value: 'A', label: 'Section A' },
        { value: 'B', label: 'Section B' },
        { value: 'C', label: 'Section C' },
        { value: 'D', label: 'Section D' },
        { value: 'E', label: 'Section E' }
    ],
    gender: [
        { value: '', label: 'All Genders' },
        { value: 'MALE', label: 'Male' },
        { value: 'FEMALE', label: 'Female' },
    ]
};

//To be used for sorting options
const SORT_OPTIONS = [
    { value: 'last_name:asc', label: 'Last Name (A-Z)' },
    { value: 'last_name:desc', label: 'Last Name (Z-A)' },
    { value: 'first_name:asc', label: 'First Name (A-Z)' },
    { value: 'first_name:desc', label: 'First Name (Z-A)' },
    { value: 'department:asc', label: 'Department (A-Z)' },
    { value: 'year_level:asc', label: 'Year Level (1-5)' }
];

export default function Student() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    
    // Consolidated state
    const [state, setState] = useState({
        query: searchParams.get('q') || '',
        searching: false,
        mode: '',
        selectedIds: [],
        allStudentIds: [], // Store all student IDs for global select all
        students: [],
        loading: false,
        error: '',
        showAddStudent: false,
        showBulkImport: false,
        meta: { total: 0, page: 1, totalPages: 0, hasNext: false, hasPrev: false }
    });

    // Delete confirmation modal state
    const [deleteModal, setDeleteModal] = useState({
        show: false,
        isDeleteAll: false,
        count: 0
    });

    const [localFilters, setLocalFilters] = useState(() => {
        const filters = {};
        FILTER_KEYS.forEach(key => {
            filters[key] = searchParams.get(key) || '';
        });
        return filters;
    });

    const [localQuery, setLocalQuery] = useState(searchParams.get('q') || '');

    // Memoized current filters from URL
    const currentFilters = useMemo(() => {
        const filters = {};
        FILTER_KEYS.forEach(key => {
            const value = searchParams.get(key);
            if (value) filters[key] = value;
        });
        return filters;
    }, [searchParams]);

    // Memoized search params for API
    const apiParams = useMemo(() => {
        const params = {
            page: Math.max(1, parseInt(searchParams.get('page')) || 1),
            per_page: Math.min(MAX_PER_PAGE, Math.max(1, parseInt(searchParams.get('per_page')) || DEFAULT_PER_PAGE)),
            sort: searchParams.get('sort') || 'last_name:asc'
        };
        
        const q = searchParams.get('q');
        if (q && q.trim()) params.q = q.trim();
        
        // Add filters
        Object.entries(currentFilters).forEach(([key, value]) => {
            if (value) params[key] = value;
        });
        
        return params;
    }, [searchParams, currentFilters]);

    // Fetch all student IDs for global select all
    const fetchAllStudentIds = useCallback(async () => {
        try {
            const handler = new StudentHandler();
            // Fetch with same filters but get all pages and only IDs
            const allParams = {
                ...currentFilters,
                q: state.query,
                per_page: 1000, // Large number to get all
                page: 1
            };
            
            const data = await handler.fetchStudents(allParams);
            const allIds = data.items ? data.items.map(s => s.id) : [];
            
            setState(prev => ({ ...prev, allStudentIds: allIds }));
            return allIds;
        } catch (err) {
            console.error('Failed to fetch all student IDs:', err);
            return [];
        }
    }, [currentFilters, state.query]);

    // Optimized data fetcher with better error handling
    const fetchStudents = useCallback(async (params) => {
        setState(prev => ({ ...prev, loading: true, error: '' }));
        
        try {
            const handler = new StudentHandler();
            const data = await handler.fetchStudents(params);
            // Transform and validate data
            const students = data.items.map(u => {
                // Ensure required fields exist
                const fullName = u.full_name || u.fullName ||
                    `${u.first_name || ''} ${u.middle_name || ''} ${u.last_name || ''}`.replace(/\s+/g, ' ').trim() ||
                    'Unknown Name';

                // Short name: first + last (or fallback to initials / fullName)
                const nameParts = fullName.split(/\s+/).filter(Boolean);
                let shortName = fullName;
                if (nameParts.length >= 2) {
                    shortName = `${nameParts[0]} ${nameParts[nameParts.length - 1]}`; // First + Last
                } else if (nameParts.length === 1) {
                    // Single name - use initials if too long
                    shortName = nameParts[0].length > 12 ? `${nameParts[0].slice(0, 12)}...` : nameParts[0];
                }

                return {
                    id: u.id,
                    fullName: fullName,
                    shortName: shortName,
                    avatar: u.avatar || u.profile_path, // Use avatar field from API
                    department: u.department || 'Unknown',
                    yearlevel: u.year_level || u.yearlevel || '',
                    section: u.section || '',
                    gender: u.gender || '',
                    // Add other fields as needed
                };
            });
            console.log('Transformed students:', students);
            setState(prev => ({
                ...prev,
                students,
                meta: {
                    total: data.meta.total || 0,
                    page: data.meta.page || 1,
                    totalPages: data.meta.total_pages || data.meta.totalPages || Math.ceil((data.meta.total || students.length) / params.per_page),
                    hasNext: data.meta.has_next ?? data.meta.hasNext ?? false,
                    hasPrev: data.meta.has_prev ?? data.meta.hasPrev ?? false
                },
                error: students.length === 0 && !params.q && Object.keys(currentFilters).length === 0 
                    ? 'No students found in the system.' 
                    : students.length === 0 
                    ? 'No students match your search criteria.' 
                    : '',
                loading: false
            }));
            
        } catch (err) {
            console.error('Failed to load students:', err);
            setState(prev => ({ 
                ...prev, 
                students: [],
                error: err.message || 'Failed to load students from server. Please try again.',
                loading: false 
            }));
        }
    }, [currentFilters]);

    // Load data when URL params change
    useEffect(() => {
        fetchStudents(apiParams);
    }, [apiParams, fetchStudents]);

    // Sync local state with URL params when they change (for back/forward navigation)
    useEffect(() => {
        const urlQuery = searchParams.get('q') || '';
        const urlFilters = {};
        FILTER_KEYS.forEach(key => {
            urlFilters[key] = searchParams.get(key) || '';
        });
        
        setLocalQuery(urlQuery);
        setLocalFilters(urlFilters);
        setState(prev => ({ ...prev, query: urlQuery }));
    }, [searchParams]);
    // Optimized URL param updater
    const updateSearchParams = useCallback((updates, resetPage = true) => {
        const newParams = new URLSearchParams(searchParams);
        
        if (resetPage) {
            newParams.set('page', '1');
        }
        
        Object.entries(updates).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value.toString().trim() !== '') {
                newParams.set(key, value.toString().trim());
            } else {
                newParams.delete(key);
            }
        });
        
        setSearchParams(newParams);
    }, [searchParams, setSearchParams]);

    // Local query change handler (no immediate URL update)
    const handleQueryChange = useCallback((e) => {
        const value = e.target.value;
        setLocalQuery(value);
        setState(prev => ({ ...prev, query: value }));
    }, []);

    // Manual search trigger - applies local query to URL
    const handleSearch = useCallback(() => {
        setState(prev => ({ ...prev, searching: true }));
        updateSearchParams({ q: localQuery });
        setTimeout(() => setState(prev => ({ ...prev, searching: false })), 300);
    }, [localQuery, updateSearchParams]);

    // Filter change handler - updates local filters only
    const handleFilterChange = useCallback((field, value) => {
        setLocalFilters(prev => ({ ...prev, [field]: value }));
    }, []);

    // Apply filters handler - syncs local filters to URL
    const handleApplyFilters = useCallback(() => {
        const updates = { ...localFilters };
        updateSearchParams(updates);
    }, [localFilters, updateSearchParams]);

    // Clear filters handler - resets all local filters
    const handleClearFilters = useCallback(() => {
        const clearedFilters = {};
        FILTER_KEYS.forEach(key => {
            clearedFilters[key] = '';
        });
        setLocalFilters(clearedFilters);
    }, []);

    // Sort change handler
    const handleSortChange = useCallback((value) => {
        updateSearchParams({ sort: value }, false);
    }, [updateSearchParams]);

    // Selection handlers
    const toggleSelection = useCallback((id) => {
        setState(prev => ({
            ...prev,
            selectedIds: prev.selectedIds.includes(id)
                ? prev.selectedIds.filter(selectedId => selectedId !== id)
                : [...prev.selectedIds, id]
        }));
    }, []);
    //Use to select or deselect all students -- select ALL across all pages with current filters
    const selectAll = useCallback(async () => {
        setState(prev => ({ ...prev, loading: true }));
        
        try {
            // If all available students are selected, deselect all
            const allIds = state.allStudentIds.length > 0 ? state.allStudentIds : await fetchAllStudentIds();
            const areAllSelected = allIds.length > 0 && allIds.every(id => state.selectedIds.includes(id));
            
            setState(prev => ({
                ...prev,
                selectedIds: areAllSelected ? [] : allIds,
                loading: false
            }));
        } catch (err) {
            console.error('Failed to select all students:', err);
            setState(prev => ({ ...prev, loading: false }));
        }
    }, [state.selectedIds, state.allStudentIds, fetchAllStudentIds]);

    const handleCardClick = useCallback((e, user) => {
        if (state.mode === 'edit') {
            e.preventDefault();
            toggleSelection(user.id);
        }
    }, [state.mode, toggleSelection]);
    //Use to clear all selections --tobe used after deletions
    const clearSelection = useCallback(() => {
        setState(prev => ({ ...prev, selectedIds: [], mode: '' }));
    }, []);

    const goToPage = useCallback((page) => {
        updateSearchParams({ page }, false);
    }, [updateSearchParams]);

    // Check if local filters differ from URL (has pending changes)
    const hasFilterChanges = useMemo(() => {
        return FILTER_KEYS.some(key => {
            const localValue = localFilters[key] || '';
            const urlValue = currentFilters[key] || '';
            return localValue !== urlValue;
        });
    }, [localFilters, currentFilters]);

    // Check if local search differs from URL
    const hasSearchChanges = useMemo(() => {
        const urlQuery = searchParams.get('q') || '';
        return localQuery !== urlQuery;
    }, [localQuery, searchParams]);

    // Show delete confirmation modal
    const handleDeleteSelected = useCallback(() => {
        if (state.selectedIds.length === 0) return;

        const isDeleteAll = state.allStudentIds.length > 0 && state.allStudentIds.every(id => state.selectedIds.includes(id));
        
        setDeleteModal({
            show: true,
            isDeleteAll,
            count: isDeleteAll ? state.meta.total : state.selectedIds.length
        });
    }, [state.selectedIds, state.allStudentIds, state.meta.total]);

    // Execute the actual delete
    const executeDelete = useCallback(async () => {
        setDeleteModal({ show: false, isDeleteAll: false, count: 0 });
        setState(prev => ({ ...prev, loading: true, error: '' }));

        try {
            const handler = new StudentHandler();
            
            if (state.selectedIds.length === 1) {
                // Single delete
                await handler.deleteStudent(state.selectedIds[0]);
            } else {
                // Bulk delete
                await handler.bulkDeleteStudents(state.selectedIds);
            }

            // Refresh the student list
            await fetchStudents(apiParams);
            
            // Clear selection and exit edit mode
            setState(prev => ({ 
                ...prev, 
                selectedIds: [], 
                mode: '',
                loading: false 
            }));

        } catch (err) {
            console.error('Failed to delete students:', err);
            setState(prev => ({ 
                ...prev, 
                error: err.message || 'Failed to delete students. Please try again.',
                loading: false 
            }));
        }
    }, [state.selectedIds, apiParams, fetchStudents]);

    // AddStudent modal handlers
    const handleAddStudent = useCallback(() => {
        setState(prev => ({ ...prev, showAddStudent: true }));
    }, []);
    
    const handleCloseAddStudent = useCallback(() => {
        setState(prev => ({ ...prev, showAddStudent: false }));
    }, []);
    
    const handleStudentAdded = useCallback(async (newStudent) => {
        // Refresh the student list to include the new student
        await fetchStudents(apiParams);
    }, [apiParams, fetchStudents]);
    
    // Bulk import modal handlers
    const handleBulkImport = useCallback(() => {
        setState(prev => ({ ...prev, showBulkImport: true }));
    }, []);
    
    const handleCloseBulkImport = useCallback(() => {
        setState(prev => ({ ...prev, showBulkImport: false }));
    }, []);
    
    const handleBulkImportSuccess = useCallback(async (result) => {
        // Refresh the student list to include imported students
        await fetchStudents(apiParams);
    }, [apiParams, fetchStudents]);

    return (
        <>
            <div className="user-page-wrapper">
                <div className='user-filter-content'>
                <div className='user-filter'>
                    <h2>Students</h2>
                    <div className='filter-options'>
                        {Object.entries(FILTER_OPTIONS).map(([key, options]) => (
                            <label key={key}>
                                {key.charAt(0).toUpperCase() + key.slice(1).replace('yearlevel', 'Year Level')}:
                                <select 
                                    value={localFilters[key] || ''} 
                                    onChange={e => handleFilterChange(key, e.target.value)}
                                >
                                    {options.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </label>
                        ))}
                    </div>
                    <div className="filter-buttons">
                        <button 
                            className={`search-filtered ${hasFilterChanges ? 'has-changes' : ''}`} 
                            onClick={handleApplyFilters}
                            disabled={state.loading}
                        >
                            Apply Filter {hasFilterChanges ? '•' : ''}
                        </button>
                        <button 
                            className="clear-filters"
                            onClick={handleClearFilters}
                            disabled={state.loading || Object.values(localFilters).every(val => !val)}
                            title="Clear all filters"
                        >
                            Clear
                        </button>
                    </div>
                </div>
            </div>

            <div className="users-content">
                <div className="user-header">
                    <h1>Student Management ({state.meta.total} total)</h1>
                    <div className="user-searchbar">
                        {state.mode === '' && (
                            <>
                                <button 
                                    className='bulk-import-btn' 
                                    onClick={handleBulkImport}
                                    title="Bulk Import Students"
                                >
                                    <FaIcons.FaFileExcel />
                                    Bulk Import
                                </button>
                                <button 
                                    className='add-student-btn' 
                                    onClick={handleAddStudent}
                                    title="Add New Student"
                                >
                                    <IoIcons.IoPersonAdd />
                                    Add Student
                                </button>
                                <button className='setDelMode' onClick={async () => {
                                    setState(prev => ({ ...prev, mode: 'edit' }));
                                    // Fetch all student IDs when entering edit mode
                                    await fetchAllStudentIds();
                                }}>
                                    <CiIcons.CiEdit />
                                </button>
                            </>
                        )}
                        {state.mode === 'edit' && (
                            <div className='editMode'>
                                <div className="select-all-section">
                                    <label className="select-all-label">
                                        <input
                                            type="checkbox"
                                            checked={state.allStudentIds.length > 0 && state.allStudentIds.every(id => state.selectedIds.includes(id))}
                                            onChange={selectAll}
                                            className="select-all-checkbox"
                                            disabled={state.loading}
                                        />
                                        Select All ({state.meta.total} total)
                                    </label>
                                </div>
                                <span className="selected-count">
                                    {state.selectedIds.length} selected
                                    {state.selectedIds.length > state.students.length && (
                                        <span className="cross-page-indicator"> (across pages)</span>
                                    )}
                                </span>
                                <button 
                                    className={`delete-user ${state.allStudentIds.length > 0 && state.allStudentIds.every(id => state.selectedIds.includes(id)) ? 'delete-all' : ''}`}
                                    onClick={handleDeleteSelected}
                                    disabled={state.selectedIds.length === 0 || state.loading}
                                    title={state.allStudentIds.length > 0 && state.allStudentIds.every(id => state.selectedIds.includes(id))
                                        ? `DELETE ALL ${state.meta.total} students (requires confirmation)` 
                                        : `Delete ${state.selectedIds.length} selected student${state.selectedIds.length !== 1 ? 's' : ''}`}
                                >
                                    <MdIcons.MdDelete />
                                    {state.allStudentIds.length > 0 && state.allStudentIds.every(id => state.selectedIds.includes(id))
                                        ? `DELETE ALL (${state.meta.total})` 
                                        : state.selectedIds.length > 0 
                                        ? `Delete ${state.selectedIds.length}` 
                                        : 'Delete'}
                                </button>
                                <button 
                                    className='closeEditMode' 
                                    onClick={() => setState(prev => ({ ...prev, mode: '', selectedIds: [] }))}
                                    title="Exit edit mode"
                                >
                                    <MdIcons.MdClose />
                                </button>
                            </div>
                        )}
                        <div className="search-input-wrap">
                            <input
                                type="search"
                                value={localQuery}
                                onChange={handleQueryChange}
                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
                                placeholder="Search students..."
                            />
                            <button 
                                className={`search-btn ${hasSearchChanges ? 'has-changes' : ''}`} 
                                onClick={handleSearch} 
                                disabled={state.searching || state.loading}
                                aria-label={hasSearchChanges ? "Search (changes pending)" : "Search"}
                                title={hasSearchChanges ? "Press to apply search changes" : "Search"}
                            >
                                <MdIcons.MdSearch />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="users-list">
                    {state.loading && <div style={{ padding: 12 }}>Loading students...</div>}
                    {state.error && <div style={{ color: 'orange', padding: 8 }}>{state.error}</div>}
                    
                    <div className="user-cards">
                        {state.students.map(u => {
                            const isSelected = state.selectedIds.includes(u.id);
                            return (
                                <Link 
                                    key={u.id} 
                                    className={`user-card-button ${isSelected ? 'selected' : ''}`} 
                                    to={`/dashboard/students/profile?id=${u.id}`}
                                    onClick={(e) => handleCardClick(e, u)}
                                >
                                    <article className={`user-card ${isSelected ? 'card-active' : ''}`}>
                                        {state.mode === 'edit' && (
                                            <div className="select-indicator">
                                                {isSelected ? <MdIcons.MdCheckBox /> : <MdIcons.MdCheckBoxOutlineBlank />}
                                            </div>
                                        )}
                                        <UserAvatar 
                                            src={u.avatar} 
                                            alt={`${u.fullName} avatar`} 
                                            fullName={u.fullName}
                                            className="user-avatar" 
                                        />
                                        <div className="user-info">
                                            <div className="user-name" title={u.fullName}>{u.shortName || u.fullName}</div>
                                            <div className="user-id">{u.id}</div>
                                            <div className="user-section">
                                                {`${u.department} - ${u.yearlevel || ''}${u.section || ''}`}
                                            </div>
                                        </div>
                                    </article>
                                </Link>
                            );
                        })}
                    </div>

                    {/* Pagination - back inside scrollable area */}
                    {state.meta.totalPages > 1 && (
                        <div className="pagination">
                            <button 
                                disabled={state.meta.page <= 1} 
                                onClick={() => goToPage(state.meta.page - 1)}
                            >
                                Previous
                            </button>
                            <span>Page {state.meta.page} of {state.meta.totalPages}</span>
                            <button 
                                disabled={state.meta.page >= state.meta.totalPages} 
                                onClick={() => goToPage(state.meta.page + 1)}
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>
            </div>
            </div>
            
            {/* Add Student Modal */}
            <AddStudent 
                isOpen={state.showAddStudent}
                onClose={handleCloseAddStudent}
                onSuccess={handleStudentAdded}
            />
            
            {/* Bulk Import Modal */}
            <BulkImportStudents 
                isOpen={state.showBulkImport}
                onClose={handleCloseBulkImport}
                onSuccess={handleBulkImportSuccess}
            />

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                show={deleteModal.show}
                title={deleteModal.isDeleteAll ? "⚠️ Delete All Students" : "Delete Students"}
                message={deleteModal.isDeleteAll 
                    ? `You are about to delete ALL ${deleteModal.count} students matching current filters.\n\nThis action CANNOT be undone!`
                    : `Are you sure you want to delete ${deleteModal.count} selected student${deleteModal.count !== 1 ? 's' : ''}?\n\nThis action cannot be undone.`
                }
                onConfirm={executeDelete}
                onCancel={() => setDeleteModal({ show: false, isDeleteAll: false, count: 0 })}
                confirmText={deleteModal.isDeleteAll ? "Delete All" : "Delete"}
                confirmClass="btn-danger"
                requireInput={deleteModal.isDeleteAll}
                requiredInputValue="DELETE ALL"
                inputPlaceholder="Type DELETE ALL to confirm"
            />
        </>
    );
}