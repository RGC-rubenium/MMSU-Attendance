from flask import Blueprint, request, jsonify
from datetime import datetime, date, time as datetime_time
import json
from models import Student, Faculty, EventSchedule, ClassSchedule, AttendanceLog
from extensions import db
from sqlalchemy import and_, or_
from scanner_config import SCANNER_CONFIG, DEFAULT_SCHEDULE_CONFIG

rfid_scanner_bp = Blueprint('rfid_scanner', __name__)

def get_current_day_time():
    """Get current day and time for schedule checking"""
    now = datetime.now()
    current_day = now.strftime('%A').lower()  # monday, tuesday, etc.
    current_time = now.time()
    current_date = now.date()
    return current_day, current_time, current_date, now

def check_time_in_range(current_time, start_time_str, end_time_str):
    """Check if current time is within the given time range"""
    try:
        start_time = datetime.strptime(start_time_str, '%H:%M').time()
        end_time = datetime.strptime(end_time_str, '%H:%M').time()
        return start_time <= current_time <= end_time
    except:
        return False

def is_scanner_available(user_type):
    """Check if scanner is available for the given user type at current time"""
    current_day, current_time, current_date, now = get_current_day_time()
    
    # Get configuration based on user type
    if user_type == 'student':
        config = SCANNER_CONFIG['student_scanner_hours']
    elif user_type == 'faculty':
        config = SCANNER_CONFIG['faculty_scanner_hours']
    else:
        return False
    
    # Check if it's weekday or weekend
    if current_day in ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']:
        hours = config['weekdays']
    else:
        hours = config['weekends']
    
    # Check if current time is within allowed scanner hours
    return check_time_in_range(current_time, hours['start_time'], hours['end_time'])

def get_default_schedule_config(current_day):
    """Get default schedule configuration based on day"""
    if current_day in ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']:
        return DEFAULT_SCHEDULE_CONFIG['weekdays']
    else:
        return DEFAULT_SCHEDULE_CONFIG['weekends']

def time_overlaps(start1, end1, start2, end2):
    """Check if two time ranges overlap"""
    try:
        if isinstance(start1, str):
            start1 = datetime.strptime(start1, '%H:%M').time()
        if isinstance(end1, str):
            end1 = datetime.strptime(end1, '%H:%M').time()
        if isinstance(start2, str):
            start2 = datetime.strptime(start2, '%H:%M').time()
        if isinstance(end2, str):
            end2 = datetime.strptime(end2, '%H:%M').time()
        
        return start1 < end2 and start2 < end1
    except:
        return False

