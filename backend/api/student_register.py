from flask import blueprints, jsonify, request
from models import Student
import utils.jwt_utils as jwt_utils

student_register_bp = blueprints.Blueprint('students register', __name__)
@student_register_bp.route('/student/register', methods=['POST'])
# @jwt_utils.token_required
def register_student():
    pass