from flask import Flask, jsonify, request
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
import os
import jwt
from datetime import datetime, timedelta

app = Flask(__name__)
CORS(app)

# Configuration
SECRET_KEY = os.environ.get('JWT_SECRET', 'dev-secret-change-me')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRES_MINUTES = int(os.environ.get('JWT_EXPIRES_MINUTES', '60'))

# Sample in-memory users dataset
SAMPLE_USERS = [
    { "id": 100, "studentId": 'S1001', "fullName": 'Maria Reyes', "avatar": 'https://i.pravatar.cc/150?img=12',"yearlevel": '1', "section": 'A', "department": 'BSCPE' },
    { "id": 2, "studentId": 'S1002', "fullName": 'Juan Dela Cruz', "avatar": 'https://i.pravatar.cc/150?img=32',"yearlevel": '2', "section": 'B', "department": 'HR' },
    { "id": 3, "studentId": 'S1003', "fullName": 'Anne Garcia', "avatar": 'https://i.pravatar.cc/150?img=18',"yearlevel": '3', "section": 'C', "department": 'Finance' },
    { "id": 4, "studentId": 'S1004', "fullName": 'Mark Torres', "avatar": 'https://i.pravatar.cc/150?img=24',"yearlevel": '4', "section": 'D', "department":"IT" },
    { "id": 5, "studentId": 'S1005', "fullName": 'Liza Santos', "avatar": 'https://i.pravatar.cc/150?img=8',"yearlevel":"5" ,"section":"E" ,"department":"HR"},
    { "id": 6, "studentId": 'S1006', "fullName": 'Rico Lopez', "avatar": 'https://i.pravatar.cc/150?img=47' ,"yearlevel":"6" ,"section":"F", "department":"Finance" },
    { "id": 7, "studentId": 'S1007', "fullName": 'Cathy Mendoza', "avatar": 'https://i.pravatar.cc/150?img=52' ,"yearlevel":"1" ,"section":"A", "department":"HR" },
    { "id": 8, "studentId": 'S1008', "fullName": 'James Villanueva', "avatar": 'https://i.pravatar.cc/150?img=15' ,"yearlevel":"2" ,"section":"B", "department":"Finance" },
]

# In-memory credentials store (username -> hashed password)
# Replace with a real user table in production
CREDENTIALS = {
    'admin': generate_password_hash('password')
}


def create_jwt(payload: dict) -> str:
    now = datetime.utcnow()
    exp = now + timedelta(minutes=JWT_EXPIRES_MINUTES)
    # include issued-at and expiry claims
    token_payload = {**payload, 'iat': now, 'exp': exp}
    token = jwt.encode(token_payload, SECRET_KEY, algorithm=JWT_ALGORITHM)
    # PyJWT may return bytes in some versions
    if isinstance(token, bytes):
        token = token.decode('utf-8')
    return token


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth = request.headers.get('Authorization', '')
        if not auth or not auth.startswith('Bearer '):
            return jsonify({'message': 'Authorization header missing or invalid'}), 401
        token = auth.split(' ', 1)[1].strip()
        try:
            decoded = jwt.decode(token, SECRET_KEY, algorithms=[JWT_ALGORITHM])
            # attach user info to request for handlers to use
            request.user = decoded
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Invalid token'}), 401
        return f(*args, **kwargs)
    return decorated


# Login Endpoint (uses hashed password + returns JWT)
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'message': 'Username and password are required'}), 400

    hashed = CREDENTIALS.get(username) #get credentials
    if not hashed or not check_password_hash(hashed, password):
        return jsonify({'message': 'Invalid credentials'}), 401

    # create token including roles as an array and return expiry timestamp
    expires_at = datetime.utcnow() + timedelta(minutes=JWT_EXPIRES_MINUTES)
    token = create_jwt({'sub': username, 'roles': ['admin']})
    return jsonify({
        'message': 'Login successful',
        'token': token,
        'expiresAt': expires_at.isoformat(),
        'roles': ['admin']
    }), 200


# Optional: register endpoint for local testing (stores hashed password in-memory)
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    username = data.get('username')
    password = data.get('password')
    if not username or not password:
        return jsonify({'message': 'username and password required'}), 400
    if username in CREDENTIALS:
        return jsonify({'message': 'user already exists'}), 409
    CREDENTIALS[username] = generate_password_hash(password)
    return jsonify({'message': 'user created'}), 201


# Protected Student list Dashboard Endpoint
@app.route('/api/student', methods=['GET'])
@token_required
def get_student_dashboard():
    # request.user contains decoded token info set by token_required
    return jsonify(SAMPLE_USERS), 200


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)