import os
import uuid
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
import utils.jwt_utils as jwt_utils
from extensions import db
from models import Student
from datetime import datetime
import re
import pandas as pd
import tempfile

add_student_bp = Blueprint('add_student', __name__)

# Configuration
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), '..', 'images', 'members', 'student')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def sanitize_filename(name):
    """Convert student name to valid filename"""
    # Remove special characters and replace spaces with underscores
    clean_name = re.sub(r'[^a-zA-Z0-9\s]', '', name)
    clean_name = re.sub(r'\s+', '_', clean_name.strip())
    return clean_name.lower()

@add_student_bp.route('/api/students', methods=['POST'])
def add_student():
    try:
        # Check if request has file part
        profile_image = None
        if 'profile_image' in request.files:
            profile_image = request.files['profile_image']
            if profile_image.filename == '':
                profile_image = None

        # Get form data
        data = request.form.to_dict()

        # Required fields validation (parent_contact is now optional)
        required_fields = ['uid', 'id', 'first_name', 'last_name', 'department', 'year_level', 'gender', 'section']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'success': False,
                    'message': f'{field.replace("_", " ").title()} is required'
                }), 400

        # Validate year_level is integer
        try:
            year_level = int(data['year_level'])
            if year_level < 1 or year_level > 5:
                raise ValueError("Year level must be between 1-5")
        except ValueError:
            return jsonify({
                'success': False,
                'message': 'Year level must be a valid number between 1-5'
            }), 400

        # Check if UID already exists
        existing_uid = Student.query.filter_by(uid=data['uid']).first()
        if existing_uid:
            return jsonify({
                'success': False,
                'message': 'UID already exists in the system'
            }), 400

        # Check if student ID already exists (if provided)
        if data.get('id'):
            existing_student = Student.query.filter_by(id=data['id']).first()
            if existing_student:
                return jsonify({
                    'success': False,
                    'message': 'Student ID already exists'
                }), 400

        # Use the provided UID
        uid = data['uid'].strip()

        # Handle profile image upload
        profile_path = None
        if profile_image and allowed_file(profile_image.filename):
            # Create upload directory if it doesn't exist
            os.makedirs(UPLOAD_FOLDER, exist_ok=True)
            
            # Generate filename based on student name
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
                filename = f"{name_part}_{counter}.{file_ext}"
                counter += 1
            
            # Save file
            file_path = os.path.join(UPLOAD_FOLDER, filename)
            profile_image.save(file_path)
            profile_path = f"/images/members/student/{filename}"

        # Create new student
        new_student = Student(
            uid=uid,
            id=data.get('id'),
            first_name=data['first_name'].strip(),
            middle_name=data.get('middle_name', '').strip() or None,
            last_name=data['last_name'].strip(),
            department=data['department'].strip(),
            year_level=year_level,
            section=data.get('section', '').strip() or None,
            gender=data.get('gender', '').upper() if data.get('gender') else None,
            profile_path=profile_path,
               parent_contact=(data.get('parent_contact', '').strip() or None) if 'parent_contact' in data else None,
            contact_number=data.get('contact_number', '').strip() or None,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )

        # Save to database
        db.session.add(new_student)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Student added successfully',
            'student': new_student.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'An error occurred: {str(e)}'
        }), 500

@add_student_bp.route('/api/students/validate-id', methods=['POST'])
def validate_student_id():
    """Validate if student ID is available"""
    try:
        data = request.get_json()
        student_id = data.get('id')
        
        if not student_id:
            return jsonify({'available': True})
        
        existing = Student.query.filter_by(id=student_id).first()
        return jsonify({'available': existing is None})
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Validation error: {str(e)}'
        }), 500

