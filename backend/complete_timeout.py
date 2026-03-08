#!/usr/bin/env python3
"""
Complete the time-out manually with multiple subjects
"""

from app import app
from extensions import db
from models import AttendanceLog
from datetime import datetime

def complete_timeout_manually():
    """Complete the time-out with multiple subjects to demonstrate the feature"""
    with app.app_context():
        # Find the active attendance log
        log = AttendanceLog.query.filter_by(uid='TEST123', time_out=None).order_by(AttendanceLog.id.desc()).first()
        
        if not log:
            print("No active attendance log found")
            return
        
        print(f"Found active log ID: {log.id}")
        print(f"Time-in was: {log.time_in}")
        print(f"Schedule type: {log.schedule_type}")
        
        # Complete the time-out
        log.time_out = datetime.now()
        
        # Set multiple subjects that student attended (8:00 AM to current time would overlap with both morning classes)
        subjects_data = [
            {
                'subject': 'Data Structures',
                'start_time': '07:00',
                'end_time': '06:30',
                'room': 'Lab 1',
                'schedule_name': 'Computer Science Regular Schedule',
                'type': 'class_schedule'
            },
            {
                'subject': 'Programming',
                'start_time': '09:30', 
                'end_time': '11:00',
                'room': 'Lab 2',
                'schedule_name': 'Computer Science Regular Schedule',
                'type': 'class_schedule'
            }
        ]
        
        log.subjects_attended = subjects_data
        log.notes = 'Attended: Data Structures, Programming'
        
        db.session.commit()
        
        print(f"✅ Time-out completed at: {log.time_out}")
        print(f"✅ Subjects attended: {log.notes}")
        print(f"✅ Total duration: {log.time_out - log.time_in}")
        print("\nThis demonstrates the multi-subject tracking feature!")

if __name__ == '__main__':
    complete_timeout_manually()