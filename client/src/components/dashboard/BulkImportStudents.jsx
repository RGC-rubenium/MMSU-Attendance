import React, { useState, useRef } from 'react';
import './AddStudent.css';
import AddStudentHandler from '../../api/AddStudent';
import * as MdIcons from 'react-icons/md';
import * as IoIcons from 'react-icons/io5';
import * as BiIcons from 'react-icons/bi';
import * as FaIcons from 'react-icons/fa';

const BulkImportStudents = ({ isOpen, onClose, onSuccess }) => {
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
        if (file) {
            processFile(file);
        }
        // Clear the input to allow selecting the same file again if needed
        e.target.value = '';
    };
    
    // Process selected file
    const processFile = (file) => {
        // Validate file type
        if (!file.name.toLowerCase().endsWith('.xlsx') && !file.name.toLowerCase().endsWith('.xls')) {
            setMessage('Please select a valid Excel file (.xlsx or .xls)');
            setMessageType('error');
            return;
        }
        
        // Validate file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
            setMessage('Excel file size must be less than 10MB');
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
        e.stopPropagation();
        setIsDragOver(true);
    };
    
    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    };
    
    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        
        const files = e.dataTransfer.files;
        if (files && files[0]) {
            processFile(files[0]);
        }
    };
    
    // Handle bulk import
    const handleImport = async () => {
        if (!excelFile) {
            setMessage('Please select an Excel file to import');
            setMessageType('error');
            return;
        }
        
        setIsImporting(true);
        setMessage('');
        
        try {
            const result = await AddStudentHandler.bulkImportStudents(excelFile);
            
            setImportResults(result);
            
            if (result.students_added > 0) {
                setMessage(`Successfully imported ${result.students_added} students!`);
                setMessageType('success');
                
                // Call success callback after a delay
                setTimeout(() => {
                    onSuccess && onSuccess(result);
                }, 2000);
            } else {
                setMessage('No students were imported. Please check the file and try again.');
                setMessageType('error');
            }
            
        } catch (error) {
            console.error('Import error details:', error);
            let errorMessage = 'Failed to import students';
            
            // Provide more specific error messages
            if (error.message.includes('WinError 32') || error.message.includes('process cannot access')) {
                errorMessage = 'File is currently being used by another application. Please close the Excel file and try again.';
            } else if (error.message.includes('Missing required columns')) {
                errorMessage = error.message;
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            setMessage(errorMessage);
            setMessageType('error');
        } finally {
            setIsImporting(false);
        }
    };
    
    // Download template
    const handleDownloadTemplate = () => {
        AddStudentHandler.downloadTemplate();
    };
    
    // Reset form
    const resetForm = () => {
        setExcelFile(null);
        setMessage('');
        setImportResults(null);
        setIsDragOver(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };
    
    // Handle modal close
    const handleClose = () => {
        if (!isImporting) {
            resetForm();
            onClose();
        }
    };
    
    if (!isOpen) return null;
    
    return (
        <div className="add-student-modal" onClick={(e) => e.target === e.currentTarget && handleClose()}>
            <div className="add-student-content">
                <div className="add-student-header">
                    <h2 className="add-student-title">
                        <FaIcons.FaFileExcel className="icon" />
                        Bulk Import Students
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
                                <p>Download the Excel template with the required columns and sample data.</p>
                                <div className="template-header">
                                    <MdIcons.MdEdit className="icon" />
                                    <h3>Step 2: Input Data</h3>
                                </div>
                                <p>Fill in following data in the template:</p>
                                <ul>
                                    <li><strong>uid</strong> (required)</li>
                                    <li><strong>id</strong> (required)</li>
                                    <li><strong>first_name</strong> (required)</li>
                                    <li><strong>middle_name</strong> (optional)</li>
                                    <li><strong>last_name</strong> (required)</li>
                                    <li><strong>department</strong> (required): BSCpE, BSME, BSEE, BSECE, BSCE, BSChE, BSCerE, BSABE</li>
                                    <li><strong>year_level</strong> (optional)</li>
                                    <li><strong>gender</strong> (optional)</li>
                                    <li><strong>parent_contact</strong> (optional)</li>
                                    <li><strong>contact_number</strong> (optional)</li>
                                </ul>
                                <div className="template-header" style={{ marginTop: 12 }}>
                                    <MdIcons.MdCloudUpload className="icon" />
                                    <h3>Step 3: Import</h3>
                                </div>
                                <p>
                                    After filling out the template, make sure the file is in a supported format before uploading.
                                    If your spreadsheet editor exported a different format (for example, CSV), open the file in
                                    Excel or a compatible editor and save/export it as <strong>.xlsx</strong> or <strong>.xls</strong>.
                                    Then upload it using the "Upload Excel File" section below and click the <strong>Import Students</strong>
                                    button to start the import process.
                                </p>
                                <button 
                                    type="button" 
                                    className="template-download-btn"
                                    onClick={handleDownloadTemplate}
                                >
                                    <MdIcons.MdDownload />
                                    Download Template
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
                                    {importResults.students_added} students imported successfully
                                </div>
                                {importResults.errors && importResults.errors.length > 0 && (
                                    <div className="error-count">
                                        <MdIcons.MdError className="icon" />
                                        {importResults.errors.length} errors occurred
                                    </div>
                                )}
                            </div>
                            
                            {importResults.errors && importResults.errors.length > 0 && (
                                <div className="errors-list">
                                    <h5>Errors:</h5>
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
                        <button
                            type="button"
                            className="btn-cancel"
                            onClick={handleClose}
                            disabled={isImporting}
                        >
                            {importResults && importResults.students_added > 0 ? 'Close' : 'Cancel'}
                        </button>
                        <button
                            type="button"
                            className="btn-submit"
                            onClick={handleImport}
                            disabled={isImporting || !excelFile}
                        >
                            {isImporting ? 'Importing...' : 'Import Students'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BulkImportStudents;