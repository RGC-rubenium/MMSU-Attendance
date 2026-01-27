from app import app
from extensions import db
from models import User, Student, Faculty


def run_seed():
    with app.app_context():
        print('Creating database tables (if missing)...')
        db.create_all()

        if not User.query.filter_by(username='admin').first():
            admin = User(username='admin')
            admin.set_password('password')
            admin.role = 'admin'
            db.session.add(admin)
            print('Added admin user (username=admin, password=password)')

        if not Student.query.first():
            s = Student(
                uid='S1001',
                id='S1001',
                first_name='Maria',
                middle_name='R.',
                last_name='Reyes',
                department='BSCPE',
                year_level=1,
                profile_path='https://i.pravatar.cc/150?img=12'
            )
            db.session.add(s)
            print('Added sample student')

        if not Faculty.query.first():
            f = Faculty(
                uid='F1001',
                id='F1001',
                first_name='John',
                middle_name='Q.',
                last_name='Doe',
                department='IT',
                profile_path='https://i.pravatar.cc/150?img=32'
            )
            db.session.add(f)
            print('Added sample faculty')

        db.session.commit()
        print('Seed complete')


if __name__ == '__main__':
    run_seed()
