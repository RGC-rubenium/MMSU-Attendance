"""
RPI Device Management API
Handles device registration, pairing, approval, and configuration
Includes SSH-based remote management (reboot, shutdown, time sync)
Server-side scheduled auto-shutdown using SSH
"""

from flask import Blueprint, request, jsonify
from models import RpiDevice, PairingRequest
from extensions import db
from datetime import datetime, timedelta
import uuid
import random
import string
import threading
import time as time_module

# SSH functionality using paramiko
try:
    import paramiko
    PARAMIKO_AVAILABLE = True
except ImportError:
    PARAMIKO_AVAILABLE = False
    print("Warning: paramiko not installed. SSH remote management disabled.")

rpi_management_bp = Blueprint('rpi_management', __name__)

# Global scheduler thread reference
_scheduler_thread = None
_scheduler_running = False


# ==================== SSH Helper Functions ====================

def execute_ssh_command(ip_address, username, password, command, port=22, timeout=30):
    """Execute SSH command on a remote device"""
    if not PARAMIKO_AVAILABLE:
        return {'success': False, 'error': 'paramiko not installed'}
    
    try:
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect(
            hostname=ip_address,
            port=port,
            username=username,
            password=password,
            timeout=timeout,
            allow_agent=False,
            look_for_keys=False
        )
        
        stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
        output = stdout.read().decode('utf-8').strip()
        error = stderr.read().decode('utf-8').strip()
        exit_code = stdout.channel.recv_exit_status()
        
        client.close()
        
        return {
            'success': exit_code == 0,
            'output': output,
            'error': error,
            'exit_code': exit_code
        }
    except paramiko.AuthenticationException:
        return {'success': False, 'error': 'Authentication failed. Check username/password.'}
    except paramiko.SSHException as e:
        return {'success': False, 'error': f'SSH error: {str(e)}'}
    except Exception as e:
        return {'success': False, 'error': str(e)}


def execute_ssh_command_async(ip_address, username, password, command, port=22):
    """Execute SSH command asynchronously (for reboot/shutdown which close connection)"""
    if not PARAMIKO_AVAILABLE:
        return {'success': False, 'error': 'paramiko not installed'}
    
    try:
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect(
            hostname=ip_address,
            port=port,
            username=username,
            password=password,
            timeout=10,
            allow_agent=False,
            look_for_keys=False
        )
        
        # Execute command without waiting for response (for reboot/shutdown)
        client.exec_command(command, timeout=5)
        
        # Brief delay to allow command to start
        time_module.sleep(0.5)
        
        client.close()
        return {'success': True, 'output': 'Command sent successfully'}
    except paramiko.AuthenticationException:
        return {'success': False, 'error': 'Authentication failed. Check username/password.'}
    except paramiko.SSHException as e:
        return {'success': False, 'error': f'SSH error: {str(e)}'}
    except Exception as e:
        # Connection might close during reboot/shutdown - this is expected
        if 'reboot' in command.lower() or 'shutdown' in command.lower() or 'poweroff' in command.lower():
            return {'success': True, 'output': 'Command sent (connection closed as expected)'}
        return {'success': False, 'error': str(e)}


# ==================== Auto-Shutdown Scheduler ====================

def check_and_execute_scheduled_shutdowns(app):
    """Check all devices for scheduled shutdowns and execute via SSH"""
    global _scheduler_running
    
    while _scheduler_running:
        try:
            with app.app_context():
                current_time = datetime.now().strftime('%H:%M')
                
                # Find devices with auto-shutdown enabled at current time
                devices = RpiDevice.query.filter_by(
                    is_paired=True,
                    auto_shutdown_enabled=True,
                    auto_shutdown_time=current_time
                ).all()
                
                for device in devices:
                    # Only shutdown if device has SSH credentials and IP
                    if device.ssh_username and device.ssh_password and device.ip_address:
                        print(f"[Auto-Shutdown] Executing scheduled shutdown for {device.device_name} at {current_time}")
                        
                        result = execute_ssh_command_async(
                            device.ip_address,
                            device.ssh_username,
                            device.ssh_password,
                            'sudo shutdown -h now',
                            device.ssh_port or 22
                        )
                        
                        if result['success']:
                            device.pending_command = 'scheduled_shutdown'
                            device.command_issued_at = datetime.utcnow()
                            device.command_issued_by = 'auto_scheduler'
                            print(f"[Auto-Shutdown] Successfully sent shutdown to {device.device_name}")
                        else:
                            print(f"[Auto-Shutdown] Failed to shutdown {device.device_name}: {result.get('error')}")
                    else:
                        print(f"[Auto-Shutdown] Skipping {device.device_name} - no SSH credentials configured")
                
                if devices:
                    db.session.commit()
                    
        except Exception as e:
            print(f"[Auto-Shutdown] Scheduler error: {e}")
        
        # Sleep for 60 seconds before next check
        time_module.sleep(60)


