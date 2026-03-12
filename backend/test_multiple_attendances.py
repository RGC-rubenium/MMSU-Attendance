#!/usr/bin/env python3
"""
Test script to verify multiple attendances per day functionality
"""

from app import app
from models import Student, AttendanceLog
from extensions import db
from datetime import datetime, date
import requests
import json
import time

def test_multiple_attendances():
    """Test that users can now scan multiple times per day"""
    print("=== TESTING MULTIPLE ATTENDANCES PER DAY ===\n")
    
    # Test with a specific UID (adjust if needed)
    test_uid = "0637611191"  # Change this to an existing UID in your system
    base_url = "http://localhost:5000"
    
    print(f"Testing with UID: {test_uid}")
    print("Make sure Flask server is running on localhost:5000\n")
    
    try:
        # First scan - should create first attendance
        print("🔄 FIRST SCAN...")
        response1 = requests.post(f"{base_url}/api/scanner/rfid-scan", 
                                 json={"uid": test_uid})
        data1 = response1.json()
        print(f"Response: {response1.status_code}")
        print(f"Success: {data1.get('success')}")
        print(f"Action: {data1.get('action')}")
        print(f"Message: {data1.get('message', 'No message')}")
        
        if data1.get('success'):
            print("✓ First scan successful (time-in)")
        else:
            print(f"✗ First scan failed: {data1.get('message')}")
            return
        
        # Wait a moment
        time.sleep(2)
        
        # Second scan - should complete first attendance (time-out)
        print("\n🔄 SECOND SCAN...")
        response2 = requests.post(f"{base_url}/api/scanner/rfid-scan", 
                                 json={"uid": test_uid})
        data2 = response2.json()
        print(f"Response: {response2.status_code}")
        print(f"Success: {data2.get('success')}")
        print(f"Action: {data2.get('action')}")
        print(f"Message: {data2.get('message', 'No message')}")
        
        if data2.get('success') and data2.get('action') == 'time_out':
            print("✓ Second scan successful (time-out)")
        else:
            print(f"✗ Second scan failed or unexpected action: {data2.get('message')}")
        
        # Wait a moment
        time.sleep(2)
        
        # Third scan - should create NEW attendance (time-in again)
        print("\n🔄 THIRD SCAN...")
        response3 = requests.post(f"{base_url}/api/scanner/rfid-scan", 
                                 json={"uid": test_uid})
        data3 = response3.json()
        print(f"Response: {response3.status_code}")
        print(f"Success: {data3.get('success')}")
        print(f"Action: {data3.get('action')}")
        print(f"Message: {data3.get('message', 'No message')}")
        
        if data3.get('success') and data3.get('action') == 'time_in':
            print("✓ Third scan successful - NEW time-in allowed!")
            print("✅ MULTIPLE ATTENDANCES PER DAY WORKING!")
        elif not data3.get('success') and "already completed" in data3.get('message', '').lower():
            print("✗ Third scan blocked - Still enforcing once per day restriction")
            print("❌ MULTIPLE ATTENDANCES NOT WORKING")
        else:
            print(f"✗ Third scan unexpected result: {data3.get('message')}")
        
        # Wait a moment
        time.sleep(2)
        
        # Fourth scan - should complete second attendance (time-out again)
        print("\n🔄 FOURTH SCAN...")
        response4 = requests.post(f"{base_url}/api/scanner/rfid-scan", 
                                 json={"uid": test_uid})
        data4 = response4.json()
        print(f"Response: {response4.status_code}")
        print(f"Success: {data4.get('success')}")
        print(f"Action: {data4.get('action')}")
        print(f"Message: {data4.get('message', 'No message')}")
        
        if data4.get('success') and data4.get('action') == 'time_out':
            print("✓ Fourth scan successful (second time-out)")
        else:
            print(f"✗ Fourth scan failed or unexpected action: {data4.get('message')}")
        
        print("\n=== TEST SUMMARY ===")
        print("Expected behavior with multiple attendances enabled:")
        print("1. First scan: ✅ TIME IN (new session)")
        print("2. Second scan: ✅ TIME OUT (complete session)")  
        print("3. Third scan: ✅ TIME IN (new session)")
        print("4. Fourth scan: ✅ TIME OUT (complete session)")
        print("\nThis allows multiple attendance sessions per day!")
        
    except requests.exceptions.ConnectionError:
        print("✗ Connection error: Please start the Flask server first")
        print("Run: python app.py")
    except Exception as e:
        print(f"✗ Error: {e}")

def check_todays_logs(uid):
    """Check today's attendance logs for the test user"""
    print(f"\n=== TODAY'S ATTENDANCE LOGS FOR UID: {uid} ===")
    
    with app.app_context():
        today = date.today()
        today_start = datetime.combine(today, datetime.min.time())
        today_end = datetime.combine(today, datetime.max.time())
        
        logs = AttendanceLog.query.filter(
            AttendanceLog.uid == uid,
            AttendanceLog.time_in >= today_start,
            AttendanceLog.time_in <= today_end
        ).order_by(AttendanceLog.time_in.asc()).all()
        
        print(f"Total attendance records for today: {len(logs)}\n")
        
        for i, log in enumerate(logs, 1):
            status = "COMPLETE" if log.time_out else "ACTIVE"
            print(f"📋 Record #{i} (ID: {log.id})")
            print(f"   Time In:  {log.time_in}")
            print(f"   Time Out: {log.time_out or 'Not set'}")
            print(f"   Status:   {status}")
            print(f"   Schedule: {log.schedule_name}")
            print()

if __name__ == '__main__':
    test_uid = "0637611191"  # Adjust this to match your test data
    
    print("🧪 MULTIPLE ATTENDANCES TEST")
    print("=" * 50)
    
    # Check current state
    check_todays_logs(test_uid)
    
    # Run the test
    test_multiple_attendances()
    
    # Check final state
    check_todays_logs(test_uid)