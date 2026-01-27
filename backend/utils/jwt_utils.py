import jwt
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify
import config


def create_jwt(payload: dict) -> str:
    now = datetime.utcnow()
    exp = now + timedelta(minutes=config.JWT_EXPIRES_MINUTES)
    token_payload = {**payload, 'iat': now, 'exp': exp}
    token = jwt.encode(token_payload, config.SECRET_KEY, algorithm=config.JWT_ALGORITHM)
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
            decoded = jwt.decode(token, config.SECRET_KEY, algorithms=[config.JWT_ALGORITHM])
            request.user = decoded
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Invalid token'}), 401
        return f(*args, **kwargs)
    return decorated
