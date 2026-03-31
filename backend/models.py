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

    uid = db.Column(db.String(36), primary_key=True) 
    id = db.Column(db.String(50), unique=True, nullable=True)
    first_name = db.Column(db.String(100)) 
    middle_name = db.Column(db.String(100), nullable=True)
    last_name = db.Column(db.String(100))
    department = db.Column(db.String(100)) 
    year_level = db.Column(db.Integer)
    schedule = db.Column(db.JSON, nullable=True)
    profile_path = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    section = db.Column(db.String(20), nullable=True)
    gender = db.Column(db.String(20), nullable=True)
    schedule = db.Column(db.JSON, nullable=True)
    parent_contact = db.Column(db.String(20), nullable=True)

    def full_name(self):
        parts = [self.first_name, self.middle_name, self.last_name]
        return ' '.join(p for p in parts if p)

    def to_dict(self):
        return {
            'uid': self.uid,
            'id': self.id,
            'first_name': self.first_name,
            'middle_name': self.middle_name,
            'last_name': self.last_name,
            'fullName': self.full_name(),
            'department': self.department,
            'yearlevel': str(self.year_level) if self.year_level is not None else None,
            'section': self.section,
            'avatar': self.profile_path,
            'gender': self.gender,
            'profile_path': self.profile_path
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
    gender = db.Column(db.String(10), nullable=True)
    def full_name(self):
        parts = [self.first_name, self.middle_name, self.last_name]
        return ' '.join(p for p in parts if p)

    def to_dict(self):
        return {
            'uid': self.uid,
            'id': self.id,
            'first_name': self.first_name,
            'middle_name': self.middle_name,
            'last_name': self.last_name,
            'fullName': self.full_name(),
            'department': self.department,
            'avatar': self.profile_path,
            'gender': self.gender,
            'profile_path': self.profile_path
        }

class EventSchedule(db.Model):
    __tablename__ = "event_schedule"
    __table_args__ = {'schema': 'attendance'}

    id = db.Column(db.Integer, primary_key=True)
    event_name = db.Column(db.String(100), nullable=False)
    event_date = db.Column(db.Date, nullable=False)
    schedule = db.Column(db.JSON, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'event_name': self.event_name,
            'event_date': self.event_date.isoformat() if self.event_date else None,
            'schedule': self.schedule,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class ClassSchedule(db.Model):
    __tablename__ = "class_schedule"
    __table_args__ = {'schema': 'attendance'}

    id = db.Column(db.Integer, primary_key=True)
    schedule_name = db.Column(db.String(100), nullable=False)
    department = db.Column(db.String(50), nullable=True)
    year_level = db.Column(db.Integer, nullable=True)
    section = db.Column(db.String(20), nullable=True)
    schedule_data = db.Column(db.JSON, nullable=False)  # Weekly schedule with days and time slots
    description = db.Column(db.Text, nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    created_by = db.Column(db.String(50), nullable=True)  # Faculty/Admin who created
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'schedule_name': self.schedule_name,
            'department': self.department,
            'year_level': self.year_level,
            'section': self.section,
            'schedule_data': self.schedule_data,
            'description': self.description,
            'is_active': self.is_active,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class AttendanceLog(db.Model):
    __tablename__ = "attendance_logs"
    __table_args__ = (
        # Composite index for the most common query: date range + filters
        db.Index('ix_alog_time_in',       'time_in'),
        db.Index('ix_alog_user_type',     'user_type'),
        db.Index('ix_alog_status',        'status'),
        db.Index('ix_alog_department',    'department'),
        db.Index('ix_alog_uid',           'uid'),
        # Composite: date range filtered by user_type (most common combo)
        db.Index('ix_alog_timein_utype',  'time_in', 'user_type'),
        {'schema': 'attendance'},
    )

    id = db.Column(db.Integer, primary_key=True)
    uid = db.Column(db.String(36), nullable=False)
    user_type = db.Column(db.String(20), nullable=False)  # 'student' or 'faculty'
    user_id = db.Column(db.String(50), nullable=True)  # Student/Faculty ID
    full_name = db.Column(db.String(200), nullable=False)
    department = db.Column(db.String(100), nullable=True)
    schedule_type = db.Column(db.String(20), nullable=False)  # 'default', 'event', 'student'
    schedule_name = db.Column(db.String(100), nullable=True)
    time_in = db.Column(db.DateTime, nullable=False)
    time_out = db.Column(db.DateTime, nullable=True)
    status = db.Column(db.String(20), default='incomplete') 
    subjects_attended = db.Column(db.JSON, nullable=True)  # List of subjects attended during time-in to time-out
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'uid': self.uid,
            'user_type': self.user_type,
            'user_id': self.user_id,
            'full_name': self.full_name,
            'department': self.department,
            'schedule_type': self.schedule_type,
            'schedule_name': self.schedule_name,
            'time_in': self.time_in.isoformat() if self.time_in else None,
            'time_out': self.time_out.isoformat() if self.time_out else None,
            'status': self.status,
            'subjects_attended': self.subjects_attended,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class RpiDevice(db.Model):
    __tablename__ = "rpi_devices"
    __table_args__ = {'schema': 'attendance'}

    id = db.Column(db.Integer, primary_key=True)
    device_id = db.Column(db.String(50), unique=True, nullable=False)  # Unique identifier for RPi
    device_name = db.Column(db.String(100), nullable=False)
    mac_address = db.Column(db.String(17), nullable=True)  # MAC address for identification
    ip_address = db.Column(db.String(15), nullable=True)  # Current IP address
    location = db.Column(db.String(200), nullable=True)  # Physical location description
    
    # Pairing and status
    is_paired = db.Column(db.Boolean, default=False)
    is_online = db.Column(db.Boolean, default=False)
    last_heartbeat = db.Column(db.DateTime, nullable=True)
    pairing_code = db.Column(db.String(10), nullable=True)  # Temporary pairing code
    pairing_expires = db.Column(db.DateTime, nullable=True)
    
    # Configuration
    config_data = db.Column(db.JSON, nullable=True)  # Scanner configuration
    is_enabled = db.Column(db.Boolean, default=True)
    scanner_mode = db.Column(db.String(20), default='both')  # 'time_in', 'time_out', 'both'
    
    # Metadata
    paired_at = db.Column(db.DateTime, nullable=True)
    paired_by = db.Column(db.String(50), nullable=True)  # Admin who approved pairing
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'device_id': self.device_id,
            'device_name': self.device_name,
            'mac_address': self.mac_address,
            'ip_address': self.ip_address,
            'location': self.location,
            'is_paired': self.is_paired,
            'is_online': self.is_online,
            'last_heartbeat': self.last_heartbeat.isoformat() if self.last_heartbeat else None,
            'config_data': self.config_data,
            'is_enabled': self.is_enabled,
            'scanner_mode': self.scanner_mode,
            'paired_at': self.paired_at.isoformat() if self.paired_at else None,
            'paired_by': self.paired_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    def is_heartbeat_recent(self, timeout_minutes=5):
        """Check if device heartbeat is recent"""
        if not self.last_heartbeat:
            return False
        from datetime import timedelta
        threshold = datetime.utcnow() - timedelta(minutes=timeout_minutes)
        return self.last_heartbeat > threshold


class PairingRequest(db.Model):
    __tablename__ = "pairing_requests"
    __table_args__ = {'schema': 'attendance'}

    id = db.Column(db.Integer, primary_key=True)
    device_id = db.Column(db.String(50), nullable=False)
    device_name = db.Column(db.String(100), nullable=False)
    mac_address = db.Column(db.String(17), nullable=True)
    ip_address = db.Column(db.String(15), nullable=True)
    location = db.Column(db.String(200), nullable=True)
    
    # Request details
    pairing_code = db.Column(db.String(10), nullable=False)
    status = db.Column(db.String(20), default='pending')  # 'pending', 'approved', 'rejected'
    
    # Admin response
    reviewed_by = db.Column(db.String(50), nullable=True)
    reviewed_at = db.Column(db.DateTime, nullable=True)
    rejection_reason = db.Column(db.Text, nullable=True)
    
    # Metadata
    expires_at = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'device_id': self.device_id,
            'device_name': self.device_name,
            'mac_address': self.mac_address,
            'ip_address': self.ip_address,
            'location': self.location,
            'pairing_code': self.pairing_code,
            'status': self.status,
            'reviewed_by': self.reviewed_by,
            'reviewed_at': self.reviewed_at.isoformat() if self.reviewed_at else None,
            'rejection_reason': self.rejection_reason,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    def is_expired(self):
        """Check if pairing request has expired"""
        return datetime.utcnow() > self.expires_at


class Camera(db.Model):
    """Model for surveillance cameras with RTSP support"""
    __tablename__ = "cameras"
    __table_args__ = {'schema': 'attendance'}

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    rtsp_url = db.Column(db.Text, nullable=False)  # RTSP URL for the camera stream
    location = db.Column(db.String(200), nullable=True)  # Physical location description
    description = db.Column(db.Text, nullable=True)
    
    # Camera settings
    is_active = db.Column(db.Boolean, default=True)
    is_online = db.Column(db.Boolean, default=False)
    last_check = db.Column(db.DateTime, nullable=True)
    
    # Display settings
    grid_position = db.Column(db.Integer, nullable=True)  # Position in the grid view
    
    # Metadata
    created_by = db.Column(db.String(50), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'rtsp_url': self.rtsp_url,
            'location': self.location,
            'description': self.description,
            'is_active': self.is_active,
            'is_online': self.is_online,
            'last_check': self.last_check.isoformat() if self.last_check else None,
            'grid_position': self.grid_position,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }