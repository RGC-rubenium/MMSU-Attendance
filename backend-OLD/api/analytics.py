from flask import Blueprint, jsonify, request
from datetime import datetime, timedelta
from sqlalchemy import func, desc
from models import db, Student, Faculty, AttendanceLog
import logging
import utils.jwt_utils as jwt_utils

analytics_bp = Blueprint('analytics', __name__)

@analytics_bp.route('/dashboard-stats', methods=['GET'])
def get_dashboard_stats():
    """Get comprehensive dashboard analytics"""
    try:
        # Get current date for filtering
        today = datetime.now().date()
        
        # Total records (attendance logs)
        total_records = db.session.query(func.count(AttendanceLog.id)).scalar() or 0
        
        # Total students
        total_students = db.session.query(func.count(Student.uid)).scalar() or 0
        
        # Total faculty
        total_faculty = db.session.query(func.count(Faculty.uid)).scalar() or 0
        
        # Today's attendance count
        today_attendance = db.session.query(func.count(AttendanceLog.id))\
            .filter(func.date(AttendanceLog.time_in) == today)\
            .scalar() or 0
        
        # This week's attendance
        week_start = today - timedelta(days=today.weekday())
        week_attendance = db.session.query(func.count(AttendanceLog.id))\
            .filter(func.date(AttendanceLog.time_in) >= week_start)\
            .scalar() or 0
        
        # This month's attendance
        month_start = today.replace(day=1)
        month_attendance = db.session.query(func.count(AttendanceLog.id))\
            .filter(func.date(AttendanceLog.time_in) >= month_start)\
            .scalar() or 0
        
        # Present today (people who checked in today and haven't checked out or have incomplete status)
        present_today = db.session.query(func.count(func.distinct(AttendanceLog.uid)))\
            .filter(
                func.date(AttendanceLog.time_in) == today,
                db.or_(
                    AttendanceLog.time_out.is_(None),
                    AttendanceLog.status == 'incomplete'
                )
            ).scalar() or 0
        
        # Calculate attendance rate
        total_people = total_students + total_faculty
        attendance_rate = round((present_today / total_people * 100) if total_people > 0 else 0, 1)
        
        return jsonify({
            'success': True,
            'data': {
                'total_records': total_records,
                'total_students': total_students,
                'total_faculty': total_faculty,
                'total_people': total_people,
                'present_today': present_today,
                'attendance_rate': attendance_rate,
                'today_attendance': today_attendance,
                'week_attendance': week_attendance,
                'month_attendance': month_attendance,
                'last_updated': datetime.now().isoformat()
            }
        })
        
    except Exception as e:
        logging.error(f"Error getting dashboard stats: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to fetch dashboard statistics'
        }), 500

@analytics_bp.route('/recent-attendance', methods=['GET'])
def get_recent_attendance():
    """Get recent attendance records (latest 5 by default)"""
    try:
        limit = request.args.get('limit', 5, type=int)
        limit = min(limit, 50)  # Maximum 50 records
        
        # Get recent attendance logs
        recent_logs = db.session.query(AttendanceLog)\
            .order_by(desc(AttendanceLog.time_in))\
            .limit(limit)\
            .all()
        
        attendance_data = []
        for log in recent_logs:
            # Use the data from the AttendanceLog which already contains user info
            name = log.full_name or "Unknown"
            person_type = log.user_type.title() if log.user_type else "Unknown"
            person_id = log.user_id or "N/A"
            additional_info = log.department or "N/A"
            
            # Format timestamp
            time_in = log.time_in
            time_str = time_in.strftime('%I:%M %p') if time_in else 'N/A'
            date_str = time_in.strftime('%Y-%m-%d') if time_in else 'N/A'
            
            # Determine status based on time_out and status
            if log.time_out:
                status = 'Checked Out'
                status_class = 'warning'
            elif log.status == 'incomplete':
                status = 'Checked In'
                status_class = 'success'
            else:
                status = 'Complete'
                status_class = 'success'
            
            attendance_data.append({
                'id': log.id,
                'name': name,
                'person_type': person_type,
                'person_id': person_id,
                'additional_info': additional_info,
                'action': 'time_in',  # Default since we're showing time_in records
                'status': status,
                'status_class': status_class,
                'time': time_str,
                'date': date_str,
                'timestamp': time_in.isoformat() if time_in else None,
                'rfid_uid': log.uid
            })
        
        return jsonify({
            'success': True,
            'data': attendance_data,
            'total': len(attendance_data),
            'last_updated': datetime.now().isoformat()
        })
        
    except Exception as e:
        logging.error(f"Error getting recent attendance: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to fetch recent attendance records'
        }), 500

