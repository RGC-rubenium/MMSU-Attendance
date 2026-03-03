#!/usr/bin/env python3
"""
Test once-per-day scanning functionality
"""

from app import app
from models import Student, AttendanceLog
from extensions import db
from datetime import datetime, date
import requests
import json

def test_once_per_day_scanning():
    """Test that users can only scan once per day"""
    print("Testing once-per-day scanning functionality...")
    
    # Test student UID (should exist in your test data)
    test_uid = "TEST123"  # Change this to a valid UID in your database
    
    # API endpoint
    url = "http://localhost:5000/api/scanner/rfid-scan"
    headers = {
        "Content-Type": "application/json"
    }
    
    print(f"Testing with UID: {test_uid}")
    
    # First scan - should succeed (time in)
    print("\n1. First scan (time in):")
    response1 = requests.post(url, 
                             headers=headers, 
                             json={"uid": test_uid})
    
    print(f"Status Code: {response1.status_code}")
    try:
        data1 = response1.json()
        print(f"Response: {json.dumps(data1, indent=2)}")
        
        if data1.get('success'):
            print("✓ First scan successful - Time In recorded")
        else:
            print(f"✗ First scan failed: {data1.get('message')}")
    except:
        print(f"✗ Invalid JSON response: {response1.text}")
    
    # Second scan - should succeed (time out)
    print("\n2. Second scan (time out):")
    response2 = requests.post(url, 
                             headers=headers, 
                             json={"uid": test_uid})
    
    print(f"Status Code: {response2.status_code}")
    try:
        data2 = response2.json()
        print(f"Response: {json.dumps(data2, indent=2)}")
        
        if data2.get('success') and data2.get('action') == 'time_out':
            print("✓ Second scan successful - Time Out recorded")
        else:
            print(f"✗ Second scan failed or unexpected action: {data2.get('message')}")
    except:
        print(f"✗ Invalid JSON response: {response2.text}")
    
    # Third scan - should fail (already scanned today)
    print("\n3. Third scan (should be blocked):")
    response3 = requests.post(url, 
                             headers=headers, 
                             json={"uid": test_uid})
    
    print(f"Status Code: {response3.status_code}")
    try:
        data3 = response3.json()
        print(f"Response: {json.dumps(data3, indent=2)}")
        
        if not data3.get('success') and "already scanned today" in data3.get('message', '').lower():
            print("✓ Third scan correctly blocked - Once per day restriction working")
        else:
            print(f"✗ Third scan should have been blocked: {data3.get('message')}")
    except:
        print(f"✗ Invalid JSON response: {response3.text}")

def clean_up_test_data():
    """Clean up test attendance logs for today"""
    with app.app_context():
        today = date.today()
        today_start = datetime.combine(today, datetime.min.time())
        today_end = datetime.combine(today, datetime.max.time())
        
        # Delete attendance logs for today
        test_logs = AttendanceLog.query.filter(
            AttendanceLog.uid == "TEST123",
            AttendanceLog.created_at >= today_start,
            AttendanceLog.created_at <= today_end
        ).all()
        
        for log in test_logs:
            db.session.delete(log)
        
        db.session.commit()
        print(f"Cleaned up {len(test_logs)} test attendance logs for today")

if __name__ == '__main__':
    # Make sure you have a running Flask server before running this test
    # You can run: python app.py
    
    print("Make sure Flask server is running on localhost:5000")
    print("If you need to clean up test data first, uncomment the line below:")
    # clean_up_test_data()
    
    try:
        test_once_per_day_scanning()
    except requests.exceptions.ConnectionError:
        print("\n✗ Connection error: Please start the Flask server first")
        print("Run: python app.py")
    except Exception as e:
        print(f"\n✗ Error: {e}")