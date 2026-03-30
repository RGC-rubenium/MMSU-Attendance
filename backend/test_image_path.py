#!/usr/bin/env python3
"""
Test script to check image directory path resolution
"""
import os

# Get the backend directory path (where app.py is located)
backend_dir = os.path.dirname(os.path.abspath(__file__))
print(f"Backend directory: {backend_dir}")

# Calculate the images directory path
images_dir = os.path.join(backend_dir, '..', 'images')
print(f"Images directory (relative): {images_dir}")

# Get absolute path
images_dir_abs = os.path.abspath(images_dir)
print(f"Images directory (absolute): {images_dir_abs}")

# Check if directory exists
print(f"Images directory exists: {os.path.exists(images_dir_abs)}")

# Check specific file
student_photo = os.path.join(images_dir_abs, 'members', 'student', 'raven_gian_sulit_copon.jpg')
print(f"Student photo path: {student_photo}")
print(f"Student photo exists: {os.path.exists(student_photo)}")

# List contents of student directory
student_dir = os.path.join(images_dir_abs, 'members', 'student')
if os.path.exists(student_dir):
    print(f"\nContents of student directory:")
    for file in os.listdir(student_dir):
        print(f"  - {file}")
else:
    print("Student directory does not exist!")