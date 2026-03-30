from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
from models import RpiDevice, PairingRequest
from extensions import db
import secrets
import string
import uuid

rpi_management_bp = Blueprint('rpi_management', __name__)

def generate_pairing_code():
    """Generate a 6-digit pairing code"""
    return ''.join(secrets.choice(string.digits) for _ in range(6))

def generate_device_id():
    """Generate a unique device ID"""
    return str(uuid.uuid4())[:8].upper()

@rpi_management_bp.route('/api/rpi/pairing/request', methods=['POST'])
def request_pairing():
    """RPi device requests pairing with the backend"""
    try:
        data = request.get_json()
        
        # Validate required fields
        device_name = data.get('device_name', '').strip()
        mac_address = data.get('mac_address', '').strip()
        location = data.get('location', '').strip()
        
        if not device_name:
            return jsonify({'success': False, 'message': 'Device name is required'}), 400
        
        # Get client IP
        client_ip = request.environ.get('HTTP_X_FORWARDED_FOR', request.environ['REMOTE_ADDR'])
        
        # Check if device already exists (by MAC address if provided)
        existing_device = None
        if mac_address:
            existing_device = RpiDevice.query.filter_by(mac_address=mac_address).first()
        
        if existing_device and existing_device.is_paired:
            return jsonify({
                'success': False, 
                'message': 'Device is already paired',
                'device_id': existing_device.device_id
            }), 400
        
        # Check for existing pending requests
        pending_request = PairingRequest.query.filter_by(
            mac_address=mac_address,
            status='pending'
        ).first()
        
        if pending_request and not pending_request.is_expired():
            return jsonify({
                'success': False,
                'message': 'Pairing request already exists',
                'pairing_code': pending_request.pairing_code,
                'expires_at': pending_request.expires_at.isoformat()
            }), 400
        
        # Generate pairing code and expiry
        pairing_code = generate_pairing_code()
        device_id = data.get('device_id') or generate_device_id()
        expires_at = datetime.utcnow() + timedelta(hours=24)  # 24-hour expiry
        
        # Create pairing request
        pairing_request = PairingRequest(
            device_id=device_id,
            device_name=device_name,
            mac_address=mac_address,
            ip_address=client_ip,
            location=location,
            pairing_code=pairing_code,
            expires_at=expires_at
        )
        
        db.session.add(pairing_request)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Pairing request created successfully',
            'device_id': device_id,
            'pairing_code': pairing_code,
            'expires_at': expires_at.isoformat()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error creating pairing request: {e}")
        return jsonify({'success': False, 'message': 'Failed to create pairing request', 'error': str(e)}), 500

@rpi_management_bp.route('/api/rpi/pairing/check', methods=['GET'])
def check_pairing_status():
    """RPi device checks if pairing has been approved"""
    try:
        device_id = request.args.get('device_id')
        pairing_code = request.args.get('pairing_code')
        
        if not device_id or not pairing_code:
            return jsonify({'success': False, 'message': 'Device ID and pairing code required'}), 400
        
        # Check pairing request status
        pairing_request = PairingRequest.query.filter_by(
            device_id=device_id,
            pairing_code=pairing_code
        ).first()
        
        if not pairing_request:
            return jsonify({'success': False, 'message': 'Pairing request not found'}), 404
        
        if pairing_request.is_expired():
            return jsonify({'success': False, 'message': 'Pairing request expired'}), 400
        
        if pairing_request.status == 'approved':
            # Get the paired device
            device = RpiDevice.query.filter_by(device_id=device_id).first()
            if device:
                return jsonify({
                    'success': True,
                    'status': 'approved',
                    'message': 'Device successfully paired',
                    'device': device.to_dict()
                }), 200
        elif pairing_request.status == 'rejected':
            return jsonify({
                'success': False,
                'status': 'rejected',
                'message': 'Pairing request was rejected',
                'reason': pairing_request.rejection_reason
            }), 403
        
        # Still pending
        return jsonify({
            'success': True,
            'status': 'pending',
            'message': 'Pairing request is still pending approval'
        }), 200
        
    except Exception as e:
        print(f"Error checking pairing status: {e}")
        return jsonify({'success': False, 'message': 'Failed to check pairing status', 'error': str(e)}), 500

