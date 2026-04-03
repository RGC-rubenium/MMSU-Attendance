#!/bin/bash

# ============================================================
# MMSU Attendance System - Raspberry Pi Zero 2W Setup Script
# ============================================================
# This script sets up a Raspberry Pi Zero 2W as a kiosk device
# for the MMSU Attendance System scanner interface.
# ============================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print functions
print_status() { echo -e "${BLUE}[i]${NC} $1"; }
print_success() { echo -e "${GREEN}[✓]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[!]${NC} $1"; }
print_error() { echo -e "${RED}[✗]${NC} $1"; }

# Configuration
INSTALL_DIR="/home/$(logname)/attendance"
CONFIG_FILE="${INSTALL_DIR}/device_config.json"
SERVICE_NAME="attendance-kiosk"
CURRENT_USER=$(logname)

# Default values
DEFAULT_SERVER_URL="http://your-server-ip:5000"
DEFAULT_DEVICE_NAME="Scanner-$(hostname)"

# ============================================================
# Check if running as root
# ============================================================
if [ "$EUID" -ne 0 ]; then
    print_error "Please run this script with sudo: sudo ./setup.sh"
    exit 1
fi

# ============================================================
# Welcome Banner
# ============================================================
clear
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║     MMSU Attendance System - Raspberry Pi Setup            ║"
echo "║     Version 1.0 - For Raspberry Pi Zero 2W                 ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# ============================================================
# Get Configuration from User
# ============================================================
print_status "Please enter the configuration details:"
echo ""

read -p "Server URL (default: ${DEFAULT_SERVER_URL}): " SERVER_URL
SERVER_URL=${SERVER_URL:-$DEFAULT_SERVER_URL}

read -p "Device Name (default: ${DEFAULT_DEVICE_NAME}): " DEVICE_NAME
DEVICE_NAME=${DEVICE_NAME:-$DEFAULT_DEVICE_NAME}

read -p "Device Location (e.g., 'Main Entrance'): " DEVICE_LOCATION
DEVICE_LOCATION=${DEVICE_LOCATION:-"Unspecified Location"}

echo ""
print_status "Configuration:"
echo "  Server URL: ${SERVER_URL}"
echo "  Device Name: ${DEVICE_NAME}"
echo "  Device Location: ${DEVICE_LOCATION}"
echo ""

read -p "Continue with these settings? (y/n): " CONFIRM
if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    print_warning "Setup cancelled."
    exit 0
fi

# ============================================================
# Update System
# ============================================================
print_status "Updating system packages..."
apt update && apt upgrade -y
print_success "System updated."

# ============================================================
# Install Required Packages
# ============================================================
print_status "Installing required packages..."

# Note: On Raspberry Pi OS, the package is 'chromium' not 'chromium-browser'
apt install -y \
    chromium \
    xserver-xorg \
    x11-xserver-utils \
    xinit \
    openbox \
    matchbox-window-manager \
    xdotool \
    jq \
    curl

print_success "Packages installed."

# ============================================================
# Create Installation Directory
# ============================================================
print_status "Creating installation directory..."
mkdir -p "${INSTALL_DIR}"
chown ${CURRENT_USER}:${CURRENT_USER} "${INSTALL_DIR}"
print_success "Directory created: ${INSTALL_DIR}"

# ============================================================
# Create Device Configuration File
# ============================================================
print_status "Creating device configuration..."

# Generate a unique device identifier based on hardware
DEVICE_SERIAL=$(cat /proc/cpuinfo | grep Serial | cut -d ':' -f2 | tr -d ' ')
if [ -z "$DEVICE_SERIAL" ]; then
    DEVICE_SERIAL=$(cat /etc/machine-id)
fi

# Get MAC address
MAC_ADDRESS=$(cat /sys/class/net/wlan0/address 2>/dev/null || cat /sys/class/net/eth0/address 2>/dev/null || echo "unknown")

cat > "${CONFIG_FILE}" << EOF
{
    "server_url": "${SERVER_URL}",
    "device_name": "${DEVICE_NAME}",
    "device_location": "${DEVICE_LOCATION}",
    "device_serial": "${DEVICE_SERIAL}",
    "mac_address": "${MAC_ADDRESS}",
    "scanner_mode": "both",
    "default_page": "device-check",
    "heartbeat_interval": 30,
    "auto_refresh": true,
    "display_mode": "fullscreen",
    "sound_enabled": true,
    "setup_complete": false,
    "device_id": "",
    "pairing_code": ""
}
EOF

chown ${CURRENT_USER}:${CURRENT_USER} "${CONFIG_FILE}"
print_success "Configuration file created."

# ============================================================
# Create Kiosk Start Script
# ============================================================
print_status "Creating kiosk launcher script..."

cat > "${INSTALL_DIR}/start_kiosk.sh" << 'KIOSK_SCRIPT'
#!/bin/bash

# ============================================================
# MMSU Attendance Kiosk Launcher
# ============================================================

CONFIG_FILE="/home/$(whoami)/attendance/device_config.json"
LOG_FILE="/home/$(whoami)/attendance/kiosk.log"

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

