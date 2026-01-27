import os
from urllib.parse import quote_plus

# Load environment variables from .env if present
try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

SECRET_KEY = os.environ.get('JWT_SECRET', 'dev-secret-change-me')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRES_MINUTES = int(os.environ.get('JWT_EXPIRES_MINUTES', '60'))

# Database URL: prefer DATABASE_URL env var, fallback to sqlite
SQLALCHEMY_DATABASE_URI =  'postgresql://user1:attendanceatmmsu@192.168.1.200/Attendance'