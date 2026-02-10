#!/usr/bin/env python3
"""
Check students with schedules and test schedule detection
"""

from app import app
from extensions import db
from models import Student
from api.rfid_scanner import find_active_schedule_for_student, get_current_day_time
import json

def check_student_schedules():
    """Check all students with schedules and test detection"""
    with app.app_context():
        current_day, current_time, current_date, now = get_current_day_time()
        print(f"Current day: {current_day}")
        print(f"Current time: {current_time}")
        print(f"Current date: {current_date}")
        print("-" * 50)
        
        # Find all students with schedules
        students_with_schedules = Student.query.filter(Student.schedule.isnot(None)).all()
        
        print(f"Found {len(students_with_schedules)} students with schedules:")
        print()
        
        for student in students_with_schedules:
            print(f"Student: {student.full_name()} (UID: {student.uid})")
            print(f"Department: {student.department}, Year: {student.year_level}, Section: {student.section}")
            
            if student.schedule:
                print("Schedule:")
                print(json.dumps(student.schedule, indent=2))
                
                # Test schedule detection
                active_schedule = find_active_schedule_for_student(student)
                print(f"Active schedule detected: {active_schedule}")
            else:
                print("No schedule data")
            
            print("-" * 50)
            
        # Also check what the current day schedule should show
        if students_with_schedules:
            test_student = students_with_schedules[0]
            if test_student.schedule and current_day in test_student.schedule:
                print(f"Today's ({current_day}) schedule for {test_student.full_name()}:")
                day_schedule = test_student.schedule[current_day]
                for slot in day_schedule:
                    print(f"  {slot.get('start_time')}-{slot.get('end_time')}: {slot.get('subject')} ({slot.get('room', 'No room')})")

if __name__ == '__main__':
    check_student_schedules()