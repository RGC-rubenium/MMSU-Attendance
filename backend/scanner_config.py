# Scanner Configuration Settings

# Scanner availability times - when students and faculty can start using the scanner
SCANNER_CONFIG = {
    # Student scanner availability
    "student_scanner_hours": {
        "weekdays": {
            "start_time": "06:00",  # Students can start scanning from 6:00 AM
            "end_time": "21:30"     # Students can scan until 9:30 PM
        },
        "weekends": {
            "start_time": "08:00",  # Weekend hours: 8:00 AM
            "end_time": "17:00"     # Weekend hours: 5:00 PM
        }
    },
    
    # Faculty scanner availability (more flexible hours)
    "faculty_scanner_hours": {
        "weekdays": {
            "start_time": "05:00",  # Faculty can start earlier: 5:00 AM
            "end_time": "23:00"     # Faculty can scan later: 11:00 PM
        },
        "weekends": {
            "start_time": "06:00",  # Weekend faculty hours: 6:00 AM
            "end_time": "20:00"     # Weekend faculty hours: 8:00 PM
        }
    }
}

# Default schedule configuration (fallback when no personal schedule)
DEFAULT_SCHEDULE_CONFIG = {
    "weekdays": {
        "start_time": "07:00",  # Default class hours start: 7:00 AM
        "end_time": "21:00",    # Default class hours end: 9:00 PM
        "description": "Regular Class Hours"
    },
    "weekends": {
        "start_time": "08:00",  # Weekend default: 8:00 AM
        "end_time": "17:00",    # Weekend default: 5:00 PM
        "description": "Weekend Hours"
    }
}

# Time zone and date settings
TIMEZONE_CONFIG = {
    "timezone": "Asia/Manila",  # Philippines timezone
    "date_format": "%Y-%m-%d",
    "time_format": "%H:%M:%S"
}