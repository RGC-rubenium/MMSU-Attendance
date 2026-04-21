import os
from urllib.parse import quote_plus

#Sqlite credentials
username = 'user1'
password = 'attendanceatmmsu'
ip = '192.168.1.200'
database = 'Attendance'

#Jwt Config
minute = '300'
key = 'dev-secret-change-me'

# Load environment variables from .env file if it exists
try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass


SECRET_KEY = os.environ.get('JWT_SECRET', key)
JWT_ALGORITHM = 'HS256'
# JWT_EXPIRES_MINUTES = int(os.environ.get('JWT_EXPIRES_MINUTES', minute))

# Database URL: prefer DATABASE_URL env var, fallback to sqlite
SQLALCHEMY_DATABASE_URI = f'postgresql://{username}:{password}@{ip}/{database}'