def start_auto_shutdown_scheduler(app):
    """Start the auto-shutdown scheduler thread"""
    global _scheduler_thread, _scheduler_running
    
    if _scheduler_thread is not None and _scheduler_thread.is_alive():
        print("[Auto-Shutdown] Scheduler already running")
        return
    
    _scheduler_running = True
    _scheduler_thread = threading.Thread(
        target=check_and_execute_scheduled_shutdowns,
        args=(app,),
        daemon=True
    )
    _scheduler_thread.start()
    print("[Auto-Shutdown] Scheduler started")


def stop_auto_shutdown_scheduler():
    """Stop the auto-shutdown scheduler thread"""
    global _scheduler_running
    _scheduler_running = False
    print("[Auto-Shutdown] Scheduler stopped")


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
        
        # Auto-shutdown settings
        if 'auto_shutdown_enabled' in data:
            device.auto_shutdown_enabled = data['auto_shutdown_enabled']
        if 'auto_shutdown_time' in data:
            # Validate time format HH:MM
            shutdown_time = data['auto_shutdown_time']
            if shutdown_time:
                try:
                    hours, minutes = map(int, shutdown_time.split(':'))
                    if 0 <= hours <= 23 and 0 <= minutes <= 59:
                        device.auto_shutdown_time = shutdown_time
                    else:
                        return jsonify({
                            'success': False,
                            'message': 'Invalid shutdown time. Use HH:MM format (00:00-23:59)'
                        }), 400
                except (ValueError, AttributeError):
                    return jsonify({
                        'success': False,
                        'message': 'Invalid shutdown time format. Use HH:MM'
                    }), 400
            else:
                device.auto_shutdown_time = None
        
        # SSH credentials
        if 'ssh_username' in data:
            device.ssh_username = data['ssh_username'] if data['ssh_username'] else None
        if 'ssh_password' in data:
            device.ssh_password = data['ssh_password'] if data['ssh_password'] else None
        if 'ssh_port' in data:
            device.ssh_port = int(data['ssh_port']) if data['ssh_port'] else 22
        
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


# ==================== Time Sync Endpoint ====================

