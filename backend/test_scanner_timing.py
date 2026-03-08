#!/usr/bin/env python3
"""
Test script to verify scanner timing configurations work correctly
"""

from datetime import datetime, time as datetime_time
from scanner_config import SCANNER_CONFIG, DEFAULT_SCHEDULE_CONFIG

def test_time_in_range(current_time_str, start_time_str, end_time_str):
    """Test version of check_time_in_range function"""
    try:
        current_time = datetime.strptime(current_time_str, '%H:%M').time()
        start_time = datetime.strptime(start_time_str, '%H:%M').time()
        end_time = datetime.strptime(end_time_str, '%H:%M').time()
        return start_time <= current_time <= end_time
    except:
        return False

def test_scanner_availability():
    """Test scanner availability at different times"""
    print("🧪 Testing Scanner Availability Times\n")
    
    # Test times
    test_times = [
        "05:30",  # Before allowed time
        "06:00",  # Start time (should work now)
        "07:00",  # Previous start time
        "07:30",  # Your problematic time-in window
        "08:00",  # Your problematic time-out window
        "08:30",  # After 8am
        "12:00",  # Midday
        "18:00",  # Evening
        "22:00",  # End time for students
        "22:30",  # After student hours
        "23:00"   # Late night
    ]
    
    student_config = SCANNER_CONFIG['student_scanner_hours']['weekdays']
    faculty_config = SCANNER_CONFIG['faculty_scanner_hours']['weekdays']
    
    print("📅 WEEKDAY SCANNER AVAILABILITY:")
    print(f"Student Hours: {student_config['start_time']} - {student_config['end_time']}")
    print(f"Faculty Hours: {faculty_config['start_time']} - {faculty_config['end_time']}")
    print()
    
    for test_time in test_times:
        student_allowed = test_time_in_range(test_time, student_config['start_time'], student_config['end_time'])
        faculty_allowed = test_time_in_range(test_time, faculty_config['start_time'], faculty_config['end_time'])
        
        student_status = "✅ ALLOWED" if student_allowed else "❌ BLOCKED"
        faculty_status = "✅ ALLOWED" if faculty_allowed else "❌ BLOCKED"
        
        print(f"⏰ {test_time} - Student: {student_status}, Faculty: {faculty_status}")
    
    print("\n" + "="*60)
    print("🔍 SPECIFIC ISSUE TESTING:")
    print("="*60)
    
    # Test your specific problematic times
    time_in_window = "07:30"  # 7:30 AM (within your problematic 7-7:59am window)
    time_out_window = "08:00"  # 8:00 AM (your problematic timeout window)
    
    print(f"\n📥 TIME-IN at {time_in_window}:")
    can_time_in = test_time_in_range(time_in_window, student_config['start_time'], student_config['end_time'])
    if can_time_in:
        print(f"   ✅ Time-in ALLOWED - Scanner accepts time-in at {time_in_window}")
    else:
        print(f"   ❌ Time-in BLOCKED - Scanner rejects time-in at {time_in_window}")
        print(f"   💡 Solution: Time-in allowed from {student_config['start_time']} onwards")
    
    print(f"\n📤 TIME-OUT at {time_out_window}:")
    print("   ✅ Time-out should ALWAYS be allowed (no time restrictions)")
    print("   💡 If time-out is blocked, it's likely a different issue (not time-based)")
    
    print("\n" + "="*60)
    print("🏆 RECOMMENDED TESTING:")
    print("="*60)
    print("1. Try time-in between 06:00-22:00 (should work)")
    print("2. Try time-out at ANY time after time-in (should always work)")
    print("3. If time-out still fails, check for other error messages")
    print("4. Ensure you have an active time-in before attempting time-out")

if __name__ == "__main__":
    test_scanner_availability()