#!/usr/bin/env python3
"""
Debug script to check attendance logs and identify timeout issues
"""

from datetime import datetime, date, time as datetime_time
from models import AttendanceLog, Student, Faculty
from extensions import db
from sqlalchemy import and_
from config import Config
import sys
import os

# Add the backend directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def debug_attendance_logs(uid=None):
    """Debug attendance logs for a specific user or all users"""
    print("🔍 ATTENDANCE DEBUG REPORT")
    print("=" * 50)
    
    # Get current date info
    now = datetime.now()
    current_date = now.date()
    today_start = datetime.combine(current_date, datetime_time.min)
    today_end = datetime.combine(current_date, datetime_time.max)
    
    print(f"Current Time: {now}")
    print(f"Checking Date: {current_date}")
    print(f"Time Range: {today_start} to {today_end}")
    print()
    
    # Get logs based on UID filter
    if uid:
        print(f"🎯 LOGS FOR UID: {uid}")
        logs_query = AttendanceLog.query.filter(
            and_(
                AttendanceLog.uid == uid,
                AttendanceLog.created_at >= today_start,
                AttendanceLog.created_at <= today_end
            )
        )
        
        # Also check user details
        student = Student.query.filter_by(uid=uid).first()
        faculty = Faculty.query.filter_by(uid=uid).first()
        
        if student:
            print(f"👤 User: {student.full_name()} (Student)")
        elif faculty:
            print(f"👤 User: {faculty.full_name()} (Faculty)")
        else:
            print(f"❌ User not found for UID: {uid}")
    else:
        print("📊 ALL LOGS FOR TODAY")
        logs_query = AttendanceLog.query.filter(
            and_(
                AttendanceLog.created_at >= today_start,
                AttendanceLog.created_at <= today_end
            )
        )
    
    logs = logs_query.order_by(AttendanceLog.created_at.desc()).all()
    
    print(f"📈 Total logs found: {len(logs)}")
    print()
    
    if not logs:
        print("✅ No attendance logs found for today")
        return
    
    # Analyze logs
    incomplete_logs = []
    completed_logs = []
    
    for log in logs:
        print(f"📋 Log ID: {log.id}")
        print(f"   UID: {log.uid}")
        print(f"   User: {log.full_name} ({log.user_type})")
        print(f"   Time In: {log.time_in}")
        print(f"   Time Out: {log.time_out or 'Not set'}")
        print(f"   Schedule: {log.schedule_name}")
        print(f"   Status: {'Completed' if log.time_out else 'Active'}")
        print(f"   Created: {log.created_at}")
        print()
        
        if log.time_out is None:
            incomplete_logs.append(log)
        else:
            completed_logs.append(log)
    
    print("📊 SUMMARY:")
    print(f"✅ Completed sessions: {len(completed_logs)}")
    print(f"⏳ Active sessions: {len(incomplete_logs)}")
    
    if incomplete_logs:
        print()
        print("⚠️  ACTIVE SESSIONS DETECTED:")
        print("   → These should trigger timeout on next scan")
        for log in incomplete_logs:
            duration = now - log.time_in
            hours = duration.total_seconds() / 3600
            print(f"   • {log.full_name} ({log.uid}) - Active for {hours:.1f} hours")
            print(f"     Time-in: {log.time_in}")
            print(f"     Next scan: ✅ Should timeout (allowed anytime)")
    
    print()
    print("🔧 TIMEOUT TESTING:")
    print("   If a user with active session scans before 8am:")
    print("   → Should process TIMEOUT (not create new time-in)")
    print("   → Should work regardless of scanner availability hours")

if __name__ == "__main__":
    from app import create_app
    
    app = create_app()
    with app.app_context():
        # Check if user provided a UID
        if len(sys.argv) > 1:
            uid = sys.argv[1]
            debug_attendance_logs(uid)
        else:
            debug_attendance_logs()