@rpi_management_bp.route('/api/rpi/time', methods=['GET'])
def get_server_time():
    """Get current server time for device time synchronization"""
    return jsonify({
        'success': True,
        'server_time': datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S'),
        'server_timezone': 'UTC'
    }), 200


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
        
        # Update IP if provided in request body (from Pi) or from request headers
        ip_from_body = data.get('ip_address')
        ip_from_headers = request.environ.get('HTTP_X_FORWARDED_FOR', request.environ.get('REMOTE_ADDR', ''))
        ip_address = ip_from_body or ip_from_headers
        if ip_address:
            device.ip_address = ip_address.split(',')[0].strip()  # Handle comma-separated IPs
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Heartbeat received',
            'device': device.to_dict(),
            'config': device.config_data or {},
            'enabled': device.is_enabled,
            'scanner_mode': device.scanner_mode,
            'auto_shutdown_enabled': device.auto_shutdown_enabled,
            'auto_shutdown_time': device.auto_shutdown_time,
            'server_time': datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S'),
            'server_timezone': 'UTC'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error processing heartbeat: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to process heartbeat',
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
        
        return jsonify({
            'success': True,
            'stats': {
                'total': total,
                'online': online,
                'offline': total - online,
                'enabled': enabled,
                'disabled': total - enabled
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


# ==================== SSH Remote Management Endpoints ====================

@rpi_management_bp.route('/api/admin/rpi/devices/<device_id>/ssh/credentials', methods=['PUT'])
def update_ssh_credentials(device_id):
    """Update SSH credentials for a device"""
    try:
        data = request.get_json()
        
        device = RpiDevice.query.filter_by(device_id=device_id).first()
        
        if not device:
            return jsonify({
                'success': False,
                'message': 'Device not found'
            }), 404
        
        # Update SSH credentials
        if 'ssh_username' in data:
            device.ssh_username = data['ssh_username'] if data['ssh_username'] else None
        if 'ssh_password' in data:
            device.ssh_password = data['ssh_password'] if data['ssh_password'] else None
        if 'ssh_port' in data:
            device.ssh_port = int(data['ssh_port']) if data['ssh_port'] else 22
        
        device.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'SSH credentials updated',
            'has_ssh_credentials': bool(device.ssh_username and device.ssh_password)
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error updating SSH credentials: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to update SSH credentials',
            'error': str(e)
        }), 500


@rpi_management_bp.route('/api/admin/rpi/devices/<device_id>/ssh/reboot', methods=['POST'])
def reboot_device(device_id):
    """Reboot a device via SSH"""
    try:
        if not PARAMIKO_AVAILABLE:
            return jsonify({
                'success': False,
                'message': 'SSH functionality not available. Install paramiko.'
            }), 503
        
        device = RpiDevice.query.filter_by(device_id=device_id).first()
        
        if not device:
            return jsonify({
                'success': False,
                'message': 'Device not found'
            }), 404
        
        if not device.ip_address:
            return jsonify({
                'success': False,
                'message': 'Device IP address not available'
            }), 400
        
        if not device.ssh_username or not device.ssh_password:
            return jsonify({
                'success': False,
                'message': 'SSH credentials not configured for this device'
            }), 400
        
        # Execute reboot command
        result = execute_ssh_command_async(
            device.ip_address,
            device.ssh_username,
            device.ssh_password,
            'sudo reboot',
            device.ssh_port or 22
        )
        
        if result['success']:
            device.pending_command = 'reboot'
            device.command_issued_at = datetime.utcnow()
            device.command_issued_by = request.get_json().get('admin_user', 'admin')
            db.session.commit()
        
        return jsonify({
            'success': result['success'],
            'message': 'Reboot command sent' if result['success'] else result.get('error', 'Failed to send reboot command'),
            'device_id': device_id
        }), 200 if result['success'] else 500
        
    except Exception as e:
        db.session.rollback()
        print(f"Error rebooting device: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to reboot device',
            'error': str(e)
        }), 500


@rpi_management_bp.route('/api/admin/rpi/devices/<device_id>/ssh/shutdown', methods=['POST'])
def shutdown_device(device_id):
    """Shutdown a device via SSH"""
    try:
        if not PARAMIKO_AVAILABLE:
            return jsonify({
                'success': False,
                'message': 'SSH functionality not available. Install paramiko.'
            }), 503
        
        device = RpiDevice.query.filter_by(device_id=device_id).first()
        
        if not device:
            return jsonify({
                'success': False,
                'message': 'Device not found'
            }), 404
        
        if not device.ip_address:
            return jsonify({
                'success': False,
                'message': 'Device IP address not available'
            }), 400
        
        if not device.ssh_username or not device.ssh_password:
            return jsonify({
                'success': False,
                'message': 'SSH credentials not configured for this device'
            }), 400
        
        # Execute shutdown command
        result = execute_ssh_command_async(
            device.ip_address,
            device.ssh_username,
            device.ssh_password,
            'sudo shutdown -h now',
            device.ssh_port or 22
        )
        
        if result['success']:
            device.pending_command = 'shutdown'
            device.command_issued_at = datetime.utcnow()
            device.command_issued_by = request.get_json().get('admin_user', 'admin')
            db.session.commit()
        
        return jsonify({
            'success': result['success'],
            'message': 'Shutdown command sent' if result['success'] else result.get('error', 'Failed to send shutdown command'),
            'device_id': device_id
        }), 200 if result['success'] else 500
        
    except Exception as e:
        db.session.rollback()
        print(f"Error shutting down device: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to shutdown device',
            'error': str(e)
        }), 500