log "Starting kiosk launcher..."

# Read configuration
if [ -f "$CONFIG_FILE" ]; then
    SERVER_URL=$(jq -r '.server_url' "$CONFIG_FILE")
    DEVICE_ID=$(jq -r '.device_id' "$CONFIG_FILE")
    DEFAULT_PAGE=$(jq -r '.default_page' "$CONFIG_FILE")
else
    log "ERROR: Configuration file not found!"
    SERVER_URL="http://localhost:5000"
    DEFAULT_PAGE="device-check"
fi

# Determine the URL to open
if [ -z "$DEVICE_ID" ] || [ "$DEVICE_ID" = "null" ] || [ "$DEVICE_ID" = "" ]; then
    # No device ID - go to device check/registration
    KIOSK_URL="${SERVER_URL}/device-check.html"
    log "No device ID found. Opening device check page."
else
    # Has device ID - go to device check for eligibility verification
    KIOSK_URL="${SERVER_URL}/device-check.html?device_id=${DEVICE_ID}"
    log "Device ID found: ${DEVICE_ID}. Opening eligibility check."
fi

log "Opening URL: $KIOSK_URL"

# Disable screen blanking and power saving
xset s off
xset s noblank
xset -dpms

# Wait for X to be ready
sleep 2

# Start Chromium in kiosk mode (with keyboard and mouse input enabled)
# Note: Using 'chromium' instead of 'chromium-browser' for Raspberry Pi OS
chromium \
    --kiosk \
    --noerrdialogs \
    --disable-infobars \
    --disable-translate \
    --disable-features=TranslateUI \
    --disable-session-crashed-bubble \
    --disable-restore-session-state \
    --no-first-run \
    --start-fullscreen \
    --autoplay-policy=no-user-gesture-required \
    --check-for-update-interval=604800 \
    --disable-component-update \
    --disable-background-networking \
    --disable-sync \
    --disable-default-apps \
    --disable-hang-monitor \
    --disable-prompt-on-repost \
    --disable-background-timer-throttling \
    --disable-backgrounding-occluded-windows \
    --disable-renderer-backgrounding \
    --disable-dev-shm-usage \
    --memory-pressure-off \
    --max-gum-fps=15 \
    --enable-low-end-device-mode \
    --disable-software-rasterizer \
    --no-memcheck \
    --ignore-certificate-errors \
    "$KIOSK_URL" 2>&1 | tee -a "$LOG_FILE"
KIOSK_SCRIPT

chmod +x "${INSTALL_DIR}/start_kiosk.sh"
chown ${CURRENT_USER}:${CURRENT_USER} "${INSTALL_DIR}/start_kiosk.sh"
print_success "Kiosk launcher created."

# ============================================================
# Create Heartbeat Script
# ============================================================
print_status "Creating heartbeat script..."

cat > "${INSTALL_DIR}/heartbeat.sh" << 'HEARTBEAT_SCRIPT'
#!/bin/bash

# ============================================================
# MMSU Attendance Device Heartbeat
# Sends periodic heartbeat to server to indicate device is online
# ============================================================

CONFIG_FILE="/home/$(whoami)/attendance/device_config.json"
LOG_FILE="/home/$(whoami)/attendance/heartbeat.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

send_heartbeat() {
    if [ ! -f "$CONFIG_FILE" ]; then
        log "ERROR: Config file not found"
        return 1
    fi
    
    SERVER_URL=$(jq -r '.server_url' "$CONFIG_FILE")
    DEVICE_ID=$(jq -r '.device_id' "$CONFIG_FILE")
    
    if [ -z "$DEVICE_ID" ] || [ "$DEVICE_ID" = "null" ]; then
        log "No device ID configured yet"
        return 1
    fi
    
    # Get current IP address
    IP_ADDRESS=$(hostname -I | awk '{print $1}')
    
    # Send heartbeat
    RESPONSE=$(curl -s -X POST "${SERVER_URL}/api/rpi/heartbeat" \
        -H "Content-Type: application/json" \
        -d "{\"device_id\": \"${DEVICE_ID}\", \"ip_address\": \"${IP_ADDRESS}\"}" \
        --connect-timeout 10 \
        --max-time 30)
    
    if [ $? -eq 0 ]; then
        log "Heartbeat sent successfully: $RESPONSE"
    else
        log "ERROR: Failed to send heartbeat"
    fi
}

# Main loop
log "Heartbeat service started"
INTERVAL=$(jq -r '.heartbeat_interval // 30' "$CONFIG_FILE")

while true; do
    send_heartbeat
    sleep $INTERVAL
done
HEARTBEAT_SCRIPT

chmod +x "${INSTALL_DIR}/heartbeat.sh"
chown ${CURRENT_USER}:${CURRENT_USER} "${INSTALL_DIR}/heartbeat.sh"
print_success "Heartbeat script created."

# ============================================================
# Create Xinitrc for Auto-Start
# ============================================================
print_status "Configuring X auto-start..."

cat > "/home/${CURRENT_USER}/.xinitrc" << 'XINITRC'
#!/bin/bash

