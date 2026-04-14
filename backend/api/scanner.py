# Old file
from models import Student, Faculty, event_schedule
from extensions import db
import utils.jwt_utils as jwt_utils
from flask import Blueprint, request, jsonify
from datetime import datetime

scanner_bp = Blueprint('scanner', __name__)

@scanner_bp.route('/api/scanner/<string:student_id>', methods=['GET'])
def handleScheduler(student_id):
    try:
        # Fetch the student by ID
        student = Student.query.filter_by(id=student_id).first()
        if not student:
            return jsonify({
                'success': False,
                'message': 'Student not found'
            }), 404
        
        # Fetch the current event schedule
        schedule = event_schedule.get_current_schedule()
        
        return jsonify({
            'success': True,
            'student': student.to_dict(),
            'eventSchedule': schedule
        }), 200
        
    except Exception as e:
        print(f"Error handling scanner request for student {student_id}: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to process request',
            'error': str(e) if request.args.get('debug') else None
        }), 500