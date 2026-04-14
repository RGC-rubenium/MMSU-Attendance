from flask import Blueprint, jsonify, request
from models import ClassSchedule, Student
from extensions import db
import utils.jwt_utils as jwt_utils
from sqlalchemy import and_, or_
from datetime import datetime

class_schedule_bp = Blueprint('class_schedule', __name__)


@class_schedule_bp.route('/class-schedule', methods=['GET'])
@jwt_utils.token_required
def get_class_schedules():
    """Get all class schedules with optional filtering"""
    try:
        # Get query parameters
        department = request.args.get('department')
        year_level = request.args.get('year_level')
        section = request.args.get('section')
        is_active_param = request.args.get('is_active')
        search = request.args.get('search', '').strip()

        # Build query
        query = ClassSchedule.query

        # Apply filters
        filters = []
        if department:
            filters.append(ClassSchedule.department == department)
        if year_level:
            try:
                year_int = int(year_level)
                filters.append(ClassSchedule.year_level == year_int)
            except ValueError:
                pass
        if section:
            filters.append(ClassSchedule.section == section)
        # Only filter by is_active if explicitly provided
        if is_active_param is not None:
            is_active = is_active_param.lower() == 'true'
            filters.append(ClassSchedule.is_active == is_active)

        if filters:
            query = query.filter(and_(*filters))

        # Apply search
        if search:
            search_pattern = f"%{search}%"
            search_filters = or_(
                ClassSchedule.schedule_name.ilike(search_pattern),
                ClassSchedule.description.ilike(search_pattern),
                ClassSchedule.department.ilike(search_pattern)
            )
            query = query.filter(search_filters)

        # Order by created_at desc
        schedules = query.order_by(ClassSchedule.created_at.desc()).all()

        return jsonify({
            'success': True,
            'items': [schedule.to_dict() for schedule in schedules]
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to fetch class schedules',
            'error': str(e)
        }), 500


