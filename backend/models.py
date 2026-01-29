from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from extensions import db


class User(db.Model):
    __tablename__ = "user_tb"
    __table_args__ = {'schema': 'attendance'}

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.Text, nullable=False)
    role = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, raw: str):
        self.password = generate_password_hash(raw)

    def check_password(self, raw: str) -> bool:
        return check_password_hash(self.password, raw)

    def get_roles_list(self):
        if not self.role:
            return []
        # support comma-separated roles
        return [r.strip() for r in self.role.split(',') if r.strip()]

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'roles': self.get_roles_list(),
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class Student(db.Model):
    __tablename__ = "students"
    __table_args__ = {'schema': 'attendance'}

    uid = db.Column(db.String(20), primary_key=True)
    id = db.Column(db.String(50), unique=True, nullable=True)
    first_name = db.Column(db.String(50))
    middle_name = db.Column(db.String(50), nullable=True)
    last_name = db.Column(db.String(50))
    department = db.Column(db.String(50))
    year_level = db.Column(db.Integer)
    schedule = db.Column(db.JSON, nullable=True)
    profile_path = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    section = db.Column(db.String(20), nullable=True)
    gender = db.Column(db.String(10), nullable=True)

    def full_name(self):
        parts = [self.first_name, self.middle_name, self.last_name]
        return ' '.join(p for p in parts if p)

    def to_dict(self):
        return {
            'uid': self.uid,
            'id': self.id,
            'fullName': self.full_name(),
            'department': self.department,
            'yearlevel': str(self.year_level) if self.year_level is not None else None,
            'section': self.section,
            'avatar': self.profile_path,
            'gender': self.gender,  
        }


class Faculty(db.Model):
    __tablename__ = "faculty"
    __table_args__ = {'schema': 'attendance'}

    uid = db.Column(db.String(20), primary_key=True)
    id = db.Column(db.String(50), unique=True, nullable=True)
    first_name = db.Column(db.String(50))
    middle_name = db.Column(db.String(50), nullable=True)
    last_name = db.Column(db.String(50))
    department = db.Column(db.String(50))
    profile_path = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    profile_path = db.Column(db.Text, nullable=True)

    def full_name(self):
        parts = [self.first_name, self.middle_name, self.last_name]
        return ' '.join(p for p in parts if p)

    def to_dict(self):
        return {
            'uid': self.uid,
            'facultyId': self.id,
            'fullName': self.full_name(),
            'department': self.department,
            'avatar': self.profile_path,
        }
