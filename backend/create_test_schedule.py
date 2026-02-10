from app import app
from extensions import db
from models import Student, ClassSchedule, AttendanceLog
from datetime import datetime
import json

def create_test_schedule_data():
    with app.app_context():
        # Clear existing class schedules
        ClassSchedule.query.delete()
        
        # Create a comprehensive class schedule for CS department
        cs_schedule = ClassSchedule(
            schedule_name='Computer Science Regular Schedule',
            department='CS',
            year_level=3,
            section='A',
            description='Regular CS class schedule with multiple subjects',
            schedule_data={
                'monday': [
                    {'start_time': '08:00', 'end_time': '09:30', 'subject': 'Data Structures', 'room': 'Lab 1'},
                    {'start_time': '09:30', 'end_time': '11:00', 'subject': 'Programming', 'room': 'Lab 2'},
                    {'start_time': '13:00', 'end_time': '14:30', 'subject': 'Database Systems', 'room': 'Room 201'},
                    {'start_time': '14:30', 'end_time': '16:00', 'subject': 'Web Development', 'room': 'Lab 1'}
                ],
                'tuesday': [
                    {'start_time': '08:00', 'end_time': '09:30', 'subject': 'Software Engineering', 'room': 'Room 202'},
                    {'start_time': '10:00', 'end_time': '11:30', 'subject': 'Network Security', 'room': 'Lab 3'},
                    {'start_time': '13:00', 'end_time': '15:00', 'subject': 'Mobile Development', 'room': 'Lab 2'}
                ],
                'wednesday': [
                    {'start_time': '08:00', 'end_time': '10:00', 'subject': 'System Analysis', 'room': 'Room 203'},
                    {'start_time': '10:00', 'end_time': '12:00', 'subject': 'Capstone Project', 'room': 'Project Room'},
                    {'start_time': '14:00', 'end_time': '16:00', 'subject': 'Machine Learning', 'room': 'Lab 4'}
                ],
                'thursday': [
                    {'start_time': '08:00', 'end_time': '09:30', 'subject': 'Data Structures', 'room': 'Lab 1'},
                    {'start_time': '09:30', 'end_time': '11:00', 'subject': 'Programming', 'room': 'Lab 2'},
                    {'start_time': '13:00', 'end_time': '14:30', 'subject': 'Database Systems', 'room': 'Room 201'},
                    {'start_time': '14:30', 'end_time': '16:00', 'subject': 'Web Development', 'room': 'Lab 1'}
                ],
                'friday': [
                    {'start_time': '08:00', 'end_time': '10:00', 'subject': 'Thesis Writing', 'room': 'Library'},
                    {'start_time': '10:00', 'end_time': '12:00', 'subject': 'Internship Program', 'room': 'Various'},
                    {'start_time': '14:00', 'end_time': '17:00', 'subject': 'Laboratory Work', 'room': 'All Labs'}
                ]
            },
            is_active=True,
            created_by='admin'
        )
        
        db.session.add(cs_schedule)
        
        # Update the test student to have a personal schedule as well
        test_student = Student.query.filter_by(uid='TEST123').first()
        if test_student:
            test_student.department = 'CS'
            test_student.year_level = 3
            test_student.section = 'A'
            test_student.schedule = {
                'thursday': [  # Today is Thursday
                    {'start_time': '08:30', 'end_time': '10:00', 'subject': 'Personal Study - Algorithms', 'room': 'Study Hall'},
                    {'start_time': '15:00', 'end_time': '16:30', 'subject': 'Personal Research', 'room': 'Library'}
                ]
            }
        
        db.session.commit()
        print("Test schedule data created successfully!")
        
        # Print the schedule
        schedule = ClassSchedule.query.filter_by(schedule_name='Computer Science Regular Schedule').first()
        if schedule:
            print(f"Created schedule: {schedule.schedule_name}")
            print(f"Department: {schedule.department}, Year: {schedule.year_level}, Section: {schedule.section}")
            
            current_day = datetime.now().strftime('%A').lower()
            print(f"\\nToday's ({current_day.title()}) classes:")
            day_schedule = schedule.schedule_data.get(current_day, [])
            for slot in day_schedule:
                print(f"  {slot['start_time']}-{slot['end_time']}: {slot['subject']} ({slot['room']})")
        
        if test_student:
            print(f"\\nUpdated test student: {test_student.full_name()}")
            print(f"Department: {test_student.department}, Year: {test_student.year_level}, Section: {test_student.section}")

if __name__ == '__main__':
    create_test_schedule_data()