@class_schedule_bp.route('/class-schedule', methods=['POST'])
#@jwt_utils.token_required
def create_class_schedule():
    """Create a new class schedule"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('schedule_name'):
            return jsonify({
                'success': False,
                'message': 'Schedule name is required'
            }), 400
        
        if not data.get('schedule_data'):
            return jsonify({
                'success': False,
                'message': 'Schedule data is required'
            }), 400

        # Create new class schedule
        schedule = ClassSchedule(
            schedule_name=data['schedule_name'],
            department=data.get('department'),
            year_level=int(data['year_level']) if data.get('year_level') else None,
            section=data.get('section'),
            schedule_data=data['schedule_data'],
            description=data.get('description'),
            is_active=data.get('is_active', True),
            created_by=data.get('created_by')
        )

        db.session.add(schedule)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Class schedule created successfully',
            'item': schedule.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Failed to create class schedule',
            'error': str(e)
        }), 500


@class_schedule_bp.route('/class-schedule/<int:schedule_id>', methods=['PUT'])
#@jwt_utils.token_required
def update_class_schedule(schedule_id):
    """Update an existing class schedule"""
    try:
        schedule = ClassSchedule.query.get(schedule_id)
        if not schedule:
            return jsonify({
                'success': False,
                'message': 'Class schedule not found'
            }), 404

        data = request.get_json()

        # Update fields
        if 'schedule_name' in data:
            schedule.schedule_name = data['schedule_name']
        if 'department' in data:
            schedule.department = data['department']
        if 'year_level' in data:
            schedule.year_level = int(data['year_level']) if data['year_level'] else None
        if 'section' in data:
            schedule.section = data['section']
        if 'schedule_data' in data:
            schedule.schedule_data = data['schedule_data']
        if 'description' in data:
            schedule.description = data['description']
        if 'is_active' in data:
            schedule.is_active = data['is_active']
        if 'created_by' in data:
            schedule.created_by = data['created_by']

        schedule.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Class schedule updated successfully',
            'item': schedule.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Failed to update class schedule',
            'error': str(e)
        }), 500


@class_schedule_bp.route('/class-schedule/<int:schedule_id>', methods=['DELETE'])
#@jwt_utils.token_required
def delete_class_schedule(schedule_id):
    """Delete a class schedule"""
    try:
        schedule = ClassSchedule.query.get(schedule_id)
        if not schedule:
            return jsonify({
                'success': False,
                'message': 'Class schedule not found'
            }), 404

        db.session.delete(schedule)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Class schedule deleted successfully'
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Failed to delete class schedule',
            'error': str(e)
        }), 500


@class_schedule_bp.route('/class-schedule/<int:schedule_id>/apply', methods=['POST'])
#@jwt_utils.token_required
def apply_schedule_to_students(schedule_id):
    """Apply a class schedule to multiple students based on criteria or student IDs"""
    try:
        data = request.get_json()
        
        # Get the schedule
        schedule = ClassSchedule.query.get(schedule_id)
        if not schedule:
            return jsonify({
                'success': False,
                'message': 'Class schedule not found'
            }), 404

        # Build student query based on criteria
        student_query = Student.query
        
        # Option 1: Apply by student IDs
        if data.get('student_ids'):
            student_ids = data['student_ids']
            if isinstance(student_ids, list) and student_ids:
                student_query = student_query.filter(Student.id.in_(student_ids))
            else:
                return jsonify({
                    'success': False,
                    'message': 'Invalid student_ids provided'
                }), 400
        
        # Option 2: Apply by criteria (department, year_level, section)
        else:
            filters = []
            if data.get('department'):
                filters.append(Student.department == data['department'])
            if data.get('year_level'):
                try:
                    year_int = int(data['year_level'])
                    filters.append(Student.year_level == year_int)
                except ValueError:
                    return jsonify({
                        'success': False,
                        'message': 'Invalid year_level provided'
                    }), 400
            if data.get('section'):
                filters.append(Student.section == data['section'])
            
            if not filters:
                return jsonify({
                    'success': False,
                    'message': 'Either student_ids or filtering criteria (department/year_level/section) must be provided'
                }), 400
                
            student_query = student_query.filter(and_(*filters))

        # Get matching students
        students = student_query.all()
        
        if not students:
            return jsonify({
                'success': False,
                'message': 'No students found matching the criteria'
            }), 404

        # Apply schedule to each student
        updated_count = 0
        for student in students:
            student.schedule = schedule.schedule_data
            student.updated_at = datetime.utcnow()
            updated_count += 1

        db.session.commit()

        return jsonify({
            'success': True,
            'message': f'Schedule applied successfully to {updated_count} students',
            'updated_count': updated_count,
            'schedule_applied': schedule.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Failed to apply schedule to students',
            'error': str(e)
        }), 500


@class_schedule_bp.route('/class-schedule/clear-students', methods=['POST'])
#@jwt_utils.token_required
def clear_student_schedules():
    """Clear schedules for multiple students based on criteria or student IDs"""
    try:
        data = request.get_json()
        
        # Build student query based on criteria
        student_query = Student.query
        
        # Option 1: Clear by student IDs
        if data.get('student_ids'):
            student_ids = data['student_ids']
            if isinstance(student_ids, list) and student_ids:
                student_query = student_query.filter(Student.id.in_(student_ids))
            else:
                return jsonify({
                    'success': False,
                    'message': 'Invalid student_ids provided'
                }), 400
        
        # Option 2: Clear by criteria (department, year_level, section)
        else:
            filters = []
            if data.get('department'):
                filters.append(Student.department == data['department'])
            if data.get('year_level'):
                try:
                    year_int = int(data['year_level'])
                    filters.append(Student.year_level == year_int)
                except ValueError:
                    return jsonify({
                        'success': False,
                        'message': 'Invalid year_level provided'
                    }), 400
            if data.get('section'):
                filters.append(Student.section == data['section'])
            
            if not filters:
                return jsonify({
                    'success': False,
                    'message': 'Either student_ids or filtering criteria (department/year_level/section) must be provided'
                }), 400
                
            student_query = student_query.filter(and_(*filters))

        # Get matching students
        students = student_query.all()
        
        if not students:
            return jsonify({
                'success': False,
                'message': 'No students found matching the criteria'
            }), 404

        # Clear schedule for each student
        updated_count = 0
        for student in students:
            student.schedule = None
            student.updated_at = datetime.utcnow()
            updated_count += 1

        db.session.commit()

        return jsonify({
            'success': True,
            'message': f'Schedules cleared successfully for {updated_count} students',
            'updated_count': updated_count
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Failed to clear student schedules',
            'error': str(e)
        }), 500


@class_schedule_bp.route('/students-with-schedules', methods=['GET'])
#@jwt_utils.token_required
def get_students_with_schedules():
    """Get students with their current schedules for preview"""
    try:
        # Get query parameters
        department = request.args.get('department')
        year_level = request.args.get('year_level')
        section = request.args.get('section')
        has_schedule = request.args.get('has_schedule')  # 'true', 'false', or None for all

        # Build query
        query = Student.query

        # Apply filters
        filters = []
        if department:
            filters.append(Student.department == department)
        if year_level:
            try:
                year_int = int(year_level)
                filters.append(Student.year_level == year_int)
            except ValueError:
                pass
        if section:
            filters.append(Student.section == section)
        
        if has_schedule == 'true':
            filters.append(Student.schedule.isnot(None))
        elif has_schedule == 'false':
            filters.append(Student.schedule.is_(None))

        if filters:
            query = query.filter(and_(*filters))

        students = query.order_by(Student.last_name.asc()).all()

        # Transform results
        result = []
        for student in students:
            student_dict = student.to_dict()
            student_dict['has_schedule'] = student.schedule is not None
            student_dict['schedule'] = student.schedule
            result.append(student_dict)

        return jsonify({
            'success': True,
            'items': result,
            'total': len(result)
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to fetch students with schedules',
            'error': str(e)
        }), 500
