"""
RPI Device Management API
Handles device registration, pairing, approval, and configuration
"""

from flask import Blueprint, request, jsonify
from models import RpiDevice, PairingRequest
from extensions import db
from datetime import datetime, timedelta
import uuid
import random
import string

rpi_management_bp = Blueprint('rpi_management', __name__)


def generate_device_id():
    """Generate a unique device ID"""
    return f"RPI-{uuid.uuid4().hex[:8].upper()}"


def generate_pairing_code():
    """Generate a 6-character alphanumeric pairing code"""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))


# ==================== Device Pairing Endpoints ====================

@rpi_management_bp.route('/api/rpi/pairing/request', methods=['POST'])
def request_pairing():
    """Submit a pairing request from a Raspberry Pi device"""
    try:
        data = request.get_json()
        
        device_name = data.get('device_name')
        location = data.get('location', '')
        mac_address = data.get('mac_address', '')
        
        if not device_name:
            return jsonify({
                'success': False,
                'message': 'Device name is required'
            }), 400
        
        # Generate unique identifiers
        device_id = generate_device_id()
        pairing_code = generate_pairing_code()
        
        # Get client IP
        ip_address = request.environ.get('HTTP_X_FORWARDED_FOR', request.environ.get('REMOTE_ADDR', ''))
        
        # Create pairing request (expires in 24 hours)
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
            'message': 'Pairing request submitted successfully',
            'device_id': device_id,
            'pairing_code': pairing_code,
            'expires_at': pairing_request.expires_at.isoformat()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Error creating pairing request: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to create pairing request',
            'error': str(e)
        }), 500


@rpi_management_bp.route('/api/rpi/pairing/check', methods=['GET'])
def check_pairing_status():
    """Check the status of a pairing request"""
    try:
        device_id = request.args.get('device_id')
        pairing_code = request.args.get('pairing_code')
        
        if not device_id or not pairing_code:
            return jsonify({
                'success': False,
                'message': 'Device ID and pairing code are required'
            }), 400
        
        # First, check if device is already paired
        device = RpiDevice.query.filter_by(device_id=device_id).first()
        if device and device.is_paired:
            return jsonify({
                'success': True,
                'status': 'approved',
                'message': 'Device is paired',
                'device': device.to_dict()
            }), 200
        
        # Check pairing request
        pairing_request = PairingRequest.query.filter_by(
            device_id=device_id,
            pairing_code=pairing_code
        ).first()
        
        if not pairing_request:
            return jsonify({
                'success': False,
                'status': 'not_found',
                'message': 'Pairing request not found'
            }), 404
        
        if pairing_request.is_expired():
            return jsonify({
                'success': False,
                'status': 'expired',
                'message': 'Pairing request has expired'
            }), 410
        
        if pairing_request.status == 'rejected':
            return jsonify({
                'success': False,
                'status': 'rejected',
                'message': 'Pairing request was rejected',
                'reason': pairing_request.rejection_reason
            }), 403
        
        if pairing_request.status == 'pending':
            return jsonify({
                'success': True,
                'status': 'pending',
                'message': 'Pairing request is pending approval'
            }), 200
        
        return jsonify({
            'success': True,
            'status': pairing_request.status,
            'message': f'Pairing request status: {pairing_request.status}'
        }), 200
        
    except Exception as e:
        print(f"Error checking pairing status: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to check pairing status',
            'error': str(e)
        }), 500


# ==================== Admin Management Endpoints ====================

@rpi_management_bp.route('/api/admin/rpi/devices', methods=['GET'])
def get_all_devices():
    """Get all paired RPI devices"""
    try:
        devices = RpiDevice.query.filter_by(is_paired=True).all()
        
        # Update online status based on heartbeat
        for device in devices:
            device.is_online = device.is_heartbeat_recent(timeout_minutes=5)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'devices': [d.to_dict() for d in devices],
            'count': len(devices)
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error fetching devices: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to fetch devices',
            'error': str(e)
        }), 500


