# MMSU Attendance System - Raspberry Pi Zero 2W Setup Guide

This folder contains all the resources needed to set up a Raspberry Pi Zero 2W as an attendance scanner kiosk for the MMSU Attendance System.

## 📋 Table of Contents

1. [Hardware Requirements](#hardware-requirements)
2. [Initial Setup](#initial-setup)
3. [Network Configuration](#network-configuration)
4. [Installation](#installation)
5. [Device Registration](#device-registration)
6. [Admin Approval](#admin-approval)
7. [Configuration Options](#configuration-options)
8. [Troubleshooting](#troubleshooting)
9. [Management Commands](#management-commands)

---

## 🔧 Hardware Requirements

- **Raspberry Pi Zero 2W** (with WiFi capability)
- **MicroSD Card** (8GB minimum, 16GB recommended)
- **Power Supply** (5V 2.5A recommended)
- **Display** (HDMI or DSI compatible)
- **Keyboard/Mouse** (for initial setup only)

### Optional Accessories
- Case with HDMI port access
- Touch screen display
- USB hub (if using multiple USB devices)

---

## 🚀 Initial Setup

### 1. Download and Flash Raspberry Pi OS

1. Download the **Raspberry Pi Imager** from [https://www.raspberrypi.com/software/](https://www.raspberrypi.com/software/)

2. Download **Raspberry Pi OS Lite (64-bit)**

3. Flash the image to your MicroSD card using the Raspberry Pi Imager
   - Click "Choose OS" → "Raspberry Pi OS (other)" → "Raspberry Pi OS Lite (64-bit)"
   - Click "Choose Storage" and select your MicroSD card
   - Click the **⚙️ Settings** icon to configure:
     - ✅ Enable SSH (optional but recommended)
     - ✅ Set username and password
     - ✅ Configure WiFi (enter your network credentials)
     - ✅ Set locale settings

4. Click "Write" and wait for the process to complete

### 2. First Boot

1. Insert the MicroSD card into the Raspberry Pi
2. Connect the display, keyboard, and power
3. Wait for the Pi to boot up
4. Log in with your configured credentials

---

## 🌐 Network Configuration

### WiFi Setup (if not configured during imaging)

```bash
# Edit WiFi configuration
sudo nano /etc/wpa_supplicant/wpa_supplicant.conf
```

Add your network:
```
country=PH
ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
update_config=1

network={
    ssid="Your_WiFi_Name"
    psk="Your_WiFi_Password"
    priority=1
}
```

Restart WiFi:
```bash
sudo systemctl restart wpa_supplicant
```

### Static IP (Recommended)

Edit DHCP configuration:
```bash
sudo nano /etc/dhcpcd.conf
```

Add at the end:
```
interface wlan0
static ip_address=192.168.1.100/24    # Change to your desired IP
static routers=192.168.1.1             # Your router IP
static domain_name_servers=8.8.8.8 8.8.4.4
```

Reboot:
```bash
sudo reboot
```

---

## 📦 Installation

### 1. Copy Setup Files to the Raspberry Pi

**Option A: Using SCP (SSH file transfer)**
```bash
# From your computer
scp -r a-pizero-resources/* pi@raspberrypi.local:/home/pi/
```

**Option B: Using USB drive**
1. Copy the contents of `a-pizero-resources/` to a USB drive
2. Mount the USB on the Pi and copy files to `/home/pi/`

### 2. Run the Setup Script

```bash
# Navigate to the setup directory
cd /home/pi

# Make the script executable
sudo chmod +x setup.sh

# Run the setup script
sudo bash setup.sh
```

The script will prompt you for:
- **Server URL**: The URL of your MMSU Attendance server (e.g., `http://192.168.1.50:5000`)
- **Device Name**: A friendly name for this scanner (e.g., "Main Entrance Scanner")
- **Device Location**: Physical location description (e.g., "Building A, Ground Floor")

### 3. Reboot

```bash
sudo reboot
```

---

## 📝 Device Registration

After installation and reboot, the Raspberry Pi will:

1. **Boot into kiosk mode** - The browser opens automatically in fullscreen
2. **Attempt to register** - It will contact the server to register as a new device
3. **Display a pairing code** - A 6-character code will be shown on screen

### What you'll see:

```
┌─────────────────────────────────────┐
│     MMSU Attendance System          │
│                                     │
│     Awaiting Admin Approval         │
│                                     │
│     Your Pairing Code:              │
│         ABC123                      │
│                                     │
│     Device ID: RPI-A1B2C3D4         │
│                                     │
│     Share this code with an         │
│     administrator to approve        │
│     your device.                    │
└─────────────────────────────────────┘
```

**Important**: Note down the **Pairing Code** - you'll need to provide this to an administrator.

---

## ✅ Admin Approval

### For Administrators

1. Log into the MMSU Attendance System admin dashboard
2. Navigate to **RPi Device Management** (`/dashboard/rpi/management`)
3. Click on the **"Pairing Requests"** tab
4. Find the pending request matching the device's pairing code
5. Click **"Approve"** to activate the device

### Configuration Options During Approval

When approving a device, you can configure:
- **Scanner Mode**: 
  - `time_in` - Device only shows Time In scanner
  - `time_out` - Device only shows Time Out scanner  
  - `both` - Device can switch between Time In and Time Out

### After Approval

Once approved, the Raspberry Pi will automatically:
1. Detect the approval (checks every 10 seconds)
2. Redirect to the configured scanner page
3. Begin functioning as an attendance scanner

---

## ⚙️ Configuration Options

### Device Configuration File

The main configuration file is located at:
```
/opt/mmsu-attendance/device.conf
```

### Configuration Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `SERVER_URL` | URL of the attendance server | - |
| `DEVICE_NAME` | Friendly device name | Scanner-{hostname} |
| `DEVICE_LOCATION` | Physical location | - |
| `DEVICE_ID` | Unique device identifier (auto-generated) | - |
| `DISPLAY_ROTATION` | Screen rotation (0, 90, 180, 270) | 0 |
| `HEARTBEAT_INTERVAL` | Seconds between heartbeats | 60 |
| `SOUND_ENABLED` | Enable scanner sounds | true |

### Keyboard and Mouse Support

The device is configured to support full keyboard and mouse input:
- **Mouse cursor** is visible for navigation
- **Keyboard input** works in all text fields
- **Press F11** to toggle fullscreen mode
- **Press Ctrl+L** to focus the URL bar

This allows users to:
- Type in search boxes and input fields
- Navigate using mouse clicks
- Browse to different pages if needed

### Changing Configuration

```bash
# Edit configuration
sudo nano /opt/mmsu-attendance/device.conf

# Restart service to apply changes
sudo systemctl restart mmsu-scanner.service
```

---

## 🔍 Troubleshooting

### Device won't boot to kiosk mode

```bash
# Check service status
sudo systemctl status mmsu-scanner.service

# View logs
sudo journalctl -u mmsu-scanner.service -f
```

### No network connection

```bash
# Check WiFi status
iwconfig wlan0

# Check IP address
ip addr show wlan0

# Test connection to server
ping your-server-ip
```

### Browser doesn't open

```bash
# Check if X server is running
ps aux | grep Xorg

# Try starting manually
startx /opt/mmsu-attendance/launcher.sh
```

### Device shows as offline in admin panel

1. Check network connectivity
2. Verify server URL is correct in config
3. Check if heartbeat is running:
```bash
cat /opt/mmsu-attendance/heartbeat.pid
ps aux | grep heartbeat
```

### Reset device registration

If you need to re-register the device:
```bash
sudo mmsu-reset
```

This will clear the device ID and require re-pairing.

---

## 🛠️ Management Commands

The setup script installs several management commands:

### Check Status
```bash
mmsu-status
```
Shows current device status, configuration, and recent logs.

### Restart Service
```bash
mmsu-restart
```
Restarts the scanner service.

### Reset Registration
```bash
mmsu-reset
```
Clears the device registration (requires re-pairing).

### View Logs
```bash
# Real-time logs
tail -f /var/log/mmsu-attendance/launcher.log

# Service logs
sudo journalctl -u mmsu-scanner.service -f
```

### Manual Service Control
```bash
# Stop service
sudo systemctl stop mmsu-scanner.service

# Start service
sudo systemctl start mmsu-scanner.service

# Disable auto-start
sudo systemctl disable mmsu-scanner.service

# Enable auto-start
sudo systemctl enable mmsu-scanner.service
```

---

## 📁 File Structure

After installation, the following files are created:

```
/opt/mmsu-attendance/
├── device.conf          # Main configuration file
├── launcher.sh          # Kiosk launcher script
├── offline.html         # Offline fallback page
├── heartbeat.pid        # Heartbeat process ID
└── browser.pid          # Browser process ID

/var/log/mmsu-attendance/
├── launcher.log         # Main launcher logs
└── device_manager.log   # Device manager logs

/etc/systemd/system/
└── mmsu-scanner.service # Systemd service file

/usr/local/bin/
├── mmsu-status          # Status command
├── mmsu-restart         # Restart command
└── mmsu-reset           # Reset command
```

---

## 🔒 Security Considerations

1. **Change default passwords** on the Raspberry Pi
2. **Use HTTPS** for production deployments (configure SSL on your server)
3. **Firewall**: Consider limiting network access to only the attendance server
4. **Physical security**: Secure the device to prevent tampering

---

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review logs using `mmsu-status` or `journalctl`
3. Contact the system administrator

---

## 📄 License

This software is part of the MMSU Attendance System. 