@rpi_management_bp.route('/api/admin/rpi/devices/<device_id>/ssh/sync-time', methods=['POST'])
def sync_device_time(device_id):
    """Sync server time to device via SSH"""
    try:
        if not PARAMIKO_AVAILABLE:
            return jsonify({
                'success': False,
                'message': 'SSH functionality not available. Install paramiko.'
            }), 503
        
        device = RpiDevice.query.filter_by(device_id=device_id).first()
        
        if not device:
            return jsonify({
                'success': False,
                'message': 'Device not found'
            }), 404
        
        if not device.ip_address:
            return jsonify({
                'success': False,
                'message': 'Device IP address not available'
            }), 400
        
        if not device.ssh_username or not device.ssh_password:
            return jsonify({
                'success': False,
                'message': 'SSH credentials not configured for this device'
            }), 400
        
        # Get current server time and sync to device
        server_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        # Set system time on device using timedatectl or date command
        sync_command = f'sudo timedatectl set-time "{server_time}" || sudo date -s "{server_time}"'
        
        result = execute_ssh_command(
            device.ip_address,
            device.ssh_username,
            device.ssh_password,
            sync_command,
            device.ssh_port or 22
        )
        
        return jsonify({
            'success': result['success'],
            'message': f'Time synced to {server_time}' if result['success'] else result.get('error', 'Failed to sync time'),
            'server_time': server_time,
            'device_id': device_id
        }), 200 if result['success'] else 500
        
    except Exception as e:
        print(f"Error syncing device time: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to sync device time',
            'error': str(e)
        }), 500


# ==================== Bulk SSH Operations ====================

@rpi_management_bp.route('/api/admin/rpi/bulk/reboot', methods=['POST'])
def bulk_reboot_devices():
    """Reboot multiple devices via SSH"""
    try:
        if not PARAMIKO_AVAILABLE:
            return jsonify({
                'success': False,
                'message': 'SSH functionality not available. Install paramiko.'
            }), 503
        
        data = request.get_json()
        device_ids = data.get('device_ids', [])
        admin_user = data.get('admin_user', 'admin')
        
        if not device_ids:
            return jsonify({
                'success': False,
                'message': 'No device IDs provided'
            }), 400
        
        results = []
        success_count = 0
        skip_count = 0
        fail_count = 0
        
        for device_id in device_ids:
            device = RpiDevice.query.filter_by(device_id=device_id).first()
            
            if not device:
                results.append({'device_id': device_id, 'status': 'not_found', 'message': 'Device not found'})
                fail_count += 1
                continue
            
            if not device.ip_address:
                results.append({'device_id': device_id, 'status': 'skipped', 'message': 'No IP address'})
                skip_count += 1
                continue
            
            if not device.ssh_username or not device.ssh_password:
                results.append({'device_id': device_id, 'status': 'skipped', 'message': 'No SSH credentials'})
                skip_count += 1
                continue
            
            result = execute_ssh_command_async(
                device.ip_address,
                device.ssh_username,
                device.ssh_password,
                'sudo reboot',
                device.ssh_port or 22
            )
            
            if result['success']:
                device.pending_command = 'reboot'
                device.command_issued_at = datetime.utcnow()
                device.command_issued_by = admin_user
                results.append({'device_id': device_id, 'status': 'success', 'message': 'Reboot command sent'})
                success_count += 1
            else:
                results.append({'device_id': device_id, 'status': 'failed', 'message': result.get('error', 'Failed')})
                fail_count += 1
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Bulk reboot completed: {success_count} success, {skip_count} skipped, {fail_count} failed',
            'results': results,
            'summary': {
                'total': len(device_ids),
                'success': success_count,
                'skipped': skip_count,
                'failed': fail_count
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error in bulk reboot: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to perform bulk reboot',
            'error': str(e)
        }), 500


