import os
import re
import utils.jwt_utils as jwt_utils
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from extensions import db
from models import Student
from datetime import datetime

student_update_bp = Blueprint('student_update', __name__)

# Configuration
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), '..', 'images', 'members', 'student')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def sanitize_filename(name):
    """Convert student name to valid filename"""
    clean_name = re.sub(r'[^a-zA-Z0-9\s]', '', name)
    clean_name = re.sub(r'\s+', '_', clean_name.strip())
    return clean_name.lower()

def _delete_profile_image(profile_path):
    """Delete the profile image file if it exists."""
    PROJECT_ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.dirname(__file__)), '..'))
    if profile_path and profile_path.strip():
        relative = profile_path.strip().lstrip('/')
        full_path = os.path.normpath(os.path.join(PROJECT_ROOT, relative))
        if os.path.isfile(full_path):
            try:
                os.remove(full_path)
                print(f"Deleted old image: {full_path}")
            except Exception as e:
                print(f"Warning: Could not delete image {full_path}: {e}")


@student_update_bp.route('/student/<string:student_id>', methods=['PUT', 'PATCH'])
def update_student(student_id):
    """
    Update a student's information
    Accepts form data with optional profile_image file
    """
    try:
        # Find the student by ID
        student = Student.query.filter_by(id=student_id).first()
        if not student:
            # Try to find by uid
            student = Student.query.filter_by(uid=student_id).first()
        
        if not student:
            return jsonify({
                'success': False,
                'message': 'Student not found'
            }), 404

        # Get form data
        data = request.form.to_dict() if request.form else {}
        
        # If no form data, try JSON
        if not data and request.is_json:
            data = request.get_json()

        # Handle profile image upload
        profile_image = None
        if 'profile_image' in request.files:
            profile_image = request.files['profile_image']
            if profile_image.filename == '':
                profile_image = None

        if 'first_name' in data and data['first_name']:
            student.first_name = data['first_name'].strip()
        
        if 'middle_name' in data:
            student.middle_name = data['middle_name'].strip() if data['middle_name'] else None
        
        if 'last_name' in data and data['last_name']:
            student.last_name = data['last_name'].strip()
        
        if 'department' in data and data['department']:
            student.department = data['department'].strip()
        
        if 'year_level' in data:
            try:
                year_level = int(data['year_level'])
                if 1 <= year_level <= 5:
                    student.year_level = year_level
            except (ValueError, TypeError):
                pass
        
        if 'section' in data:
            student.section = data['section'].strip() if data['section'] else None
        
        if 'gender' in data:
            student.gender = data['gender'].strip() if data['gender'] else None
        
        if 'parent_contact' in data:
            student.parent_contact = data['parent_contact'].strip() if data['parent_contact'] else None

        # Check if changing student ID to one that already exists
        if 'id' in data and data['id'] and data['id'] != student.id:
            existing = Student.query.filter_by(id=data['id']).first()
            if existing:
                return jsonify({
                    'success': False,
                    'message': 'Student ID already exists'
                }), 400
            student.id = data['id'].strip()

        # Allow admin to update UID (with uniqueness check)
        if 'uid' in data and data['uid'] and data['uid'] != student.uid:
            existing_uid = Student.query.filter_by(uid=data['uid']).first()
            if existing_uid:
                return jsonify({
                    'success': False,
                    'message': 'UID already exists'
                }), 400
            student.uid = data['uid'].strip()

        # Handle profile image
        if profile_image and allowed_file(profile_image.filename):
            # Delete old image if exists
            if student.profile_path:
                _delete_profile_image(student.profile_path)
            
            # Create upload directory if it doesn't exist
            os.makedirs(UPLOAD_FOLDER, exist_ok=True)
            
            # Generate filename based on student name
            full_name = f"{student.first_name} {student.middle_name or ''} {student.last_name}".strip()
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
            student.profile_path = f"/images/members/student/{filename}"
        
        # Check if we need to remove the profile image
        if data.get('remove_profile_image') == 'true':
            if student.profile_path:
                _delete_profile_image(student.profile_path)
            student.profile_path = None

        # Save changes
        student.updated_at = datetime.utcnow()
        db.session.commit()

        # Build avatar URL for response
        avatar_url = None
        if student.profile_path:
            avatar_url = f"{request.url_root.rstrip('/')}{student.profile_path}"

        return jsonify({
            'success': True,
            'message': 'Student updated successfully',
            'student': {
                **student.to_dict(),
                'avatar': avatar_url
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error updating student {student_id}: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to update student',
            'error': str(e) if request.args.get('debug') else None
        }), 500
