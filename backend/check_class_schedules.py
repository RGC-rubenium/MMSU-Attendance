#!/usr/bin/env python3
"""
Check class schedules and full schedule detection logic
"""

from app import app
from extensions import db
from models import Student, ClassSchedule
from api.rfid_scanner import find_active_schedule_for_student, get_current_day_time
import json

def check_class_schedules():
    """Check all class schedules and their impact on detection"""
    with app.app_context():
        current_day, current_time, current_date, now = get_current_day_time()
        print(f"Current: {current_day} {current_time}")
        print("-" * 50)
        
        # Check all class schedules
        class_schedules = ClassSchedule.query.filter_by(is_active=True).all()
        print(f"Found {len(class_schedules)} active class schedules:")
        
        for schedule in class_schedules:
            print(f"\nClass Schedule: {schedule.schedule_name}")
            print(f"Department: {schedule.department}, Year: {schedule.year_level}, Section: {schedule.section}")
            if schedule.schedule_data:
                print("Schedule data:")
                print(json.dumps(schedule.schedule_data, indent=2))
        
        print("\n" + "=" * 50)
        
        # Test specific student
        student = Student.query.filter_by(uid='0637611191').first()
        if student:
            print(f"\nTesting for student: {student.full_name()}")
            print(f"Department: {student.department}, Year: {student.year_level}, Section: {student.section}")
            
            # Test at 09:30 (during the student's class time)
            from datetime import time
            test_time = time(9, 30)  # 09:30
            
            from api.rfid_scanner import check_time_in_range
            
            # Check if student's Monday schedule matches current test time
            if student.schedule and 'Monday' in student.schedule:
                monday_schedule = student.schedule['Monday']
                print(f"\nStudent's Monday schedule: {monday_schedule}")
                
                for slot in monday_schedule:
                    start_time = slot.get('start_time')
                    end_time = slot.get('end_time')
                    in_range = check_time_in_range(test_time, start_time, end_time)
                    print(f"Time slot {start_time}-{end_time}: {'✅ ACTIVE' if in_range else '❌ inactive'} at 09:30")
            
            # Test schedule detection at 09:30
            print(f"\nSchedule detection at 09:30:")
            # We need to mock the current time for testing
            print("(Note: This will still use current time, not 09:30)")
            result = find_active_schedule_for_student(student)
            print(f"Result: {result}")

if __name__ == '__main__':
    check_class_schedules()