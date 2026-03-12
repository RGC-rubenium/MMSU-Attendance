# backend/api/surveillance.py
"""
Surveillance API - RTSP-to-MJPEG proxy + ISAPI PTZ control for Tiandy cameras.

PTZ via Hikvision-compatible ISAPI (no ONVIF library required):
  - PUT /ISAPI/PTZCtrl/channels/{ch}/continuous  -> pan/tilt/zoom (-100..100, 0=stop)
  - GET /ISAPI/PTZCtrl/channels/{ch}/home        -> go to home
  - PUT /ISAPI/PTZCtrl/channels/{ch}/presets/{id}         -> save preset
  - PUT /ISAPI/PTZCtrl/channels/{ch}/presets/{id}/goto    -> go to preset
  - GET /ISAPI/PTZCtrl/channels/{ch}/presets              -> list presets
  - Auto-patrol: server-side thread that cycles through preset IDs

RTSP stream:
  rtsp://Admin:Lobby_Scan@192.168.1.183:554/1/1
"""

import cv2
import threading
import time
import io
import os
import requests
from urllib.parse import quote
from requests.auth import HTTPDigestAuth, HTTPBasicAuth
from flask import Blueprint, Response, jsonify, request, send_file
from PIL import Image

# Force OpenCV to use TCP for RTSP (avoids UDP packet loss / auth issues)
os.environ.setdefault('OPENCV_FFMPEG_CAPTURE_OPTIONS', 'rtsp_transport;tcp')

# ─── PTZ direction vectors ───────────────────────────────────────────────────
# (pan_velocity, tilt_velocity)  – zoom handled separately
PTZ_VECTORS = {
    "left":       (-1,  0),
    "right":      ( 1,  0),
    "up":         ( 0,  1),
    "down":       ( 0, -1),
    "up_left":    (-1,  1),
    "up_right":   ( 1,  1),
    "down_left":  (-1, -1),
    "down_right": ( 1, -1),
}

# Patrol: list of (preset_token_or_index, dwell_seconds)
DEFAULT_PATROL = [("1", 8), ("2", 8), ("3", 8), ("4", 8)]

surveillance_bp = Blueprint('surveillance', __name__)

# ─── In-memory camera registry ────────────────────────────────────────────────
_cameras = {
    "cam1": {
        "label": "Channel 1 – Main Entrance",
        "ip": "192.168.1.183",
        "http_port": 80,
        "rtsp_port": 554,
        "username": "Admin",
        "password": "Lobby_Scan",
        "channel": 1,
        "stream": 1,        # 1=main, 2=sub, 3=third
        "is_active": True,
        "ptz_enabled": True,
        "ptz_speed": 5,     # 1–10
        "patrol": DEFAULT_PATROL,
    }
}

# ─── Per-camera patrol state ──────────────────────────────────────────────────
_patrol_threads: dict[str, threading.Thread] = {}
_patrol_stop:    dict[str, threading.Event]  = {}

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


# ─── ISAPI PTZ helpers ───────────────────────────────────────────────────────
# Tiandy cameras expose a Hikvision-compatible ISAPI over plain HTTP.
# No third-party ONVIF library needed – just requests + Digest auth.

def _isapi_url(cam: dict, path: str) -> str:
    return f"http://{cam['ip']}:{cam['http_port']}{path}"


def _isapi_auth(cam: dict):
    return HTTPDigestAuth(cam["username"], cam["password"])


def _ptz_continuous_move(cam_id: str, pan: float, tilt: float, zoom: float = 0.0, speed: float = 0.5) -> dict:
    """Send continuous pan/tilt/zoom via ISAPI.
    pan/tilt/zoom are unit vectors (-1..1); speed (0.1..1.0) scales them to -100..100.
    """
    cam = _cameras.get(cam_id)
    if cam is None:
        return {"success": False, "error": "Camera not found"}
    ch  = cam.get("channel", 1)
    val = int(speed * 100)
    p   = int(pan  * val)
    t   = int(tilt * val)
    z   = int(zoom * val)
    xml = f"<PTZData><pan>{p}</pan><tilt>{t}</tilt><zoom>{z}</zoom></PTZData>"
    try:
        r = requests.put(
            _isapi_url(cam, f"/ISAPI/PTZCtrl/channels/{ch}/continuous"),
            auth=_isapi_auth(cam), data=xml,
            headers={"Content-Type": "application/xml"}, timeout=5,
        )
        return {"success": r.status_code == 200}
    except Exception as e:
        return {"success": False, "error": str(e)}


