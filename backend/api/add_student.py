import os
import uuid
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from extensions import db
from models import Student
from datetime import datetime
import re

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
        
        # Required fields validation
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