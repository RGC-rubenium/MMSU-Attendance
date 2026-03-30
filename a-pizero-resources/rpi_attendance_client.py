#!/usr/bin/env python3
"""
Raspberry Pi Zero Client for MMSU Attendance System
This script handles device pairing, configuration, and scanner page management
"""

import json
import time
import requests
import subprocess
import threading
import uuid
import socket
from datetime import datetime, timedelta
import os
import signal
import sys

class RPiAttendanceClient:
    def __init__(self, config_file='rpi_config.json'):
        self.config_file = config_file
        self.config = self.load_config()
        self.device_id = self.config.get('device_id')
        self.pairing_code = self.config.get('pairing_code')
        self.backend_url = self.config.get('backend_url', 'http://192.168.1.100:5000')
        self.is_paired = self.config.get('is_paired', False)
        self.device_name = self.config.get('device_name', f'RPi-{self.get_mac_address()[-6:]}')
        self.location = self.config.get('location', 'Unknown Location')
        
        # Runtime state
        self.running = True
        self.heartbeat_thread = None
        self.browser_process = None
        self.current_page = None
        
        # Device info
        self.mac_address = self.get_mac_address()
        self.ip_address = self.get_ip_address()
        
        print(f"🔧 RPi Attendance Client initialized")
        print(f"   Device ID: {self.device_id}")
        print(f"   Name: {self.device_name}")
        print(f"   MAC: {self.mac_address}")
        print(f"   IP: {self.ip_address}")
        print(f"   Paired: {self.is_paired}")

    def load_config(self):
        """Load configuration from file"""
        if os.path.exists(self.config_file):
            try:
                with open(self.config_file, 'r') as f:
                    return json.load(f)
            except Exception as e:
                print(f"⚠️ Error loading config: {e}")
                return {}
        return {}

    def save_config(self):
        """Save configuration to file"""
        try:
            with open(self.config_file, 'w') as f:
                json.dump(self.config, f, indent=2)
            print("💾 Configuration saved")
        except Exception as e:
            print(f"❌ Error saving config: {e}")

    def get_mac_address(self):
        """Get MAC address of the device"""
        try:
            # Get MAC address from eth0 or wlan0
            for interface in ['eth0', 'wlan0']:
                try:
                    mac = subprocess.check_output(
                        f"cat /sys/class/net/{interface}/address", 
                        shell=True
                    ).decode().strip()
                    if mac and mac != "00:00:00:00:00:00":
                        return mac.upper()
                except:
                    continue
            
            # Fallback: generate a pseudo-MAC based on device serial
            try:
                with open('/proc/cpuinfo', 'r') as f:
                    for line in f:
                        if line.startswith('Serial'):
                            serial = line.split(':')[1].strip()
                            # Convert last 12 chars of serial to MAC format
                            mac_part = serial[-12:].upper()
                            return f"{mac_part[0:2]}:{mac_part[2:4]}:{mac_part[4:6]}:{mac_part[6:8]}:{mac_part[8:10]}:{mac_part[10:12]}"
            except:
                pass
                
            # Final fallback
            return "AA:BB:CC:DD:EE:FF"
        except Exception as e:
            print(f"⚠️ Error getting MAC address: {e}")
            return "AA:BB:CC:DD:EE:FF"

    def get_ip_address(self):
        """Get current IP address"""
        try:
            # Connect to a remote server to determine local IP
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            s.close()
            return ip
        except Exception:
            return "127.0.0.1"

    def request_pairing(self):
        """Request pairing with the backend"""
        if not self.device_id:
            self.device_id = str(uuid.uuid4())[:8].upper()
            self.config['device_id'] = self.device_id

        print(f"🔗 Requesting pairing for device {self.device_id}...")
        
        try:
            response = requests.post(f"{self.backend_url}/api/rpi/pairing/request", 
                json={
                    'device_id': self.device_id,
                    'device_name': self.device_name,
                    'mac_address': self.mac_address,
                    'location': self.location
                },
                timeout=10
            )
            
            data = response.json()
            
            if data['success']:
                self.pairing_code = data['pairing_code']
                self.config.update({
                    'device_id': self.device_id,
                    'pairing_code': self.pairing_code,
                    'device_name': self.device_name,
                    'location': self.location,
                    'pairing_requested_at': datetime.now().isoformat()
                })
                self.save_config()
                
                print(f"✅ Pairing request submitted successfully!")
                print(f"   Pairing Code: {self.pairing_code}")
                print(f"   Please share this code with an administrator")
                
                return True
            else:
                print(f"❌ Pairing request failed: {data['message']}")
                return False
                
        except Exception as e:
            print(f"❌ Error requesting pairing: {e}")
            return False

    def check_pairing_status(self):
        """Check if pairing has been approved"""
        if not self.device_id or not self.pairing_code:
            return False
            
        try:
            response = requests.get(
                f"{self.backend_url}/api/rpi/pairing/check",
                params={
                    'device_id': self.device_id,
                    'pairing_code': self.pairing_code
                },
                timeout=10
            )
            
            data = response.json()
            
            if data['success'] and data['status'] == 'approved':
                print("🎉 Pairing approved! Device is now paired.")
                self.is_paired = True
                self.config['is_paired'] = True
                self.save_config()
                return True
            elif data.get('status') == 'rejected':
                print(f"❌ Pairing rejected: {data.get('reason', 'No reason provided')}")
                return False
            else:
                print("⏳ Pairing still pending...")
                return False
                
        except Exception as e:
            print(f"❌ Error checking pairing status: {e}")
            return False

    def get_device_config(self):
        """Get device configuration from backend"""
        if not self.is_paired:
            return None
            
        try:
            response = requests.get(
                f"{self.backend_url}/api/rpi/config",
                params={'device_id': self.device_id},
                timeout=10
            )
            
            data = response.json()
            
            if data['success']:
                config = data['config']
                self.config.update({
                    'scanner_mode': config.get('scanner_mode', 'both'),
                    'default_page': config.get('default_page', 'time-in'),
                    'heartbeat_interval': config.get('heartbeat_interval', 30),
                    'backend_url': config.get('backend_url', self.backend_url)
                })
                self.save_config()
                return config
            else:
                print(f"❌ Error getting config: {data['message']}")
                return None
                
        except Exception as e:
            print(f"❌ Error fetching device config: {e}")
            return None

    def send_heartbeat(self):
        """Send heartbeat to backend"""
        if not self.is_paired:
            return False
            
        try:
            response = requests.post(
                f"{self.backend_url}/api/rpi/heartbeat",
                json={'device_id': self.device_id},
                timeout=5
            )
            
            data = response.json()
            return data.get('success', False)
            
        except Exception as e:
            print(f"❌ Heartbeat failed: {e}")
            return False

    def heartbeat_loop(self):
        """Continuous heartbeat loop"""
        interval = self.config.get('heartbeat_interval', 30)
        
        while self.running and self.is_paired:
            success = self.send_heartbeat()
            if success:
                print(f"💓 Heartbeat sent successfully")
            else:
                print(f"💔 Heartbeat failed")
                
            time.sleep(interval)

    def check_device_access(self):
        """Check if device has access to scanner"""
        try:
            response = requests.get(
                f"{self.backend_url}/api/scanner/device-check",
                params={'device_id': self.device_id},
                timeout=10
            )
            
            data = response.json()
            
            if data['success'] and data['access_granted']:
                return data
            else:
                print(f"❌ Access denied: {data['message']}")
                return None
                
        except Exception as e:
            print(f"❌ Error checking device access: {e}")
            return None

    def open_browser_page(self, page_url):
        """Open browser to specified page"""
        try:
            # Kill existing browser process
            if self.browser_process:
                self.browser_process.terminate()
                self.browser_process.wait()
            
            # Open new page in fullscreen browser
            cmd = [
                'chromium-browser',
                '--start-fullscreen',
                '--disable-infobars',
                '--disable-session-crashed-bubble',
                '--disable-restore-session-state',
                '--autoplay-policy=no-user-gesture-required',
                page_url
            ]
            
            print(f"🌐 Opening browser to: {page_url}")
            self.browser_process = subprocess.Popen(cmd)
            self.current_page = page_url
            
            return True
        except Exception as e:
            print(f"❌ Error opening browser: {e}")
            return False

    def launch_scanner_interface(self):
        """Launch the appropriate scanner interface"""
        if not self.is_paired:
            print("❌ Device not paired. Cannot launch scanner.")
            return False
            
        # Get device configuration
        config = self.get_device_config()
        if not config:
            print("❌ Could not get device configuration")
            return False
            
        # Check device access
        access_data = self.check_device_access()
        if not access_data:
            return False
            
        # Determine which page to open
        scanner_mode = config.get('scanner_mode', 'both')
        default_page = config.get('default_page', 'time-in')
        
        if scanner_mode == 'time_in':
            page = 'time-in'
        elif scanner_mode == 'time_out':
            page = 'time-out'
        else:  # both
            page = default_page
            
        page_url = f"{self.backend_url}/scanner/{page}?device_id={self.device_id}"
        
        return self.open_browser_page(page_url)

    def run_pairing_process(self):
        """Run the pairing process"""
        print("🔗 Starting pairing process...")
        
        if not self.request_pairing():
            return False
            
        print("⏳ Waiting for admin approval...")
        print(f"   Pairing Code: {self.pairing_code}")
        print("   Please share this code with an administrator")
        
        # Check status every 10 seconds
        while True:
            time.sleep(10)
            if self.check_pairing_status():
                return True
                
            # Check if user wants to exit
            print("   Still waiting... (Press Ctrl+C to cancel)")

    def run(self):
        """Main run loop"""
        print("🚀 Starting RPi Attendance Client...")
        
        # If not paired, start pairing process
        if not self.is_paired:
            print("📱 Device not paired. Starting pairing process...")
            try:
                if not self.run_pairing_process():
                    print("❌ Pairing failed. Exiting.")
                    return
            except KeyboardInterrupt:
                print("\n🛑 Pairing cancelled by user")
                return
        
        # Start heartbeat thread
        print("💓 Starting heartbeat...")
        self.heartbeat_thread = threading.Thread(target=self.heartbeat_loop, daemon=True)
        self.heartbeat_thread.start()
        
        # Launch scanner interface
        print("🖥️ Launching scanner interface...")
        if not self.launch_scanner_interface():
            print("❌ Failed to launch scanner interface")
            return
            
        print("✅ RPi Attendance Client is running!")
        print("   Press Ctrl+C to stop")
        
        try:
            # Keep running until interrupted
            while self.running:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n🛑 Shutting down...")
            self.shutdown()

    def shutdown(self):
        """Clean shutdown"""
        print("🔌 Shutting down RPi Client...")
        self.running = False
        
        # Close browser
        if self.browser_process:
            self.browser_process.terminate()
            self.browser_process.wait()
            
        print("👋 Goodbye!")

def signal_handler(sig, frame):
    """Handle Ctrl+C gracefully"""
    print("\n🛑 Received shutdown signal")
    sys.exit(0)

def main():
    """Main entry point"""
    print("=" * 50)
    print("🥧 RPi Zero Attendance Client")
    print("   MMSU Attendance System")
    print("=" * 50)
    
    # Set up signal handler
    signal.signal(signal.SIGINT, signal_handler)
    
    # Create and run client
    client = RPiAttendanceClient()
    
    try:
        client.run()
    except Exception as e:
        print(f"💥 Unexpected error: {e}")
        client.shutdown()

if __name__ == "__main__":
    main()