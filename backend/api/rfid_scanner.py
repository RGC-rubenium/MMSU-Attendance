from flask import Blueprint, request, jsonify
from datetime import datetime, date, time as datetime_time
import json
import utils.jwt_utils as jwt_utils
from models import Student, Faculty, EventSchedule, ClassSchedule, AttendanceLog
from extensions import db
from sqlalchemy import and_, or_
from scanner_config import SCANNER_CONFIG, DEFAULT_SCHEDULE_CONFIG

rfid_scanner_bp = Blueprint('rfid_scanner', __name__)

def format_avatar_url(profile_path):
    """Format profile_path to proper avatar URL"""
    if not profile_path or not profile_path.strip():
        return None
    
    clean_path = profile_path.strip()
    if clean_path.startswith('http'):
        return clean_path
    
    # Remove leading slash if present to avoid double slashes
    if clean_path.startswith('/'):
        clean_path = clean_path[1:]
    
    # Check if path already starts with 'images/' to avoid duplication
    if clean_path.startswith('images/'):
        return f"{request.url_root}{clean_path}"
    else:
        return f"{request.url_root}images/{clean_path}"

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
    
    # Additional safety check for required attributes
    if not hasattr(student, 'schedule') or not hasattr(student, 'department') or not hasattr(student, 'year_level') or not hasattr(student, 'section'):
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
    
    # Faculty work hours (configurable) - ALWAYS available as fallback
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
    
    # Priority 3: Default Schedule (configurable hours) - ALWAYS available as fallback
    default_config = get_default_schedule_config(current_day)
    # Always return default schedule as fallback - no time restrictions for basic attendance
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
        
        # ===== CRITICAL: CHECK FOR EXISTING INCOMPLETE LOG FIRST =====
        today_start = datetime.combine(current_date, datetime_time.min)
        today_end = datetime.combine(current_date, datetime_time.max)
        
        print(f"🔍 Debug - Checking for incomplete logs for UID: {uid}")
        
        # Look for ANY incomplete log today - this is the most important check
        # Use time_in field instead of created_at to handle timezone issues
        incomplete_log = AttendanceLog.query.filter(
            and_(
                AttendanceLog.uid == uid,
                AttendanceLog.time_in >= today_start,
                AttendanceLog.time_in <= today_end,
                AttendanceLog.time_out.is_(None)
            )
        ).order_by(AttendanceLog.time_in.desc()).first()
        
        print(f"🔍 Debug - Incomplete log found: {incomplete_log is not None}")
        if incomplete_log:
            print(f"🔍 Debug - Incomplete log details: ID={incomplete_log.id}, time_in={incomplete_log.time_in}")
        
        # ===== IF INCOMPLETE LOG EXISTS: THIS IS DEFINITELY A TIMEOUT =====
        if incomplete_log:
            print(f"🔍 Debug - PROCESSING TIMEOUT (bypassing all other checks)")
            
            # Set timeout immediately
            incomplete_log.time_out = now
            incomplete_log.updated_at = now
            
            # Calculate attendance details based on user type
            if user_type == 'student':
                try:
                    subjects_attended = calculate_subjects_attended(user, incomplete_log.time_in, now)
                    incomplete_log.subjects_attended = subjects_attended
                    
                    # Update notes with subject summary
                    if subjects_attended:
                        subject_names = [s['subject'] for s in subjects_attended if s.get('subject')]
                        incomplete_log.notes = f"Attended: {', '.join(subject_names)}"
                    else:
                        incomplete_log.notes = "No subjects during attendance period"
                except Exception as e:
                    print(f"Error calculating subjects attended: {e}")
                    incomplete_log.subjects_attended = []
                    incomplete_log.notes = "Attendance recorded (subject calculation failed)"
            
            elif user_type == 'faculty':
                # Faculty attendance - calculate work hours
                work_duration = now - incomplete_log.time_in
                hours = work_duration.total_seconds() / 3600
                incomplete_log.notes = f"Work duration: {hours:.1f} hours"
                incomplete_log.subjects_attended = []
            
            # Commit the timeout
            db.session.commit()
            print(f"🔍 Debug - TIMEOUT COMPLETED successfully")
            
            return jsonify({
                'success': True,
                'action': 'time_out',
                'user': {
                    'uid': user.uid,
                    'id': user.id,
                    'name': user.full_name(),
                    'type': user_type,
                    'department': user.department,
                    'avatar': format_avatar_url(getattr(user, 'profile_path', None))
                },
                'schedule': {
                    'type': incomplete_log.schedule_type,
                    'name': incomplete_log.schedule_name,
                    'current_slot': {}
                },
                'attendance': incomplete_log.to_dict()
            }), 200
        
        # ===== NO INCOMPLETE LOG: PROCEED WITH NEW TIME-IN =====
        # Multiple attendances per day are now allowed
        print(f"🔍 Debug - No incomplete log found, proceeding with new time-in")
        
        # ===== THIS IS A NEW TIME-IN OPERATION =====
        print(f"🔍 Debug - Processing NEW TIME-IN operation")
        
        # Check scanner availability for new time-in
        if not is_scanner_available(user_type):
            # Get the allowed hours for this user type
            config = SCANNER_CONFIG[f'{user_type}_scanner_hours']
            
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
        
        # Find active schedule for time-in operations
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
        
        # Create new time-in entry
        attendance_log = AttendanceLog(
            uid=uid,
            user_type=user_type,
            user_id=user.id,
            full_name=user.full_name(),
            department=user.department,
            schedule_type=active_schedule['type'],
            schedule_name=active_schedule['name'],
            time_in=now,
            status='incomplete',
            subjects_attended=None,  # Will be calculated on time-out
            notes=None
        )
        
        db.session.add(attendance_log)
        db.session.commit()
        #debuger
        print(f"🔍 Debug - NEW TIME-IN created: ID={attendance_log.id}")
        
        return jsonify({
            'success': True,
            'action': 'time_in',
            'user': {
                'uid': user.uid,
                'id': user.id,
                'name': user.full_name(),
                'type': user_type,
                'department': user.department,
                'avatar': format_avatar_url(getattr(user, 'profile_path', None))
            },
            'schedule': {
                'type': active_schedule['type'],
                'name': active_schedule['name'],
                'current_slot': active_schedule.get('current_slot') or {}
            },
            'attendance': attendance_log.to_dict()
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
                if check_time_in_range(current_time, '06:00', '22:00'):  # Extended hours
                    active_schedule = {
                        'type': 'work_hours',
                        'schedule': None,
                        'current_slot': {'start_time': '06:00', 'end_time': '22:00', 'description': 'Work Hours'},
                        'name': 'Work Hours'
                    }
            else:
                # Weekend
                if check_time_in_range(current_time, '06:00', '20:00'):
                    active_schedule = {
                        'type': 'weekend_hours',
                        'schedule': None,
                        'current_slot': {'start_time': '06:00', 'end_time': '20:00', 'description': 'Weekend Hours'},
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

@rfid_scanner_bp.route('/api/scanner/time-in', methods=['POST'])
def handle_time_in():
    """Handle RFID scan specifically for time-in operations"""
    try:
        data = request.get_json()
        uid = data.get('uid', '').strip()
        
        if not uid:
            return jsonify({
                'success': False,
                'message': 'UID is required'
            }), 400
        
        current_day, current_time, current_date, now = get_current_day_time()
        
        # Find user by UID
        user = None
        user_type = None
        
        student = Student.query.filter_by(uid=uid).first()
        if student:
            user = student
            user_type = 'student'
        else:
            faculty = Faculty.query.filter_by(uid=uid).first()
            if faculty:
                user = faculty
                user_type = 'faculty'
        
        if not user:
            return jsonify({
                'success': False,
                'message': 'RFID card not registered',
                'details': 'The scanned card is not associated with any student or faculty member.',
                'uid': uid
            }), 404
        
        # Check for existing incomplete log today
        today_start = datetime.combine(current_date, datetime_time.min)
        today_end = datetime.combine(current_date, datetime_time.max)
        
        incomplete_log = AttendanceLog.query.filter(
            and_(
                AttendanceLog.uid == uid,
                AttendanceLog.time_in >= today_start,
                AttendanceLog.time_in <= today_end,
                AttendanceLog.time_out.is_(None)
            )
        ).order_by(AttendanceLog.time_in.desc()).first()
        
        if incomplete_log:
            return jsonify({
                'success': False,
                'message': 'You already have an active time-in session',
                'details': f'You checked in at {incomplete_log.time_in.strftime("%H:%M")}. Please use time-out scanner to complete your session.',
                'user': {
                    'uid': user.uid,
                    'id': user.id,
                    'name': user.full_name(),
                    'type': user_type,
                    'department': user.department,
                    'avatar': format_avatar_url(getattr(user, 'profile_path', None))
                },
                'existing_time_in': incomplete_log.time_in.isoformat()
            }), 400
        
        # Check scanner availability for time-in
        if not is_scanner_available(user_type):
            config = SCANNER_CONFIG[f'{user_type}_scanner_hours']
            
            if current_day in ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']:
                allowed_hours = config['weekdays']
                day_type = 'weekdays'
            else:
                allowed_hours = config['weekends']
                day_type = 'weekends'
            
            return jsonify({
                'success': False,
                'message': f'Time-in not available for {user_type}s at this time',
                'details': f'Scanner hours: {allowed_hours["start_time"]} - {allowed_hours["end_time"]} on {day_type}',
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
        
        # Find active schedule for time-in
        if user_type == 'student':
            active_schedule = find_active_schedule_for_student(user)
        elif user_type == 'faculty':
            active_schedule = find_active_schedule_for_faculty(user)
        else:
            active_schedule = find_active_schedule()
        
        # Create new time-in entry
        attendance_log = AttendanceLog(
            uid=uid,
            user_type=user_type,
            user_id=user.id,
            full_name=user.full_name(),
            department=user.department,
            schedule_type=active_schedule['type'],
            schedule_name=active_schedule['name'],
            time_in=now,
            status='incomplete',
            subjects_attended=None,
            notes='Time-in recorded'
        )
        
        db.session.add(attendance_log)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'action': 'time_in',
            'message': 'Time-in recorded successfully',
            'user': {
                'uid': user.uid,
                'id': user.id,
                'name': user.full_name(),
                'type': user_type,
                'department': user.department,
                'avatar': format_avatar_url(getattr(user, 'profile_path', None))
            },
            'schedule': {
                'type': active_schedule['type'],
                'name': active_schedule['name'],
                'current_slot': active_schedule.get('current_slot') or {}
            },
            'attendance': attendance_log.to_dict(),
            'schedule_info': f"Checked in to {active_schedule['name']}"
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error handling time-in: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to process time-in',
            'error': str(e)
        }), 500

@rfid_scanner_bp.route('/api/scanner/time-out', methods=['POST'])
def handle_time_out():
    """Handle RFID scan specifically for time-out operations"""
    try:
        data = request.get_json()
        uid = data.get('uid', '').strip()
        
        if not uid:
            return jsonify({
                'success': False,
                'message': 'UID is required'
            }), 400
        
        current_day, current_time, current_date, now = get_current_day_time()
        
        # Find user by UID
        user = None
        user_type = None
        
        student = Student.query.filter_by(uid=uid).first()
        if student:
            user = student
            user_type = 'student'
        else:
            faculty = Faculty.query.filter_by(uid=uid).first()
            if faculty:
                user = faculty
                user_type = 'faculty'
        
        if not user:
            return jsonify({
                'success': False,
                'message': 'RFID card not registered',
                'details': 'The scanned card is not associated with any student or faculty member.',
                'uid': uid
            }), 404
        
        # Look for incomplete log today
        today_start = datetime.combine(current_date, datetime_time.min)
        today_end = datetime.combine(current_date, datetime_time.max)
        
        incomplete_log = AttendanceLog.query.filter(
            and_(
                AttendanceLog.uid == uid,
                AttendanceLog.time_in >= today_start,
                AttendanceLog.time_in <= today_end,
                AttendanceLog.time_out.is_(None)
            )
        ).order_by(AttendanceLog.time_in.desc()).first()
        
        if not incomplete_log:
            return jsonify({
                'success': False,
                'message': 'No active time-in session found',
                'details': 'You need to check in first before you can check out. Please use the time-in scanner.',
                'user': {
                    'uid': user.uid,
                    'id': user.id,
                    'name': user.full_name(),
                    'type': user_type,
                    'department': user.department,
                    'avatar': format_avatar_url(getattr(user, 'profile_path', None))
                }
            }), 400
        
        # Process time-out
        incomplete_log.time_out = now
        incomplete_log.status = 'complete'
        incomplete_log.updated_at = now
        
        # Calculate attendance details based on user type
        subjects_attended = []
        if user_type == 'student':
            try:
                subjects_attended = calculate_subjects_attended(user, incomplete_log.time_in, now)
                incomplete_log.subjects_attended = subjects_attended
                
                # Update notes with subject summary
                if subjects_attended:
                    subject_names = [s['subject'] for s in subjects_attended if s.get('subject')]
                    incomplete_log.notes = f"Completed session. Attended: {', '.join(subject_names)}"
                else:
                    incomplete_log.notes = "Completed session. No subjects during attendance period"
            except Exception as e:
                print(f"Error calculating subjects attended: {e}")
                incomplete_log.subjects_attended = []
                incomplete_log.notes = "Completed session (subject calculation failed)"
        
        elif user_type == 'faculty':
            # Faculty attendance - calculate work duration
            work_duration = now - incomplete_log.time_in
            hours = work_duration.total_seconds() / 3600
            incomplete_log.notes = f"Completed work session. Duration: {hours:.1f} hours"
            incomplete_log.subjects_attended = []
        
        db.session.commit()
        
        # Calculate duration for response
        duration_seconds = (now - incomplete_log.time_in).total_seconds()
        duration_hours = int(duration_seconds // 3600)
        duration_minutes = int((duration_seconds % 3600) // 60)
        
        return jsonify({
            'success': True,
            'action': 'time_out',
            'message': 'Time-out recorded successfully',
            'user': {
                'uid': user.uid,
                'id': user.id,
                'name': user.full_name(),
                'type': user_type,
                'department': user.department,
                'avatar': format_avatar_url(getattr(user, 'profile_path', None))
            },
            'attendance': incomplete_log.to_dict(),
            'time_in': incomplete_log.time_in.isoformat(),
            'time_out': now.isoformat(),
            'duration': f"{duration_hours}h {duration_minutes}m" if duration_hours > 0 else f"{duration_minutes}m",
            'subjects_attended': subjects_attended
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error handling time-out: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to process time-out',
            'error': str(e)
        }), 500

@rfid_scanner_bp.route('/api/scanner/attendance-logs', methods=['GET'])
@jwt_utils.token_required
def get_attendance_logs():
    """Get attendance logs with filtering, search, and pagination"""
    try:
        date_filter   = request.args.get('date')
        user_type     = request.args.get('user_type')
        search        = request.args.get('search', '').strip()
        department    = request.args.get('department', '').strip()
        status        = request.args.get('status', '').strip()
        page          = request.args.get('page', 1, type=int)
        per_page      = min(request.args.get('per_page', 20, type=int), 100)

        query = AttendanceLog.query

        if date_filter:
            try:
                filter_date = datetime.strptime(date_filter, '%Y-%m-%d').date()
                date_start  = datetime.combine(filter_date, datetime_time.min)
                date_end    = datetime.combine(filter_date, datetime_time.max)
                query = query.filter(AttendanceLog.time_in.between(date_start, date_end))
            except ValueError:
                return jsonify({'success': False, 'message': 'Invalid date format. Use YYYY-MM-DD'}), 400

        if user_type and user_type in ['student', 'faculty']:
            query = query.filter(AttendanceLog.user_type == user_type)

        if search:
            like = f'%{search}%'
            query = query.filter(
                or_(
                    AttendanceLog.full_name.ilike(like),
                    AttendanceLog.uid.ilike(like),
                    AttendanceLog.user_id.ilike(like),
                    AttendanceLog.department.ilike(like),
                )
            )

        if department:
            query = query.filter(AttendanceLog.department.ilike(f'%{department}%'))

        if status:
            query = query.filter(AttendanceLog.status == status)

        query = query.order_by(AttendanceLog.time_in.desc())

        # paginate() issues a single optimised COUNT + windowed SELECT
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)

        return jsonify({
            'success':     True,
            'logs':        [log.to_dict() for log in pagination.items],
            'count':       len(pagination.items),
            'total':       pagination.total,
            'page':        pagination.page,
            'per_page':    per_page,
            'total_pages': pagination.pages,
        }), 200

    except Exception as e:
        print(f"Error getting attendance logs: {e}")
        return jsonify({'success': False, 'message': 'Failed to get attendance logs', 'error': str(e)}), 500

@rfid_scanner_bp.route('/api/scanner/heartbeat', methods=['GET'])
def heartbeat():
    """Keep-alive endpoint to prevent backend sleep"""
    return jsonify({'success': True, 'status': 'alive', 'timestamp': datetime.now().isoformat()}), 200

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

@rfid_scanner_bp.route('/api/scanner/test-avatar', methods=['GET'])
def test_avatar_url():
    """Test endpoint to check avatar URL generation"""
    try:
        # Get the student "Raven Gian Sulit Copon"
        student = Student.query.filter_by(uid='0637611191').first()
        
        if student:
            avatar_url = format_avatar_url(student.profile_path)
            return jsonify({
                'success': True,
                'student_name': student.full_name(),
                'profile_path': student.profile_path,
                'formatted_avatar_url': avatar_url,
                'request_url_root': request.url_root
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': 'Student not found'
            }), 404
            
    except Exception as e:
        print(f"Error testing avatar URL: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to test avatar URL',
            'error': str(e)
        }), 500
        
@rfid_scanner_bp.route('/api/scanner/attendance-logs/<int:log_id>', methods=['DELETE'])
@jwt_utils.token_required
def delete_attendance_log(log_id):
    log = AttendanceLog.query.get(log_id)
    if not log:
        return jsonify({'success': False, 'message': 'Log not found'})
    db.session.delete(log)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Log deleted'})