def calculate_subjects_attended(student, time_in, time_out):
    """Calculate which subjects/classes the student attended based on their personal schedule first"""
    if not student or not time_in or not time_out:
        return []
    
    subjects_attended = []
    current_day = time_in.strftime('%A').lower()
    
    # Priority 1: Check student's individual schedule first
    if student.schedule and isinstance(student.schedule, dict):
        # Check both lowercase and capitalized day names
        day_schedule = None
        if current_day in student.schedule:
            day_schedule = student.schedule.get(current_day)
        elif current_day.capitalize() in student.schedule:
            day_schedule = student.schedule.get(current_day.capitalize())
            
        if day_schedule and isinstance(day_schedule, list):
            for time_slot in day_schedule:
                start_time = time_slot.get('start_time')
                end_time = time_slot.get('end_time')
                subject = time_slot.get('subject')
                
                if start_time and end_time and subject:
                    # Check if student was present during this subject time
                    if time_overlaps(time_in.time(), time_out.time(), start_time, end_time):
                        subjects_attended.append({
                            'subject': subject,
                            'start_time': start_time,
                            'end_time': end_time,
                            'room': time_slot.get('room', ''),
                            'schedule_name': f'{student.full_name()} Schedule',
                            'type': 'student_schedule'
                        })
    
    # Priority 2: Only check class schedules if no personal schedule subjects found
    if not subjects_attended:
        class_schedules = ClassSchedule.query.filter(
            and_(
                ClassSchedule.is_active == True,
                or_(
                    ClassSchedule.department == student.department,
                    ClassSchedule.department.is_(None)
                )
            )
        ).all()
        
        for class_schedule in class_schedules:
            # Check if this schedule applies to the student
            if (class_schedule.year_level is None or class_schedule.year_level == student.year_level) and \
               (class_schedule.section is None or class_schedule.section == student.section):
                
                if class_schedule.schedule_data and isinstance(class_schedule.schedule_data, dict):
                    day_schedule = class_schedule.schedule_data.get(current_day, [])
                    if isinstance(day_schedule, list):
                        for time_slot in day_schedule:
                            start_time = time_slot.get('start_time')
                            end_time = time_slot.get('end_time')
                            subject = time_slot.get('subject')
                            
                            if start_time and end_time and subject:
                                # Check if student was present during this subject time
                                if time_overlaps(time_in.time(), time_out.time(), start_time, end_time):
                                    subjects_attended.append({
                                        'subject': subject,
                                        'start_time': start_time,
                                        'end_time': end_time,
                                        'room': time_slot.get('room', ''),
                                        'schedule_name': class_schedule.schedule_name,
                                        'type': 'class_schedule'
                                    })
        if current_day in student.schedule:
            day_schedule = student.schedule.get(current_day)
        elif current_day.capitalize() in student.schedule:
            day_schedule = student.schedule.get(current_day.capitalize())
            
        if day_schedule and isinstance(day_schedule, list):
            for time_slot in day_schedule:
                start_time = time_slot.get('start_time')
                end_time = time_slot.get('end_time')
                subject = time_slot.get('subject')
                
                if start_time and end_time and subject:
                    # Check if student was present during this subject time
                    if time_overlaps(time_in.time(), time_out.time(), start_time, end_time):
                        subjects_attended.append({
                            'subject': subject,
                            'start_time': start_time,
                            'end_time': end_time,
                            'room': time_slot.get('room', ''),
                            'schedule_name': f'{student.full_name()} Schedule',
                            'type': 'student_schedule'
                        })
    
    return subjects_attended

def find_active_schedule_for_faculty(faculty=None):
    """Find active schedule for faculty using configurable hours"""
    current_day, current_time, current_date, now = get_current_day_time()
    
    # Get faculty hours from configuration
    faculty_config = SCANNER_CONFIG['faculty_scanner_hours']
    if current_day in ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']:
        hours = faculty_config['weekdays']
    else:
        hours = faculty_config['weekends']
    
    # Faculty work hours (configurable)
    if check_time_in_range(current_time, hours['start_time'], hours['end_time']):
        return {
            'type': 'faculty_work',
            'schedule': None,
            'current_slot': {
                'start_time': hours['start_time'], 
                'end_time': hours['end_time'], 
                'description': f"Faculty {('Work' if current_day in ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] else 'Weekend')} Hours"
            },
            'name': f"Faculty {'Work' if current_day in ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] else 'Weekend'} Schedule"
        }
    
    return None

def find_active_schedule_for_student(student=None):
    """Find the currently active schedule with correct priority: Event > Student Personal > Default"""
    current_day, current_time, current_date, now = get_current_day_time()
    
    # Priority 1: Check Event Schedules (highest priority - campus events)
    event_schedules = EventSchedule.query.filter_by(event_date=current_date).all()
    for event in event_schedules:
        if event.schedule and isinstance(event.schedule, dict):
            for time_slot in event.schedule.get('time_slots', []):
                if check_time_in_range(current_time, time_slot.get('start_time'), time_slot.get('end_time')):
                    return {
                        'type': 'event',
                        'schedule': event,
                        'current_slot': time_slot,
                        'name': event.event_name
                    }
    
    # Priority 2: Check Student's Individual Schedule (if student has any schedule for today)
    if student and student.schedule and isinstance(student.schedule, dict):
        # Check both lowercase and capitalized day names
        day_schedule = None
        if current_day in student.schedule:
            day_schedule = student.schedule.get(current_day)
        elif current_day.capitalize() in student.schedule:
            day_schedule = student.schedule.get(current_day.capitalize())
        
        # If student has ANY schedule for today (even if not currently active), use student schedule type
        if day_schedule and isinstance(day_schedule, list) and len(day_schedule) > 0:
            # Check if currently in a scheduled time slot
            for time_slot in day_schedule:
                if check_time_in_range(current_time, time_slot.get('start_time'), time_slot.get('end_time')):
                    return {
                        'type': 'student_schedule',
                        'schedule': student,
                        'current_slot': time_slot,
                        'name': f'{student.full_name()} Schedule'
                    }
            
            # Student has schedule for today but not currently active - still use student schedule type
            # This allows them to scan anytime on days they have classes
            return {
                'type': 'student_schedule',
                'schedule': student,
                'current_slot': {'description': f'Scheduled day for {student.full_name()}'},
                'name': f'{student.full_name()} Schedule'
            }
    
    # Priority 3: Default Schedule (configurable hours)
    default_config = get_default_schedule_config(current_day)
    if check_time_in_range(current_time, default_config['start_time'], default_config['end_time']):
        return {
            'type': 'default',
            'schedule': None,
            'current_slot': {
                'start_time': default_config['start_time'], 
                'end_time': default_config['end_time'], 
                'description': default_config['description']
            },
            'name': 'Default Schedule'
        }
    
    return None

