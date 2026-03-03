#!/usr/bin/env python3
"""
Demonstration of once-per-day RFID scanning functionality

This script shows how the system now prevents users from scanning more than once per day.
"""

from app import app
from models import Student, Faculty, AttendanceLog
from extensions import db
from datetime import datetime, date
import json

def demonstrate_once_per_day():
    """Demonstrate the once-per-day scanning functionality"""
    print("=== RFID Once-Per-Day Scanning Demonstration ===\n")
    
    with app.app_context():
        # Get a test student
        test_student = Student.query.first()
        if not test_student:
            print("No students found in database. Please add test data first.")
            return
        
        print(f"Testing with student: {test_student.full_name()}")
        print(f"Student UID: {test_student.uid}")
        print(f"Department: {test_student.department}\n")
        
        # Check current attendance status
        today = date.today()
        today_start = datetime.combine(today, datetime.min.time())
        today_end = datetime.combine(today, datetime.max.time())
        
        existing_logs = AttendanceLog.query.filter(
            AttendanceLog.uid == test_student.uid,
            AttendanceLog.created_at >= today_start,
            AttendanceLog.created_at <= today_end
        ).all()
        
        print(f"Current attendance logs for today: {len(existing_logs)}")
        
        for i, log in enumerate(existing_logs, 1):
            print(f"  Log {i}:")
            print(f"    Time In: {log.time_in}")
            print(f"    Time Out: {log.time_out or 'Not set'}")
            print(f"    Schedule: {log.schedule_name} ({log.schedule_type})")
            print(f"    Status: {'Completed' if log.time_out else 'Active'}")
            print()
        
        # Explain the new behavior
        print("=== NEW ONCE-PER-DAY BEHAVIOR ===")
        print()
        print("🔹 FIRST SCAN: Creates time-in record")
        print("🔹 SECOND SCAN: Updates same record with time-out")
        print("🚫 THIRD+ SCAN: BLOCKED - 'You have already scanned today'")
        print()
        print("Benefits:")
        print("✅ Prevents duplicate attendance records")
        print("✅ Ensures accurate daily attendance tracking")
        print("✅ Reduces database clutter")
        print("✅ Prevents gaming the system")
        print()
        
        # Show what happens with different scenarios
        print("=== SCANNING SCENARIOS ===")
        print()
        
        if not existing_logs:
            print("📱 SCENARIO: No scans today")
            print("   → Next scan: ✅ TIME IN (allowed)")
            print("   → Scan after: ✅ TIME OUT (allowed)")
            print("   → Any more scans: 🚫 BLOCKED")
            
        elif len(existing_logs) == 1 and not existing_logs[0].time_out:
            print("📱 SCENARIO: One active time-in")
            print("   → Next scan: ✅ TIME OUT (allowed)")
            print("   → Any more scans: 🚫 BLOCKED")
            
        elif len(existing_logs) == 1 and existing_logs[0].time_out:
            print("📱 SCENARIO: Completed attendance")
            print("   → Next scan: 🚫 BLOCKED")
            print("   → Message: 'You have already scanned today'")
            
        else:
            print("📱 SCENARIO: Multiple logs (legacy data)")
            print("   → Next scan: 🚫 BLOCKED")
            print("   → System enforces once-per-day rule")

def clean_today_logs():
    """Clean up today's logs for testing"""
    with app.app_context():
        today = date.today()
        today_start = datetime.combine(today, datetime.min.time())
        today_end = datetime.combine(today, datetime.max.time())
        
        logs_to_delete = AttendanceLog.query.filter(
            AttendanceLog.created_at >= today_start,
            AttendanceLog.created_at <= today_end
        ).all()
        
        print(f"Found {len(logs_to_delete)} logs to clean up for today")
        
        for log in logs_to_delete:
            db.session.delete(log)
        
        db.session.commit()
        print("✅ Today's attendance logs cleaned up")

def show_api_endpoints():
    """Show the relevant API endpoints"""
    print("\n=== RELEVANT API ENDPOINTS ===")
    print()
    print("📡 POST /api/scanner/rfid-scan")
    print("   Body: {'uid': 'RFID_UID_HERE'}")
    print("   Purpose: Scan RFID card for attendance")
    print()
    print("📊 GET /api/scanner/attendance-logs?date=YYYY-MM-DD")
    print("   Purpose: View attendance logs for specific date")
    print()
    print("⏰ GET /api/scanner/current-schedule")
    print("   Purpose: Check current active schedule")
    print()

if __name__ == '__main__':
    demonstrate_once_per_day()
    show_api_endpoints()
    
    print("\n" + "="*50)
    print("To test this functionality:")
    print("1. Start the Flask server: python app.py")
    print("2. Use the Scanner interface or API endpoints")
    print("3. Try scanning the same RFID card multiple times")
    print("="*50)