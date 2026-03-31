"""
Surveillance API - Camera management and RTSP streaming endpoints
"""
from flask import Blueprint, request, jsonify, Response
from datetime import datetime
from models import Camera
from extensions import db
import cv2
import threading
import time

surveillance_bp = Blueprint('surveillance', __name__)

# Cache for camera streams to avoid opening multiple connections
camera_streams = {}
camera_locks = {}


def get_camera_stream(camera_id, rtsp_url):
    """Get or create a camera stream"""
    if camera_id not in camera_streams or camera_streams[camera_id] is None:
        if camera_id not in camera_locks:
            camera_locks[camera_id] = threading.Lock()
        
        with camera_locks[camera_id]:
            if camera_id not in camera_streams or camera_streams[camera_id] is None:
                cap = cv2.VideoCapture(rtsp_url)
                cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                if cap.isOpened():
                    camera_streams[camera_id] = cap
                else:
                    return None
    
    return camera_streams[camera_id]


def release_camera_stream(camera_id):
    """Release a camera stream"""
    if camera_id in camera_streams and camera_streams[camera_id] is not None:
        camera_streams[camera_id].release()
        camera_streams[camera_id] = None


def generate_frames(camera_id, rtsp_url):
    """Generator function for streaming MJPEG frames"""
    cap = None
    try:
        cap = cv2.VideoCapture(rtsp_url)
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        
        if not cap.isOpened():
            # Return a placeholder frame if camera is unavailable
            yield b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + create_error_frame("Camera Unavailable") + b'\r\n'
            return
        
        while True:
            ret, frame = cap.read()
            if not ret:
                # If frame read fails, try to reconnect
                cap.release()
                time.sleep(1)
                cap = cv2.VideoCapture(rtsp_url)
                cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                if not cap.isOpened():
                    yield b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + create_error_frame("Reconnecting...") + b'\r\n'
                    time.sleep(2)
                continue
            
            # Resize frame for web streaming (adjust as needed)
            frame = cv2.resize(frame, (640, 480))
            
            # Encode frame as JPEG
            ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
            if not ret:
                continue
                
            frame_bytes = buffer.tobytes()
            yield b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n'
            
            # Small delay to control frame rate
            time.sleep(0.033)  # ~30 FPS
            
    except Exception as e:
        print(f"Stream error for camera {camera_id}: {e}")
        yield b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + create_error_frame(f"Error: {str(e)[:30]}") + b'\r\n'
    finally:
        if cap is not None:
            cap.release()


