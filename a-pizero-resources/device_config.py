#!/usr/bin/env python3
"""
MMSU Attendance Scanner - Device Configuration Manager
This script manages device configuration on the Raspberry Pi
"""

import os
import sys
import json
import subprocess
import time
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/mmsu-attendance/device_manager.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class DeviceConfigManager:
    """Manages device configuration and server communication"""
    
    CONFIG_FILE = '/opt/mmsu-attendance/device.conf'
    
    def __init__(self):
        self.config = {}
        self.load_config()
    
    def load_config(self):
        """Load configuration from file"""
        if os.path.exists(self.CONFIG_FILE):
            with open(self.CONFIG_FILE, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        self.config[key.strip()] = value.strip()
        else:
            logger.warning(f"Config file not found: {self.CONFIG_FILE}")
    
    def save_config(self):
        """Save configuration to file"""
        try:
            # Read existing file to preserve comments and structure
            lines = []
            if os.path.exists(self.CONFIG_FILE):
                with open(self.CONFIG_FILE, 'r') as f:
                    lines = f.readlines()
            
            # Update values
            updated_keys = set()
            for i, line in enumerate(lines):
                stripped = line.strip()
                if stripped and not stripped.startswith('#') and '=' in stripped:
                    key = stripped.split('=', 1)[0].strip()
                    if key in self.config:
                        lines[i] = f"{key}={self.config[key]}\n"
                        updated_keys.add(key)
            
            # Add new keys
            for key, value in self.config.items():
                if key not in updated_keys:
                    lines.append(f"{key}={value}\n")
            
            with open(self.CONFIG_FILE, 'w') as f:
                f.writelines(lines)
            
            logger.info("Configuration saved successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to save config: {e}")
            return False
    
    def get(self, key, default=None):
        """Get a configuration value"""
        return self.config.get(key, default)
    
    def set(self, key, value):
        """Set a configuration value"""
        self.config[key] = str(value)
        return self.save_config()
    
    @property
    def server_url(self):
        return self.get('SERVER_URL', 'http://localhost:5000')
    
    @property
    def device_id(self):
        return self.get('DEVICE_ID', '')
    
    @device_id.setter
    def device_id(self, value):
        self.set('DEVICE_ID', value)
    
    @property
    def device_name(self):
        return self.get('DEVICE_NAME', f'Scanner-{self.get_hostname()}')
    
    @property
    def mac_address(self):
        return self.get('MAC_ADDRESS', self.get_mac_address())
    
    @staticmethod
    def get_hostname():
        """Get system hostname"""
        try:
            return subprocess.check_output(['hostname']).decode().strip()
        except:
            return 'unknown'
    
    @staticmethod
    def get_mac_address():
        """Get MAC address of wlan0 interface"""
        try:
            with open('/sys/class/net/wlan0/address', 'r') as f:
                return f.read().strip()
        except:
            return 'unknown'
    
    def get_system_info(self):
        """Get system information"""
        return {
            'hostname': self.get_hostname(),
            'mac_address': self.get_mac_address(),
            'kernel': subprocess.check_output(['uname', '-r']).decode().strip(),
            'platform': subprocess.check_output(['uname', '-m']).decode().strip(),
            'timestamp': datetime.utcnow().isoformat()
        }


class DeviceClient:
    """HTTP client for communicating with the attendance server"""
    
    def __init__(self, config_manager):
        self.config = config_manager
        
        # Try to import requests, fall back to urllib if not available
        try:
            import requests
            self.requests = requests
            self.use_requests = True
        except ImportError:
            import urllib.request
            import urllib.error
            self.urllib_request = urllib.request
            self.urllib_error = urllib.error
            self.use_requests = False
    
    def _make_request(self, method, endpoint, data=None):
        """Make HTTP request to server"""
        url = f"{self.config.server_url}{endpoint}"
        
        if self.use_requests:
            try:
                if method == 'GET':
                    response = self.requests.get(url, timeout=30)
                elif method == 'POST':
                    response = self.requests.post(
                        url, 
                        json=data, 
                        headers={'Content-Type': 'application/json'},
                        timeout=30
                    )
                
                return response.json()
            except self.requests.exceptions.RequestException as e:
                logger.error(f"Request error: {e}")
                return {'success': False, 'error': str(e)}
        else:
            # Use urllib
            try:
                req_data = json.dumps(data).encode('utf-8') if data else None
                req = self.urllib_request.Request(
                    url,
                    data=req_data,
                    method=method,
                    headers={'Content-Type': 'application/json'} if data else {}
                )
                
                with self.urllib_request.urlopen(req, timeout=30) as response:
                    return json.loads(response.read().decode('utf-8'))
            except Exception as e:
                logger.error(f"Request error: {e}")
                return {'success': False, 'error': str(e)}
    
    def check_eligibility(self):
        """Check device eligibility"""
        device_id = self.config.device_id
        
        if not device_id:
            return {
                'eligible': False,
                'reason': 'no_device_id',
                'action': 'register'
            }
        
        response = self._make_request('GET', f'/api/device/check-eligibility?device_id={device_id}')
        return response
    
    def register_device(self):
        """Register device with server"""
        data = {
            'device_name': self.config.device_name,
            'location': self.config.get('DEVICE_LOCATION', ''),
            'mac_address': self.config.mac_address,
            'system_info': self.config.get_system_info()
        }
        
        response = self._make_request('POST', '/api/device/register', data)
        
        if response.get('success'):
            self.config.device_id = response.get('device_id', '')
            logger.info(f"Device registered: {response.get('device_id')}")
            logger.info(f"Pairing code: {response.get('pairing_code')}")
        
        return response
    
    def send_heartbeat(self):
        """Send heartbeat to server"""
        device_id = self.config.device_id
        
        if not device_id:
            return {'success': False, 'error': 'No device ID'}
        
        response = self._make_request('POST', '/api/rpi/heartbeat', {'device_id': device_id})
        return response
    
    def get_device_status(self):
        """Get device status from server"""
        device_id = self.config.device_id
        
        if not device_id:
            return {'success': False, 'error': 'No device ID'}
        
        response = self._make_request('GET', f'/api/device/status/{device_id}')
        return response
    
    def get_device_config(self):
        """Get device configuration from server"""
        device_id = self.config.device_id
        
        if not device_id:
            return {'success': False, 'error': 'No device ID'}
        
        response = self._make_request('GET', f'/api/device/config/{device_id}')
        return response


def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description='MMSU Device Configuration Manager')
    parser.add_argument('command', choices=['status', 'register', 'check', 'heartbeat', 'config'],
                        help='Command to execute')
    parser.add_argument('--json', action='store_true', help='Output as JSON')
    
    args = parser.parse_args()
    
    config = DeviceConfigManager()
    client = DeviceClient(config)
    
    if args.command == 'status':
        result = client.get_device_status()
    elif args.command == 'register':
        result = client.register_device()
    elif args.command == 'check':
        result = client.check_eligibility()
    elif args.command == 'heartbeat':
        result = client.send_heartbeat()
    elif args.command == 'config':
        result = client.get_device_config()
    
    if args.json:
        print(json.dumps(result, indent=2))
    else:
        if result.get('success') or result.get('eligible'):
            print(f"✓ Success: {result.get('message', 'Operation completed')}")
            for key, value in result.items():
                if key not in ['success', 'message']:
                    print(f"  {key}: {value}")
        else:
            print(f"✗ Error: {result.get('message', result.get('error', 'Unknown error'))}")
            if result.get('reason'):
                print(f"  Reason: {result.get('reason')}")
            if result.get('action'):
                print(f"  Action: {result.get('action')}")


if __name__ == '__main__':
    main()