def _ptz_stop(cam_id: str) -> dict:
    """Stop all movement by sending zero velocity."""
    return _ptz_continuous_move(cam_id, 0, 0, 0, speed=0.0)


def _ptz_goto_home(cam_id: str) -> dict:
    """Move to home position via ISAPI."""
    cam = _cameras.get(cam_id)
    if cam is None:
        return {"success": False, "error": "Camera not found"}
    ch = cam.get("channel", 1)
    try:
        r = requests.get(
            _isapi_url(cam, f"/ISAPI/PTZCtrl/channels/{ch}/home"),
            auth=_isapi_auth(cam), timeout=5,
        )
        return {"success": r.status_code == 200}
    except Exception as e:
        return {"success": False, "error": str(e)}


def _ptz_goto_preset(cam_id: str, token: str) -> dict:
    """Go to a saved preset by its numeric ID."""
    cam = _cameras.get(cam_id)
    if cam is None:
        return {"success": False, "error": "Camera not found"}
    ch = cam.get("channel", 1)
    try:
        r = requests.put(
            _isapi_url(cam, f"/ISAPI/PTZCtrl/channels/{ch}/presets/{token}/goto"),
            auth=_isapi_auth(cam), timeout=5,
        )
        return {"success": r.status_code == 200}
    except Exception as e:
        return {"success": False, "error": str(e)}


def _ptz_set_preset(cam_id: str, token: str | None, name: str) -> dict:
    """Save current position as a preset."""
    cam = _cameras.get(cam_id)
    if cam is None:
        return {"success": False, "error": "Camera not found"}
    ch  = cam.get("channel", 1)
    pid = token or "1"
    xml = f"<PTZPreset><id>{pid}</id><presetName>{name}</presetName></PTZPreset>"
    try:
        r = requests.put(
            _isapi_url(cam, f"/ISAPI/PTZCtrl/channels/{ch}/presets/{pid}"),
            auth=_isapi_auth(cam), data=xml,
            headers={"Content-Type": "application/xml"}, timeout=5,
        )
        return {"success": r.status_code == 200, "token": pid}
    except Exception as e:
        return {"success": False, "error": str(e)}


def _ptz_list_presets(cam_id: str) -> dict:
    """List presets stored on the camera via ISAPI."""
    cam = _cameras.get(cam_id)
    if cam is None:
        return {"success": False, "error": "Camera not found", "presets": []}
    ch = cam.get("channel", 1)
    try:
        r = requests.get(
            _isapi_url(cam, f"/ISAPI/PTZCtrl/channels/{ch}/presets"),
            auth=_isapi_auth(cam), timeout=5,
        )
        if r.status_code != 200:
            return {"success": False, "error": f"HTTP {r.status_code}", "presets": []}
        # Parse XML: <PTZPresetList><PTZPreset><id>1</id><presetName>Foo</presetName>...
        import xml.etree.ElementTree as ET
        root = ET.fromstring(r.text)
        ns   = {'ns': 'http://www.isapi.org/ver20/XMLSchema'}
        presets = []
        # try namespaced first, then bare
        items = root.findall('ns:PTZPreset', ns) or root.findall('PTZPreset')
        for item in items:
            pid  = (item.findtext('ns:id', namespaces=ns) or item.findtext('id') or '').strip()
            pname = (item.findtext('ns:presetName', namespaces=ns) or item.findtext('presetName') or '').strip()
            if pid:
                presets.append({"token": pid, "name": pname or f"Preset {pid}"})
        return {"success": True, "presets": presets}
    except Exception as e:
        return {"success": False, "error": str(e), "presets": []}

# ─── Patrol helpers ───────────────────────────────────────────────────────────

