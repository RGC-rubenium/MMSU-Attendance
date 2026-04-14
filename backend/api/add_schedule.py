from flask import Blueprint, jsonify, request
from models import EventSchedule
from extensions import db
import utils.jwt_utils as jwt_utils
from datetime import datetime

event_schedule_bp = Blueprint('event_schedule', __name__)

@event_schedule_bp.route('/event-schedule', methods=['GET'])
@jwt_utils.token_required
def get_event_schedules():
    """
    Get list of event schedules with optional filtering
    """
    try:
        # Get query parameters
        page = int(request.args.get('page', 1))
        per_page = min(int(request.args.get('per_page', 20)), 100)
        search = request.args.get('search', '').strip()
        
        # Build query
        query = EventSchedule.query
        
        # Apply search filter
        if search:
            query = query.filter(EventSchedule.event_name.ilike(f"%{search}%"))
        
        # Order by date (newest first)
        query = query.order_by(EventSchedule.event_date.desc(), EventSchedule.created_at.desc())
        
        # Paginate
        pagination = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        # Transform results
        events = [event.to_dict() for event in pagination.items]
        
        return jsonify({
            'success': True,
            'items': events,
            'meta': {
                'total': pagination.total,
                'page': pagination.page,
                'per_page': pagination.per_page,
                'total_pages': pagination.pages,
                'has_next': pagination.has_next,
                'has_prev': pagination.has_prev
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to fetch event schedules',
            'error': str(e)
        }), 500

@event_schedule_bp.route('/event-schedule', methods=['POST'])
#@jwt_utils.token_required  # Temporarily disabled for testing
def create_event_schedule():
    """
    Create a new event schedule
    """
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('event_name'):
            return jsonify({
                'success': False,
                'message': 'Event name is required'
            }), 400
            
        if not data.get('event_date'):
            return jsonify({
                'success': False,
                'message': 'Event date is required'
            }), 400
            
        if not data.get('schedule'):
            return jsonify({
                'success': False,
                'message': 'Schedule is required'
            }), 400
        
        # Parse event date
        try:
            event_date = datetime.strptime(data['event_date'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({
                'success': False,
                'message': 'Invalid date format. Use YYYY-MM-DD'
            }), 400
        
        # Create new event schedule
        event_schedule = EventSchedule(
            event_name=data['event_name'].strip(),
            event_date=event_date,
            schedule=data['schedule']
        )
        
        db.session.add(event_schedule)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Event schedule created successfully',
            'data': event_schedule.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Failed to create event schedule',
            'error': str(e)
        }), 500

@event_schedule_bp.route('/event-schedule/<int:event_id>', methods=['PUT'])
#@jwt_utils.token_required  # Temporarily disabled for testing
def update_event_schedule(event_id):
    """
    Update an existing event schedule
    """
    try:
        event_schedule = EventSchedule.query.get(event_id)
        if not event_schedule:
            return jsonify({
                'success': False,
                'message': 'Event schedule not found'
            }), 404
        
        data = request.get_json()
        
        # Update fields if provided
        if 'event_name' in data:
            event_schedule.event_name = data['event_name'].strip()
            
        if 'event_date' in data:
            try:
                event_schedule.event_date = datetime.strptime(data['event_date'], '%Y-%m-%d').date()
            except ValueError:
                return jsonify({
                    'success': False,
                    'message': 'Invalid date format. Use YYYY-MM-DD'
                }), 400
                
        if 'schedule' in data:
            event_schedule.schedule = data['schedule']
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Event schedule updated successfully',
            'data': event_schedule.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Failed to update event schedule',
            'error': str(e)
        }), 500

@event_schedule_bp.route('/event-schedule/<int:event_id>', methods=['DELETE'])
#@jwt_utils.token_required  # Temporarily disabled for testing
def delete_event_schedule(event_id):
    """
    Delete an event schedule
    """
    try:
        event_schedule = EventSchedule.query.get(event_id)
        if not event_schedule:
            return jsonify({
                'success': False,
                'message': 'Event schedule not found'
            }), 404
        
        db.session.delete(event_schedule)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Event schedule deleted successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Failed to delete event schedule',
            'error': str(e)
        }), 500

@event_schedule_bp.route('/event-schedule/<int:event_id>', methods=['GET'])
#@jwt_utils.token_required  # Temporarily disabled for testing
def get_event_schedule(event_id):
    """
    Get a single event schedule by ID
    """
    try:
        event_schedule = EventSchedule.query.get(event_id)
        if not event_schedule:
            return jsonify({
                'success': False,
                'message': 'Event schedule not found'
            }), 404
        
        return jsonify({
            'success': True,
            'data': event_schedule.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to fetch event schedule',
            'error': str(e)
        }), 500
