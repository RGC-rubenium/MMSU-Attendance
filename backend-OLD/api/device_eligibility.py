"""
Device Eligibility API
Middleware and endpoints for checking device access eligibility before allowing scanner access
"""

from flask import Blueprint, request, jsonify, redirect
from models import RpiDevice, PairingRequest
from extensions import db
from datetime import datetime
from functools import wraps

device_eligibility_bp = Blueprint('device_eligibility', __name__)


def get_device_from_request():
    """Extract device ID from request (query param, header, or cookie)"""
    device_id = request.args.get('device_id')
    
    if not device_id:
        device_id = request.headers.get('X-Device-ID')
    
    if not device_id:
        device_id = request.cookies.get('device_id')
    
    return device_id


def check_device_eligibility(device_id):
    """
    Check if a device is eligible to access the scanner.
    Returns tuple: (is_eligible, status_code, response_data)
    """
    if not device_id:
        return False, 'no_device_id', {
            'eligible': False,
            'reason': 'no_device_id',
            'message': 'No device ID provided',
            'action': 'register',
            'redirect': '/device/register'
        }
    
    device = RpiDevice.query.filter_by(device_id=device_id).first()
    
    if not device:
        # Check if there's a pending pairing request
        pairing = PairingRequest.query.filter_by(device_id=device_id, status='pending').first()
        
        if pairing:
            return False, 'pending_approval', {
                'eligible': False,
                'reason': 'pending_approval',
                'message': 'Device pairing is pending admin approval',
                'action': 'wait',
                'redirect': '/device/pending',
                'pairing_code': pairing.pairing_code
            }
        
        return False, 'not_registered', {
            'eligible': False,
            'reason': 'not_registered',
            'message': 'Device is not registered',
            'action': 'register',
            'redirect': '/device/register'
        }
    
    if not device.is_paired:
        return False, 'not_paired', {
            'eligible': False,
            'reason': 'not_paired',
            'message': 'Device has not completed pairing',
            'action': 'pair',
            'redirect': '/device/pair'
        }
    
    if not device.is_enabled:
        return False, 'disabled', {
            'eligible': False,
            'reason': 'disabled',
            'message': 'Device has been disabled by administrator',
            'action': 'contact_admin',
            'redirect': '/device/disabled'
        }
    
    # Device is eligible
    return True, 'eligible', {
        'eligible': True,
        'reason': 'eligible',
        'message': 'Device is eligible for scanner access',
        'device': device.to_dict(),
        'scanner_mode': device.scanner_mode,
        'config': device.config_data or {}
    }


