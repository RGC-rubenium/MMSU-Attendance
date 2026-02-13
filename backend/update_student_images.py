from extensions import db
from models import Student, Faculty
from app import app
import os

with app.app_context():
    # Check what image files exist
    images_dir = os.path.join('..', 'images', 'members', 'student')
    if os.path.exists(images_dir):
        image_files = [f for f in os.listdir(images_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
        print(f'Found student images: {image_files}')
        
        # Try to match images to students by name
        students = Student.query.all()
        for student in students:
            first_name = (student.first_name or '').lower().replace(' ', '_')
            middle_name = (student.middle_name or '').lower().replace(' ', '_')
            last_name = (student.last_name or '').lower().replace(' ', '_')
            
            student_name_variants = [
                f"{first_name}_{last_name}",
                f"{first_name}_{middle_name}_{last_name}".replace('__', '_') if middle_name else f"{first_name}_{last_name}",
                first_name,
                last_name
            ]
            
            for variant in student_name_variants:
                variant = variant.strip('_')
                if not variant:
                    continue
                    
                for img_file in image_files:
                    img_name = os.path.splitext(img_file)[0].lower()
                    if variant in img_name or img_name.startswith(variant):
                        print(f'Matching {student.full_name()} with {img_file}')
                        student.profile_path = f'members/student/{img_file}'
                        break
                if student.profile_path:
                    break
        
        # Commit changes
        db.session.commit()
        print('Updated student profile paths')
        
        # Show updated students
        updated_students = Student.query.filter(Student.profile_path.isnot(None)).all()
        for s in updated_students:
            print(f'Student: {s.full_name()} -> {s.profile_path}')
    else:
        print(f'Images directory not found: {images_dir}')