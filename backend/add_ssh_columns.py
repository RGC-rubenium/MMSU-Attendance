"""
Script to add SSH credentials columns to the rpi_devices table.
Run this script to add the necessary columns for SSH remote management.

Usage: python add_ssh_columns.py
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from extensions import db
from app import create_app

def add_ssh_columns():
    """Add SSH credential columns to rpi_devices table if they don't exist"""
    app = create_app() if callable(create_app) else None
    
    if app is None:
        # Fallback: import app directly
        from app import app
    
    with app.app_context():
        # Check if columns already exist
        from sqlalchemy import inspect, text
        inspector = inspect(db.engine)
        
        # Get existing columns
        columns = [col['name'] for col in inspector.get_columns('rpi_devices', schema='attendance')]
        
        print(f"Existing columns: {columns}")
        
        # Add columns if they don't exist
        with db.engine.connect() as conn:
            if 'ssh_username' not in columns:
                print("Adding ssh_username column...")
                conn.execute(text("""
                    ALTER TABLE attendance.rpi_devices 
                    ADD COLUMN ssh_username VARCHAR(50) NULL
                """))
                conn.commit()
                print("Added ssh_username column")
            else:
                print("ssh_username column already exists")
            
            if 'ssh_password' not in columns:
                print("Adding ssh_password column...")
                conn.execute(text("""
                    ALTER TABLE attendance.rpi_devices 
                    ADD COLUMN ssh_password VARCHAR(255) NULL
                """))
                conn.commit()
                print("Added ssh_password column")
            else:
                print("ssh_password column already exists")
            
            if 'ssh_port' not in columns:
                print("Adding ssh_port column...")
                conn.execute(text("""
                    ALTER TABLE attendance.rpi_devices 
                    ADD COLUMN ssh_port INTEGER DEFAULT 22
                """))
                conn.commit()
                print("Added ssh_port column")
            else:
                print("ssh_port column already exists")
        
        print("\nSSH columns setup complete!")


if __name__ == '__main__':
    add_ssh_columns()
