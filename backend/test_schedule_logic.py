#!/usr/bin/env python3
"""
Test schedule detection logic
"""

from app import app
from api.rfid_scanner import get_current_day_time, check_time_in_range, find_active_schedule_for_student
from models import Student

def test_schedule_logic():
    """Test why the schedule detection is failing"""
    with app.app_context():
        # Get current time info
        current_day, current_time, current_date, now = get_current_day_time()
        print(f"Current day: {current_day}")
        print(f"Current time: {current_time}")
        print(f"Current date: {current_date}")
        
        # Test time range check
        is_in_range = check_time_in_range(current_time, '06:00', '21:00')
        print(f"Is in weekday range 06:00-21:00: {is_in_range}")
        
        # Check if it's a weekday
        is_weekday = current_day in ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
        print(f"Is weekday: {is_weekday}")
        
        # Test with student
        student = Student.query.filter_by(uid='TEST123').first()
        print(f"Student found: {student.full_name() if student else 'None'}")
        
        # Test the schedule function
        result = find_active_schedule_for_student(student)
        print(f"Schedule result: {result}")

if __name__ == '__main__':
    test_schedule_logic()