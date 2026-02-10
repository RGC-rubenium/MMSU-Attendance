#!/usr/bin/env python3
"""
Database update script to recreate tables with new schema
"""

from app import app
from extensions import db

def update_database():
    """Drop and recreate all tables with updated schema"""
    with app.app_context():
        print("Dropping all existing tables...")
        db.drop_all()
        
        print("Creating all tables with updated schema...")
        db.create_all()
        
        print("Database tables recreated successfully!")
        print("All models should now have the latest schema including subjects_attended field.")

if __name__ == '__main__':
    update_database()