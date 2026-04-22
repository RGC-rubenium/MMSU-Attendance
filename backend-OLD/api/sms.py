

from flask import Blueprint, request, jsonify
import requests
import threading
import time
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
def process_sms_queue():
    from app import app
    with app.app_context():
        while True:
            sms = sms_queue.query.filter_by(status='queued').first()
            time.sleep(1)  # Sleep briefly to prevent tight loop
            if sms:
                success = send_sms(sms.mobile_num, sms.message)
                sms.status = 'sent' if success else 'failed'
                log = SMSLog(
                    mobile_num=sms.mobile_num,
                    message=sms.message,
                    status=sms.status
                )
                db.session.add(log)
                db.session.commit()
            else:
                time.sleep(2)

# Start the worker thread when the app starts
worker_thread = threading.Thread(target=process_sms_queue, daemon=True)
worker_thread.start()

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

    # Add to sms_queue table
    sms_entry = sms_queue(mobile_num=mobile_num, message=msg, status='queued')
    db.session.add(sms_entry)
    db.session.commit()

    return jsonify({
        "success": True,
        "message": "SMS has been queued for sending."
    })