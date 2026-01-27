from flask import Blueprint, jsonify, request
from models import Student
from extensions import db
import utils.jwt_utils as jwt_utils

students_delete_bp = Blueprint('students_delete', __name__)

@students_delete_bp.route('/student/<string:student_id>', methods=['DELETE'])
#@jwt_utils.token_required  # Temporarily disabled for testing
def delete_student(student_id):
    """
    Delete a single student by UID
    """
    try:
        # Find the student
        student = Student.query.filter_by(uid=student_id).first()
        if not student:
            return jsonify({
                'success': False,
                'message': 'Student not found'
            }), 404
        
        # Delete the student
        db.session.delete(student)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Student {student.full_name()} deleted successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting student {student_id}: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to delete student',
            'error': str(e) if request.args.get('debug') else None
        }), 500

@students_delete_bp.route('/students/bulk-delete', methods=['DELETE'])
#@jwt_utils.token_required  # Temporarily disabled for testing
def bulk_delete_students():
    """
    Delete multiple students by their UIDs
    Expects JSON body: {"student_ids": ["uid1", "uid2", ...]}
    """
    try:
        data = request.get_json()
        if not data or 'student_ids' not in data:
            return jsonify({
                'success': False,
                'message': 'student_ids array is required in request body'
            }), 400
        
        student_ids = data['student_ids']
        if not isinstance(student_ids, list) or not student_ids:
            return jsonify({
                'success': False,
                'message': 'student_ids must be a non-empty array'
            }), 400
        
        # Find all students to be deleted
        students_to_delete = Student.query.filter(Student.uid.in_(student_ids)).all()
        
        if not students_to_delete:
            return jsonify({
                'success': False,
                'message': 'No students found with the provided IDs'
            }), 404
        
        deleted_count = len(students_to_delete)
        deleted_names = [student.full_name() for student in students_to_delete]
        
        # Delete all students
        for student in students_to_delete:
            db.session.delete(student)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Successfully deleted {deleted_count} student{"s" if deleted_count != 1 else ""}',
            'deleted_count': deleted_count,
            'deleted_students': deleted_names
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error bulk deleting students: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to delete students',
            'error': str(e) if request.args.get('debug') else None
        }), 500