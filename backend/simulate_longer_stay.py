#!/usr/bin/env python3
"""
Simulate longer attendance period for testing multiple subjects
"""

from app import app
from extensions import db
from models import AttendanceLog
from datetime import datetime, time

def simulate_longer_attendance():
    """Update the latest attendance record to simulate longer stay"""
    with app.app_context():
        # Get the latest attendance record
        log = AttendanceLog.query.filter_by(uid='TEST123', time_out=None).first()
        if not log:
            print("No active attendance session found")
            return
        
        print(f"Original time-in: {log.time_in}")
        
        # Simulate that student came in at 8:00 AM (covering multiple classes)
        today = log.time_in.date()
        early_time_in = datetime.combine(today, time(8, 0))  # 8:00 AM
        log.time_in = early_time_in
        
        db.session.commit()
        
        print(f"Updated time-in to: {log.time_in} (8:00 AM)")
        print("Now when student times out, they should have attended multiple subjects!")
        
        # Show what classes are scheduled for today
        print("\nToday's CS schedule that student should overlap with:")
        print("08:00-09:30: Data Structures (Lab 1)")
        print("09:30-11:00: Programming (Lab 2)")  
        print("13:00-14:30: Database Systems (Room 201)")
        print("14:30-16:00: Web Development (Lab 1)")

if __name__ == '__main__':
    simulate_longer_attendance()