def _patrol_worker(cam_id: str, stop_event: threading.Event):
    """Cycle through ISAPI preset IDs until stop_event is set."""
    cam = _cameras.get(cam_id)
    if cam is None:
        return
    sequence = cam.get("patrol", DEFAULT_PATROL)
    idx = 0
    print(f"[Patrol] {cam_id} started – {len(sequence)} stops", flush=True)
    while not stop_event.is_set():
        token, dwell = sequence[idx % len(sequence)]
        result = _ptz_goto_preset(cam_id, str(token))
        if not result["success"]:
            print(f"[Patrol] {cam_id} preset {token} error: {result.get('error')}", flush=True)
        stop_event.wait(timeout=dwell)
        idx += 1
    print(f"[Patrol] {cam_id} stopped", flush=True)


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
            "ptz_enabled": cam.get("ptz_enabled", False),
            "ptz_speed": cam.get("ptz_speed", 5),
            "patrol": cam.get("patrol", DEFAULT_PATROL),
            "patrol_active": (
                cam_id in _patrol_stop
                and not _patrol_stop[cam_id].is_set()
                and cam_id in _patrol_threads
                and _patrol_threads[cam_id].is_alive()
            ),
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
    for field in ("label", "ip", "http_port", "rtsp_port", "username", "password",
                  "channel", "stream", "is_active", "ptz_enabled", "ptz_speed", "patrol"):
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


# ─── PTZ Routes (ISAPI) ──────────────────────────────────────────────────────

@surveillance_bp.route('/api/surveillance/ptz/<cam_id>/move', methods=['POST'])
def ptz_move(cam_id):
    """Start continuous PTZ movement via ISAPI.
    Body: { "direction": "left"|"right"|"up"|"down"|"up_left"|..., "speed": 1-10 }
    """
    cam = _cameras.get(cam_id)
    if cam is None:
        return jsonify({"error": "Camera not found"}), 404
    if not cam.get("ptz_enabled"):
        return jsonify({"error": "PTZ not enabled for this camera"}), 400
    data      = request.get_json(silent=True) or {}
    direction = data.get("direction", "")
    # Frontend sends 1-10; normalise to 0.1-1.0
    raw_speed = float(data.get("speed", cam.get("ptz_speed", 5)))
    speed     = max(0.1, min(1.0, raw_speed / 10.0))
    vec = PTZ_VECTORS.get(direction)
    if vec is None:
        return jsonify({"error": f"Unknown direction '{direction}'. Valid: {list(PTZ_VECTORS.keys())}"}), 400
    pan, tilt = vec
    return jsonify(_ptz_continuous_move(cam_id, pan, tilt, zoom=0.0, speed=speed))


@surveillance_bp.route('/api/surveillance/ptz/<cam_id>/stop', methods=['POST'])
def ptz_stop_move(cam_id):
    """Stop all PTZ movement via ISAPI (zero velocity)."""
    if _cameras.get(cam_id) is None:
        return jsonify({"error": "Camera not found"}), 404
    return jsonify(_ptz_stop(cam_id))


@surveillance_bp.route('/api/surveillance/ptz/<cam_id>/home', methods=['POST'])
def ptz_home(cam_id):
    """Send camera to its home position via ISAPI."""
    if _cameras.get(cam_id) is None:
        return jsonify({"error": "Camera not found"}), 404
    return jsonify(_ptz_goto_home(cam_id))


@surveillance_bp.route('/api/surveillance/ptz/<cam_id>/zoom', methods=['POST'])
def ptz_zoom(cam_id):
    """Zoom in or out via ISAPI continuous move (zoom axis).
    Body: { "direction": "in"|"out", "speed": 1-10 }
    """
    cam = _cameras.get(cam_id)
    if cam is None:
        return jsonify({"error": "Camera not found"}), 404
    data      = request.get_json(silent=True) or {}
    direction = data.get("direction", "in")
    raw_speed = float(data.get("speed", cam.get("ptz_speed", 5)))
    speed     = max(0.1, min(1.0, raw_speed / 10.0))
    zoom      = speed if direction == "in" else -speed
    return jsonify(_ptz_continuous_move(cam_id, pan=0.0, tilt=0.0, zoom=zoom, speed=1.0))


@surveillance_bp.route('/api/surveillance/ptz/<cam_id>/preset', methods=['POST'])
def ptz_preset(cam_id):
    """Go to or save an ISAPI preset.
    Body: { "action": "goto"|"set", "token": "1", "name": "Preset 1" }
    """
    if _cameras.get(cam_id) is None:
        return jsonify({"error": "Camera not found"}), 404
    data   = request.get_json(silent=True) or {}
    action = data.get("action", "goto")
    token  = str(data.get("token", "1"))
    if action == "goto":
        return jsonify(_ptz_goto_preset(cam_id, token))
    else:
        name = data.get("name", f"Preset {token}")
        return jsonify(_ptz_set_preset(cam_id, token, name))