@rpi_management_bp.route('/api/admin/rpi/pairing/requests', methods=['GET'])
def get_pairing_requests():
    """Get all pairing requests, optionally filtered by status"""
    try:
        status = request.args.get('status')
        
        query = PairingRequest.query
        
        if status:
            query = query.filter_by(status=status)
        
        # Order by created_at descending (newest first)
        requests = query.order_by(PairingRequest.created_at.desc()).all()
        
        # Filter out expired pending requests
        valid_requests = []
        for req in requests:
            if req.status == 'pending' and req.is_expired():
                req.status = 'expired'
                db.session.commit()
            valid_requests.append(req)
        
        return jsonify({
            'success': True,
            'requests': [r.to_dict() for r in valid_requests],
            'count': len(valid_requests)
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error fetching pairing requests: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to fetch pairing requests',
            'error': str(e)
        }), 500


@rpi_management_bp.route('/api/admin/rpi/pairing/approve', methods=['POST'])
def approve_pairing():
    """Approve a pairing request and create the device"""
    try:
        data = request.get_json()
        request_id = data.get('request_id')
        admin_user = data.get('admin_user', 'admin')
        scanner_mode = data.get('scanner_mode', 'both')
        
        if not request_id:
            return jsonify({
                'success': False,
                'message': 'Request ID is required'
            }), 400
        
        pairing_request = PairingRequest.query.get(request_id)
        
        if not pairing_request:
            return jsonify({
                'success': False,
                'message': 'Pairing request not found'
            }), 404
        
        if pairing_request.status != 'pending':
            return jsonify({
                'success': False,
                'message': f'Cannot approve request with status: {pairing_request.status}'
            }), 400
        
        if pairing_request.is_expired():
            pairing_request.status = 'expired'
            db.session.commit()
            return jsonify({
                'success': False,
                'message': 'Pairing request has expired'
            }), 410
        
        # Create the device
        device = RpiDevice(
            device_id=pairing_request.device_id,
            device_name=pairing_request.device_name,
            mac_address=pairing_request.mac_address,
            ip_address=pairing_request.ip_address,
            location=pairing_request.location,
            is_paired=True,
            is_enabled=True,
            is_online=False,
            scanner_mode=scanner_mode,
            paired_at=datetime.utcnow(),
            paired_by=admin_user,
            config_data={
                'default_page': 'time-in',
                'display_mode': 'fullscreen',
                'sound_enabled': True,
                'auto_refresh': True
            }
        )
        
        # Update pairing request
        pairing_request.status = 'approved'
        pairing_request.reviewed_by = admin_user
        pairing_request.reviewed_at = datetime.utcnow()
        
        db.session.add(device)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Pairing approved successfully',
            'device': device.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error approving pairing: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to approve pairing',
            'error': str(e)
        }), 500


@rpi_management_bp.route('/api/admin/rpi/pairing/reject', methods=['POST'])
def reject_pairing():
    """Reject a pairing request"""
    try:
        data = request.get_json()
        request_id = data.get('request_id')
        reason = data.get('reason', 'No reason provided')
        admin_user = data.get('admin_user', 'admin')
        
        if not request_id:
            return jsonify({
                'success': False,
                'message': 'Request ID is required'
            }), 400
        
        pairing_request = PairingRequest.query.get(request_id)
        
        if not pairing_request:
            return jsonify({
                'success': False,
                'message': 'Pairing request not found'
            }), 404
        
        if pairing_request.status != 'pending':
            return jsonify({
                'success': False,
                'message': f'Cannot reject request with status: {pairing_request.status}'
            }), 400
        
        pairing_request.status = 'rejected'
        pairing_request.rejection_reason = reason
        pairing_request.reviewed_by = admin_user
        pairing_request.reviewed_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Pairing request rejected'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error rejecting pairing: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to reject pairing',
            'error': str(e)
        }), 500


