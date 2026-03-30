#!/usr/bin/env python3
"""
Test script to check avatar URL generation
"""
import sys
import os

# Add backend directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

def format_avatar_url_test(profile_path, base_url="http://localhost:5000/"):
    """Test version of format_avatar_url function"""
    if not profile_path or not profile_path.strip():
        return None
    
    clean_path = profile_path.strip()
    if clean_path.startswith('http'):
        return clean_path
    
    # Remove leading slash if present to avoid double slashes
    if clean_path.startswith('/'):
        clean_path = clean_path[1:]
    
    # Check if path already starts with 'images/' to avoid duplication
    if clean_path.startswith('images/'):
        return f"{base_url}{clean_path}"
    else:
        return f"{base_url}images/{clean_path}"

# Test the function
test_cases = [
    "/images/members/student/raven_gian_sulit_copon.jpg",
    "images/members/student/raven_gian_sulit_copon.jpg", 
    "members/student/raven_gian_sulit_copon.jpg",
    None,
    "",
    "http://example.com/photo.jpg"
]

print("Testing avatar URL formatting:")
print("=" * 50)

for i, test_path in enumerate(test_cases, 1):
    result = format_avatar_url_test(test_path)
    print(f"Test {i}: {repr(test_path)}")
    print(f"Result: {result}")
    print("-" * 30)

print("\nExpected result for Raven's photo:")
expected = format_avatar_url_test("/images/members/student/raven_gian_sulit_copon.jpg")
print(f"URL: {expected}")

# Check if file exists
file_path = os.path.join(os.path.dirname(__file__), "images", "members", "student", "raven_gian_sulit_copon.jpg")
print(f"\nFile exists: {os.path.exists(file_path)}")
print(f"File path: {file_path}")