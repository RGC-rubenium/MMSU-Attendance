"""
Script to create the cameras table for the surveillance system.
Run this script if database migrations are having issues.
"""
import sys
sys.path.insert(0, '.')

from app import app
from extensions import db

# SQL to create the cameras table
CREATE_CAMERAS_TABLE = """
CREATE TABLE IF NOT EXISTS attendance.cameras (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    rtsp_url TEXT NOT NULL,
    location VARCHAR(200),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_online BOOLEAN DEFAULT FALSE,
    last_check TIMESTAMP,
    grid_position INTEGER,
    created_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"""

def create_cameras_table():
    """Create the cameras table"""
    with app.app_context():
        try:
            db.session.execute(db.text(CREATE_CAMERAS_TABLE))
            db.session.commit()
            print("✅ Cameras table created successfully!")
        except Exception as e:
            db.session.rollback()
            if "already exists" in str(e).lower():
                print("ℹ️ Cameras table already exists.")
            else:
                print(f"❌ Error creating cameras table: {e}")
                raise

if __name__ == '__main__':
    create_cameras_table()