@rpi_management_bp.route('/api/admin/rpi/devices/<device_id>/enable', methods=['POST'])
def toggle_device(device_id):
    """Enable or disable a device"""
    try:
        data = request.get_json()
        enabled = data.get('enabled', True)
        
        device = RpiDevice.query.filter_by(device_id=device_id).first()
        
        if not device:
            return jsonify({
                'success': False,
                'message': 'Device not found'
            }), 404
        
        device.is_enabled = enabled
        device.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Device {"enabled" if enabled else "disabled"} successfully',
            'device': device.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error toggling device: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to update device status',
            'error': str(e)
        }), 500


@rpi_management_bp.route('/api/admin/rpi/devices/<device_id>/unpair', methods=['POST'])
def unpair_device(device_id):
    """Unpair a device"""
    try:
        device = RpiDevice.query.filter_by(device_id=device_id).first()
        
        if not device:
            return jsonify({
                'success': False,
                'message': 'Device not found'
            }), 404
        
        # Delete the device
        db.session.delete(device)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Device unpaired successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error unpairing device: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to unpair device',
            'error': str(e)
        }), 500


@rpi_management_bp.route('/api/admin/rpi/devices/<device_id>/config', methods=['PUT'])
def update_device_config(device_id):
    """Update device configuration"""
    try:
        data = request.get_json()
        
        device = RpiDevice.query.filter_by(device_id=device_id).first()
        
        if not device:
            return jsonify({
                'success': False,
                'message': 'Device not found'
            }), 404
        
        # Update fields
        if 'device_name' in data:
            device.device_name = data['device_name']
        if 'location' in data:
            device.location = data['location']
        if 'scanner_mode' in data:
            device.scanner_mode = data['scanner_mode']
        if 'is_enabled' in data:
            device.is_enabled = data['is_enabled']
        if 'config' in data:
            device.config_data = {**(device.config_data or {}), **data['config']}
        
        device.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Device configuration updated',
            'device': device.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error updating device config: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to update device configuration',
            'error': str(e)
        }), 500


@rpi_management_bp.route('/api/admin/rpi/devices/<device_id>', methods=['GET'])
def get_device(device_id):
    """Get a specific device by ID"""
    try:
        device = RpiDevice.query.filter_by(device_id=device_id).first()
        
        if not device:
            return jsonify({
                'success': False,
                'message': 'Device not found'
            }), 404
        
        # Update online status
        device.is_online = device.is_heartbeat_recent(timeout_minutes=5)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'device': device.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error fetching device: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to fetch device',
            'error': str(e)
        }), 500


# ==================== Device Heartbeat Endpoint ====================

@rpi_management_bp.route('/api/rpi/heartbeat', methods=['POST'])
def device_heartbeat():
    """Receive heartbeat from a device to track online status"""
    try:
        data = request.get_json()
        device_id = data.get('device_id')
        
        if not device_id:
            return jsonify({
                'success': False,
                'message': 'Device ID is required'
            }), 400
        
        device = RpiDevice.query.filter_by(device_id=device_id).first()
        
        if not device:
            return jsonify({
                'success': False,
                'message': 'Device not found',
                'registered': False
            }), 404
        
        if not device.is_paired:
            return jsonify({
                'success': False,
                'message': 'Device not paired',
                'paired': False
            }), 403
        
        # Update heartbeat
        device.last_heartbeat = datetime.utcnow()
        device.is_online = True
        
        # Update IP if changed
        ip_address = request.environ.get('HTTP_X_FORWARDED_FOR', request.environ.get('REMOTE_ADDR', ''))
        if ip_address:
            device.ip_address = ip_address
        
        # Check for pending commands
        pending_command = device.pending_command
        if pending_command:
            # Clear the command after sending it
            device.pending_command = None
            device.command_issued_at = None
            device.command_issued_by = None
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Heartbeat received',
            'device': device.to_dict(),
            'config': device.config_data or {},
            'enabled': device.is_enabled,
            'scanner_mode': device.scanner_mode,
            'command': pending_command  # Send any pending command to device
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error processing heartbeat: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to process heartbeat',
            'error': str(e)
        }), 500


