#!/usr/bin/env python3
"""
Check attendance record details
"""

from app import app
from extensions import db
from models import AttendanceLog
import json

def check_attendance():
    """Check the detailed attendance record"""
    with app.app_context():
        log = AttendanceLog.query.filter_by(uid='TEST123').first()
        if not log:
            print("No attendance record found for TEST123")
            return
        
        print("=== ATTENDANCE RECORD ===")
        print(f"Student: {log.full_name}")
        print(f"Department: {log.department}")
        print(f"Time In: {log.time_in}")
        print(f"Time Out: {log.time_out}")
        print(f"Schedule Type: {log.schedule_type}")
        print(f"Schedule Name: {log.schedule_name}")
        print(f"Status: {log.status}")
        print(f"Notes: {log.notes}")
        print("\n=== SUBJECTS ATTENDED ===")
        if log.subjects_attended:
            print(json.dumps(log.subjects_attended, indent=2))
        else:
            print("None")

if __name__ == '__main__':
    check_attendance()