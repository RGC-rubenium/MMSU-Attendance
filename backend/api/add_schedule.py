from models import event_schedule
from extensions import db
from flask import blueprints, jsonify, request
import utils.jwt_utils as jwt_utils

add_schedule_bp = blueprints.Blueprint('add_schedule', __name__)
