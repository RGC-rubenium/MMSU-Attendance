from flask import Blueprint, jsonify, request
from models import Student
import utils.jwt_utils as jwt_utils

students_delete_bp = Blueprint('students delete', __name__)
@students_delete_bp.route('/student/<string:student_id>', methods=['DELETE'])
@jwt_utils.token_required

def delete_student(student_id):
    pass