@rpi_management_bp.route('/api/rpi/heartbeat', methods=['POST'])
def device_heartbeat():
    """RPi device sends heartbeat to indicate it's online"""
    try:
        data = request.get_json()
        device_id = data.get('device_id')
        
        if not device_id:
            return jsonify({'success': False, 'message': 'Device ID required'}), 400
        
        # Find the device
        device = RpiDevice.query.filter_by(device_id=device_id).first()
        if not device:
            return jsonify({'success': False, 'message': 'Device not found'}), 404
        
        if not device.is_paired:
            return jsonify({'success': False, 'message': 'Device not paired'}), 403
        
        # Update heartbeat and status
        device.last_heartbeat = datetime.utcnow()
        device.is_online = True
        device.ip_address = request.environ.get('HTTP_X_FORWARDED_FOR', request.environ['REMOTE_ADDR'])
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Heartbeat received',
            'device': device.to_dict(),
            'server_time': datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error processing heartbeat: {e}")
        return jsonify({'success': False, 'message': 'Failed to process heartbeat', 'error': str(e)}), 500

@rpi_management_bp.route('/api/rpi/config', methods=['GET'])
def get_device_config():
    """RPi device gets its configuration"""
    try:
        device_id = request.args.get('device_id')
        
        if not device_id:
            return jsonify({'success': False, 'message': 'Device ID required'}), 400
        
        device = RpiDevice.query.filter_by(device_id=device_id).first()
        if not device:
            return jsonify({'success': False, 'message': 'Device not found'}), 404
        
        if not device.is_paired:
            return jsonify({'success': False, 'message': 'Device not paired'}), 403
        
        if not device.is_enabled:
            return jsonify({'success': False, 'message': 'Device is disabled'}), 403
        
        # Default configuration
        config = {
            'scanner_mode': device.scanner_mode,
            'default_page': 'time-in' if device.scanner_mode == 'time_in' else 'time-in',
            'auto_switch': device.scanner_mode == 'both',
            'heartbeat_interval': 30,  # seconds
            'display_timeout': 5000,  # milliseconds
            'scanner_timeout': 300,  # milliseconds
            'backend_url': request.url_root,
        }
        
        # Merge with custom config
        if device.config_data:
            config.update(device.config_data)
        
        return jsonify({
            'success': True,
            'config': config,
            'device': device.to_dict()
        }), 200
        
    except Exception as e:
        print(f"Error getting device config: {e}")
        return jsonify({'success': False, 'message': 'Failed to get device config', 'error': str(e)}), 500

# Admin endpoints for managing devices and pairing requests

@rpi_management_bp.route('/api/admin/rpi/pairing/requests', methods=['GET'])
def get_pairing_requests():
    """Get all pairing requests (admin)"""
    try:
        status_filter = request.args.get('status', 'pending')
        
        query = PairingRequest.query
        if status_filter != 'all':
            query = query.filter_by(status=status_filter)
        
        requests = query.order_by(PairingRequest.created_at.desc()).all()
        
        return jsonify({
            'success': True,
            'requests': [req.to_dict() for req in requests],
            'count': len(requests)
        }), 200
        
    except Exception as e:
        print(f"Error getting pairing requests: {e}")
        return jsonify({'success': False, 'message': 'Failed to get pairing requests', 'error': str(e)}), 500

@rpi_management_bp.route('/api/admin/rpi/pairing/approve', methods=['POST'])
def approve_pairing_request():
    """Approve a pairing request (admin)"""
    try:
        data = request.get_json()
        request_id = data.get('request_id')
        admin_user = data.get('admin_user', 'admin')  # Should come from authentication
        
        if not request_id:
            return jsonify({'success': False, 'message': 'Request ID required'}), 400
        
        # Get the pairing request
        pairing_request = PairingRequest.query.get(request_id)
        if not pairing_request:
            return jsonify({'success': False, 'message': 'Pairing request not found'}), 404
        
        if pairing_request.status != 'pending':
            return jsonify({'success': False, 'message': 'Request already processed'}), 400
        
        if pairing_request.is_expired():
            return jsonify({'success': False, 'message': 'Request has expired'}), 400
        
        # Create or update device
        device = RpiDevice.query.filter_by(device_id=pairing_request.device_id).first()
        
        if not device:
            device = RpiDevice(
                device_id=pairing_request.device_id,
                device_name=pairing_request.device_name,
                mac_address=pairing_request.mac_address,
                ip_address=pairing_request.ip_address,
                location=pairing_request.location
            )
            db.session.add(device)
        
        # Update device pairing status
        device.is_paired = True
        device.paired_at = datetime.utcnow()
        device.paired_by = admin_user
        
        # Update request status
        pairing_request.status = 'approved'
        pairing_request.reviewed_by = admin_user
        pairing_request.reviewed_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Pairing request approved successfully',
            'device': device.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error approving pairing request: {e}")
        return jsonify({'success': False, 'message': 'Failed to approve pairing request', 'error': str(e)}), 500

