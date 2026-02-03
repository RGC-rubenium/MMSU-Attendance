from flask import Blueprint, jsonify, request
from models import Faculty
from extensions import db

faculty_delete_bp = Blueprint('faculty_delete', __name__)

print("DEBUG: faculty_delete_bp routes being registered:")

@faculty_delete_bp.route('/faculty/bulk-delete', methods=['DELETE'])
#@jwt_utils.token_required  # Temporarily disabled for testing
def bulk_delete_faculty():
    """
    Delete multiple faculty members by their faculty IDs
    Expects JSON body: {"faculty_ids": ["id1", "id2", ...]}
    """
    print("DEBUG: bulk_delete_faculty route called")
    try:
        data = request.get_json()
        if not data or 'faculty_ids' not in data:
            return jsonify({'error': 'faculty_ids required in request body'}), 400
        
        faculty_ids = data['faculty_ids']
        if not faculty_ids or not isinstance(faculty_ids, list):
            return jsonify({'error': 'faculty_ids must be a non-empty array'}), 400
        
        print(f"DEBUG: Attempting to delete faculty IDs: {faculty_ids}")
        
        # Find all faculty members by their IDs
        faculty_members = Faculty.query.filter(Faculty.id.in_(faculty_ids)).all()
        
        if not faculty_members:
            return jsonify({'error': 'No faculty members found with provided IDs'}), 404
        
        # Delete all found faculty members
        deleted_count = len(faculty_members)
        for faculty in faculty_members:
            db.session.delete(faculty)
        
        db.session.commit()
        
        print(f"DEBUG: Successfully deleted {deleted_count} faculty members")
        
        return jsonify({
            'message': f'Successfully deleted {deleted_count} faculty member{"s" if deleted_count != 1 else ""}'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error bulk deleting faculty: {e}")
        return jsonify({'error': 'Failed to delete faculty members'}), 500

@faculty_delete_bp.route('/faculty/<string:faculty_id>', methods=['DELETE'])
#@jwt_utils.token_required  # Temporarily disabled for testing
def delete_faculty(faculty_id):
    """
    Delete a single faculty member by faculty ID
    """
    print(f"DEBUG: delete_faculty route called for ID: {faculty_id}")
    try:
        # Find the faculty member by faculty ID (not uid)
        faculty = Faculty.query.filter_by(id=faculty_id).first()
        if not faculty:
            return jsonify({'error': 'Faculty member not found'}), 404
        
        # Delete the faculty member
        db.session.delete(faculty)
        db.session.commit()
        
        return jsonify({'message': 'Faculty member deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting faculty {faculty_id}: {e}")
        return jsonify({'error': 'Failed to delete faculty member'}), 500

print("DEBUG: faculty_delete_bp routes registered")