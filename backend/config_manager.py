#!/usr/bin/env python3
"""
Scanner Configuration Manager - Easy way to update scanner settings
"""

from scanner_config import SCANNER_CONFIG, DEFAULT_SCHEDULE_CONFIG
import json

def display_current_config():
    """Display current configuration"""
    print("=" * 60)
    print("CURRENT SCANNER CONFIGURATION")
    print("=" * 60)
    
    print("\n📅 STUDENT SCANNER HOURS:")
    student_config = SCANNER_CONFIG['student_scanner_hours']
    print(f"  Weekdays: {student_config['weekdays']['start_time']} - {student_config['weekdays']['end_time']}")
    print(f"  Weekends: {student_config['weekends']['start_time']} - {student_config['weekends']['end_time']}")
    
    print("\n👨‍🏫 FACULTY SCANNER HOURS:")
    faculty_config = SCANNER_CONFIG['faculty_scanner_hours']
    print(f"  Weekdays: {faculty_config['weekdays']['start_time']} - {faculty_config['weekdays']['end_time']}")
    print(f"  Weekends: {faculty_config['weekends']['start_time']} - {faculty_config['weekends']['end_time']}")
    
    print("\n🕐 DEFAULT SCHEDULE HOURS:")
    default_config = DEFAULT_SCHEDULE_CONFIG
    print(f"  Weekdays: {default_config['weekdays']['start_time']} - {default_config['weekdays']['end_time']}")
    print(f"  Weekends: {default_config['weekends']['start_time']} - {default_config['weekends']['end_time']}")

def update_student_hours():
    """Update student scanner hours"""
    print("\n🎓 UPDATE STUDENT SCANNER HOURS")
    print("-" * 40)
    
    # Weekdays
    print("Weekdays:")
    weekday_start = input(f"Start time (current: {SCANNER_CONFIG['student_scanner_hours']['weekdays']['start_time']}): ").strip()
    weekday_end = input(f"End time (current: {SCANNER_CONFIG['student_scanner_hours']['weekdays']['end_time']}): ").strip()
    
    if weekday_start:
        SCANNER_CONFIG['student_scanner_hours']['weekdays']['start_time'] = weekday_start
    if weekday_end:
        SCANNER_CONFIG['student_scanner_hours']['weekdays']['end_time'] = weekday_end
    
    # Weekends
    print("\nWeekends:")
    weekend_start = input(f"Start time (current: {SCANNER_CONFIG['student_scanner_hours']['weekends']['start_time']}): ").strip()
    weekend_end = input(f"End time (current: {SCANNER_CONFIG['student_scanner_hours']['weekends']['end_time']}): ").strip()
    
    if weekend_start:
        SCANNER_CONFIG['student_scanner_hours']['weekends']['start_time'] = weekend_start
    if weekend_end:
        SCANNER_CONFIG['student_scanner_hours']['weekends']['end_time'] = weekend_end

def update_faculty_hours():
    """Update faculty scanner hours"""
    print("\n👨‍🏫 UPDATE FACULTY SCANNER HOURS")
    print("-" * 40)
    
    # Weekdays
    print("Weekdays:")
    weekday_start = input(f"Start time (current: {SCANNER_CONFIG['faculty_scanner_hours']['weekdays']['start_time']}): ").strip()
    weekday_end = input(f"End time (current: {SCANNER_CONFIG['faculty_scanner_hours']['weekdays']['end_time']}): ").strip()
    
    if weekday_start:
        SCANNER_CONFIG['faculty_scanner_hours']['weekdays']['start_time'] = weekday_start
    if weekday_end:
        SCANNER_CONFIG['faculty_scanner_hours']['weekdays']['end_time'] = weekday_end
    
    # Weekends
    print("\nWeekends:")
    weekend_start = input(f"Start time (current: {SCANNER_CONFIG['faculty_scanner_hours']['weekends']['start_time']}): ").strip()
    weekend_end = input(f"End time (current: {SCANNER_CONFIG['faculty_scanner_hours']['weekends']['end_time']}): ").strip()
    
    if weekend_start:
        SCANNER_CONFIG['faculty_scanner_hours']['weekends']['start_time'] = weekend_start
    if weekend_end:
        SCANNER_CONFIG['faculty_scanner_hours']['weekends']['end_time'] = weekend_end

def update_default_schedule():
    """Update default schedule hours"""
    print("\n🕐 UPDATE DEFAULT SCHEDULE HOURS")
    print("-" * 40)
    
    # Weekdays
    print("Weekdays:")
    weekday_start = input(f"Start time (current: {DEFAULT_SCHEDULE_CONFIG['weekdays']['start_time']}): ").strip()
    weekday_end = input(f"End time (current: {DEFAULT_SCHEDULE_CONFIG['weekdays']['end_time']}): ").strip()
    
    if weekday_start:
        DEFAULT_SCHEDULE_CONFIG['weekdays']['start_time'] = weekday_start
    if weekday_end:
        DEFAULT_SCHEDULE_CONFIG['weekdays']['end_time'] = weekday_end
    
    # Weekends
    print("\nWeekends:")
    weekend_start = input(f"Start time (current: {DEFAULT_SCHEDULE_CONFIG['weekends']['start_time']}): ").strip()
    weekend_end = input(f"End time (current: {DEFAULT_SCHEDULE_CONFIG['weekends']['end_time']}): ").strip()
    
    if weekend_start:
        DEFAULT_SCHEDULE_CONFIG['weekends']['start_time'] = weekend_start
    if weekend_end:
        DEFAULT_SCHEDULE_CONFIG['weekends']['end_time'] = weekend_end

def save_config():
    """Save configuration back to file"""
    config_content = f'''# Scanner Configuration Settings

# Scanner availability times - when students and faculty can start using the scanner
SCANNER_CONFIG = {json.dumps(SCANNER_CONFIG, indent=4)}

# Default schedule configuration (fallback when no personal schedule)
DEFAULT_SCHEDULE_CONFIG = {json.dumps(DEFAULT_SCHEDULE_CONFIG, indent=4)}

# Time zone and date settings
TIMEZONE_CONFIG = {{
    "timezone": "Asia/Manila",  # Philippines timezone
    "date_format": "%Y-%m-%d",
    "time_format": "%H:%M:%S"
}}'''
    
    with open('scanner_config.py', 'w') as f:
        f.write(config_content)
    
    print("✅ Configuration saved successfully!")
    print("⚠️  Please restart the server for changes to take effect.")

def main():
    """Main configuration menu"""
    while True:
        display_current_config()
        print("\n" + "=" * 60)
        print("CONFIGURATION MENU")
        print("=" * 60)
        print("1. Update Student Scanner Hours")
        print("2. Update Faculty Scanner Hours") 
        print("3. Update Default Schedule Hours")
        print("4. Save Configuration")
        print("5. Exit")
        
        choice = input("\nEnter your choice (1-5): ").strip()
        
        if choice == '1':
            update_student_hours()
        elif choice == '2':
            update_faculty_hours()
        elif choice == '3':
            update_default_schedule()
        elif choice == '4':
            save_config()
        elif choice == '5':
            print("Exiting configuration manager.")
            break
        else:
            print("Invalid choice. Please try again.")

if __name__ == '__main__':
    main()