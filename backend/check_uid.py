#!/usr/bin/env python3
"""
Quick check for specific UID attendance logs
"""

from datetime import datetime, date, time as datetime_time, timedelta
from models import AttendanceLog, Student, Faculty
from extensions import db
from sqlalchemy import and_
import sys
import os

def check_uid_logs(uid):
    """Check logs for specific UID"""
    print(f"🔍 CHECKING LOGS FOR UID: {uid}")
    print("=" * 50)
    
    # Get current date info
    now = datetime.now()
    current_date = now.date()
    today_start = datetime.combine(current_date, datetime_time.min)
    today_end = datetime.combine(current_date, datetime_time.max)
    
    # Check user details
    student = Student.query.filter_by(uid=uid).first()
    faculty = Faculty.query.filter_by(uid=uid).first()
    
    if student:
        print(f"👤 User: {student.full_name()} (Student)")
    elif faculty:
        print(f"👤 User: {faculty.full_name()} (Faculty)")
    else:
        print(f"❌ User not found for UID: {uid}")
        return
    
    print(f"📅 Current Date: {current_date}")
    print(f"🕐 Current Time: {now}")
    print()
    
    # Get logs for today
    print("📋 TODAY'S LOGS:")
    today_logs = AttendanceLog.query.filter(
        and_(
            AttendanceLog.uid == uid,
            AttendanceLog.created_at >= today_start,
            AttendanceLog.created_at <= today_end
        )
    ).order_by(AttendanceLog.created_at.desc()).all()
    
    if today_logs:
        for i, log in enumerate(today_logs, 1):
            print(f"  {i}. ID: {log.id}")
            print(f"     Time In: {log.time_in}")
            print(f"     Time Out: {log.time_out or 'INCOMPLETE'}")
            print(f"     Schedule: {log.schedule_name}")
            print(f"     Created: {log.created_at}")
            print()
    else:
        print("  ✅ No logs found for today")
    
    # Get recent logs (last 3 days)
    print("📋 RECENT LOGS (Last 3 days):")
    three_days_ago = current_date - timedelta(days=3)
    recent_start = datetime.combine(three_days_ago, datetime_time.min)
    
    recent_logs = AttendanceLog.query.filter(
        and_(
            AttendanceLog.uid == uid,
            AttendanceLog.created_at >= recent_start
        )
    ).order_by(AttendanceLog.created_at.desc()).all()
    
    if recent_logs:
        for i, log in enumerate(recent_logs, 1):
            log_date = log.created_at.date()
            status = "COMPLETE" if log.time_out else "INCOMPLETE"
            print(f"  {i}. [{log_date}] ID: {log.id} - {status}")
            print(f"     Time In: {log.time_in}")
            print(f"     Time Out: {log.time_out or 'None'}")
            print()
    else:
        print("  ✅ No recent logs found")
    
    # Check for any incomplete logs (any date)
    print("⚠️  ALL INCOMPLETE LOGS:")
    incomplete_logs = AttendanceLog.query.filter(
        and_(
            AttendanceLog.uid == uid,
            AttendanceLog.time_out.is_(None)
        )
    ).order_by(AttendanceLog.created_at.desc()).all()
    
    if incomplete_logs:
        print(f"  Found {len(incomplete_logs)} incomplete session(s):")
        for i, log in enumerate(incomplete_logs, 1):
            log_date = log.created_at.date()
            duration = now - log.time_in
            hours = duration.total_seconds() / 3600
            print(f"  {i}. [{log_date}] ID: {log.id}")
            print(f"     Time In: {log.time_in}")
            print(f"     Duration: {hours:.1f} hours")
            print(f"     Schedule: {log.schedule_name}")
            print()
    else:
        print("  ✅ No incomplete sessions found")
    
    print("🔧 RECOMMENDATION:")
    if incomplete_logs:
        today_incomplete = [log for log in incomplete_logs if log.created_at.date() == current_date]
        if today_incomplete:
            print("  ⚠️  User has incomplete session TODAY")
            print("  → Next scan should trigger TIMEOUT")
        else:
            print("  ⚠️  User has incomplete session from PREVIOUS days")
            print("  → You may want to manually complete old sessions")
            print("  → Or modify logic to handle cross-date sessions")
    else:
        print("  ✅ User has no incomplete sessions")
        print("  → Next scan should create new TIME-IN")

if __name__ == "__main__":
    # Import the app directly
    from app import app
    
    with app.app_context():
        check_uid_logs("0637611191")