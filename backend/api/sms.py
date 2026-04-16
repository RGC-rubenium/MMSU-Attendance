
from flask import Blueprint, request, jsonify
from rq import Queue
from redis import Redis

import requests

sms_bp = Blueprint('sms', __name__)
redis_conn = Redis(host='localhost', port=6379)
sms_queue = Queue('sms', connection=redis_conn)
# Function to send SMS using the external API
def send_sms(mobile_num, msg):
    country_code = "+63"  # Philippine country code
    api_url = "http://192.168.1.191:8080/sms/send"  # Replace with your actual API endpoint
    user = "sms"
    pswrd = "rgc#2004"  # Replace with your actual password
    payload = {
        "textMessage":
        {
            "text": msg,
        },
        "phoneNumber":[f"{country_code}{mobile_num}"]
    }
    try:
        response = requests.post(api_url, json=payload, auth=(user, pswrd))
    except Exception as e:
        print(f"Error sending SMS: {e}")
        return False
    
    return True
    
@sms_bp.route('/send_sms', methods=['POST'])
# Endpoint to queue an SMS for sending
def queue_sms():
    
    return_msg ={
        "success": "True",
        "message": "SMS has been queued for sending."
    }
    return jsonify(return_msg)