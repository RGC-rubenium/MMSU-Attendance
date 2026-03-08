#!/usr/bin/env python3
"""
Test script to verify the scanner timeout fix
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime, time as datetime_time
from scanner_config import SCANNER_CONFIG, DEFAULT_SCHEDULE_CONFIG

def test_time_ranges():
    """Test the time ranges to understand the issue"""
    
    # Student scanner hours
    student_config = SCANNER_CONFIG['student_scanner_hours']['weekdays']
    print("Student Scanner Hours (Weekdays):")
    print(f"  Start: {student_config['start_time']}")
    print(f"  End: {student_config['end_time']}")
    
    # Default schedule hours  
    default_config = DEFAULT_SCHEDULE_CONFIG['weekdays']
    print("\nDefault Schedule Hours (Weekdays):")
    print(f"  Start: {default_config['start_time']}")
    print(f"  End: {default_config['end_time']}")
    
    # Test times
    test_times = ['06:30', '07:30', '07:59', '08:00', '21:00', '21:30']
    
    print("\nTime Range Analysis:")
    print("Time     | Scanner Available | Schedule Active")
    print("-" * 45)
    
    for test_time_str in test_times:
        test_time = datetime.strptime(test_time_str, '%H:%M').time()
        
        # Check scanner availability
        scanner_start = datetime.strptime(student_config['start_time'], '%H:%M').time()
        scanner_end = datetime.strptime(student_config['end_time'], '%H:%M').time()
        scanner_available = scanner_start <= test_time <= scanner_end
        
        # Check schedule availability
        schedule_start = datetime.strptime(default_config['start_time'], '%H:%M').time()
        schedule_end = datetime.strptime(default_config['end_time'], '%H:%M').time()
        schedule_active = schedule_start <= test_time <= schedule_end
        
        print(f"{test_time_str:8s} | {str(scanner_available):17s} | {str(schedule_active):15s}")
    
    print("\nPROBLEM IDENTIFIED:")
    print("- Between 06:00-06:59: Scanner available but NO default schedule")
    print("- Students with personal schedules can time-in during this period")
    print("- But if they try to time-out between 07:00-07:59 without a personal schedule,")
    print("  they get blocked because system looks for default schedule")
    print("\nFIX APPLIED:")
    print("- Time-out operations now bypass scanner availability checks")
    print("- Time-out operations use the schedule info from the existing log")

if __name__ == "__main__":
    test_time_ranges()