#!/usr/bin/env python3
"""
Create test event schedule to test Priority 1
"""

from app import app
from extensions import db
from models import EventSchedule
from datetime import datetime, date

def create_test_event_schedule():
    """Create a test event schedule for today"""
    with app.app_context():
        today = date.today()
        
        # Check if event already exists for today
        existing_event = EventSchedule.query.filter_by(event_date=today).first()
        if existing_event:
            print(f"Event schedule already exists: {existing_event.event_name}")
            return
        
        # Create test event schedule
        event_schedule_data = {
            "time_slots": [
                {
                    "start_time": "09:00",
                    "end_time": "11:00", 
                    "activity": "Campus Assembly",
                    "location": "Main Auditorium"
                },
                {
                    "start_time": "14:00",
                    "end_time": "16:00",
                    "activity": "Special Seminar", 
                    "location": "Conference Hall"
                }
            ]
        }
        
        test_event = EventSchedule(
            event_name="Campus Wide Event",
            event_date=today,
            schedule=event_schedule_data
        )
        
        db.session.add(test_event)
        db.session.commit()
        
        print(f"✅ Test event schedule created for {today}")
        print(f"📅 Event: {test_event.event_name}")
        print(f"🎯 Priority 1 Schedule (should override student schedules):")
        print(f"  09:00-11:00: Campus Assembly (Main Auditorium)")
        print(f"  14:00-16:00: Special Seminar (Conference Hall)")
        print(f"\n⚠️  This should take priority over John's individual schedule!")
        print(f"📚 John's schedule shows: 08:00-10:00 Computer Programming")
        print(f"🔥 Event schedule overlaps: 09:00-11:00 should override!")

if __name__ == '__main__':
    create_test_event_schedule()