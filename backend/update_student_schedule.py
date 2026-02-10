#!/usr/bin/env python3
"""
Update test student with operator-set schedule
"""

from app import app
from extensions import db
from models import Student

def update_test_student_schedule():
    """Update test student with schedule that operators would set"""
    with app.app_context():
        # Find the test student
        student = Student.query.filter_by(uid="TEST123").first()
        if not student:
            print("Test student not found")
            return
        
        # Set a schedule that operators would configure
        operator_set_schedule = {
            "thursday": [
                {
                    "subject": "Computer Programming",
                    "start_time": "08:00",
                    "end_time": "10:00", 
                    "room": "Computer Lab"
                },
                {
                    "subject": "Database Management",
                    "start_time": "10:30",
                    "end_time": "12:00",
                    "room": "Room 201"
                },
                {
                    "subject": "Web Development",
                    "start_time": "13:00",
                    "end_time": "15:00",
                    "room": "Lab 1"
                }
            ],
            "friday": [
                {
                    "subject": "Data Structures",
                    "start_time": "09:00",
                    "end_time": "11:00",
                    "room": "Lab 2"
                }
            ]
        }
        
        student.schedule = operator_set_schedule
        db.session.commit()
        
        print(f"✅ Updated schedule for {student.full_name()}")
        print(f"📅 New Schedule (set by operators):")
        print(f"Thursday:")
        print(f"  08:00-10:00: Computer Programming (Computer Lab)")
        print(f"  10:30-12:00: Database Management (Room 201)")
        print(f"  13:00-15:00: Web Development (Lab 1)")
        print(f"Friday:")
        print(f"  09:00-11:00: Data Structures (Lab 2)")
        print(f"\n✨ This schedule is now independent of class schedules!")
        print(f"✨ Operators can set individual schedules for any student!")

if __name__ == '__main__':
    update_test_student_schedule()