@surveillance_bp.route('/api/surveillance/ptz/<cam_id>/presets', methods=['GET'])
def ptz_get_presets(cam_id):
    """List all presets stored on the camera via ISAPI."""
    if _cameras.get(cam_id) is None:
        return jsonify({"error": "Camera not found"}), 404
    return jsonify(_ptz_list_presets(cam_id))


# ─── Patrol Routes ────────────────────────────────────────────────────────────

@surveillance_bp.route('/api/surveillance/patrol/<cam_id>/start', methods=['POST'])
def patrol_start(cam_id):
    """Start automatic patrol (cycle through ISAPI preset IDs).
    Optional body: { "sequence": [["preset_id", dwell_seconds], ...] }
    """
    cam = _cameras.get(cam_id)
    if cam is None:
        return jsonify({"error": "Camera not found"}), 404
    data = request.get_json(silent=True) or {}
    if "sequence" in data:
        cam["patrol"] = [tuple(s) for s in data["sequence"]]
    if cam_id in _patrol_stop:
        _patrol_stop[cam_id].set()
        if cam_id in _patrol_threads:
            _patrol_threads[cam_id].join(timeout=2)
    stop_event = threading.Event()
    _patrol_stop[cam_id] = stop_event
    t = threading.Thread(target=_patrol_worker, args=(cam_id, stop_event), daemon=True)
    _patrol_threads[cam_id] = t
    t.start()
    return jsonify({"success": True, "message": f"Patrol started for {cam_id}", "sequence": cam["patrol"]})


@surveillance_bp.route('/api/surveillance/patrol/<cam_id>/stop', methods=['POST'])
def patrol_stop(cam_id):
    """Stop automatic patrol and send a PTZ stop."""
    if cam_id in _patrol_stop:
        _patrol_stop[cam_id].set()
        _ptz_stop(cam_id)
        return jsonify({"success": True, "message": f"Patrol stopped for {cam_id}"})
    return jsonify({"success": False, "message": "Patrol was not running"})


@surveillance_bp.route('/api/surveillance/patrol/<cam_id>/status')
def patrol_status(cam_id):
    """Return whether patrol is currently active."""
    active = (
        cam_id in _patrol_stop
        and not _patrol_stop[cam_id].is_set()
        and cam_id in _patrol_threads
        and _patrol_threads[cam_id].is_alive()
    )
    cam = _cameras.get(cam_id, {})
    return jsonify({"active": active, "sequence": cam.get("patrol", DEFAULT_PATROL)})


@surveillance_bp.route('/api/surveillance/test-connect/<cam_id>')
def test_connect(cam_id):
    """Test RTSP stream + ISAPI PTZ connectivity."""
    cam = _cameras.get(cam_id)
    if cam is None:
        return jsonify({"success": False, "error": "Camera not found"}), 404

    # 1. RTSP frame grab
    rtsp_url = _build_rtsp_url(cam)
    safe_url = rtsp_url.replace(quote(str(cam["password"]), safe='-._~'), '***')
    cap = cv2.VideoCapture(rtsp_url, cv2.CAP_FFMPEG)
    rtsp_ok = cap.isOpened()
    frame_ok = False
    if rtsp_ok:
        ret, _ = cap.read()
        frame_ok = ret
    cap.release()

    # 2. ISAPI PTZ probe
    isapi_ok = False
    isapi_err = ""
    try:
        r = requests.get(
            _isapi_url(cam, f"/ISAPI/PTZCtrl/channels/{cam['channel']}/presets"),
            auth=_isapi_auth(cam), timeout=5,
        )
        isapi_ok = r.status_code == 200
        if not isapi_ok:
            isapi_err = f"HTTP {r.status_code}"
    except Exception as e:
        isapi_err = str(e)

    return jsonify({
        "rtsp_url":    safe_url,
        "rtsp_open":   rtsp_ok,
        "frame_ok":    frame_ok,
        "isapi_ok":    isapi_ok,
        "isapi_error": isapi_err,
        "success":     rtsp_ok and isapi_ok,
    })
