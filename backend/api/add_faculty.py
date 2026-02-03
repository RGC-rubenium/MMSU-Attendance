import os
import uuid
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from extensions import db
from models import Faculty
from datetime import datetime
import re
import pandas as pd
import tempfile

add_faculty_bp = Blueprint('add_faculty', __name__)

# Configuration
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), '..', 'images', 'members', 'faculty')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def sanitize_filename(name):
    """Convert faculty name to valid filename"""
    # Remove special characters and replace spaces with underscores
    clean_name = re.sub(r'[^a-zA-Z0-9\s]', '', name)
    clean_name = re.sub(r'\s+', '_', clean_name.strip())
    return clean_name.lower()

@add_faculty_bp.route('/api/faculty', methods=['POST'])
def add_faculty():
    try:
        # Check if request has file part
        profile_image = None
        if 'profile_image' in request.files:
            profile_image = request.files['profile_image']
            if profile_image.filename == '':
                profile_image = None

        # Get form data
        data = request.form.to_dict()
        
        # Required fields validation
        required_fields = ['uid', 'id', 'first_name', 'last_name', 'department', 'gender']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'success': False,
                    'message': f'{field.replace("_", " ").title()} is required'
                }), 400

        # Check if UID already exists
        existing_uid = Faculty.query.filter_by(uid=data['uid']).first()
        if existing_uid:
            return jsonify({
                'success': False,
                'message': 'UID already exists'
            }), 400

        # Check if faculty ID already exists
        if data.get('id'):
            existing_faculty = Faculty.query.filter_by(id=data['id']).first()
            if existing_faculty:
                return jsonify({
                    'success': False,
                    'message': 'Faculty ID already exists'
                }), 400

        # Use the provided UID
        uid = data['uid'].strip()

        # Handle profile image upload
        profile_path = None
        if profile_image and allowed_file(profile_image.filename):
            # Create upload directory if it doesn't exist
            os.makedirs(UPLOAD_FOLDER, exist_ok=True)
            
            # Generate filename based on faculty name
            full_name = f"{data['first_name']} {data.get('middle_name', '')} {data['last_name']}".strip()
            clean_name = sanitize_filename(full_name)
            
            # Get file extension
            file_ext = profile_image.filename.rsplit('.', 1)[1].lower()
            filename = f"{clean_name}.{file_ext}"
            
            # Handle duplicate filenames
            counter = 1
            original_filename = filename
            while os.path.exists(os.path.join(UPLOAD_FOLDER, filename)):
                name_part = original_filename.rsplit('.', 1)[0]
                ext_part = original_filename.rsplit('.', 1)[1]
                filename = f"{name_part}_{counter}.{ext_part}"
                counter += 1
            
            # Save file
            file_path = os.path.join(UPLOAD_FOLDER, filename)
            profile_image.save(file_path)
            profile_path = f"/images/members/faculty/{filename}"

        # Create new faculty
        new_faculty = Faculty(
            uid=uid,
            id=data.get('id'),
            first_name=data['first_name'].strip(),
            middle_name=data.get('middle_name', '').strip() or None,
            last_name=data['last_name'].strip(),
            department=data['department'].strip(),
            gender=data.get('gender', '').upper() if data.get('gender') else None,
            profile_path=profile_path,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )

        # Save to database
        db.session.add(new_faculty)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Faculty added successfully',
            'faculty': new_faculty.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'An error occurred: {str(e)}'
        }), 500

@add_faculty_bp.route('/api/faculty/validate-uid', methods=['POST'])
def validate_faculty_uid():
    """Validate if UID is available"""
    try:
        data = request.get_json()
        uid = data.get('uid')
        
        if not uid:
            return jsonify({'available': True})
        
        existing = Faculty.query.filter_by(uid=uid).first()
        return jsonify({'available': existing is None})
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Validation error: {str(e)}'
        }), 500

@add_faculty_bp.route('/api/faculty/validate-id', methods=['POST'])
def validate_faculty_id():
    """Validate if faculty ID is available"""
    try:
        data = request.get_json()
        faculty_id = data.get('id')
        
        if not faculty_id:
            return jsonify({'available': True})
        
        existing = Faculty.query.filter_by(id=faculty_id).first()
        return jsonify({'available': existing is None})
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Validation error: {str(e)}'
        }), 500

