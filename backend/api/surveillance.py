# backend/api/surveillance.py
"""
Surveillance API - RTSP-to-MJPEG proxy for Tiandy cameras.
Uses OpenCV to read the RTSP stream and re-streams it as MJPEG
so modern browsers can display it directly via an <img> tag.
"""

import cv2
import threading
import time
import io
import os
import requests
from urllib.parse import quote
from flask import Blueprint, Response, jsonify, request, send_file
from PIL import Image

# Force OpenCV to use TCP for RTSP (avoids UDP packet loss / auth issues)
os.environ.setdefault('OPENCV_FFMPEG_CAPTURE_OPTIONS', 'rtsp_transport;tcp')

surveillance_bp = Blueprint('surveillance', __name__)

# ─── In-memory camera registry ────────────────────────────────────────────────
# Each entry: { rtsp_url, username, password, label, is_active }
_cameras = {
    "cam1": {
        "label": "Channel 1 – Main Entrance",
        "ip": "192.168.1.183",
        "http_port": 80,
        "rtsp_port": 554,
        "username": "Admin",
        "password": "Lobby_Scan",
        "channel": 1,
        "stream": 1,   # 1=main, 2=sub, 3=third
        "is_active": True,
    }
}

def _build_rtsp_url(cam: dict) -> str:
    """Build the Tiandy RTSP URL from camera config.

    Tiandy format: rtsp://<user>:<pass>@<ip>:<port>/<channel>/<stream>
      channel : 1 to N
      stream  : 1 = main (high), 2 = sub (low), 3 = third
    Example   : rtsp://admin:admin@192.168.1.3:554/1/1

    Credentials are percent-encoded so special characters (@, :, #, etc.)
    in the password don't break the URL.
    """
    user = quote(str(cam["username"]), safe='')
    pwd  = quote(str(cam["password"]), safe='-._~')  # keep unreserved chars unencoded
    ip   = cam["ip"]
    port = cam["rtsp_port"]
    ch   = cam["channel"]
    st   = cam["stream"]    # numeric: 1 / 2 / 3
    creds = f"{user}:{pwd}@" if cam["username"] else ""
    return f"rtsp://{creds}{ip}:{port}/{ch}/{st}"

# ─── Stream thread per camera ─────────────────────────────────────────────────
class CameraStream:
    """Background thread that keeps an OpenCV capture open and
    stores the latest JPEG frame so multiple HTTP clients can
    all read from the same capture without re-opening it."""

    def __init__(self, cam_id: str, rtsp_url: str):
        self.cam_id   = cam_id
        self.rtsp_url = rtsp_url
        self.frame    = None
        self.lock     = threading.Lock()
        self._stop    = threading.Event()
        self.connected = False
        self.last_error = ""
        self._thread  = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    def _run(self):
        while not self._stop.is_set():
            # CAP_FFMPEG with TCP transport avoids UDP auth/packet-loss issues
            cap = cv2.VideoCapture(self.rtsp_url, cv2.CAP_FFMPEG)
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)          # low latency
            if not cap.isOpened():
                self.connected = False
                self.last_error = "Cannot open RTSP stream – check IP, port and credentials"
                time.sleep(5)
                continue
            self.connected = True
            self.last_error = ""
            while not self._stop.is_set():
                ret, frame = cap.read()
                if not ret:
                    self.connected = False
                    self.last_error = "Stream lost – reconnecting"
                    cap.release()
                    time.sleep(3)
                    break
                _, buf = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
                with self.lock:
                    self.frame = buf.tobytes()
            cap.release()

    def get_frame(self):
        with self.lock:
            return self.frame

    def stop(self):
        self._stop.set()

# Active stream threads
_streams: dict[str, CameraStream] = {}


def _get_or_start_stream(cam_id: str) -> CameraStream | None:
    cam = _cameras.get(cam_id)
    if cam is None:
        return None
    if cam_id not in _streams or not _streams[cam_id]._thread.is_alive():
        rtsp_url = _build_rtsp_url(cam)
        safe_log = rtsp_url.replace(quote(str(cam["password"]), safe='-._~'), '***')
        print(f"[Surveillance] Starting stream {cam_id}: {safe_log}", flush=True)
        _streams[cam_id] = CameraStream(cam_id, rtsp_url)
    return _streams[cam_id]


def _mjpeg_generator(stream: CameraStream):
    """Yield multipart/x-mixed-replace JPEG frames."""
    while True:
        frame = stream.get_frame()
        if frame is None:
            time.sleep(0.05)
            continue
        yield (
            b"--frame\r\n"
            b"Content-Type: image/jpeg\r\n\r\n" + frame + b"\r\n"
        )
        time.sleep(0.033)  # ~30 fps cap


# ─── Routes ───────────────────────────────────────────────────────────────────