@analytics_bp.route('/attendance-trends', methods=['GET'])
def get_attendance_trends():
    """Get attendance trends for charts and analytics"""
    try:
        days = request.args.get('days', 7, type=int)
        days = min(days, 90)  # Maximum 90 days
        
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=days-1)
        
        # Get daily attendance counts
        daily_stats = db.session.query(
            func.date(AttendanceLog.time_in).label('date'),
            func.count(AttendanceLog.id).label('total_count'),
            func.sum(func.case([(AttendanceLog.time_out.is_(None), 1)], else_=0)).label('check_ins'),
            func.sum(func.case([(AttendanceLog.time_out.isnot(None), 1)], else_=0)).label('check_outs')
        ).filter(
            func.date(AttendanceLog.time_in).between(start_date, end_date)
        ).group_by(func.date(AttendanceLog.time_in))\
         .order_by(func.date(AttendanceLog.time_in))\
         .all()
        
        # Format data for frontend charts
        trends = []
        for stat in daily_stats:
            trends.append({
                'date': stat.date.isoformat(),
                'total': stat.total_count,
                'check_ins': stat.check_ins or 0,
                'check_outs': stat.check_outs or 0
            })
        
        return jsonify({
            'success': True,
            'data': trends,
            'period': {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat(),
                'days': days
            }
        })
        
    except Exception as e:
        logging.error(f"Error getting attendance trends: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to fetch attendance trends'
        }), 500

@analytics_bp.route('/live-stats', methods=['GET'])
def get_live_stats():
    """Get live statistics for real-time updates"""
    try:
        # Get current hour attendance
        current_hour = datetime.now().replace(minute=0, second=0, microsecond=0)
        next_hour = current_hour + timedelta(hours=1)
        
        current_hour_attendance = db.session.query(func.count(AttendanceLog.id))\
            .filter(AttendanceLog.time_in.between(current_hour, next_hour))\
            .scalar() or 0
        
        # Get last 5 minutes attendance
        five_minutes_ago = datetime.now() - timedelta(minutes=5)
        recent_activity = db.session.query(func.count(AttendanceLog.id))\
            .filter(AttendanceLog.time_in >= five_minutes_ago)\
            .scalar() or 0
        
        # Get currently present count (checked in but not checked out today)
        today = datetime.now().date()
        
        # People currently present (time_in today but no time_out or incomplete status)
        currently_present = db.session.query(func.count(func.distinct(AttendanceLog.uid)))\
            .filter(
                func.date(AttendanceLog.time_in) == today,
                db.or_(
                    AttendanceLog.time_out.is_(None),
                    AttendanceLog.status == 'incomplete'
                )
            ).scalar() or 0
        
        # Students currently present
        students_present = db.session.query(func.count(func.distinct(AttendanceLog.uid)))\
            .filter(
                func.date(AttendanceLog.time_in) == today,
                AttendanceLog.user_type == 'student',
                db.or_(
                    AttendanceLog.time_out.is_(None),
                    AttendanceLog.status == 'incomplete'
                )
            ).scalar() or 0
        
        # Faculty currently present
        faculty_present = db.session.query(func.count(func.distinct(AttendanceLog.uid)))\
            .filter(
                func.date(AttendanceLog.time_in) == today,
                AttendanceLog.user_type == 'faculty',
                db.or_(
                    AttendanceLog.time_out.is_(None),
                    AttendanceLog.status == 'incomplete'
                )
            ).scalar() or 0
        
        return jsonify({
            'success': True,
            'data': {
                'current_hour_attendance': current_hour_attendance,
                'recent_activity': recent_activity,
                'currently_present': currently_present,
                'students_present': students_present,
                'faculty_present': faculty_present,
                'timestamp': datetime.now().isoformat()
            }
        })
        
    except Exception as e:
        logging.error(f"Error getting live stats: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to fetch live statistics'
        }), 500