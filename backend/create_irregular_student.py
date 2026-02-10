#!/usr/bin/env python3
"""
Create an irregular student with personal schedule
"""

from app import app
from extensions import db
from models import Student

def create_irregular_student():
    """Create an irregular student with personal schedule"""
    with app.app_context():
        # Check if irregular student already exists
        existing_student = Student.query.filter_by(uid="IRREGULAR123").first()
        if existing_student:
            print(f"Irregular student already exists: {existing_student.full_name()}")
            return

        # Create irregular student with personal schedule
        personal_schedule = {
            "thursday": [
                {
                    "subject": "Advanced Mathematics",
                    "start_time": "07:00",
                    "end_time": "08:30",
                    "room": "Room 301"
                },
                {
                    "subject": "Special Project",
                    "start_time": "11:00", 
                    "end_time": "12:30",
                    "room": "Lab 3"
                },
                {
                    "subject": "Thesis Writing",
                    "start_time": "15:00",
                    "end_time": "16:30",
                    "room": "Library"
                }
            ],
            "friday": [
                {
                    "subject": "Independent Study",
                    "start_time": "09:00",
                    "end_time": "10:30", 
                    "room": "Room 205"
                }
            ]
        }
        
        irregular_student = Student(
            uid="IRREGULAR123",
            id="2020-987654",
            first_name="Maria",
            middle_name="L",
            last_name="Santos",
            department="CS",  
            year_level=4,  # 4th year
            section="IR",  # Irregular section
            schedule=personal_schedule  # Personal schedule different from class schedule
        )
        
        db.session.add(irregular_student)
        db.session.commit()
        
        print(f"✅ Irregular student created successfully!")
        print(f"UID: {irregular_student.uid}")
        print(f"Student ID: {irregular_student.id}")
        print(f"Name: {irregular_student.full_name()}")
        print(f"Department: {irregular_student.department}, Year: {irregular_student.year_level}, Section: {irregular_student.section}")
        print(f"\n📅 Personal Schedule:")
        print(f"Thursday:")
        print(f"  07:00-08:30: Advanced Mathematics (Room 301)")
        print(f"  11:00-12:30: Special Project (Lab 3)") 
        print(f"  15:00-16:30: Thesis Writing (Library)")
        print(f"Friday:")
        print(f"  09:00-10:30: Independent Study (Room 205)")
        print(f"\n⚠️  Note: This student has completely different schedule from regular CS students!")

if __name__ == '__main__':
    create_irregular_student()