from flask import Blueprint, jsonify, request
from models import Faculty
import utils.jwt_utils as jwt_utils

faculty_bp = Blueprint('faculty', __name__)


@faculty_bp.route('/faculty', methods=['GET'])
@jwt_utils.token_required
def list_faculty():
    q = (request.args.get('q') or '').strip().lower()
    query = Faculty.query
    if q:
        like = f"%{q}%"
        query = query.filter(
            (Faculty.first_name.ilike(like)) |
            (Faculty.last_name.ilike(like)) |
            (Faculty.department.ilike(like))
        )
    items = query.all()
    return jsonify([f.to_dict() for f in items])


@faculty_bp.route('/faculty/<string:uid>', methods=['GET'])
@jwt_utils.token_required
def get_faculty(uid):
    f = Faculty.query.get(uid)
    if not f:
        return jsonify({'message': 'not found'}), 404
    return jsonify(f.to_dict())
