import React, { useState, useRef } from 'react';
import AddFacultyAPI from '../../api/AddFaculty';
import * as MdIcons from 'react-icons/md';
import * as FaIcons from 'react-icons/fa';
import './AddStudent.css';

const BulkImportFaculty = ({ isOpen, onClose, onSuccess }) => {
    const [excelFile, setExcelFile] = useState(null);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const [importResults, setImportResults] = useState(null);
    
    const fileInputRef = useRef(null);
    
    // Handle file selection
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        processFile(file);
    };
    
    // Process selected file
    const processFile = (file) => {
        if (!file) return;
        
        // Validate file type
        const allowedTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
            'application/vnd.ms-excel' // .xls
        ];
        
        if (!allowedTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
            setMessage('Please select a valid Excel file (.xlsx or .xls)');
            setMessageType('error');
            return;
        }
        
        // Validate file size (10MB max)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            setMessage('File size must be less than 10MB');
            setMessageType('error');
            return;
        }
        
        setExcelFile(file);
        setMessage('');
        setImportResults(null);
    };
    
    // Drag and drop handlers
    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragOver(true);
    };
    
    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragOver(false);
    };
    
    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            processFile(files[0]);
        }
    };
    
    // Handle bulk import
    const handleImport = async () => {
        if (!excelFile) {
            setMessage('Please select an Excel file first');
            setMessageType('error');
            return;
        }
        
        setIsImporting(true);
        setMessage('');
        setImportResults(null);
        
        try {
            const result = await AddFacultyAPI.bulkImportFaculty(excelFile);
            
            setImportResults({
                success: result.success,
                total_processed: result.total_processed,
                successful_imports: result.successful_imports,
                failed_imports: result.failed_imports,
                errors: result.errors || []
            });
            
            if (result.success) {
                setMessage(`Import completed! ${result.successful_imports} faculty members added successfully.`);
                setMessageType('success');
                
                // Call success callback
                if (onSuccess) {
                    onSuccess(result);
                }
                
                // Keep the modal open even on full success so the user can review results.
                // The parent (`onSuccess`) may refresh the list; user can close manually.
            } else {
                setMessage('Import completed with errors. Please review the results below.');
                setMessageType('error');
            }
            
        } catch (error) {
            console.error('Import error:', error);
            setMessage(error.message || 'Failed to import faculty data');
            setMessageType('error');
        } finally {
            setIsImporting(false);
        }
    };
    
    // Download template
    const handleDownloadTemplate = () => {
        AddFacultyAPI.downloadTemplate();
    };
    
    // Reset form
    const resetForm = () => {
        setExcelFile(null);
        setMessage('');
        setMessageType('');
        setImportResults(null);
        setIsDragOver(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };
    
    // Handle modal close
    const handleClose = () => {
        resetForm();
        onClose();
    };
    
    if (!isOpen) return null;
    
    return (
        <div className="add-student-modal" onClick={(e) => e.target === e.currentTarget && handleClose()}>
            <div className="add-student-content">
                <div className="add-student-header">
                    <h2 className="add-student-title">
                        <FaIcons.FaFileExcel className="icon" />
                        Bulk Import Faculty
                    </h2>
                    <button 
                        className="add-student-close"
                        onClick={handleClose}
                        disabled={isImporting}
                    >
                        <MdIcons.MdClose />
                    </button>
                </div>
                
                <div className="add-student-form">
                    {message && (
                        <div className={`message ${messageType}`}>
                            {message}
                        </div>
                    )}
                    
                    {/* Template Download Section */}
                    <div className="form-grid">
                        <div className="form-group full-width">
                            <div className="template-section">
                                <div className="template-header">
                                    <MdIcons.MdDownload className="icon" />
                                    <h3>Step 1: Download Template</h3>
                                </div>
                                <p>Download the Excel template and fill in your faculty data:</p>
                                <button 
                                    type="button" 
                                    className="template-download-btn"
                                    onClick={handleDownloadTemplate}
                                >
                                    <MdIcons.MdDownload />
                                    Download Faculty Template
                                </button>
                            </div>
                        </div>
                        
                        {/* File Upload Section */}
                        <div className="form-group full-width">
                            <div className={`profile-image-section excel-upload-section ${isDragOver ? 'drag-over' : ''}`}
                                 onDragOver={handleDragOver}
                                 onDragLeave={handleDragLeave}
                                 onDrop={handleDrop}
                            >
                                <div className="profile-image-header">
                                    <FaIcons.FaFileExcel className="icon" />
                                    <h3>Step 2: Upload Excel File</h3>
                                </div>
                                <div className="profile-image-upload">
                                    {excelFile ? (
                                        <div className="file-selected">
                                            <FaIcons.FaFileExcel className="file-icon" />
                                            <div className="file-info">
                                                <div className="file-name">{excelFile.name}</div>
                                                <div className="file-size">
                                                    {(excelFile.size / 1024 / 1024).toFixed(2)} MB
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className={`image-placeholder excel-placeholder ${isDragOver ? 'drag-over' : ''}`}>
                                            {isDragOver ? (
                                                <>
                                                    <MdIcons.MdCloudUpload className="icon" />
                                                    <span>Drop Excel file here</span>
                                                </>
                                            ) : (
                                                <>
                                                    <FaIcons.FaFileExcel className="icon" />
                                                    <span>Drag & drop Excel file here or click to browse</span>
                                                </>
                                            )}
                                        </div>
                                    )}
                                    
                                    <div className="file-input-wrapper">
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            className="file-input"
                                            accept=".xlsx,.xls"
                                            onChange={handleFileChange}
                                        />
                                        <button
                                            type="button"
                                            className="file-input-button"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            {excelFile ? 'Change File' : 'Choose Excel File'}
                                        </button>
                                    </div>
                                    
                                    <div className="file-info">
                                        Supported formats: XLSX, XLS (Max: 10MB)
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Import Results */}
                    {importResults && (
                        <div className="import-results">
                            <h4>Import Results</h4>
                            <div className="results-summary">
                                <div className="success-count">
                                    <MdIcons.MdCheckCircle className="icon" />
                                    <span>{importResults.successful_imports} successful</span>
                                </div>
                                <div className="error-count">
                                    <MdIcons.MdError className="icon" />
                                    <span>{importResults.failed_imports} failed</span>
                                </div>
                            </div>
                            
                            {importResults.errors && importResults.errors.length > 0 && (
                                <div className="errors-list">
                                    <h5>Import Errors:</h5>
                                    <ul>
                                        {importResults.errors.map((error, index) => (
                                            <li key={index}>{error}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                    
                    <div className="form-actions">
                        <button type="button" className="btn-cancel" onClick={handleClose}>
                            {importResults ? 'Close' : 'Cancel'}
                        </button>
                        <button 
                            type="button" 
                            className="btn-submit" 
                            onClick={handleImport}
                            disabled={!excelFile || isImporting}
                        >
                            {isImporting ? (
                                <>
                                    <MdIcons.MdHourglassEmpty />
                                    Importing...
                                </>
                            ) : (
                                <>
                                    <MdIcons.MdUploadFile />
                                    Import Faculty
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BulkImportFaculty;
