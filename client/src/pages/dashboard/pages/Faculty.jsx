import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './Member.css';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import * as MdIcons from "react-icons/md";
import * as CiIcons from "react-icons/ci";
import FacultyHandler from '../../../api/FacultyHandler';
import AddFaculty from '../../../components/dashboard/AddFaculty';
import BulkImportFaculty from '../../../components/dashboard/BulkImportFaculty';

// Constants
const DEFAULT_PER_PAGE = 20;
const MAX_PER_PAGE = 100;
const FILTER_KEYS = ['department','gender']; // Define filter keys here

// Filter configurations
const FILTER_OPTIONS = {
    department: [
        { value: '', label: 'All Departments' },
        { value: 'BSCPE', label: 'BSCPE' },
        { value: 'HR', label: 'Human Resources' },
        { value: 'Finance', label: 'Finance' },
        { value: 'IT', label: 'Information Technology' },
        { value: 'Engineering', label: 'Engineering' },
        { value: 'Business', label: 'Business Administration' }
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

export default function Faculty() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    
    // Consolidated state
    const [state, setState] = useState({
        query: searchParams.get('q') || '',
        searching: false,
        mode: '',
        selectedIds: [],
        allFacultyIds: [], // Store all faculty IDs for global select all
        faculty: [],
        loading: false,
        error: '',
        showAddFaculty: false,
        showBulkImport: false,
        meta: { total: 0, page: 1, totalPages: 0, hasNext: false, hasPrev: false }
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

    // Fetch all faculty IDs for global select all
    const fetchAllFacultyIds = useCallback(async () => {
        try {
            const handler = new FacultyHandler();
            // Use current API params but with large per_page to get all results
            const allParams = {
                ...apiParams,
                per_page: 1000, // Large number to get all
                page: 1
            };
            
            const data = await handler.fetchFaculties(allParams);
            // Filter out null/undefined IDs
            const allIds = data.items ? data.items.map(f => f.id).filter(id => id != null && id !== undefined && id !== '') : [];
            
            setState(prev => ({ ...prev, allFacultyIds: allIds }));
            return allIds;
        } catch (err) {
            console.error('Failed to fetch all faculty IDs:', err);
            return [];
        }
    }, [apiParams]);

    // Optimized data fetcher with better error handling
    const fetchFaculty = useCallback(async (params) => {
        setState(prev => ({ ...prev, loading: true, error: '' }));
        
        try {
            const handler = new FacultyHandler();
            const data = await handler.fetchFaculties(params);
            // Transform and validate data
            const faculty = data.items.map(u => {
                // Ensure required fields exist
                const fullName = u.full_name || 
                    `${u.first_name || ''} ${u.middle_name || ''} ${u.last_name || ''}`.replace(/\s+/g, ' ').trim() ||
                    'Unknown Name';
                
                return {
                    id: u.id,
                    fullName: u.fullName,
                    avatar: u.profile_path,
                    department: u.department || 'Unknown',
                    yearlevel: u.year_level || u.yearlevel || '',
                    section: u.section || '',
                    gender: u.gender || '',
                    // Add other fields as needed
                };
            });
            console.log(faculty);
            setState(prev => ({
                ...prev,
                faculty,
                meta: {
                    total: data.meta.total || 0,
                    page: data.meta.page || 1,
                    totalPages: data.meta.totalPages || Math.ceil((data.meta.total || faculty.length) / params.per_page),
                    hasNext: data.meta.hasNext || false,
                    hasPrev: data.meta.hasPrev || false
                },
                error: faculty.length === 0 && !params.q && Object.keys(currentFilters).length === 0 
                    ? 'No faculty members found in the system.' 
                    : faculty.length === 0 
                    ? 'No faculty members match your search criteria.' 
                    : '',
                loading: false
            }));
            
        } catch (err) {
            console.error('Failed to load faculty members:', err);
            setState(prev => ({ 
                ...prev, 
                faculty: [],
                error: err.message || 'Failed to load faculty members from server. Please try again.',
                loading: false 
            }));
        }
    }, [currentFilters]);

    // Load data when URL params change
    useEffect(() => {
        fetchFaculty(apiParams);
    }, [apiParams, fetchFaculty]);

    // Clear allFacultyIds when filters or query change so it refetches with new criteria
    useEffect(() => {
        setState(prev => ({ 
            ...prev, 
            allFacultyIds: [],
            selectedIds: [] // Also clear selections when filters change
        }));
    }, [apiParams]);

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
    //Use to select or deselect all faculty -- select ALL across all pages with current filters
    const selectAll = useCallback(async () => {
        setState(prev => ({ ...prev, loading: true }));
        
        try {
            // If all available faculty are selected, deselect all
            const allIds = state.allFacultyIds.length > 0 ? state.allFacultyIds : await fetchAllFacultyIds();
            const areAllSelected = allIds.length > 0 && allIds.every(id => state.selectedIds.includes(id));
            
            setState(prev => ({
                ...prev,
                selectedIds: areAllSelected ? [] : allIds,
                loading: false
            }));
        } catch (err) {
            console.error('Failed to select all faculty:', err);
            setState(prev => ({ ...prev, loading: false }));
        }
    }, [state.selectedIds, state.allFacultyIds, fetchAllFacultyIds]);

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

    // Delete handlers
    const handleDeleteSelected = useCallback(async () => {
        if (state.selectedIds.length === 0) return;

        const isDeleteAll = state.allFacultyIds.length > 0 && state.allFacultyIds.every(id => state.selectedIds.includes(id));
        
        let confirmMessage;
        if (isDeleteAll) {
            confirmMessage = `⚠️ DELETE ALL FACULTY MEMBERS\n\nYou are about to delete ALL ${state.meta.total} faculty members matching current filters.\n\nThis action CANNOT be undone!\n\nType "DELETE ALL" to confirm:`;
            const userInput = window.prompt(confirmMessage);
            if (userInput !== "DELETE ALL") {
                return; // User cancelled or didn't type the exact phrase
            }
        } else {
            confirmMessage = `Are you sure you want to delete ${state.selectedIds.length} selected faculty member${state.selectedIds.length !== 1 ? 's' : ''}?\n\nThis action cannot be undone.`;
            if (!window.confirm(confirmMessage)) return;
        }

        setState(prev => ({ ...prev, loading: true, error: '' }));

        try {
            const handler = new FacultyHandler();
            
            if (state.selectedIds.length === 1) {
                // Single delete
                await handler.deleteFaculty(state.selectedIds[0]);
            } else {
                // Bulk delete
                await handler.bulkDeleteFaculty(state.selectedIds);
            }

            // Refresh the faculty list
            await fetchFaculty(apiParams);
            
            // Clear selection, allFacultyIds, and exit edit mode
            setState(prev => ({ 
                ...prev, 
                selectedIds: [], 
                allFacultyIds: [], // Clear this so Select All recalculates
                mode: '',
                loading: false 
            }));

        } catch (err) {
            console.error('Failed to delete faculty member:', err);
            setState(prev => ({ 
                ...prev, 
                error: err.message || 'Failed to delete faculty members. Please try again.',
                loading: false 
            }));
        }
    }, [state.selectedIds, state.allFacultyIds, state.meta.total, apiParams, fetchFaculty]);

    // AddFaculty modal handlers
    const handleAddFaculty = useCallback(() => {
        setState(prev => ({ ...prev, showAddFaculty: true }));
    }, []);
    
    const handleCloseAddFaculty = useCallback(() => {
        setState(prev => ({ ...prev, showAddFaculty: false }));
    }, []);
    
    const handleFacultyAdded = useCallback(async (newFaculty) => {
        setState(prev => ({ ...prev, showAddFaculty: false }));
        await fetchFaculty(apiParams);
    }, [apiParams, fetchFaculty]);
    
    // Bulk import modal handlers
    const handleBulkImport = useCallback(() => {
        setState(prev => ({ ...prev, showBulkImport: true }));
    }, []);
    
    const handleCloseBulkImport = useCallback(() => {
        setState(prev => ({ ...prev, showBulkImport: false }));
    }, []);
    
    const handleBulkImportSuccess = useCallback(async (result) => {
        setState(prev => ({ ...prev, showBulkImport: false }));
        await fetchFaculty(apiParams);
    }, [apiParams, fetchFaculty]);

    return (
        <div className="user-page-wrapper">
            <div className='user-filter-content'>
                <div className='user-filter'>
                    <h2>Faculty</h2>
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
                    <h1>Faculty Management ({state.meta.total} total)</h1>
                    <div className="user-searchbar">
                        {state.mode === '' && (
                            <>
                                <button 
                                    className='bulk-import-btn' 
                                    onClick={handleBulkImport}
                                    disabled={state.loading}
                                    title="Bulk import faculty from Excel"
                                >
                                    <MdIcons.MdUploadFile />
                                    Bulk Import
                                </button>
                                <button 
                                    className='add-student-btn' 
                                    onClick={handleAddFaculty}
                                    disabled={state.loading}
                                    title="Add new faculty member"
                                >
                                    <MdIcons.MdPersonAdd />
                                    Add Faculty
                                </button>
                                <button className='setDelMode' onClick={() => setState(prev => ({ ...prev, mode: 'edit' }))}>
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
                                            checked={state.allFacultyIds.length > 0 && state.allFacultyIds.every(id => state.selectedIds.includes(id))}
                                            onChange={selectAll}
                                            className="select-all-checkbox"
                                            disabled={state.loading}
                                        />
                                        Select All ({state.meta.total} total)
                                    </label>
                                </div>
                                <span className="selected-count">
                                    {state.selectedIds.length} selected
                                    {state.selectedIds.length > state.faculty.length && (
                                        <span className="cross-page-indicator"> (across pages)</span>
                                    )}
                                </span>
                                <button 
                                    className={`delete-user ${state.allFacultyIds.length > 0 && state.allFacultyIds.every(id => state.selectedIds.includes(id)) ? 'delete-all' : ''}`}
                                    onClick={handleDeleteSelected}
                                    disabled={state.selectedIds.length === 0 || state.loading}
                                    title={`Delete ${state.selectedIds.length} selected faculty member${state.selectedIds.length !== 1 ? 's' : ''}`}
                                >
                                    <MdIcons.MdDelete />
                                    {state.allFacultyIds.length > 0 && state.allFacultyIds.every(id => state.selectedIds.includes(id)) ? 'DELETE ALL' : 'Delete'}
                                </button>
                                <button 
                                    className='closeEditMode' 
                                    onClick={() => setState(prev => ({ ...prev, mode: '', selectedIds: [] }))}
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
                                placeholder="Search Faculty..."
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
                    {state.loading && <div style={{ padding: 12 }}>Loading faculty members...</div>}
                    {state.error && <div style={{ color: 'orange', padding: 8 }}>{state.error}</div>}
                    
                    <div className="user-cards">
                        {state.faculty.map(u => {
                            const isSelected = state.selectedIds.includes(u.id);
                            return (
                                <Link 
                                    key={u.id} 
                                    className={`user-card-button ${isSelected ? 'selected' : ''}`} 
                                    to={`/dashboard/faculty/profile?id=${u.id}`}
                                    onClick={(e) => handleCardClick(e, u)}
                                >
                                    <article className={`user-card ${isSelected ? 'card-active' : ''}`}>
                                        {state.mode === 'edit' && (
                                            <div className="select-indicator">
                                                {isSelected ? <MdIcons.MdCheckBox /> : <MdIcons.MdCheckBoxOutlineBlank />}
                                            </div>
                                        )}
                                        <img className="user-avatar" src={u.avatar} alt={"No Image"} />
                                        <div className="user-info">
                                            <div className="user-name">{u.fullName}</div>
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

                    {/* Pagination */}
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
            
            {/* Modals */}
            <AddFaculty 
                isOpen={state.showAddFaculty}
                onClose={handleCloseAddFaculty}
                onSuccess={handleFacultyAdded}
            />
            <BulkImportFaculty 
                isOpen={state.showBulkImport}
                onClose={handleCloseBulkImport}
                onSuccess={handleBulkImportSuccess}
            />
        </div>
    );
}