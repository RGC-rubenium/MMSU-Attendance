from flask import Blueprint, request, jsonify
from extensions import db
from models import User
import utils.jwt_utils as jwt_utils

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

    token = jwt_utils.create_jwt({'sub': user.username, 'roles': user.get_roles_list()})
    return jsonify({
        'message': 'Login successful',
        'token': token,
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
    # Only allow admin role by default for self-registration.
    # Disallow creating or assigning 'superadmin' or any non-admin roles via this endpoint.
    roles = data.get('roles') or data.get('role') or 'admin'
    # normalize
    if isinstance(roles, list):
        roles_list = [r.strip() for r in roles if r]
    else:
        roles_list = [r.strip() for r in str(roles).split(',') if r.strip()]

    # allowed roles for this endpoint (users can only self-create admin accounts)
    allowed = {'admin'}
    if any(r not in allowed for r in roles_list):
        return jsonify({'message': 'Invalid role(s) provided'}), 400
    u.role = ','.join(roles_list)
    db.session.add(u)
    db.session.commit()
    return jsonify({'message': 'user created'}), 201


@auth_bp.route('/account-settings', methods=['GET'])
@jwt_utils.token_required
def get_account_settings():
    current_username = (getattr(request, 'user', {}) or {}).get('sub')
    if not current_username:
        return jsonify({'message': 'Invalid token payload'}), 401

    user = User.query.filter_by(username=current_username).first()
    if not user:
        return jsonify({'message': 'User not found'}), 404

    return jsonify({
        'account': user.to_dict()
    }), 200


@auth_bp.route('/account-settings', methods=['PUT'])
@jwt_utils.token_required
def update_account_settings():
    token_payload = getattr(request, 'user', {}) or {}
    current_username = token_payload.get('sub')
    current_roles = token_payload.get('roles') or []

    if not current_username:
        return jsonify({'message': 'Invalid token payload'}), 401

    if 'admin' not in current_roles:
        return jsonify({'message': 'Only admins can update account settings'}), 403

    user = User.query.filter_by(username=current_username).first()
    if not user:
        return jsonify({'message': 'User not found'}), 404

    data = request.get_json() or {}
    new_username = (data.get('username') or '').strip()
    current_password = data.get('current_password') or ''
    new_password = data.get('new_password') or ''

    if not new_username and not new_password:
        return jsonify({'message': 'Provide a new username or password'}), 400

    if not current_password:
        return jsonify({'message': 'Current password is required'}), 400

    if not user.check_password(current_password):
        return jsonify({'message': 'Current password is incorrect'}), 401

    if new_username:
        existing_user = User.query.filter_by(username=new_username).first()
        if existing_user and existing_user.id != user.id:
            return jsonify({'message': 'Username is already taken'}), 409
        user.username = new_username

    if new_password:
        if len(new_password) < 8:
            return jsonify({'message': 'New password must be at least 8 characters long'}), 400
        user.set_password(new_password)

    db.session.commit()

    return jsonify({
        'message': 'Account settings updated successfully',
        'account': user.to_dict()
    }), 200
