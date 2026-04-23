import jwt
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify
import config


def create_jwt(payload: dict) -> str:
    token_payload = {**payload}
    # add expiry (7 days) if not present
    if 'exp' not in token_payload:
        token_payload['exp'] = datetime.utcnow() + timedelta(days=7)
    token = jwt.encode(token_payload, config.SECRET_KEY, algorithm=config.JWT_ALGORITHM)
    if isinstance(token, bytes):
        token = token.decode('utf-8')
    return token


def decode_jwt(token: str):
    try:
        return jwt.decode(token, config.SECRET_KEY, algorithms=[config.JWT_ALGORITHM])
    except Exception:
        return None


def get_roles_from_token(token: str):
    payload = decode_jwt(token)
    if not payload:
        return []
    roles = payload.get('roles') or payload.get('role') or []
    if isinstance(roles, str):
        return [r.strip() for r in roles.split(',') if r.strip()]
    if isinstance(roles, list):
        return roles
    return []


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth = request.headers.get('Authorization', '')
        if not auth or not auth.startswith('Bearer '):
            return jsonify({'message': 'Authorization header missing or invalid'}), 401
        token = auth.split(' ', 1)[1].strip()
        try:
            decoded = jwt.decode(token, config.SECRET_KEY, algorithms=[config.JWT_ALGORITHM])
            # normalize roles to always be list under 'roles'
            roles = decoded.get('roles') or decoded.get('role') or []
            if isinstance(roles, str):
                roles = [r.strip() for r in roles.split(',') if r.strip()]
            decoded['roles'] = roles
            request.user = decoded
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Invalid token'}), 401
        return f(*args, **kwargs)
    return decorated