def find_active_schedule():
    """Legacy function for backward compatibility - finds general active schedule"""
    return find_active_schedule_for_student(None)

def check_student_personal_schedule(student):
    """Check if student has personal schedule conflicts"""
    if not student.schedule or not isinstance(student.schedule, dict):
        return True, None
    
    current_day, current_time, current_date, now = get_current_day_time()
    
    # Check student's personal schedule
    day_schedule = student.schedule.get(current_day)
    if day_schedule and isinstance(day_schedule, list):
        for time_slot in day_schedule:
            if check_time_in_range(current_time, time_slot.get('start_time'), time_slot.get('end_time')):
                return True, time_slot
    
    return False, None

@rfid_scanner_bp.route('/api/scanner/rfid-scan', methods=['POST'])
def handle_rfid_scan():
    """Handle RFID scan and log attendance based on active schedules"""
    try:
        data = request.get_json()
        uid = data.get('uid', '').strip()
        
        if not uid:
            return jsonify({
                'success': False,
                'message': 'UID is required'
            }), 400
        
        current_day, current_time, current_date, now = get_current_day_time()
        
        # Find user by UID (check both students and faculty)
        user = None
        user_type = None
        
        # Check students first
        student = Student.query.filter_by(uid=uid).first()
        if student:
            user = student
            user_type = 'student'
        else:
            # Check faculty
            faculty = Faculty.query.filter_by(uid=uid).first()
            if faculty:
                user = faculty
                user_type = 'faculty'
        
        if not user:
            return jsonify({
                'success': False,
                'message': 'RFID card not registered',
                'uid': uid
            }), 404
        
        # Check if scanner is available for this user type at current time
        if not is_scanner_available(user_type):
            # Get the allowed hours for this user type
            config = SCANNER_CONFIG[f'{user_type}_scanner_hours']
            current_day, current_time, current_date, now = get_current_day_time()
            
            if current_day in ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']:
                allowed_hours = config['weekdays']
                day_type = 'weekdays'
            else:
                allowed_hours = config['weekends']
                day_type = 'weekends'
            
            return jsonify({
                'success': False,
                'message': f'Scanner not available for {user_type}s at this time',
                'allowed_hours': {
                    'day_type': day_type,
                    'start_time': allowed_hours['start_time'],
                    'end_time': allowed_hours['end_time']
                },
                'current_time': current_time.strftime('%H:%M'),
                'user': {
                    'name': user.full_name(),
                    'type': user_type,
                    'department': user.department,
                    'uid': uid
                }
            }), 403
        
        # Find active schedule based on user type
        if user_type == 'student':
            active_schedule = find_active_schedule_for_student(user)
        elif user_type == 'faculty':
            active_schedule = find_active_schedule_for_faculty(user)
        else:
            active_schedule = find_active_schedule()
        
        if not active_schedule:
            return jsonify({
                'success': False,
                'message': 'No active schedule found for current time',
                'user': {
                    'name': user.full_name(),
                    'type': user_type,
                    'department': user.department,
                    'uid': uid
                }
            }), 400
        
        # Schedule conflict checking is now handled in the schedule detection itself
        schedule_conflict = None
        
        # Check for existing attendance log today (regardless of schedule type for once-per-day restriction)
        today_start = datetime.combine(current_date, datetime_time.min)
        today_end = datetime.combine(current_date, datetime_time.max)
        
        # First, check if user has ANY attendance log today (once-per-day enforcement)
        any_existing_log = AttendanceLog.query.filter(
            and_(
                AttendanceLog.uid == uid,
                AttendanceLog.created_at >= today_start,
                AttendanceLog.created_at <= today_end
            )
        ).first()
        
        # Then check for existing log with current schedule type
        existing_log = AttendanceLog.query.filter(
            and_(
                AttendanceLog.uid == uid,
                AttendanceLog.created_at >= today_start,
                AttendanceLog.created_at <= today_end,
                AttendanceLog.schedule_type == active_schedule['type']
            )
        ).first()
        
        # Check if user has already scanned today (once per day restriction)
        if any_existing_log and any_existing_log.time_out:
            # User has already completed their attendance for today
            return jsonify({
                'success': False,
                'message': 'You have already scanned today. Only one scan per day is allowed.',
                'user': {
                    'uid': user.uid,
                    'id': user.id,
                    'name': user.full_name(),
                    'type': user_type,
                    'department': user.department
                },
                'attendance': {
                    'time_in': any_existing_log.time_in.isoformat(),
                    'time_out': any_existing_log.time_out.isoformat(),
                    'schedule_type': any_existing_log.schedule_type,
                    'schedule_name': any_existing_log.schedule_name
                }
            }), 400
        elif existing_log and not existing_log.time_out:
            # This is a time-out for an existing time-in with the same schedule type
                # This is a time-out for an existing time-in
                existing_log.time_out = now
                existing_log.updated_at = now
                
                # Calculate attendance details based on user type
                if user_type == 'student':
                    subjects_attended = calculate_subjects_attended(user, existing_log.time_in, now)
                    existing_log.subjects_attended = subjects_attended
                    
                    # Update notes with subject summary
                    if subjects_attended:
                        subject_names = [s['subject'] for s in subjects_attended]
                        existing_log.notes = f"Attended: {', '.join(subject_names)}"
                    else:
                        existing_log.notes = "No subjects during attendance period"
                
                elif user_type == 'faculty':
                    # Faculty attendance - calculate work hours
                    work_duration = now - existing_log.time_in
                    hours = work_duration.total_seconds() / 3600
                    existing_log.notes = f"Work duration: {hours:.1f} hours"
                    # Faculty don't need subjects_attended, but set empty array for consistency
                    existing_log.subjects_attended = []
                
                db.session.commit()
                
                action = 'time_out'
                log_data = existing_log
        elif any_existing_log and not any_existing_log.time_out:
            # User has a time-in from a different schedule type but hasn't timed out yet
            return jsonify({
                'success': False,
                'message': f'You still have an active attendance session from {any_existing_log.schedule_name}. Please time out first.',
                'user': {
                    'uid': user.uid,
                    'id': user.id,
                    'name': user.full_name(),
                    'type': user_type,
                    'department': user.department
                },
                'attendance': {
                    'time_in': any_existing_log.time_in.isoformat(),
                    'schedule_type': any_existing_log.schedule_type,
                    'schedule_name': any_existing_log.schedule_name
                }
            }), 400
        else:
            # This is a time-in (new entry for the day)
            attendance_log = AttendanceLog(
                uid=uid,
                user_type=user_type,
                user_id=user.id,
                full_name=user.full_name(),
                department=user.department,
                schedule_type=active_schedule['type'],
                schedule_name=active_schedule['name'],
                time_in=now,
                status='present',
                subjects_attended=None,  # Will be calculated on time-out
                notes=schedule_conflict
            )
            
            db.session.add(attendance_log)
            db.session.commit()
            
            action = 'time_in'
            log_data = attendance_log
        
        return jsonify({
            'success': True,
            'action': action,
            'user': {
                'uid': user.uid,
                'id': user.id,
                'name': user.full_name(),
                'type': user_type,
                'department': user.department,
                'avatar': getattr(user, 'profile_path', None)
            },
            'schedule': {
                'type': active_schedule['type'],
                'name': active_schedule['name'],
                'current_slot': active_schedule.get('current_slot') or {}
            },
            'attendance': log_data.to_dict(),
            'warning': schedule_conflict
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error handling RFID scan: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to process RFID scan',
            'error': str(e)
        }), 500

