import os
import re
from flask import Blueprint, request, jsonify
import utils.jwt_utils as jwt_utils
from werkzeug.utils import secure_filename
from extensions import db
from models import Faculty
from datetime import datetime

faculty_update_bp = Blueprint('faculty_update', __name__)

# Configuration
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), '..', 'images', 'members', 'faculty')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def sanitize_filename(name):
    """Convert faculty name to valid filename"""
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


@faculty_update_bp.route('/faculty/<string:faculty_id>', methods=['PUT', 'PATCH'])
@jwt_utils.token_required
def update_faculty(faculty_id):
    """
    Update a faculty member's information
    Accepts form data with optional profile_image file
    """
    try:
        # Find the faculty by ID
        faculty = Faculty.query.filter_by(id=faculty_id).first()
        if not faculty:
            # Try to find by uid
            faculty = Faculty.query.filter_by(uid=faculty_id).first()
        
        if not faculty:
            return jsonify({
                'success': False,
                'message': 'Faculty member not found'
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

        # Update fields if provided
        if 'first_name' in data and data['first_name']:
            faculty.first_name = data['first_name'].strip()
        
        if 'middle_name' in data:
            faculty.middle_name = data['middle_name'].strip() if data['middle_name'] else None
        
        if 'last_name' in data and data['last_name']:
            faculty.last_name = data['last_name'].strip()
        
        if 'department' in data and data['department']:
            faculty.department = data['department'].strip()
        
        if 'gender' in data:
            faculty.gender = data['gender'].strip() if data['gender'] else None

        # Check if changing faculty ID to one that already exists
        if 'id' in data and data['id'] and data['id'] != faculty.id:
            existing = Faculty.query.filter_by(id=data['id']).first()
            if existing:
                return jsonify({
                    'success': False,
                    'message': 'Faculty ID already exists'
                }), 400
            faculty.id = data['id'].strip()

        # Handle profile image
        if profile_image and allowed_file(profile_image.filename):
            # Delete old image if exists
            if faculty.profile_path:
                _delete_profile_image(faculty.profile_path)
            
            # Create upload directory if it doesn't exist
            os.makedirs(UPLOAD_FOLDER, exist_ok=True)
            
            # Generate filename based on faculty name
            full_name = f"{faculty.first_name} {faculty.middle_name or ''} {faculty.last_name}".strip()
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
            faculty.profile_path = f"/images/members/faculty/{filename}"
        
        # Check if we need to remove the profile image
        if data.get('remove_profile_image') == 'true':
            if faculty.profile_path:
                _delete_profile_image(faculty.profile_path)
            faculty.profile_path = None

        # Save changes
        faculty.updated_at = datetime.utcnow()
        db.session.commit()

        # Build avatar URL for response
        avatar_url = None
        if faculty.profile_path:
            avatar_url = f"{request.url_root.rstrip('/')}{faculty.profile_path}"

        return jsonify({
            'success': True,
            'message': 'Faculty member updated successfully',
            'faculty': {
                **faculty.to_dict(),
                'avatar': avatar_url
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error updating faculty {faculty_id}: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to update faculty member',
            'error': str(e) if request.args.get('debug') else None
        }), 500