@rpi_management_bp.route('/api/admin/rpi/pairing/reject', methods=['POST'])
def reject_pairing_request():
    """Reject a pairing request (admin)"""
    try:
        data = request.get_json()
        request_id = data.get('request_id')
        reason = data.get('reason', 'No reason provided')
        admin_user = data.get('admin_user', 'admin')
        
        if not request_id:
            return jsonify({'success': False, 'message': 'Request ID required'}), 400
        
        pairing_request = PairingRequest.query.get(request_id)
        if not pairing_request:
            return jsonify({'success': False, 'message': 'Pairing request not found'}), 404
        
        if pairing_request.status != 'pending':
            return jsonify({'success': False, 'message': 'Request already processed'}), 400
        
        # Update request status
        pairing_request.status = 'rejected'
        pairing_request.reviewed_by = admin_user
        pairing_request.reviewed_at = datetime.utcnow()
        pairing_request.rejection_reason = reason
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Pairing request rejected successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error rejecting pairing request: {e}")
        return jsonify({'success': False, 'message': 'Failed to reject pairing request', 'error': str(e)}), 500

@rpi_management_bp.route('/api/admin/rpi/devices', methods=['GET'])
def get_devices():
    """Get all paired devices (admin)"""
    try:
        devices = RpiDevice.query.filter_by(is_paired=True).order_by(RpiDevice.device_name).all()
        
        # Update online status based on recent heartbeats
        for device in devices:
            device.is_online = device.is_heartbeat_recent()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'devices': [device.to_dict() for device in devices],
            'count': len(devices)
        }), 200
        
    except Exception as e:
        print(f"Error getting devices: {e}")
        return jsonify({'success': False, 'message': 'Failed to get devices', 'error': str(e)}), 500

@rpi_management_bp.route('/api/admin/rpi/devices/<device_id>/config', methods=['PUT'])
def update_device_config():
    """Update device configuration (admin)"""
    try:
        device_id = request.view_args['device_id']
        data = request.get_json()
        
        device = RpiDevice.query.filter_by(device_id=device_id).first()
        if not device:
            return jsonify({'success': False, 'message': 'Device not found'}), 404
        
        # Update basic settings
        if 'device_name' in data:
            device.device_name = data['device_name']
        if 'location' in data:
            device.location = data['location']
        if 'scanner_mode' in data:
            device.scanner_mode = data['scanner_mode']
        if 'is_enabled' in data:
            device.is_enabled = data['is_enabled']
        
        # Update custom configuration
        if 'config' in data:
            device.config_data = data['config']
        
        device.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Device configuration updated successfully',
            'device': device.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error updating device config: {e}")
        return jsonify({'success': False, 'message': 'Failed to update device config', 'error': str(e)}), 500

@rpi_management_bp.route('/api/admin/rpi/devices/<device_id>/enable', methods=['POST'])
def enable_device():
    """Enable/disable device (admin)"""
    try:
        device_id = request.view_args['device_id']
        data = request.get_json()
        enabled = data.get('enabled', True)
        
        device = RpiDevice.query.filter_by(device_id=device_id).first()
        if not device:
            return jsonify({'success': False, 'message': 'Device not found'}), 404
        
        device.is_enabled = enabled
        device.updated_at = datetime.utcnow()
        db.session.commit()
        
        action = 'enabled' if enabled else 'disabled'
        return jsonify({
            'success': True,
            'message': f'Device {action} successfully',
            'device': device.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error enabling/disabling device: {e}")
        return jsonify({'success': False, 'message': 'Failed to update device status', 'error': str(e)}), 500

@rpi_management_bp.route('/api/admin/rpi/devices/<device_id>/unpair', methods=['POST'])
def unpair_device():
    """Unpair a device (admin)"""
    try:
        device_id = request.view_args['device_id']
        
        device = RpiDevice.query.filter_by(device_id=device_id).first()
        if not device:
            return jsonify({'success': False, 'message': 'Device not found'}), 404
        
        # Option 1: Just mark as unpaired
        device.is_paired = False
        device.is_online = False
        device.last_heartbeat = None
        device.updated_at = datetime.utcnow()
        
        # Option 2: Delete the device entirely
        # db.session.delete(device)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Device unpaired successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error unpairing device: {e}")
        return jsonify({'success': False, 'message': 'Failed to unpair device', 'error': str(e)}), 500