@rfid_scanner_bp.route('/api/scanner/current-schedule', methods=['GET'])
def get_current_schedule():
    """Get currently active schedule information"""
    try:
        current_day, current_time, current_date, now = get_current_day_time()
        
        # Check for active schedules in priority order
        active_schedule = None
        
        # Priority 1: Check Event Schedules
        event_schedules = EventSchedule.query.filter_by(event_date=current_date).all()
        for event in event_schedules:
            if event.schedule and isinstance(event.schedule, dict):
                for time_slot in event.schedule.get('time_slots', []):
                    if check_time_in_range(current_time, time_slot.get('start_time'), time_slot.get('end_time')):
                        active_schedule = {
                            'type': 'event',
                            'schedule': event,
                            'current_slot': time_slot,
                            'name': event.event_name
                        }
                        break
        
        # Priority 2: Check if it's within work/class hours (general fallback)
        if not active_schedule:
            if current_day in ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']:
                if check_time_in_range(current_time, '06:00', '21:00'):  # Extended hours
                    active_schedule = {
                        'type': 'work_hours',
                        'schedule': None,
                        'current_slot': {'start_time': '06:00', 'end_time': '21:00', 'description': 'Work Hours'},
                        'name': 'Work Hours'
                    }
            else:
                # Weekend
                if check_time_in_range(current_time, '08:00', '17:00'):
                    active_schedule = {
                        'type': 'weekend_hours',
                        'schedule': None,
                        'current_slot': {'start_time': '08:00', 'end_time': '17:00', 'description': 'Weekend Hours'},
                        'name': 'Weekend Hours'
                    }
        
        if not active_schedule:
            return jsonify({
                'success': False,
                'message': 'No active schedule found',
                'schedule': None
            }), 200
        
        # Ensure current_slot is always a proper dict
        current_slot = active_schedule.get('current_slot') or {}
        
        return jsonify({
            'success': True,
            'schedule': {
                'type': active_schedule['type'],
                'name': active_schedule['name'],
                'current_slot': current_slot,
                'current_time': now.isoformat(),
                'current_day': current_day.title()
            }
        }), 200
        
    except Exception as e:
        print(f"Error getting current schedule: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to get current schedule',
            'error': str(e)
        }), 500