@surveillance_bp.route('/api/surveillance/cameras', methods=['GET'])
def list_cameras():
    """Return list of configured cameras (without password)."""
    result = []
    for cam_id, cam in _cameras.items():
        stream = _streams.get(cam_id)
        result.append({
            "id": cam_id,
            "label": cam["label"],
            "ip": cam["ip"],
            "http_port": cam["http_port"],
            "rtsp_port": cam["rtsp_port"],
            "username": cam["username"],
            "channel": cam["channel"],
            "stream": cam["stream"],
            "is_active": cam["is_active"],
            "connected": stream.connected if stream else False,
            "last_error": stream.last_error if stream else "",
        })
    return jsonify({"cameras": result})


@surveillance_bp.route('/api/surveillance/cameras/<cam_id>', methods=['PUT'])
def update_camera(cam_id):
    """Update camera settings and restart its stream."""
    cam = _cameras.get(cam_id)
    if cam is None:
        return jsonify({"error": "Camera not found"}), 404
    data = request.get_json(silent=True) or {}
    for field in ("label", "ip", "http_port", "rtsp_port", "username", "password", "channel", "stream", "is_active"):
        if field in data:
            cam[field] = data[field]
    # Restart stream with new settings
    if cam_id in _streams:
        _streams[cam_id].stop()
        del _streams[cam_id]
    if cam["is_active"]:
        _get_or_start_stream(cam_id)
    return jsonify({"success": True, "message": "Camera settings updated"})


@surveillance_bp.route('/api/surveillance/stream/<cam_id>')
def video_stream(cam_id):
    """MJPEG stream endpoint."""
    cam = _cameras.get(cam_id)
    if cam is None or not cam["is_active"]:
        return jsonify({"error": "Camera not found or inactive"}), 404
    stream = _get_or_start_stream(cam_id)
    return Response(
        _mjpeg_generator(stream),
        mimetype='multipart/x-mixed-replace; boundary=frame'
    )


@surveillance_bp.route('/api/surveillance/snapshot/<cam_id>')
def snapshot(cam_id):
    """Return a single JPEG snapshot of the current frame."""
    stream = _get_or_start_stream(cam_id)
    if stream is None:
        return jsonify({"error": "Camera not found"}), 404
    # Wait up to 3 s for a frame
    for _ in range(60):
        frame = stream.get_frame()
        if frame:
            return send_file(io.BytesIO(frame), mimetype='image/jpeg',
                             download_name=f'snapshot_{cam_id}_{int(time.time())}.jpg',
                             as_attachment=True)
        time.sleep(0.05)
    return jsonify({"error": "No frame available"}), 503


@surveillance_bp.route('/api/surveillance/status/<cam_id>')
def stream_status(cam_id):
    """Quick JSON status check for a camera."""
    stream = _streams.get(cam_id)
    if stream is None:
        return jsonify({"connected": False, "last_error": "Stream not started"})
    return jsonify({
        "connected": stream.connected,
        "last_error": stream.last_error,
        "has_frame": stream.get_frame() is not None,
    })


@surveillance_bp.route('/api/surveillance/start/<cam_id>', methods=['POST'])
def start_stream(cam_id):
    """Manually start / restart a camera stream."""
    cam = _cameras.get(cam_id)
    if cam is None:
        return jsonify({"error": "Camera not found"}), 404
    if cam_id in _streams:
        _streams[cam_id].stop()
        del _streams[cam_id]
    _get_or_start_stream(cam_id)
    return jsonify({"success": True, "message": f"Stream {cam_id} started"})


@surveillance_bp.route('/api/surveillance/stop/<cam_id>', methods=['POST'])
def stop_stream(cam_id):
    """Stop a running camera stream."""
    if cam_id in _streams:
        _streams[cam_id].stop()
        del _streams[cam_id]
        return jsonify({"success": True, "message": f"Stream {cam_id} stopped"})
    return jsonify({"success": False, "message": "Stream was not running"})


@surveillance_bp.route('/api/surveillance/test-connect/<cam_id>')
def test_connect(cam_id):
    """Attempt a quick single-frame grab and report success/failure.
    Useful for diagnosing credential or network issues without
    waiting for the streaming thread."""
    cam = _cameras.get(cam_id)
    if cam is None:
        return jsonify({"success": False, "error": "Camera not found"}), 404
    rtsp_url = _build_rtsp_url(cam)
    # Redact password in response
    safe_url = rtsp_url.replace(quote(cam["password"], safe=''), '***') if cam["password"] else rtsp_url
    cap = cv2.VideoCapture(rtsp_url, cv2.CAP_FFMPEG)
    if not cap.isOpened():
        cap.release()
        return jsonify({
            "success": False,
            "rtsp_url": safe_url,
            "error": "cv2.VideoCapture could not open stream – verify IP, port, username and password",
        })
    ret, _ = cap.read()
    cap.release()
    if not ret:
        return jsonify({
            "success": False,
            "rtsp_url": safe_url,
            "error": "Stream opened but no frame received – camera may be starting up",
        })
    return jsonify({"success": True, "rtsp_url": safe_url, "message": "Frame grabbed successfully"})