@add_faculty_bp.route('/api/faculty/bulk-import', methods=['POST'])
def bulk_import_faculty():
    """Import faculty from Excel file"""
    temp_file_path = None
    try:
        # Check if file is present
        if 'excel_file' not in request.files:
            return jsonify({
                'success': False,
                'message': 'No Excel file provided'
            }), 400
            
        file = request.files['excel_file']
        if file.filename == '':
            return jsonify({
                'success': False,
                'message': 'No file selected'
            }), 400
            
        # Validate file extension
        if not file.filename.lower().endswith(('.xlsx', '.xls')):
            return jsonify({
                'success': False,
                'message': 'Please upload a valid Excel file (.xlsx or .xls)'
            }), 400
            
        # Create temporary file with explicit delete=False and manual cleanup
        temp_file_path = os.path.join(tempfile.gettempdir(), f'bulk_import_{uuid.uuid4().hex}.xlsx')
        
        try:
            # Save uploaded file to temporary location
            file.save(temp_file_path)
            
            # Read Excel file
            df = pd.read_excel(temp_file_path)
            
            print(f"DEBUG: Excel file read successfully. Shape: {df.shape}")
            print(f"DEBUG: Columns: {list(df.columns)}")
            print(f"DEBUG: First few rows:")
            print(df.head())
            
            # Validate required columns
            required_columns = ['uid', 'id', 'first_name', 'last_name', 'department', 'gender']
            missing_columns = [col for col in required_columns if col not in df.columns]
            
            if missing_columns:
                return jsonify({
                    'success': False,
                    'message': f'Missing required columns: {", ".join(missing_columns)}'
                }), 400
            
            # Process faculty
            faculty_added = []
            errors = []
            
            print(f"DEBUG: Starting to process {len(df)} rows")
            
            for index, row in df.iterrows():
                try:
                    print(f"DEBUG: Processing row {index + 1}: {dict(row)}")
                    
                    # Skip rows with missing required data
                    if pd.isna(row['uid']) or pd.isna(row['id']) or pd.isna(row['first_name']) or pd.isna(row['last_name']) or pd.isna(row['department']) or pd.isna(row['gender']):
                        errors.append(f"Row {index + 2}: Missing required data")
                        continue
                    
                    # Convert values to strings and clean them
                    uid = str(row['uid']).strip()
                    faculty_id = str(row['id']).strip()
                    first_name = str(row['first_name']).strip()
                    last_name = str(row['last_name']).strip()
                    department = str(row['department']).strip()
                    gender = str(row['gender']).strip().upper()
                    
                    # Handle optional middle name
                    middle_name = None
                    if not pd.isna(row.get('middle_name', '')):
                        middle_name = str(row['middle_name']).strip()
                        if middle_name == '':
                            middle_name = None
                    
                    print(f"DEBUG: Cleaned data - UID: {uid}, ID: {faculty_id}, Name: {first_name} {last_name}")
                    
                    # Validate UID uniqueness
                    if Faculty.query.filter_by(uid=uid).first():
                        errors.append(f"Row {index + 2}: UID '{uid}' already exists")
                        continue
                    
                    # Validate faculty ID uniqueness
                    if Faculty.query.filter_by(id=faculty_id).first():
                        errors.append(f"Row {index + 2}: Faculty ID '{faculty_id}' already exists")
                        continue
                    
                    # Validate gender
                    if gender not in ['MALE', 'FEMALE']:
                        errors.append(f"Row {index + 2}: Invalid gender '{gender}'. Must be 'MALE' or 'FEMALE'")
                        continue
                    
                    # Create new faculty
                    new_faculty = Faculty(
                        uid=uid,
                        id=faculty_id,
                        first_name=first_name,
                        middle_name=middle_name,
                        last_name=last_name,
                        department=department,
                        gender=gender,
                        profile_path=None,  # No profile image for bulk import
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow()
                    )
                    
                    # Add to session (don't commit yet)
                    db.session.add(new_faculty)
                    faculty_added.append({
                        'uid': uid,
                        'id': faculty_id,
                        'first_name': first_name,
                        'middle_name': middle_name,
                        'last_name': last_name,
                        'department': department,
                        'gender': gender
                    })
                    
                    print(f"DEBUG: Successfully processed row {index + 1}")
                    
                except Exception as row_error:
                    print(f"DEBUG: Error processing row {index + 1}: {row_error}")
                    errors.append(f"Row {index + 2}: {str(row_error)}")
                    continue
            
            print(f"DEBUG: Finished processing all rows. Total processed: {len(df)}")
            
            # Commit all faculty at once
            if faculty_added:
                try:
                    db.session.commit()
                    print(f"DEBUG: Successfully committed {len(faculty_added)} faculty to database")
                except Exception as commit_error:
                    db.session.rollback()
                    print(f"DEBUG: Commit failed: {commit_error}")
                    return jsonify({
                        'success': False,
                        'message': f'Database commit failed: {str(commit_error)}'
                    }), 500
            else:
                print(f"DEBUG: No faculty to commit. Total errors: {len(errors)}")
            
            print(f"DEBUG: Final results - Faculty added: {len(faculty_added)}, Errors: {len(errors)}")
            if errors:
                print(f"DEBUG: Error details: {errors}")
                
            return jsonify({
                'success': True,
                'message': f'Successfully imported {len(faculty_added)} faculty members',
                'total_processed': len(df),
                'successful_imports': len(faculty_added),
                'failed_imports': len(errors),
                'errors': errors,
                'faculty': faculty_added
            }), 200
            
        except Exception as e:
            db.session.rollback()
            return jsonify({
                'success': False,
                'message': f'Import error: {str(e)}'
            }), 500
            
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Import error: {str(e)}'
        }), 500
        
    finally:
        # Clean up temporary file
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.unlink(temp_file_path)
            except Exception as e:
                print(f"Warning: Could not delete temporary file {temp_file_path}: {e}")