def create_error_frame(message):
    """Create a simple error frame with text"""
    import numpy as np
    # Create a black frame
    frame = np.zeros((480, 640, 3), dtype=np.uint8)
    # Add text
    cv2.putText(frame, message, (50, 240), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
    ret, buffer = cv2.imencode('.jpg', frame)
    return buffer.tobytes() if ret else b''


# ==================== Camera CRUD Operations ====================

@surveillance_bp.route('/api/surveillance/cameras', methods=['GET'])
def get_cameras():
    """Get all cameras"""
    try:
        cameras = Camera.query.order_by(Camera.grid_position.asc().nullslast(), Camera.created_at.desc()).all()
        return jsonify({
            'success': True,
            'cameras': [cam.to_dict() for cam in cameras],
            'total': len(cameras)
        }), 200
    except Exception as e:
        print(f"Error fetching cameras: {e}")
        return jsonify({'success': False, 'message': 'Failed to fetch cameras', 'error': str(e)}), 500


@surveillance_bp.route('/api/surveillance/cameras/<int:camera_id>', methods=['GET'])
def get_camera(camera_id):
    """Get a specific camera"""
    try:
        camera = Camera.query.get(camera_id)
        if not camera:
            return jsonify({'success': False, 'message': 'Camera not found'}), 404
        
        return jsonify({
            'success': True,
            'camera': camera.to_dict()
        }), 200
    except Exception as e:
        print(f"Error fetching camera: {e}")
        return jsonify({'success': False, 'message': 'Failed to fetch camera', 'error': str(e)}), 500


@surveillance_bp.route('/api/surveillance/cameras', methods=['POST'])
def create_camera():
    """Create a new camera"""
    try:
        data = request.get_json()
        
        # Validate required fields
        name = data.get('name', '').strip()
        rtsp_url = data.get('rtsp_url', '').strip()
        
        if not name:
            return jsonify({'success': False, 'message': 'Camera name is required'}), 400
        if not rtsp_url:
            return jsonify({'success': False, 'message': 'RTSP URL is required'}), 400
        
        # Check if camera with same name exists
        existing = Camera.query.filter_by(name=name).first()
        if existing:
            return jsonify({'success': False, 'message': 'Camera with this name already exists'}), 400
        
        # Get next grid position
        max_pos = db.session.query(db.func.max(Camera.grid_position)).scalar() or 0
        
        camera = Camera(
            name=name,
            rtsp_url=rtsp_url,
            location=data.get('location', '').strip() or None,
            description=data.get('description', '').strip() or None,
            is_active=data.get('is_active', True),
            grid_position=max_pos + 1,
            created_by=data.get('created_by')
        )
        
        db.session.add(camera)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Camera created successfully',
            'camera': camera.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Error creating camera: {e}")
        return jsonify({'success': False, 'message': 'Failed to create camera', 'error': str(e)}), 500


@surveillance_bp.route('/api/surveillance/cameras/<int:camera_id>', methods=['PUT'])
def update_camera(camera_id):
    """Update a camera"""
    try:
        camera = Camera.query.get(camera_id)
        if not camera:
            return jsonify({'success': False, 'message': 'Camera not found'}), 404
        
        data = request.get_json()
        
        # Update fields if provided
        if 'name' in data:
            name = data['name'].strip()
            if name:
                # Check for duplicate name (excluding current camera)
                existing = Camera.query.filter(Camera.name == name, Camera.id != camera_id).first()
                if existing:
                    return jsonify({'success': False, 'message': 'Camera with this name already exists'}), 400
                camera.name = name
        
        if 'rtsp_url' in data:
            rtsp_url = data['rtsp_url'].strip()
            if rtsp_url:
                camera.rtsp_url = rtsp_url
                # Release old stream if URL changed
                release_camera_stream(camera_id)
        
        if 'location' in data:
            camera.location = data['location'].strip() or None
        
        if 'description' in data:
            camera.description = data['description'].strip() or None
        
        if 'is_active' in data:
            camera.is_active = bool(data['is_active'])
        
        if 'grid_position' in data:
            camera.grid_position = data['grid_position']
        
        camera.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Camera updated successfully',
            'camera': camera.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error updating camera: {e}")
        return jsonify({'success': False, 'message': 'Failed to update camera', 'error': str(e)}), 500


@surveillance_bp.route('/api/surveillance/cameras/<int:camera_id>', methods=['DELETE'])
def delete_camera(camera_id):
    """Delete a camera"""
    try:
        camera = Camera.query.get(camera_id)
        if not camera:
            return jsonify({'success': False, 'message': 'Camera not found'}), 404
        
        # Release stream if exists
        release_camera_stream(camera_id)
        
        db.session.delete(camera)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Camera deleted successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting camera: {e}")
        return jsonify({'success': False, 'message': 'Failed to delete camera', 'error': str(e)}), 500


# ==================== Streaming Endpoints ====================

@surveillance_bp.route('/api/surveillance/stream/<int:camera_id>')
def video_stream(camera_id):
    """Stream video from a camera as MJPEG"""
    try:
        camera = Camera.query.get(camera_id)
        if not camera:
            return jsonify({'success': False, 'message': 'Camera not found'}), 404
        
        if not camera.is_active:
            return jsonify({'success': False, 'message': 'Camera is not active'}), 400
        
        return Response(
            generate_frames(camera_id, camera.rtsp_url),
            mimetype='multipart/x-mixed-replace; boundary=frame'
        )
        
    except Exception as e:
        print(f"Error streaming camera {camera_id}: {e}")
        return jsonify({'success': False, 'message': 'Failed to start stream', 'error': str(e)}), 500


@surveillance_bp.route('/api/surveillance/cameras/<int:camera_id>/test', methods=['POST'])
def test_camera_connection(camera_id):
    """Test if a camera RTSP URL is accessible"""
    try:
        camera = Camera.query.get(camera_id)
        if not camera:
            return jsonify({'success': False, 'message': 'Camera not found'}), 404
        
        # Try to connect to the camera with timeout settings
        cap = cv2.VideoCapture(camera.rtsp_url, cv2.CAP_FFMPEG)
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        cap.set(cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, 5000)
        cap.set(cv2.CAP_PROP_READ_TIMEOUT_MSEC, 5000)
        
        is_online = False
        
        if cap.isOpened():
            # Try to read multiple frames to ensure stream is actually working
            for attempt in range(3):
                ret, frame = cap.read()
                if ret and frame is not None and frame.size > 0:
                    is_online = True
                    break
                time.sleep(0.5)
        
        cap.release()
        
        # Update camera status
        camera.is_online = is_online
        camera.last_check = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'is_online': is_online,
            'message': 'Camera is online' if is_online else 'Camera is offline or stream not returning valid frames'
        }), 200
        
    except Exception as e:
        print(f"Error testing camera {camera_id}: {e}")
        return jsonify({'success': False, 'message': 'Failed to test camera', 'error': str(e)}), 500


