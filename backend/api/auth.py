from flask import Blueprint, request, jsonify
from extensions import db
from models import User
import utils.jwt_utils as jwt_utils
from utils.auth import hash_password
from datetime import datetime, timedelta
import config

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    username = data.get('username')
    password = data.get('password')
    if not username or not password:
        return jsonify({'message': 'username and password required'}), 400
    user = User.query.filter_by(username=username).first()
    if not user or not user.check_password(password):
        return jsonify({'message': 'Invalid credentials'}), 401

    expires_at = datetime.utcnow() + timedelta(minutes=config.JWT_EXPIRES_MINUTES)
    token = jwt_utils.create_jwt({'sub': user.username, 'roles': user.get_roles_list()})
    return jsonify({
        'message': 'Login successful',
        'token': token,
        'expiresAt': expires_at.isoformat(),
        'roles': user.get_roles_list()
    }), 200


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    username = data.get('username')
    password = data.get('password')
    if not username or not password:
        return jsonify({'message': 'username and password required'}), 400
    if User.query.filter_by(username=username).first():
        return jsonify({'message': 'user already exists'}), 409
    u = User(username=username)
    u.set_password(password)
    # default to 'student' role unless client provided another
    u.roles = data.get('roles') or 'student'
    db.session.add(u)
    db.session.commit()
    return jsonify({'message': 'user created'}), 201