@rpi_management_bp.route('/api/admin/rpi/bulk/shutdown', methods=['POST'])
def bulk_shutdown_devices():
    """Shutdown multiple devices via SSH"""
    try:
        if not PARAMIKO_AVAILABLE:
            return jsonify({
                'success': False,
                'message': 'SSH functionality not available. Install paramiko.'
            }), 503
        
        data = request.get_json()
        device_ids = data.get('device_ids', [])
        admin_user = data.get('admin_user', 'admin')
        
        if not device_ids:
            return jsonify({
                'success': False,
                'message': 'No device IDs provided'
            }), 400
        
        results = []
        success_count = 0
        skip_count = 0
        fail_count = 0
        
        for device_id in device_ids:
            device = RpiDevice.query.filter_by(device_id=device_id).first()
            
            if not device:
                results.append({'device_id': device_id, 'status': 'not_found', 'message': 'Device not found'})
                fail_count += 1
                continue
            
            if not device.ip_address:
                results.append({'device_id': device_id, 'status': 'skipped', 'message': 'No IP address'})
                skip_count += 1
                continue
            
            if not device.ssh_username or not device.ssh_password:
                results.append({'device_id': device_id, 'status': 'skipped', 'message': 'No SSH credentials'})
                skip_count += 1
                continue
            
            result = execute_ssh_command_async(
                device.ip_address,
                device.ssh_username,
                device.ssh_password,
                'sudo shutdown -h now',
                device.ssh_port or 22
            )
            
            if result['success']:
                device.pending_command = 'shutdown'
                device.command_issued_at = datetime.utcnow()
                device.command_issued_by = admin_user
                results.append({'device_id': device_id, 'status': 'success', 'message': 'Shutdown command sent'})
                success_count += 1
            else:
                results.append({'device_id': device_id, 'status': 'failed', 'message': result.get('error', 'Failed')})
                fail_count += 1
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Bulk shutdown completed: {success_count} success, {skip_count} skipped, {fail_count} failed',
            'results': results,
            'summary': {
                'total': len(device_ids),
                'success': success_count,
                'skipped': skip_count,
                'failed': fail_count
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error in bulk shutdown: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to perform bulk shutdown',
            'error': str(e)
        }), 500


@rpi_management_bp.route('/api/admin/rpi/bulk/sync-time', methods=['POST'])
def bulk_sync_time():
    """Sync server time to multiple devices via SSH"""
    try:
        if not PARAMIKO_AVAILABLE:
            return jsonify({
                'success': False,
                'message': 'SSH functionality not available. Install paramiko.'
            }), 503
        
        data = request.get_json()
        device_ids = data.get('device_ids', [])
        
        if not device_ids:
            return jsonify({
                'success': False,
                'message': 'No device IDs provided'
            }), 400
        
        results = []
        success_count = 0
        skip_count = 0
        fail_count = 0
        
        # Get server time once for all devices
        server_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        sync_command = f'sudo timedatectl set-time "{server_time}" || sudo date -s "{server_time}"'
        
        for device_id in device_ids:
            device = RpiDevice.query.filter_by(device_id=device_id).first()
            
            if not device:
                results.append({'device_id': device_id, 'status': 'not_found', 'message': 'Device not found'})
                fail_count += 1
                continue
            
            if not device.ip_address:
                results.append({'device_id': device_id, 'status': 'skipped', 'message': 'No IP address'})
                skip_count += 1
                continue
            
            if not device.ssh_username or not device.ssh_password:
                results.append({'device_id': device_id, 'status': 'skipped', 'message': 'No SSH credentials'})
                skip_count += 1
                continue
            
            result = execute_ssh_command(
                device.ip_address,
                device.ssh_username,
                device.ssh_password,
                sync_command,
                device.ssh_port or 22
            )
            
            if result['success']:
                results.append({'device_id': device_id, 'status': 'success', 'message': f'Time synced to {server_time}'})
                success_count += 1
            else:
                results.append({'device_id': device_id, 'status': 'failed', 'message': result.get('error', 'Failed')})
                fail_count += 1
        
        return jsonify({
            'success': True,
            'message': f'Bulk time sync completed: {success_count} success, {skip_count} skipped, {fail_count} failed',
            'server_time': server_time,
            'results': results,
            'summary': {
                'total': len(device_ids),
                'success': success_count,
                'skipped': skip_count,
                'failed': fail_count
            }
        }), 200
        
    except Exception as e:
        print(f"Error in bulk time sync: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to perform bulk time sync',
            'error': str(e)
        }), 500
