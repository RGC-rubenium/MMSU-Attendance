#!/usr/bin/env python3
"""
Create admin user for user_tb
"""

from app import app
from extensions import db
from models import User

def create_admin_user():
    """Create an admin user"""
    with app.app_context():
        # Check if admin already exists
        existing_admin = User.query.filter_by(username='admin').first()
        if existing_admin:
            print(f"Admin user already exists: {existing_admin.username}")
            print(f"Roles: {existing_admin.get_roles_list()}")
            return
        
        # Create admin user
        admin_user = User(
            username='admin',
            role='admin,superuser'  # Multiple roles
        )
        admin_user.set_password('admin123')  # Default password
        
        db.session.add(admin_user)
        db.session.commit()
        
        print(f"✅ Admin user created successfully!")
        print(f"👤 Username: {admin_user.username}")
        print(f"🔐 Password: admin123")
        print(f"🎭 Roles: {admin_user.get_roles_list()}")
        print(f"📅 Created: {admin_user.created_at}")
        print(f"\n⚠️  Remember to change the default password after first login!")

if __name__ == '__main__':
    create_admin_user()