#!/usr/bin/env python3
"""
Check all attendance records
"""

from app import app
from extensions import db
from models import AttendanceLog
import json

def check_all_attendance():
    """Check all attendance records"""
    with app.app_context():
        logs = AttendanceLog.query.filter_by(uid='TEST123').order_by(AttendanceLog.id).all()
        
        if not logs:
            print("No attendance records found for TEST123")
            return
        
        for i, log in enumerate(logs, 1):
            print(f"\n=== ATTENDANCE RECORD #{i} (ID: {log.id}) ===")
            print(f"Student: {log.full_name}")
            print(f"Department: {log.department}")
            print(f"Time In: {log.time_in}")
            print(f"Time Out: {log.time_out}")
            print(f"Duration: {log.time_out - log.time_in if log.time_out else 'Still active'}")
            print(f"Schedule Type: {log.schedule_type}")
            print(f"Schedule Name: {log.schedule_name}")
            print(f"Status: {log.status}")
            print(f"Notes: {log.notes}")
            print("\n=== SUBJECTS ATTENDED ===")
            if log.subjects_attended:
                print(json.dumps(log.subjects_attended, indent=2))
            else:
                print("None")
            print("-" * 50)

if __name__ == '__main__':
    check_all_attendance()