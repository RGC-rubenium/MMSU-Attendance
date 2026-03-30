# backend/app.py
from flask import Flask, send_from_directory
from flask_cors import CORS
import config
import os
from extensions import db, migrate
from api.auth import auth_bp
from api.students import students_bp
from api.students_delete import students_delete_bp
from api.add_student import add_student_bp
from api.faculty import faculty_bp
from api.faculty_delete import faculty_delete_bp
from api.add_faculty import add_faculty_bp
from api.add_schedule import event_schedule_bp
from api.add_class_schedule import class_schedule_bp
from api.rfid_scanner import rfid_scanner_bp
from api.rpi_management import rpi_management_bp
from api.scanner_access import scanner_access_bp
from api.analytics import analytics_bp

app = Flask(__name__)
app.config.from_object(config)

# Configure CORS to allow DELETE methods
CORS(app,
     origins=["http://localhost:3000", "http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:3000", "http://127.0.0.1:5173", "http://127.0.0.1:5174"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization", "Access-Control-Allow-Origin"],
     supports_credentials=True)

# initialize extensions
db.init_app(app)
migrate.init_app(app, db)

# Register API blueprints under /api
app.register_blueprint(auth_bp, url_prefix='/api')
app.register_blueprint(students_bp, url_prefix='/api')
app.register_blueprint(students_delete_bp, url_prefix='/api')
app.register_blueprint(add_student_bp)
app.register_blueprint(faculty_bp, url_prefix='/api')
app.register_blueprint(faculty_delete_bp, url_prefix='/api')
app.register_blueprint(add_faculty_bp)
app.register_blueprint(event_schedule_bp, url_prefix='/api')
app.register_blueprint(class_schedule_bp, url_prefix='/api')
app.register_blueprint(rfid_scanner_bp)
app.register_blueprint(rpi_management_bp)
app.register_blueprint(scanner_access_bp)
app.register_blueprint(analytics_bp, url_prefix='/api')

# Static file route for serving images
@app.route('/images/<path:filename>')
def serve_images(filename):
    """Serve images from the images directory"""
    images_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'images')
    full_path = os.path.join(images_dir, filename)
    print(f"🖼️ Serving image: {filename}")
    print(f"🖼️ Images directory: {images_dir}")
    print(f"🖼️ Full path: {full_path}")
    print(f"🖼️ File exists: {os.path.exists(full_path)}")
    
    try:
        from flask import make_response
        response = make_response(send_from_directory(images_dir, filename))
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        response.headers['Cache-Control'] = 'no-cache'
        return response
    except Exception as e:
        print(f"❌ Error serving image: {e}")
        return f"Error serving image: {e}", 404


if __name__ == '__main__':
	# when running directly, create tables if using sqlite dev and start server
	# initialize app context to ensure extensions are bound
	with app.app_context():
		try:
			from extensions import db
			db.create_all()
		except Exception:
			pass
	app.run(host='0.0.0.0', port=5000, debug=True)