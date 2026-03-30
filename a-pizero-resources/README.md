# RPi Zero Attendance Scanner Setup

This directory contains the complete Raspberry Pi Zero attendance scanner system that integrates with the MMSU Attendance System backend.

## 📋 Overview

The RPi Zero client system provides:

- **Device Pairing**: Secure pairing process with admin approval
- **Status Monitoring**: Real-time online/offline status tracking
- **Remote Configuration**: Configure scanner modes and settings from web admin
- **Access Control**: Automatic redirection based on device permissions
- **Kiosk Mode**: Full-screen scanner interface for dedicated terminals

## 🛠️ Installation

### Prerequisites
- Raspberry Pi Zero W with Raspbian OS installed
- Network connectivity (WiFi or Ethernet)
- Monitor/display connected via HDMI
- Backend server accessible on the network

### Quick Install

1. Copy the files to your Raspberry Pi:
```bash
scp -r a-pizero-resources pi@<rpi-ip>:~/
```

2. Run the installation script:
```bash
ssh pi@<rpi-ip>
cd a-pizero-resources
chmod +x install.sh
sudo ./install.sh
```

3. Configure the backend URL:
```bash
sudo nano /home/attendance/scanner/rpi_config.json
```

4. Reboot the Pi:
```bash
sudo reboot
```

## ⚙️ Configuration

### Config File (`rpi_config.json`)

```json
{
  "device_id": null,                    // Auto-generated during pairing
  "device_name": "Scanner Terminal 1",  // Display name for the device
  "location": "Main Entrance",          // Physical location description
  "backend_url": "http://192.168.1.100:5000",  // Backend server URL
  "is_paired": false,                   // Pairing status (auto-managed)
  "pairing_code": null,                 // Pairing code (auto-generated)
  "scanner_mode": "both",               // "time_in", "time_out", or "both"
  "default_page": "time-in",            // Default page when mode is "both"
  "heartbeat_interval": 30,             // Heartbeat interval in seconds
  "auto_start": true,                   // Auto-start on boot
  "fullscreen": true,                   // Run browser in fullscreen
  "kiosk_mode": true                    // Enable kiosk mode features
}
```

### Configuration Helper

Use the configuration helper script:
```bash
sudo -u attendance /home/attendance/configure_scanner.sh
```

## 🔗 Pairing Process

### 1. Initial Setup
When the RPi first boots, it will:
1. Generate a unique device ID
2. Request pairing with the backend
3. Display a 6-digit pairing code
4. Wait for admin approval

### 2. Admin Approval
Administrators can:
1. View pairing requests in the web admin panel
2. Approve or reject requests with reasons
3. Configure device settings remotely

### 3. Auto-Launch
Once paired and approved:
1. Device automatically launches the scanner interface
2. Sends regular heartbeats to maintain online status
3. Receives configuration updates from the backend

## 🖥️ Scanner Interface

### Supported Modes

- **Time In Only**: Device only shows time-in scanner
- **Time Out Only**: Device only shows time-out scanner  
- **Both**: Device can switch between time-in and time-out

### Access Control

The system automatically:
- Checks device pairing status
- Validates device permissions
- Redirects to appropriate scanner page
- Shows error pages for unauthorized access

## 🔧 Management Commands

### Service Management
```bash
# Check service status
sudo systemctl status attendance-client

# Start/stop/restart service
sudo systemctl start attendance-client
sudo systemctl stop attendance-client
sudo systemctl restart attendance-client

# View live logs
sudo journalctl -u attendance-client -f

# Enable/disable auto-start
sudo systemctl enable attendance-client
sudo systemctl disable attendance-client
```

### Manual Control
```bash
# Start scanner manually
sudo -u attendance /home/attendance/start_scanner.sh

# Configure device
sudo -u attendance /home/attendance/configure_scanner.sh

# Edit config directly
sudo nano /home/attendance/scanner/rpi_config.json
```

## 📊 Backend Integration

### API Endpoints Used

- **POST** `/api/rpi/pairing/request` - Request device pairing
- **GET** `/api/rpi/pairing/check` - Check pairing status
- **POST** `/api/rpi/heartbeat` - Send device heartbeat
- **GET** `/api/rpi/config` - Get device configuration
- **GET** `/api/scanner/device-check` - Verify scanner access

### Web Admin Features

- View all paired devices with online/offline status
- Approve/reject pairing requests
- Configure device settings remotely
- Enable/disable devices
- Unpair devices when needed

## 🔍 Troubleshooting

### Common Issues

**Device not pairing:**
- Check network connectivity
- Verify backend URL in config
- Check firewall settings
- View logs: `sudo journalctl -u attendance-client -f`

**Scanner not loading:**
- Verify device is paired and enabled
- Check backend server is running
- Test backend URL in browser
- Restart service: `sudo systemctl restart attendance-client`

**Display issues:**
- Check HDMI connection
- Verify display settings in `/boot/config.txt`
- Try different HDMI modes in boot config

### Log Locations
- Service logs: `sudo journalctl -u attendance-client`
- Boot logs: `dmesg`
- X11 logs: `/home/attendance/.xsession-errors`

## 🔄 Updates

### Updating Client Code
```bash
# Stop service
sudo systemctl stop attendance-client

# Copy new files
sudo cp rpi_attendance_client.py /home/attendance/scanner/

# Fix permissions
sudo chown attendance:attendance /home/attendance/scanner/rpi_attendance_client.py

# Start service
sudo systemctl start attendance-client
```

### Configuration Updates
Most configuration changes are applied automatically via the web admin interface. Manual changes require a service restart.

## 🔐 Security Notes

- Each device gets a unique ID and pairing code
- All communication uses HTTPS when properly configured
- Devices require admin approval before activation
- Unpaired devices are automatically blocked
- Regular heartbeats ensure device authenticity

## 📝 File Structure

```
/home/attendance/scanner/
├── rpi_attendance_client.py    # Main client application
├── rpi_config.json            # Device configuration
└── configure.py               # Configuration helper

/etc/systemd/system/
└── attendance-client.service  # Systemd service file

/home/attendance/
├── start_scanner.sh          # Manual start script
├── configure_scanner.sh      # Configuration script
├── .xinitrc                 # X11 startup script
└── .config/autostart/       # Auto-start configuration
```

## 🎯 Next Steps

1. **Set up multiple devices**: Repeat installation for additional terminals
2. **Configure network**: Set up proper DNS and network routing
3. **SSL/HTTPS**: Configure SSL certificates for secure communication
4. **Backup**: Set up automatic config backup and restore procedures
5. **Monitoring**: Set up centralized logging and monitoring