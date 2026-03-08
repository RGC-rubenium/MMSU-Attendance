# Scanner Configuration Settings

# Scanner availability times - when students and faculty can start using the scanner
SCANNER_CONFIG = {
    # Student scanner availability
    "student_scanner_hours": {
        "weekdays": {
            "start_time": "06:00",  # Students can start scanning from 6:00 AM
            "end_time": "22:00"     # Students can scan until 10:00 PM
        },
        "weekends": {
            "start_time": "06:00",  # Weekend hours: 6:00 AM
            "end_time": "20:00"     # Weekend hours: 8:00 PM
        }
    },
    
    # Faculty scanner availability (more flexible hours)
    "faculty_scanner_hours": {
        "weekdays": {
            "start_time": "06:00",  # Faculty can start earlier: 6:00 AM
            "end_time": "23:30"     # Faculty can scan later: 11:30 PM
        },
        "weekends": {
            "start_time": "06:00",  # Weekend faculty hours: 6:00 AM
            "end_time": "21:00"     # Weekend faculty hours: 9:00 PM
        }
    }
}

# Default schedule configuration (fallback when no personal schedule)
DEFAULT_SCHEDULE_CONFIG = {
    "weekdays": {
        "start_time": "06:00",  # Default class hours start: 6:00 AM
        "end_time": "22:00",    # Default class hours end: 10:00 PM
        "description": "Regular Class Hours"
    },
    "weekends": {
        "start_time": "06:00",  # Weekend default: 6:00 AM
        "end_time": "20:00",    # Weekend default: 8:00 PM
        "description": "Weekend Hours"
    }
}

# Time zone and date settings
TIMEZONE_CONFIG = {
    "timezone": "Asia/Manila",  # Philippines timezone
    "date_format": "%Y-%m-%d",
    "time_format": "%H:%M:%S"
}