# Start window manager (with cursor enabled for mouse input)
matchbox-window-manager -use_titlebar no &

# Start the kiosk
exec /home/$(whoami)/attendance/start_kiosk.sh
XINITRC

chmod +x "/home/${CURRENT_USER}/.xinitrc"
chown ${CURRENT_USER}:${CURRENT_USER} "/home/${CURRENT_USER}/.xinitrc"
print_success "X auto-start configured."

# ============================================================
# Create Systemd Service for Kiosk
# ============================================================
print_status "Creating systemd service..."

cat > "/etc/systemd/system/${SERVICE_NAME}.service" << EOF
[Unit]
Description=MMSU Attendance Kiosk
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${CURRENT_USER}
Environment=DISPLAY=:0
ExecStartPre=/bin/sleep 10
ExecStart=/usr/bin/startx /home/${CURRENT_USER}/.xinitrc
Restart=on-failure
RestartSec=10

[Install]
WantedBy=graphical.target
EOF

print_success "Systemd service created."

# ============================================================
# Create Heartbeat Service
# ============================================================
print_status "Creating heartbeat service..."

cat > "/etc/systemd/system/attendance-heartbeat.service" << EOF
[Unit]
Description=MMSU Attendance Heartbeat Service
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${CURRENT_USER}
ExecStart=/home/${CURRENT_USER}/attendance/heartbeat.sh
Restart=always
RestartSec=30

[Install]
WantedBy=multi-user.target
EOF

print_success "Heartbeat service created."

# ============================================================
# Configure Auto-Login (Console)
# ============================================================
print_status "Configuring auto-login..."

mkdir -p /etc/systemd/system/getty@tty1.service.d/

cat > "/etc/systemd/system/getty@tty1.service.d/autologin.conf" << EOF
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin ${CURRENT_USER} --noclear %I \$TERM
EOF

print_success "Auto-login configured."

# ============================================================
# Add startx to bash_profile for automatic X start
# ============================================================
print_status "Configuring automatic X start on login..."

BASH_PROFILE="/home/${CURRENT_USER}/.bash_profile"

# Backup existing .bash_profile if it exists
if [ -f "$BASH_PROFILE" ]; then
    cp "$BASH_PROFILE" "${BASH_PROFILE}.backup"
fi

cat > "$BASH_PROFILE" << 'BASHPROFILE'
# Auto-start X on tty1
if [ -z "$DISPLAY" ] && [ "$(tty)" = "/dev/tty1" ]; then
    exec startx
fi
BASHPROFILE

chown ${CURRENT_USER}:${CURRENT_USER} "$BASH_PROFILE"
print_success "Automatic X start configured."

# ============================================================
# Enable Services
# ============================================================
print_status "Enabling services..."

systemctl daemon-reload
systemctl enable attendance-heartbeat.service

print_success "Services enabled."

# ============================================================
# Create Management Commands
# ============================================================
print_status "Creating management commands..."

# Restart kiosk command
cat > "/usr/local/bin/attendance-restart" << 'EOF'
#!/bin/bash
echo "Restarting attendance kiosk..."
pkill -f chromium
sleep 2
DISPLAY=:0 /home/$(logname)/attendance/start_kiosk.sh &
echo "Kiosk restarted."
EOF
chmod +x /usr/local/bin/attendance-restart

# View logs command
cat > "/usr/local/bin/attendance-logs" << 'EOF'
#!/bin/bash
tail -f /home/$(logname)/attendance/kiosk.log
EOF
chmod +x /usr/local/bin/attendance-logs

# View config command
cat > "/usr/local/bin/attendance-config" << 'EOF'
#!/bin/bash
cat /home/$(logname)/attendance/device_config.json | jq .
EOF
chmod +x /usr/local/bin/attendance-config

# Reset device command
cat > "/usr/local/bin/attendance-reset" << 'EOF'
#!/bin/bash
echo "This will reset the device configuration. Are you sure? (y/n)"
read -r CONFIRM
if [ "$CONFIRM" = "y" ]; then
    CONFIG_FILE="/home/$(logname)/attendance/device_config.json"
    jq '.device_id = "" | .pairing_code = "" | .setup_complete = false' "$CONFIG_FILE" > "${CONFIG_FILE}.tmp"
    mv "${CONFIG_FILE}.tmp" "$CONFIG_FILE"
    echo "Device reset. Restarting kiosk..."
    attendance-restart
fi
EOF
chmod +x /usr/local/bin/attendance-reset

print_success "Management commands created."

# ============================================================
# Final Summary
# ============================================================
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    Setup Complete!                         ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
print_success "Installation directory: ${INSTALL_DIR}"
print_success "Configuration file: ${CONFIG_FILE}"
echo ""
echo "Management Commands:"
echo "  attendance-restart  - Restart the kiosk"
echo "  attendance-logs     - View kiosk logs"
echo "  attendance-config   - View current configuration"
echo "  attendance-reset    - Reset device pairing"
echo ""
print_warning "The system will now reboot to apply changes."
echo ""
read -p "Press Enter to reboot or Ctrl+C to cancel..."

reboot