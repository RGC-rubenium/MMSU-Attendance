#!/usr/bin/env python3
"""
Simulate time-in during a scheduled class period
"""

from app import app
from extensions import db
from models import AttendanceLog
from datetime import datetime, time

def simulate_class_time():
    """Update the latest attendance to simulate scanning during class time"""
    with app.app_context():
        # Get the latest attendance record
        log = AttendanceLog.query.filter_by(uid='TEST123', time_out=None).order_by(AttendanceLog.id.desc()).first()
        if not log:
            print("No active attendance session found")
            return
        
        # Simulate that student scanned at 8:30 AM (during Computer Programming class 08:00-10:00)
        today = log.time_in.date()
        class_time = datetime.combine(today, time(8, 30))  # 8:30 AM
        log.time_in = class_time
        
        db.session.commit()
        
        print(f"✅ Updated time-in to 8:30 AM (during Computer Programming class)")
        print(f"📚 Current schedule shows: 08:00-10:00 Computer Programming")
        print(f"⏰ Student scanned at: {class_time}")
        print(f"✨ Now when they time-out, it should detect Computer Programming!")

if __name__ == '__main__':
    simulate_class_time()