@surveillance_bp.route('/api/surveillance/test-url', methods=['POST'])
def test_rtsp_url():
    """Test if an RTSP URL is accessible (before adding camera)"""
    try:
        data = request.get_json()
        rtsp_url = data.get('rtsp_url', '').strip()
        
        if not rtsp_url:
            return jsonify({'success': False, 'message': 'RTSP URL is required'}), 400
        
        # Try to connect with timeout settings
        cap = cv2.VideoCapture(rtsp_url, cv2.CAP_FFMPEG)
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        # Set timeout for opening stream (in milliseconds)
        cap.set(cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, 5000)
        cap.set(cv2.CAP_PROP_READ_TIMEOUT_MSEC, 5000)
        
        is_accessible = False
        frame_valid = False
        
        if cap.isOpened():
            # Try to read multiple frames to ensure stream is actually working
            for attempt in range(3):
                ret, frame = cap.read()
                if ret and frame is not None and frame.size > 0:
                    frame_valid = True
                    break
                time.sleep(0.5)
            
            is_accessible = frame_valid
        
        cap.release()
        
        return jsonify({
            'success': True,
            'is_accessible': is_accessible,
            'message': 'RTSP URL is accessible' if is_accessible else 'Cannot connect to RTSP URL or stream is not returning valid frames'
        }), 200
        
    except Exception as e:
        print(f"Error testing RTSP URL: {e}")
        return jsonify({'success': False, 'message': 'Failed to test URL', 'error': str(e)}), 500


@surveillance_bp.route('/api/surveillance/cameras/reorder', methods=['PUT'])
def reorder_cameras():
    """Reorder cameras in the grid"""
    try:
        data = request.get_json()
        order = data.get('order', [])  # List of camera IDs in new order
        
        if not order:
            return jsonify({'success': False, 'message': 'Order list is required'}), 400
        
        for position, camera_id in enumerate(order, start=1):
            camera = Camera.query.get(camera_id)
            if camera:
                camera.grid_position = position
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Cameras reordered successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error reordering cameras: {e}")
        return jsonify({'success': False, 'message': 'Failed to reorder cameras', 'error': str(e)}), 500
