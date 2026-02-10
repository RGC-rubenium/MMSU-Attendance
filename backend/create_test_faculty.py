#!/usr/bin/env python3
"""
Create test faculty member for RFID testing
"""

from app import app
from extensions import db
from models import Faculty

def create_test_faculty():
    """Create a test faculty member with RFID card"""
    with app.app_context():
        # Check if test faculty already exists
        existing_faculty = Faculty.query.filter_by(uid="FACULTY123").first()
        if existing_faculty:
            print(f"Test faculty already exists: {existing_faculty.full_name()}")
            return

        # Create test faculty
        test_faculty = Faculty(
            uid="FACULTY123",
            id="FAC-2026-001",
            first_name="Dr. Maria",
            middle_name="S",
            last_name="Rodriguez",
            department="CS",  # Computer Science
            gender="Female"
        )
        
        db.session.add(test_faculty)
        db.session.commit()
        
        print(f"✅ Test faculty created successfully!")
        print(f"UID: {test_faculty.uid}")
        print(f"Faculty ID: {test_faculty.id}")
        print(f"Name: {test_faculty.full_name()}")
        print(f"Department: {test_faculty.department}")
        print(f"Gender: {test_faculty.gender}")
        print(f"\n📋 Faculty Attendance Features:")
        print(f"  ✅ Flexible work hours: 6 AM - 9 PM (weekdays)")
        print(f"  ✅ Weekend access: 8 AM - 5 PM")
        print(f"  ✅ Work duration tracking")
        print(f"  ✅ No schedule restrictions")
        print(f"  ✅ Separate attendance logs from students")

if __name__ == '__main__':
    create_test_faculty()