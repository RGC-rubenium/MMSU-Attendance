"""Script to add power command columns to rpi_devices table"""
from extensions import db
from app import app
from sqlalchemy import text

with app.app_context():
    try:
        # Add pending_command column
        db.session.execute(text('ALTER TABLE attendance.rpi_devices ADD COLUMN IF NOT EXISTS pending_command VARCHAR(50) DEFAULT NULL'))
        
        # Add command_issued_at column
        db.session.execute(text('ALTER TABLE attendance.rpi_devices ADD COLUMN IF NOT EXISTS command_issued_at TIMESTAMP DEFAULT NULL'))
        
        # Add command_issued_by column
        db.session.execute(text('ALTER TABLE attendance.rpi_devices ADD COLUMN IF NOT EXISTS command_issued_by VARCHAR(50) DEFAULT NULL'))
        
        db.session.commit()
        print('Columns added successfully!')
    except Exception as e:
        print(f'Error: {e}')
        db.session.rollback()
