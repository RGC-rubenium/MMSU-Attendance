from app import app
from extensions import db
from models import Student, Faculty, AttendanceLog
from datetime import datetime
import json

def create_minimal_test_data():
    with app.app_context():
        # Clear existing logs
        AttendanceLog.query.delete()
        db.session.commit()
        
        # Create minimal test student
        existing_student = Student.query.filter_by(uid='TEST123').first()
        if not existing_student:
            student = Student(
                uid='TEST123',
                id='STU-001',
                first_name='John',
                last_name='Doe',
                department='CS',
                year_level=3,
                section='A',
                gender='Male'
            )
            db.session.add(student)
        
        # Create minimal test faculty
        existing_faculty = Faculty.query.filter_by(uid='FAC123').first()
        if not existing_faculty:
            faculty = Faculty(
                uid='FAC123',
                id='FAC-001',
                first_name='Jane',
                last_name='Smith',
                department='CS',
                gender='Female'
            )
            db.session.add(faculty)
        
        db.session.commit()
        print("Minimal test data created successfully!")
        
        # Print what was created
        students = Student.query.filter(Student.uid.in_(['TEST123'])).all()
        faculties = Faculty.query.filter(Faculty.uid.in_(['FAC123'])).all()
        
        print(f"Students: {len(students)}")
        for s in students:
            print(f"  UID: {s.uid}, ID: {s.id}, Name: {s.full_name()}")
            
        print(f"Faculty: {len(faculties)}")
        for f in faculties:
            print(f"  UID: {f.uid}, ID: {f.id}, Name: {f.full_name()}")

if __name__ == '__main__':
    create_minimal_test_data()