# ==================== Power Control Endpoints ====================

@rpi_management_bp.route('/api/admin/rpi/devices/<device_id>/command', methods=['POST'])
def send_device_command(device_id):
    """Send a command to a specific device (reboot, shutdown, restart_kiosk)"""
    try:
        data = request.get_json()
        command = data.get('command')
        admin_user = data.get('admin_user', 'admin')
        
        valid_commands = ['reboot', 'shutdown', 'restart_kiosk']
        if command not in valid_commands:
            return jsonify({
                'success': False,
                'message': f'Invalid command. Valid commands: {", ".join(valid_commands)}'
            }), 400
        
        device = RpiDevice.query.filter_by(device_id=device_id).first()
        
        if not device:
            return jsonify({
                'success': False,
                'message': 'Device not found'
            }), 404
        
        # Queue the command
        device.pending_command = command
        device.command_issued_at = datetime.utcnow()
        device.command_issued_by = admin_user
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Command "{command}" queued for device {device.device_name}',
            'device': device.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error sending command: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to send command',
            'error': str(e)
        }), 500


@rpi_management_bp.route('/api/admin/rpi/devices/bulk/command', methods=['POST'])
def send_bulk_command():
    """Send a command to all online devices"""
    try:
        data = request.get_json()
        command = data.get('command')
        admin_user = data.get('admin_user', 'admin')
        target = data.get('target', 'online')  # 'online', 'all', 'enabled'
        
        valid_commands = ['reboot', 'shutdown', 'restart_kiosk']
        if command not in valid_commands:
            return jsonify({
                'success': False,
                'message': f'Invalid command. Valid commands: {", ".join(valid_commands)}'
            }), 400
        
        # Get devices based on target
        query = RpiDevice.query.filter_by(is_paired=True)
        
        if target == 'online':
            # Only devices with recent heartbeat
            devices = query.all()
            devices = [d for d in devices if d.is_heartbeat_recent(timeout_minutes=5)]
        elif target == 'enabled':
            devices = query.filter_by(is_enabled=True).all()
        else:  # 'all'
            devices = query.all()
        
        # Queue command for each device
        count = 0
        for device in devices:
            device.pending_command = command
            device.command_issued_at = datetime.utcnow()
            device.command_issued_by = admin_user
            count += 1
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Command "{command}" queued for {count} devices',
            'affected_devices': count
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error sending bulk command: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to send bulk command',
            'error': str(e)
        }), 500


@rpi_management_bp.route('/api/admin/rpi/devices/bulk/enable', methods=['POST'])
def bulk_enable_devices():
    """Enable or disable all devices"""
    try:
        data = request.get_json()
        enabled = data.get('enabled', True)
        
        devices = RpiDevice.query.filter_by(is_paired=True).all()
        
        count = 0
        for device in devices:
            device.is_enabled = enabled
            device.updated_at = datetime.utcnow()
            count += 1
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'{"Enabled" if enabled else "Disabled"} {count} devices',
            'affected_devices': count
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error bulk updating devices: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to update devices',
            'error': str(e)
        }), 500


@rpi_management_bp.route('/api/admin/rpi/stats', methods=['GET'])
def get_device_stats():
    """Get overall device statistics"""
    try:
        devices = RpiDevice.query.filter_by(is_paired=True).all()
        
        # Update online status
        for device in devices:
            device.is_online = device.is_heartbeat_recent(timeout_minutes=5)
        
        db.session.commit()
        
        total = len(devices)
        online = sum(1 for d in devices if d.is_online)
        enabled = sum(1 for d in devices if d.is_enabled)
        pending_commands = sum(1 for d in devices if d.pending_command)
        
        return jsonify({
            'success': True,
            'stats': {
                'total': total,
                'online': online,
                'offline': total - online,
                'enabled': enabled,
                'disabled': total - enabled,
                'pending_commands': pending_commands
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error fetching stats: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to fetch statistics',
            'error': str(e)
        }), 500
