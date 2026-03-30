from flask import Blueprint, request, jsonify, redirect, url_for
from models import RpiDevice
from extensions import db

scanner_access_bp = Blueprint('scanner_access', __name__)

@scanner_access_bp.route('/scanner/access/<device_id>')
def scanner_access_check(device_id):
    """Check if device has access to scanner and redirect appropriately"""
    try:
        # Find the device
        device = RpiDevice.query.filter_by(device_id=device_id).first()
        
        if not device:
            return jsonify({
                'success': False,
                'message': 'Device not found',
                'redirect': '/scanner/unauthorized'
            }), 404
        
        if not device.is_paired:
            return jsonify({
                'success': False,
                'message': 'Device not paired',
                'redirect': '/scanner/not-paired'
            }), 403
        
        if not device.is_enabled:
            return jsonify({
                'success': False,
                'message': 'Device is disabled',
                'redirect': '/scanner/disabled'
            }), 403
        
        # Determine redirect based on scanner mode
        scanner_mode = device.scanner_mode or 'both'
        
        if scanner_mode == 'time_in':
            redirect_url = '/scanner/time-in'
        elif scanner_mode == 'time_out':
            redirect_url = '/scanner/time-out'
        else:  # both or default
            # Default to time-in, or use config preference
            config = device.config_data or {}
            default_page = config.get('default_page', 'time-in')
            redirect_url = f'/scanner/{default_page}'
        
        # Update device access time
        from datetime import datetime
        device.last_heartbeat = datetime.utcnow()
        device.is_online = True
        device.ip_address = request.environ.get('HTTP_X_FORWARDED_FOR', request.environ['REMOTE_ADDR'])
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Access granted',
            'redirect': redirect_url,
            'device': device.to_dict(),
            'config': device.config_data or {}
        }), 200
        
    except Exception as e:
        print(f"Error checking scanner access: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to check access',
            'error': str(e)
        }), 500

@scanner_access_bp.route('/api/scanner/device-check', methods=['GET'])
def device_check():
    """API endpoint for device access checking"""
    try:
        device_id = request.args.get('device_id')
        
        if not device_id:
            return jsonify({
                'success': False,
                'message': 'Device ID required'
            }), 400
        
        device = RpiDevice.query.filter_by(device_id=device_id).first()
        
        if not device:
            return jsonify({
                'success': False,
                'message': 'Device not found',
                'access_granted': False
            }), 404
        
        if not device.is_paired:
            return jsonify({
                'success': False,
                'message': 'Device not paired',
                'access_granted': False,
                'pairing_required': True
            }), 403
        
        if not device.is_enabled:
            return jsonify({
                'success': False,
                'message': 'Device is disabled',
                'access_granted': False
            }), 403
        
        # Update heartbeat
        from datetime import datetime
        device.last_heartbeat = datetime.utcnow()
        device.is_online = True
        device.ip_address = request.environ.get('HTTP_X_FORWARDED_FOR', request.environ['REMOTE_ADDR'])
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Access granted',
            'access_granted': True,
            'device': device.to_dict(),
            'config': device.config_data or {},
            'scanner_mode': device.scanner_mode,
            'available_pages': {
                'time_in': device.scanner_mode in ['time_in', 'both'],
                'time_out': device.scanner_mode in ['time_out', 'both']
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error in device check: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to check device access',
            'error': str(e)
        }), 500

# Error pages for scanner access
@scanner_access_bp.route('/scanner/unauthorized')
def scanner_unauthorized():
    """Page shown when device is not found"""
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Unauthorized Device</title>
        <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f8f9fa; }
            .error-container { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); display: inline-block; }
            .error-icon { font-size: 4rem; color: #dc3545; margin-bottom: 20px; }
            h1 { color: #dc3545; margin-bottom: 20px; }
            p { color: #6c757d; margin-bottom: 30px; }
            .btn { padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; }
        </style>
    </head>
    <body>
        <div class="error-container">
            <div class="error-icon">🚫</div>
            <h1>Unauthorized Device</h1>
            <p>This device is not registered in the system.<br>Please contact an administrator for assistance.</p>
            <a href="#" onclick="window.location.reload()" class="btn">Retry</a>
        </div>
    </body>
    </html>
    """

@scanner_access_bp.route('/scanner/not-paired')
def scanner_not_paired():
    """Page shown when device is not paired"""
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Device Not Paired</title>
        <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f8f9fa; }
            .error-container { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); display: inline-block; }
            .error-icon { font-size: 4rem; color: #ffc107; margin-bottom: 20px; }
            h1 { color: #ffc107; margin-bottom: 20px; }
            p { color: #6c757d; margin-bottom: 30px; }
            .btn { padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 0 10px; }
        </style>
    </head>
    <body>
        <div class="error-container">
            <div class="error-icon">⚠️</div>
            <h1>Device Not Paired</h1>
            <p>This device needs to be paired with the system.<br>Please submit a pairing request first.</p>
            <a href="/pairing" class="btn">Request Pairing</a>
            <a href="#" onclick="window.location.reload()" class="btn">Retry</a>
        </div>
    </body>
    </html>
    """

@scanner_access_bp.route('/scanner/disabled')
def scanner_disabled():
    """Page shown when device is disabled"""
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Device Disabled</title>
        <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f8f9fa; }
            .error-container { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); display: inline-block; }
            .error-icon { font-size: 4rem; color: #6c757d; margin-bottom: 20px; }
            h1 { color: #6c757d; margin-bottom: 20px; }
            p { color: #6c757d; margin-bottom: 30px; }
            .btn { padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; }
        </style>
    </head>
    <body>
        <div class="error-container">
            <div class="error-icon">🔒</div>
            <h1>Device Disabled</h1>
            <p>This device has been disabled by an administrator.<br>Please contact support for assistance.</p>
            <a href="#" onclick="window.location.reload()" class="btn">Retry</a>
        </div>
    </body>
    </html>
    """