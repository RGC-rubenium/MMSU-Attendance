from flask import Blueprint, request, jsonify
from extensions import db
from models import User
import utils.jwt_utils as jwt_utils

user_mgmt_bp = Blueprint('user_mgmt', __name__)


def _roles_from_payload():
    payload = getattr(request, 'user', {}) or {}
    return payload.get('roles') or []


@user_mgmt_bp.route('/users', methods=['GET'])
@jwt_utils.token_required
def list_users():
    current_roles = _roles_from_payload()
    if 'superadmin' not in current_roles:
        return jsonify({'message': 'Only superadmin can list users'}), 403

    # return users that are admin-related (admin or superadmin)
    users = User.query.order_by(User.created_at.desc()).all()
    result = [u.to_dict() for u in users]
    return jsonify({'users': result}), 200


@user_mgmt_bp.route('/users', methods=['POST'])
@jwt_utils.token_required
def create_user():
    current_roles = _roles_from_payload()
    if 'superadmin' not in current_roles:
        return jsonify({'message': 'Only superadmin can create admin users'}), 403

    data = request.get_json() or {}
    username = (data.get('username') or '').strip()
    password = data.get('password') or ''
    roles = data.get('roles') or data.get('role') or 'admin'
    if not username or not password:
        return jsonify({'message': 'username and password required'}), 400
    if User.query.filter_by(username=username).first():
        return jsonify({'message': 'user already exists'}), 409

    # normalize roles into a list
    if isinstance(roles, list):
        roles_list = [r.strip() for r in roles if r]
    else:
        roles_list = [r.strip() for r in str(roles).split(',') if r.strip()]

    # allowed roles that can be created/assigned by superadmin via this endpoint
    allowed = {'admin'}
    # superadmin endpoint cannot be used to create other role types like 'student' or 'faculty'
    if any(r not in allowed for r in roles_list):
        return jsonify({'message': 'Invalid role(s). Only admin role is allowed here.'}), 400

    roles_str = ','.join(roles_list)

    u = User(username=username)
    u.set_password(password)
    u.role = roles_str
    db.session.add(u)
    db.session.commit()
    return jsonify({'message': 'user created', 'user': u.to_dict()}), 201


@user_mgmt_bp.route('/users/<int:user_id>', methods=['PUT'])
@jwt_utils.token_required
def update_user(user_id):
    current_roles = _roles_from_payload()
    if 'superadmin' not in current_roles:
        return jsonify({'message': 'Only superadmin can update users'}), 403

    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404

    data = request.get_json() or {}
    username = data.get('username')
    password = data.get('password')
    roles = data.get('roles') or data.get('role')

    if username:
        username = username.strip()
        if User.query.filter(User.username == username, User.id != user.id).first():
            return jsonify({'message': 'Username already taken'}), 409
        user.username = username

    if password:
        user.set_password(password)

    if roles is not None:
        # normalize incoming roles
        if isinstance(roles, list):
            roles_list = [r.strip() for r in roles if r]
        else:
            roles_list = [r.strip() for r in str(roles).split(',') if r.strip()]

        allowed = {'admin'}
        if any(r not in allowed for r in roles_list):
            return jsonify({'message': 'Invalid role(s). Only admin role is allowed.'}), 400

        user.role = ','.join(roles_list)

    db.session.commit()
    return jsonify({'message': 'User updated', 'user': user.to_dict()}), 200


@user_mgmt_bp.route('/users/<int:user_id>', methods=['DELETE'])
@jwt_utils.token_required
def delete_user(user_id):
    current_roles = _roles_from_payload()
    if 'superadmin' not in current_roles:
        return jsonify({'message': 'Only superadmin can delete users'}), 403

    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404

    # Prevent deleting superadmin accounts
    if 'superadmin' in user.get_roles_list():
        return jsonify({'message': 'Cannot delete a superadmin account'}), 403

    db.session.delete(user)
    db.session.commit()
    return jsonify({'message': 'User deleted'}), 200
