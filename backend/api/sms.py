

from flask import Blueprint, request, jsonify
import requests
import threading
import time
import os
from models import sms_queue, SMSLog
from extensions import db

sms_bp = Blueprint('sms', __name__)

# Function to send SMS using the external API
def send_sms(mobile_num, msg):
    country_code = "+63"  # Philippine country code
    api_url = "http://192.168.1.191:8080/message" 
    user = "sms"
    pswrd = "rgc#2004"
    payload = {
        "textMessage": {
            "text": msg,
        },
        "phoneNumbers": [f"{country_code}{mobile_num}"]
    }
    try:
        response = requests.post(api_url, json=payload, auth=(user, pswrd))
        response.raise_for_status()
    except Exception as e:
        print(f"Error sending SMS: {e}")
        return False
    return True

# Background worker to process queued SMS
def process_sms_queue(app):
    # Accept the Flask `app` object so the worker runs inside its context.
    with app.app_context():
        while True:
            sms = sms_queue.query.filter_by(status='queued').first()
            time.sleep(1)  # Sleep briefly to prevent tight loop
            if sms:
                # Mark as 'sending' immediately to avoid races across workers
                try:
                    sms.status = 'sending'
                    db.session.add(sms)
                    db.session.commit()
                except Exception:
                    db.session.rollback()

                # Attempt to send
                try:
                    success = send_sms(sms.mobile_num, sms.message)
                    sms.status = 'sent' if success else 'failed'
                except Exception:
                    sms.status = 'failed'

                # Log the attempt
                log = SMSLog(
                    mobile_num=sms.mobile_num,
                    message=sms.message,
                    status=sms.status
                )
                try:
                    db.session.add(log)
                    db.session.add(sms)
                    db.session.commit()
                except Exception:
                    db.session.rollback()
            else:
                time.sleep(2)


# Register a startup hook when the blueprint is registered on an app.
def _register_worker(state):
    app = state.app
    # When running with the Flask dev server and the reloader enabled, the
    # process may import modules twice (master and child). Only start the
    # background thread in the actual serving process (WERKZEUG_RUN_MAIN == 'true').
    if app.debug and os.environ.get('WERKZEUG_RUN_MAIN') != 'true':
        return

    thread = threading.Thread(target=lambda: process_sms_queue(app), daemon=True)
    thread.start()


sms_bp.record(_register_worker)

@sms_bp.route('/send_sms', methods=['POST'])
def queue_sms():
    data = request.get_json()
    mobile_num = data.get('mobile_num')
    student_name = data.get('student_name')
    attendance_type = data.get('attendance_type')  # 'timein' or 'timeout'
    attendance_time = data.get('attendance_time')  # should be a string, e.g., '2026-04-17 08:00:00'

    if not mobile_num or not student_name or not attendance_type or not attendance_time:
        return jsonify({"success": False, "message": "Missing parameters"}), 400

    # Format the message
    msg = f"{student_name} has {attendance_type} at {attendance_time}"

    # Send immediately (bypass local queue) and log the attempt
    try:
        success = send_sms(mobile_num, msg)
    except Exception as e:
        success = False

    status = 'sent' if success else 'failed'
    log = SMSLog(mobile_num=mobile_num, message=msg, status=status)
    try:
        db.session.add(log)
        db.session.commit()
    except Exception:
        db.session.rollback()

    return jsonify({
        "success": success,
        "status": status,
        "message": "SMS sent" if success else "SMS failed to send"
    })