@rfid_scanner_bp.route('/api/scanner/attendance-logs', methods=['GET'])
def get_attendance_logs():
    """Get attendance logs with optional filtering"""
    try:
        # Get query parameters
        date_filter = request.args.get('date')
        user_type = request.args.get('user_type')
        limit = request.args.get('limit', 50, type=int)
        
        query = AttendanceLog.query
        
        # Apply filters
        if date_filter:
            try:
                filter_date = datetime.strptime(date_filter, '%Y-%m-%d').date()
                date_start = datetime.combine(filter_date, datetime_time.min)
                date_end = datetime.combine(filter_date, datetime_time.max)
                query = query.filter(AttendanceLog.created_at.between(date_start, date_end))
            except ValueError:
                return jsonify({
                    'success': False,
                    'message': 'Invalid date format. Use YYYY-MM-DD'
                }), 400
        
        if user_type and user_type in ['student', 'faculty']:
            query = query.filter(AttendanceLog.user_type == user_type)
        
        # Get logs ordered by most recent
        logs = query.order_by(AttendanceLog.created_at.desc()).limit(limit).all()
        
        return jsonify({
            'success': True,
            'logs': [log.to_dict() for log in logs],
            'count': len(logs)
        }), 200
        
    except Exception as e:
        print(f"Error getting attendance logs: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to get attendance logs',
            'error': str(e)
        }), 500

@rfid_scanner_bp.route('/api/scanner/test-schedule', methods=['GET'])
def test_schedule_system():
    """Test endpoint to check schedule system functionality"""
    try:
        current_day, current_time, current_date, now = get_current_day_time()
        active_schedule = find_active_schedule()
        
        return jsonify({
            'success': True,
            'current_time': {
                'day': current_day,
                'time': current_time.isoformat(),
                'date': current_date.isoformat(),
                'datetime': now.isoformat()
            },
            'active_schedule': active_schedule
        }), 200
        
    except Exception as e:
        print(f"Error testing schedule system: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to test schedule system',
            'error': str(e)
        }), 500