@add_student_bp.route('/api/students/bulk-import', methods=['POST'])
def bulk_import_students():
    """Import students from Excel file"""
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
        import uuid
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
            
            # Validate required columns (uid, gender, section now optional)
            required_columns = ['id', 'first_name', 'last_name', 'department', 'year_level']
            optional_columns = ['uid', 'gender', 'section']
            missing_columns = [col for col in required_columns if col not in df.columns]
            
            if missing_columns:
                return jsonify({
                    'success': False,
                    'message': f'Missing required columns: {", ".join(missing_columns)}'
                }), 400
            
            # Process students
            students_added = []
            errors = []
            
            print(f"DEBUG: Starting to process {len(df)} rows")
            
            for index, row in df.iterrows():
                print(f"DEBUG: Starting processing of row {index + 2} (index {index})")
                try:
                    print(f"DEBUG: Processing row {index + 2}: {dict(row)}")
                    
                    # Validate required fields (uid, gender, section now optional)
                    missing_fields = []
                    for field in required_columns:
                        if pd.isna(row[field]) or str(row[field]).strip() == '':
                            missing_fields.append(field.replace("_", " ").title())
                    if missing_fields:
                        error_msg = f'Row {index + 2}: Missing required fields: {", ".join(missing_fields)}'
                        errors.append(error_msg)
                        print(f"DEBUG: {error_msg}")
                        continue
                        
                    # Check for duplicates
                    uid = str(row['uid']).strip()
                    student_id = str(row['id']).strip()
                    
                    print(f"DEBUG: Checking duplicates for UID: {uid}, ID: {student_id}")
                    
                    if Student.query.filter_by(uid=uid).first():
                        error_msg = f'Row {index + 2}: UID "{uid}" already exists'
                        errors.append(error_msg)
                        print(f"DEBUG: {error_msg}")
                        continue
                        
                    if Student.query.filter_by(id=student_id).first():
                        error_msg = f'Row {index + 2}: Student ID "{student_id}" already exists'
                        errors.append(error_msg)
                        print(f"DEBUG: {error_msg}")
                        continue
                    
                    # Validate year level
                    try:
                        year_level = int(row['year_level'])
                        if year_level < 1 or year_level > 5:
                            error_msg = f'Row {index + 2}: Year level must be between 1-5'
                            errors.append(error_msg)
                            print(f"DEBUG: {error_msg}")
                            continue
                    except ValueError:
                        error_msg = f'Row {index + 2}: Invalid year level'
                        errors.append(error_msg)
                        print(f"DEBUG: {error_msg}")
                        continue
                    
                    # Generate profile path based on name (even if photo doesn't exist)
                    first_name = str(row['first_name']).strip()
                    middle_name = str(row.get('middle_name', '')).strip() if pd.notna(row.get('middle_name')) else ''
                    last_name = str(row['last_name']).strip()
                    
                    full_name = f"{first_name} {middle_name} {last_name}".strip()
                    clean_name = sanitize_filename(full_name)
                    profile_path = f"/images/members/student/{clean_name}.jpg"
                    
                    # Create student record (parent_contact is optional)
                    new_student = Student(
                        uid=uid,
                        id=student_id,
                        first_name=first_name,
                        middle_name=middle_name if middle_name else None,
                        last_name=last_name,
                        department=str(row['department']).strip(),
                        year_level=year_level,
                        section=str(row['section']).strip(),
                        gender=str(row['gender']).upper().strip(),
                        parent_contact=str(row['parent_contact']).strip() if 'parent_contact' in row and pd.notna(row.get('parent_contact')) and str(row['parent_contact']).strip() != '' else None,
                        contact_number=str(row.get('contact_number', '')).strip() if pd.notna(row.get('contact_number')) else None,
                        profile_path=profile_path,
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow()
                    )
                    
                    db.session.add(new_student)
                    students_added.append({
                        'uid': uid,
                        'id': student_id,
                        'name': full_name,
                        'profile_path': profile_path
                    })
                    
                    print(f"DEBUG: Successfully added student: {full_name} (UID: {uid}, ID: {student_id})")
                    
                except Exception as e:
                    error_msg = f'Row {index + 2}: {str(e)}'
                    errors.append(error_msg)
                    print(f"DEBUG: Exception processing row {index + 2}: {e}")
                    import traceback
                    traceback.print_exc()
                
                print(f"DEBUG: Finished processing row {index + 2}")
            
            print(f"DEBUG: Finished processing all rows. Total processed: {len(df)}")
            
            # Commit all students at once
            if students_added:
                try:
                    db.session.commit()
                    print(f"DEBUG: Successfully committed {len(students_added)} students to database")
                except Exception as commit_error:
                    db.session.rollback()
                    print(f"DEBUG: Commit failed: {commit_error}")
                    return jsonify({
                        'success': False,
                        'message': f'Database commit failed: {str(commit_error)}'
                    }), 500
            else:
                print(f"DEBUG: No students to commit. Total errors: {len(errors)}")
            
            print(f"DEBUG: Final results - Students added: {len(students_added)}, Errors: {len(errors)}")
            if errors:
                print(f"DEBUG: Error details: {errors}")
                
            return jsonify({
                    'success': True,
                    'message': f'Successfully imported {len(students_added)} students',
                    'students_added': len(students_added),
                    'errors': errors,
                    'students': students_added
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