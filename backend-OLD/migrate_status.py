#!/usr/bin/env python3
"""
Migration script to update attendance status values from old system to new system:
- Records with only time_in (no time_out): status = 'incomplete'
- Records with both time_in and time_out: status = 'complete'
- Old statuses like 'present', 'late', 'absent' will be converted
"""

from models import AttendanceLog, db
from app import app

def update_attendance_statuses():
    """Update attendance statuses to new complete/incomplete system"""
    with app.app_context():
        print("🔄 Starting attendance status migration...")
        
        # Get all attendance logs
        logs = AttendanceLog.query.all()
        total = len(logs)
        updated = 0
        
        print(f"📊 Found {total} attendance records to process")
        
        for log in logs:
            old_status = log.status
            new_status = None
            
            # Determine new status based on time_out presence
            if log.time_out is not None:
                new_status = 'complete'
            else:
                new_status = 'incomplete'
            
            # Update if status changed
            if log.status != new_status:
                log.status = new_status
                updated += 1
                print(f"  ✅ Record ID {log.id}: {old_status} → {new_status}")
        
        # Commit changes
        if updated > 0:
            db.session.commit()
            print(f"\n🎉 Migration completed successfully!")
            print(f"📈 Updated {updated} out of {total} records")
        else:
            print(f"\n✨ No updates needed - all records already have correct status")

if __name__ == "__main__":
    update_attendance_statuses()