def require_eligible_device(f):
    """Decorator to require an eligible device for a route"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        device_id = get_device_from_request()
        is_eligible, status, data = check_device_eligibility(device_id)
        
        if not is_eligible:
            return jsonify(data), 403
        
        # Add device to request context
        request.device = RpiDevice.query.filter_by(device_id=device_id).first()
        return f(*args, **kwargs)
    
    return decorated_function


# ==================== Eligibility Check Endpoints ====================

@device_eligibility_bp.route('/api/device/check-eligibility', methods=['GET', 'POST'])
def check_eligibility():
    """
    Main endpoint for devices to check their eligibility.
    This is called when a Raspberry Pi boots up to determine where to redirect.
    """
    try:
        if request.method == 'POST':
            data = request.get_json() or {}
            device_id = data.get('device_id')
        else:
            device_id = request.args.get('device_id')
        
        is_eligible, status, response_data = check_device_eligibility(device_id)
        
        if is_eligible:
            # Update device heartbeat and IP
            device = RpiDevice.query.filter_by(device_id=device_id).first()
            if device:
                device.last_heartbeat = datetime.utcnow()
                device.is_online = True
                ip_address = request.environ.get('HTTP_X_FORWARDED_FOR', request.environ.get('REMOTE_ADDR', ''))
                if ip_address:
                    device.ip_address = ip_address
                db.session.commit()
            
            # Determine the correct redirect URL based on scanner mode
            scanner_mode = device.scanner_mode if device else 'both'
            config = device.config_data or {} if device else {}
            
            if scanner_mode == 'time_in':
                redirect_url = '/scanner/time-in'
            elif scanner_mode == 'time_out':
                redirect_url = '/scanner/time-out'
            else:
                # Default to configured page or time-in
                default_page = config.get('default_page', 'time-in')
                redirect_url = f'/scanner/{default_page}'
            
            response_data['redirect'] = redirect_url
            response_data['available_modes'] = {
                'time_in': scanner_mode in ['time_in', 'both'],
                'time_out': scanner_mode in ['time_out', 'both']
            }
            
            return jsonify(response_data), 200
        else:
            status_codes = {
                'no_device_id': 400,
                'not_registered': 404,
                'pending_approval': 202,
                'not_paired': 403,
                'disabled': 403
            }
            return jsonify(response_data), status_codes.get(status, 403)
    
    except Exception as e:
        db.session.rollback()
        print(f"Error checking device eligibility: {e}")
        return jsonify({
            'eligible': False,
            'reason': 'error',
            'message': 'Failed to check device eligibility',
            'error': str(e)
        }), 500


@device_eligibility_bp.route('/api/device/register', methods=['POST'])
def register_device():
    """
    Register a new device and create a pairing request.
    This combines device registration with pairing request creation.
    """
    try:
        data = request.get_json() or {}
        
        device_name = data.get('device_name')
        location = data.get('location', '')
        mac_address = data.get('mac_address', '')
        system_info = data.get('system_info', {})
        
        if not device_name:
            return jsonify({
                'success': False,
                'message': 'Device name is required'
            }), 400
        
        # Generate unique device ID
        import uuid
        import random
        import string
        
        device_id = f"RPI-{uuid.uuid4().hex[:8].upper()}"
        pairing_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        
        # Get client IP
        ip_address = request.environ.get('HTTP_X_FORWARDED_FOR', request.environ.get('REMOTE_ADDR', ''))
        
        # Create pairing request
        from datetime import timedelta
        pairing_request = PairingRequest(
            device_id=device_id,
            device_name=device_name,
            mac_address=mac_address,
            ip_address=ip_address,
            location=location,
            pairing_code=pairing_code,
            status='pending',
            expires_at=datetime.utcnow() + timedelta(hours=24)
        )
        
        db.session.add(pairing_request)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Device registration submitted. Awaiting admin approval.',
            'device_id': device_id,
            'pairing_code': pairing_code,
            'expires_at': pairing_request.expires_at.isoformat(),
            'redirect': '/device/pending',
            'instructions': {
                'step1': 'Note down your pairing code',
                'step2': 'Contact an administrator to approve your device',
                'step3': 'Once approved, refresh this page to access the scanner'
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Error registering device: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to register device',
            'error': str(e)
        }), 500


@device_eligibility_bp.route('/api/device/status/<device_id>', methods=['GET'])
def get_device_status(device_id):
    """Get the current status of a device"""
    try:
        device = RpiDevice.query.filter_by(device_id=device_id).first()
        
        if device and device.is_paired:
            return jsonify({
                'success': True,
                'status': 'paired',
                'device': device.to_dict(),
                'eligible': device.is_enabled,
                'scanner_mode': device.scanner_mode
            }), 200
        
        # Check for pairing request
        pairing = PairingRequest.query.filter_by(device_id=device_id).order_by(PairingRequest.created_at.desc()).first()
        
        if pairing:
            if pairing.status == 'pending':
                return jsonify({
                    'success': True,
                    'status': 'pending',
                    'message': 'Awaiting admin approval',
                    'pairing_code': pairing.pairing_code,
                    'expires_at': pairing.expires_at.isoformat() if pairing.expires_at else None
                }), 200
            elif pairing.status == 'rejected':
                return jsonify({
                    'success': False,
                    'status': 'rejected',
                    'message': 'Pairing request was rejected',
                    'reason': pairing.rejection_reason
                }), 403
            elif pairing.status == 'approved':
                return jsonify({
                    'success': True,
                    'status': 'approved',
                    'message': 'Device approved but not yet configured'
                }), 200
        
        return jsonify({
            'success': False,
            'status': 'not_found',
            'message': 'Device not found'
        }), 404
        
    except Exception as e:
        print(f"Error getting device status: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to get device status',
            'error': str(e)
        }), 500


@device_eligibility_bp.route('/api/device/config/<device_id>', methods=['GET'])
def get_device_config(device_id):
    """Get configuration for a device (used by RPi to fetch its settings)"""
    try:
        device = RpiDevice.query.filter_by(device_id=device_id).first()
        
        if not device:
            return jsonify({
                'success': False,
                'message': 'Device not found'
            }), 404
        
        if not device.is_paired:
            return jsonify({
                'success': False,
                'message': 'Device not paired'
            }), 403
        
        if not device.is_enabled:
            return jsonify({
                'success': False,
                'message': 'Device is disabled',
                'enabled': False
            }), 403
        
        # Update heartbeat
        device.last_heartbeat = datetime.utcnow()
        device.is_online = True
        ip_address = request.environ.get('HTTP_X_FORWARDED_FOR', request.environ.get('REMOTE_ADDR', ''))
        if ip_address:
            device.ip_address = ip_address
        db.session.commit()
        
        return jsonify({
            'success': True,
            'device_id': device.device_id,
            'device_name': device.device_name,
            'location': device.location,
            'scanner_mode': device.scanner_mode,
            'enabled': device.is_enabled,
            'config': device.config_data or {
                'default_page': 'time-in',
                'display_mode': 'fullscreen',
                'sound_enabled': True,
                'auto_refresh': True,
                'refresh_interval': 300  # 5 minutes
            },
            'server_time': datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error getting device config: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to get device configuration',
            'error': str(e)
        }), 500
