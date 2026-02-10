from app import app
from extensions import db
from models import Student, Faculty, AttendanceLog, ClassSchedule
from datetime import datetime, date
import json

# Sample data for testing the RFID scanner
def create_test_data():
    with app.app_context():
        # Clear existing data
        AttendanceLog.query.delete()
        
        # Create sample students
        if not Student.query.filter_by(uid='RFID123456').first():
            student1 = Student(
                uid='RFID123456',
                id='STU-2024-001',
                first_name='John',
                middle_name='A',
                last_name='Doe',
                department='CS',  # Shortened department name
                year_level=3,
                section='A',
                gender='Male',
                schedule={
                    'monday': [
                        {'start_time': '08:00', 'end_time': '10:00', 'subject': 'Programming'},
                        {'start_time': '14:00', 'end_time': '16:00', 'subject': 'Database'}
                    ],
                    'wednesday': [
                        {'start_time': '08:00', 'end_time': '12:00', 'subject': 'Web Development'}
                    ]
                }
            )
            db.session.add(student1)
        
        if not Student.query.filter_by(uid='RFID789012').first():
            student2 = Student(
                uid='RFID789012',
                id='STU-2024-002',
                first_name='Jane',
                middle_name='B',
                last_name='Smith',
                department='IT',  # Shortened department name
                year_level=2,
                section='B',
                gender='Female'
            )
            db.session.add(student2)
        
        # Create sample faculty
        if not Faculty.query.filter_by(uid='RFID345678').first():
            faculty1 = Faculty(
                uid='RFID345678',
                id='FAC-2024-001',
                first_name='Dr. Alice',
                middle_name='C',
                last_name='Johnson',
                department='CS',  # Shortened department name
                gender='Female'
            )
            db.session.add(faculty1)
        
        # Create sample class schedule
        if not ClassSchedule.query.filter_by(schedule_name='CS Regular Schedule').first():
            class_schedule = ClassSchedule(
                schedule_name='CS Regular Schedule',
                department='CS',  # Shortened department name
                year_level=3,
                section='A',
                description='Regular computer science class schedule',
                schedule_data={
                    'monday': [
                        {'start_time': '08:00', 'end_time': '10:00', 'subject': 'Programming', 'room': 'Lab 1'},
                        {'start_time': '10:00', 'end_time': '12:00', 'subject': 'Software Engineering', 'room': 'Room 201'},
                        {'start_time': '14:00', 'end_time': '16:00', 'subject': 'Database Systems', 'room': 'Lab 2'}
                    ],
                    'tuesday': [
                        {'start_time': '08:00', 'end_time': '10:00', 'subject': 'Data Structures', 'room': 'Room 202'},
                        {'start_time': '13:00', 'end_time': '15:00', 'subject': 'Network Security', 'room': 'Lab 3'}
                    ],
                    'wednesday': [
                        {'start_time': '08:00', 'end_time': '12:00', 'subject': 'Web Development', 'room': 'Lab 1'},
                        {'start_time': '14:00', 'end_time': '17:00', 'subject': 'Capstone Project', 'room': 'Project Room'}
                    ],
                    'thursday': [
                        {'start_time': '08:00', 'end_time': '10:00', 'subject': 'Mobile Development', 'room': 'Lab 2'},
                        {'start_time': '14:00', 'end_time': '16:00', 'subject': 'System Analysis', 'room': 'Room 203'}
                    ],
                    'friday': [
                        {'start_time': '08:00', 'end_time': '11:00', 'subject': 'Thesis Writing', 'room': 'Library'},
                        {'start_time': '13:00', 'end_time': '17:00', 'subject': 'Internship Program', 'room': 'Various'}
                    ]
                },
                is_active=True,
                created_by='admin'
            )
            db.session.add(class_schedule)
        
        # Commit all changes
        db.session.commit()
        print("Test data created successfully!")
        
        # Print created records
        students = Student.query.all()
        faculties = Faculty.query.all()
        schedules = ClassSchedule.query.all()
        
        print(f"\nCreated {len(students)} students:")
        for student in students:
            print(f"  - {student.full_name()} (UID: {student.uid}, ID: {student.id})")
            
        print(f"\nCreated {len(faculties)} faculty members:")
        for faculty in faculties:
            print(f"  - {faculty.full_name()} (UID: {faculty.uid}, ID: {faculty.id})")
            
        print(f"\nCreated {len(schedules)} class schedules:")
        for schedule in schedules:
            print(f"  - {schedule.schedule_name} ({schedule.department})")

if __name__ == '__main__':
    create_test_data()