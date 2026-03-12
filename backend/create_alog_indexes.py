"""
Run once to create performance indexes on the attendance_logs table.
Usage:  python create_alog_indexes.py
"""
from app import app
from extensions import db
from sqlalchemy import text

INDEXES = [
    ("ix_alog_time_in",      "CREATE INDEX IF NOT EXISTS ix_alog_time_in      ON attendance.attendance_logs (time_in DESC)"),
    ("ix_alog_user_type",    "CREATE INDEX IF NOT EXISTS ix_alog_user_type    ON attendance.attendance_logs (user_type)"),
    ("ix_alog_status",       "CREATE INDEX IF NOT EXISTS ix_alog_status       ON attendance.attendance_logs (status)"),
    ("ix_alog_department",   "CREATE INDEX IF NOT EXISTS ix_alog_department   ON attendance.attendance_logs (department)"),
    ("ix_alog_uid",          "CREATE INDEX IF NOT EXISTS ix_alog_uid          ON attendance.attendance_logs (uid)"),
    ("ix_alog_timein_utype", "CREATE INDEX IF NOT EXISTS ix_alog_timein_utype ON attendance.attendance_logs (time_in DESC, user_type)"),
]

with app.app_context():
    with db.engine.connect() as conn:
        for name, sql in INDEXES:
            print(f"Creating index {name} ...", end=" ")
            conn.execute(text(sql))
            print("OK")
        conn.commit()
    print("\nAll indexes created successfully.")
