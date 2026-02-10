#!/usr/bin/env python3
"""
Create test student for RFID testing
"""

from app import app
from extensions import db
from models import Student

def create_test_student():
    """Create a test student with RFID card"""
    with app.app_context():
        # Check if test student already exists
        existing_student = Student.query.filter_by(uid="TEST123").first()
        if existing_student:
            print(f"Test student already exists: {existing_student.full_name()}")
            return

        # Create test student
        test_student = Student(
            uid="TEST123",
            id="2021-123456",
            first_name="John",
            middle_name="A",
            last_name="Doe",
            department="CS",  # Computer Science
            year_level=3,
            section="A"
        )
        
        db.session.add(test_student)
        db.session.commit()
        
        print(f"Test student created successfully!")
        print(f"UID: {test_student.uid}")
        print(f"Student ID: {test_student.id}")
        print(f"Name: {test_student.full_name()}")
        print(f"Department: {test_student.department}, Year: {test_student.year_level}, Section: {test_student.section}")

if __name__ == '__main__':
    create_test_student()