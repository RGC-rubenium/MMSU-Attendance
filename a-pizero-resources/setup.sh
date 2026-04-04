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
print_status "Screen Orientation:"
echo "  1) Portrait (90° - rotated right)"
echo "  2) Portrait Inverted (270° - rotated left)"
echo "  3) Landscape (default - no rotation)"
echo "  4) Landscape Inverted (180° - upside down)"
read -p "Select orientation [1-4] (default: 1 for Portrait): " ROTATION_CHOICE
ROTATION_CHOICE=${ROTATION_CHOICE:-1}

case $ROTATION_CHOICE in
    1) DISPLAY_ROTATE=1; ROTATION_DESC="Portrait (90°)" ;;
    2) DISPLAY_ROTATE=3; ROTATION_DESC="Portrait Inverted (270°)" ;;
    3) DISPLAY_ROTATE=0; ROTATION_DESC="Landscape (0°)" ;;
    4) DISPLAY_ROTATE=2; ROTATION_DESC="Landscape Inverted (180°)" ;;
    *) DISPLAY_ROTATE=1; ROTATION_DESC="Portrait (90°)" ;;
esac

echo ""
print_status "Screen Resolution (lower = better performance):"
echo "  1) 640x480 (VGA - best performance)"
echo "  2) 800x600 (SVGA - recommended for Pi Zero 2W)"
echo "  3) 1024x768 (XGA)"
echo "  4) 1280x720 (720p HD)"
echo "  5) 1920x1080 (1080p - not recommended for Pi Zero)"
read -p "Select resolution [1-5] (default: 2 for 800x600): " RESOLUTION_CHOICE
RESOLUTION_CHOICE=${RESOLUTION_CHOICE:-2}

case $RESOLUTION_CHOICE in
    1) SCREEN_WIDTH=640; SCREEN_HEIGHT=480; RESOLUTION_DESC="640x480 (VGA)" ;;
    2) SCREEN_WIDTH=800; SCREEN_HEIGHT=600; RESOLUTION_DESC="800x600 (SVGA)" ;;
    3) SCREEN_WIDTH=1024; SCREEN_HEIGHT=768; RESOLUTION_DESC="1024x768 (XGA)" ;;
    4) SCREEN_WIDTH=1280; SCREEN_HEIGHT=720; RESOLUTION_DESC="1280x720 (720p)" ;;
    5) SCREEN_WIDTH=1920; SCREEN_HEIGHT=1080; RESOLUTION_DESC="1920x1080 (1080p)" ;;
    *) SCREEN_WIDTH=800; SCREEN_HEIGHT=600; RESOLUTION_DESC="800x600 (SVGA)" ;;
esac

echo ""
print_status "Configuration:"
echo "  Server URL: ${SERVER_URL}"
echo "  Device Name: ${DEVICE_NAME}"
echo "  Device Location: ${DEVICE_LOCATION}"
echo "  Screen Orientation: ${ROTATION_DESC}"
echo "  Screen Resolution: ${RESOLUTION_DESC}"
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
# Configure Screen Rotation (Portrait Mode)
# ============================================================
print_status "Configuring screen rotation..."

# Backup config.txt
if [ -f /boot/config.txt ]; then
    cp /boot/config.txt /boot/config.txt.backup
elif [ -f /boot/firmware/config.txt ]; then
    cp /boot/firmware/config.txt /boot/firmware/config.txt.backup
fi

# Determine config.txt location (differs between Pi OS versions)
if [ -f /boot/firmware/config.txt ]; then
    CONFIG_TXT="/boot/firmware/config.txt"
else
    CONFIG_TXT="/boot/config.txt"
fi

# Remove any existing rotation settings
sed -i '/^display_rotate=/d' "$CONFIG_TXT"
sed -i '/^display_hdmi_rotate=/d' "$CONFIG_TXT"
sed -i '/^lcd_rotate=/d' "$CONFIG_TXT"

# Add rotation setting (0=0°, 1=90°, 2=180°, 3=270°)
if [ "$DISPLAY_ROTATE" != "0" ]; then
    echo "" >> "$CONFIG_TXT"
    echo "# Screen rotation for portrait mode" >> "$CONFIG_TXT"
    echo "display_rotate=${DISPLAY_ROTATE}" >> "$CONFIG_TXT"
    # Also set for HDMI specifically
    echo "display_hdmi_rotate=${DISPLAY_ROTATE}" >> "$CONFIG_TXT"
fi

# Remove any existing resolution settings
sed -i '/^framebuffer_width=/d' "$CONFIG_TXT"
sed -i '/^framebuffer_height=/d' "$CONFIG_TXT"
sed -i '/^hdmi_group=/d' "$CONFIG_TXT"
sed -i '/^hdmi_mode=/d' "$CONFIG_TXT"
sed -i '/^hdmi_cvt=/d' "$CONFIG_TXT"

# Add resolution settings for lower resolution mode
echo "" >> "$CONFIG_TXT"
echo "# Screen resolution settings (optimized for Pi Zero 2W)" >> "$CONFIG_TXT"
echo "framebuffer_width=${SCREEN_WIDTH}" >> "$CONFIG_TXT"
echo "framebuffer_height=${SCREEN_HEIGHT}" >> "$CONFIG_TXT"
echo "hdmi_group=2" >> "$CONFIG_TXT"

# Set hdmi_mode based on resolution
case "${SCREEN_WIDTH}x${SCREEN_HEIGHT}" in
    "640x480") echo "hdmi_mode=4" >> "$CONFIG_TXT" ;;   # VGA 60Hz
    "800x600") echo "hdmi_mode=9" >> "$CONFIG_TXT" ;;   # SVGA 60Hz
    "1024x768") echo "hdmi_mode=16" >> "$CONFIG_TXT" ;; # XGA 60Hz
    "1280x720") echo "hdmi_mode=85" >> "$CONFIG_TXT" ;; # 720p 60Hz
    "1920x1080") echo "hdmi_mode=82" >> "$CONFIG_TXT" ;; # 1080p 60Hz
esac

# GPU memory allocation (reduce for lower resolution)
if [ "$SCREEN_WIDTH" -le 800 ]; then
    sed -i '/^gpu_mem=/d' "$CONFIG_TXT"
    echo "gpu_mem=64" >> "$CONFIG_TXT"
fi

print_success "Screen rotation configured (display_rotate=${DISPLAY_ROTATE})."
print_success "Screen resolution configured (${SCREEN_WIDTH}x${SCREEN_HEIGHT})."

# ============================================================
# Install Required Packages
# ============================================================
print_status "Installing required packages..."

# Note: On Raspberry Pi OS, the package is 'chromium' not 'chromium-browser'
apt install -y \
    chromium \
    xserver-xorg \
    xserver-xorg-input-all \
    x11-xserver-utils \
    xinit \
    openbox \
    matchbox-window-manager \
    xinput \
    xdotool \
    jq \
    curl \
    usbutils

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
    "pairing_code": "",
    "screen_width": ${SCREEN_WIDTH},
    "screen_height": ${SCREEN_HEIGHT}
}
EOF

chown ${CURRENT_USER}:${CURRENT_USER} "${CONFIG_FILE}"
print_success "Configuration file created."

# ============================================================
# Create Input Device Wait Script
# ============================================================
print_status "Creating input device wait script..."

cat > "${INSTALL_DIR}/wait_for_input.sh" << 'WAIT_SCRIPT'
#!/bin/bash

# Wait for input devices to be ready
LOG_FILE="/home/$(whoami)/attendance/kiosk.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

log "Waiting for input devices..."

# Wait up to 30 seconds for input devices
MAX_WAIT=30
WAITED=0

while [ $WAITED -lt $MAX_WAIT ]; do
    # Check for mouse/keyboard devices
    if ls /dev/input/event* > /dev/null 2>&1; then
        MOUSE_FOUND=$(cat /proc/bus/input/devices | grep -i "mouse" | wc -l)
        KBD_FOUND=$(cat /proc/bus/input/devices | grep -i "keyboard\|hid" | wc -l)
        
        if [ $MOUSE_FOUND -gt 0 ] || [ $KBD_FOUND -gt 0 ]; then
            log "Input devices found: Mouse=$MOUSE_FOUND, Keyboard/HID=$KBD_FOUND"
            # Give devices a moment to fully initialize
            sleep 2
            exit 0
        fi
    fi
    
    log "Waiting for input devices... ($WAITED/$MAX_WAIT seconds)"
    sleep 1
    WAITED=$((WAITED + 1))
done

log "WARNING: Timeout waiting for input devices, continuing anyway..."
exit 0
WAIT_SCRIPT

chmod +x "${INSTALL_DIR}/wait_for_input.sh"
chown ${CURRENT_USER}:${CURRENT_USER} "${INSTALL_DIR}/wait_for_input.sh"
print_success "Input device wait script created."

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

# Function to sync time with server
sync_time_on_startup() {
    log "Attempting to sync time with server..."
    
    if [ ! -f "$CONFIG_FILE" ]; then
        log "TIME SYNC: Config file not found, skipping"
        return
    fi
    
    local SERVER_URL=$(jq -r '.server_url' "$CONFIG_FILE" 2>/dev/null)
    local DEVICE_ID=$(jq -r '.device_id' "$CONFIG_FILE" 2>/dev/null)
    
    if [ -z "$SERVER_URL" ] || [ "$SERVER_URL" = "null" ]; then
        log "TIME SYNC: Server URL not configured, skipping"
        return
    fi
    
    # Ensure SERVER_URL has http:// prefix
    if [[ ! "$SERVER_URL" =~ ^https?:// ]]; then
        SERVER_URL="http://${SERVER_URL}"
    fi
    
    # Try to get server time via a simple API call
    local RESPONSE=""
    if [ -n "$DEVICE_ID" ] && [ "$DEVICE_ID" != "null" ]; then
        # If we have a device ID, use heartbeat endpoint
        RESPONSE=$(curl -s -X POST "${SERVER_URL}/api/rpi/heartbeat" \
            -H "Content-Type: application/json" \
            -d "{\"device_id\": \"${DEVICE_ID}\", \"ip_address\": \"$(hostname -I | awk '{print $1}')\"}" \
            --connect-timeout 10 \
            --max-time 15 2>/dev/null)
    else
        # Otherwise, try a simple time endpoint or use heartbeat with empty device
        RESPONSE=$(curl -s "${SERVER_URL}/api/rpi/time" --connect-timeout 10 --max-time 15 2>/dev/null)
    fi
    
    if [ -z "$RESPONSE" ]; then
        log "TIME SYNC: Could not reach server, skipping time sync"
        return
    fi
    
    # Parse server time from response
    local SERVER_TIME=$(echo "$RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    server_time = data.get('server_time', '')
    if server_time:
        print(server_time)
except:
    pass
" 2>/dev/null)
    
    if [ -z "$SERVER_TIME" ]; then
        log "TIME SYNC: No server time in response, skipping"
        return
    fi
    
    # Get local UTC time
    local LOCAL_TIME=$(date -u '+%Y-%m-%d %H:%M:%S')
    
    # Calculate time difference
    local LOCAL_EPOCH=$(date -u -d "$LOCAL_TIME" +%s 2>/dev/null || date +%s)
    local SERVER_EPOCH=$(date -u -d "$SERVER_TIME" +%s 2>/dev/null)
    
    if [ -z "$SERVER_EPOCH" ]; then
        log "TIME SYNC: Could not parse server time: $SERVER_TIME"
        return
    fi
    
    local TIME_DIFF=$((SERVER_EPOCH - LOCAL_EPOCH))
    local ABS_DIFF=${TIME_DIFF#-}
    
    log "TIME SYNC: Local=$LOCAL_TIME, Server=$SERVER_TIME, Diff=${TIME_DIFF}s"
    
    # Sync if difference is more than 10 seconds
    if [ $ABS_DIFF -gt 10 ]; then
        log "TIME SYNC: Synchronizing system clock..."
        if /usr/bin/sudo /bin/date -u -s "$SERVER_TIME" > /dev/null 2>&1; then
            log "TIME SYNC: System time synchronized to $SERVER_TIME UTC"
            /usr/bin/sudo /sbin/hwclock -w 2>/dev/null || true
        else
            log "TIME SYNC: Failed to set system time"
        fi
    else
        log "TIME SYNC: Time is already in sync (diff: ${ABS_DIFF}s)"
    fi
}

log "Starting kiosk launcher..."

# Wait for input devices to be ready
/home/$(whoami)/attendance/wait_for_input.sh

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

# Ensure SERVER_URL has http:// prefix
if [[ ! "$SERVER_URL" =~ ^https?:// ]]; then
    SERVER_URL="http://${SERVER_URL}"
    log "Added http:// prefix to server URL"
fi

# Sync time with server before launching browser
sync_time_on_startup

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

# Reset input devices (only if xinput is available)
log "Resetting input configuration..."
if command -v xinput &> /dev/null; then
    xinput --list >> "$LOG_FILE" 2>&1
    # Enable all input devices
    for device in $(xinput --list --id-only 2>/dev/null); do
        xinput --enable "$device" 2>/dev/null || true
    done
else
    log "xinput not found, skipping input device reset"
fi

# Wait a moment for X to be fully ready
sleep 3

# Clear any previous Chromium crash flags
CHROMIUM_DIR="/home/$(whoami)/.config/chromium"
if [ -d "$CHROMIUM_DIR" ]; then
    rm -rf "${CHROMIUM_DIR}/Singleton*" 2>/dev/null || true
    # Reset crash state
    find "$CHROMIUM_DIR" -name "*.lock" -delete 2>/dev/null || true
    # Clear GPU cache
    rm -rf "${CHROMIUM_DIR}/GPUCache" 2>/dev/null || true
fi

log "Starting Chromium..."

# Read resolution from config if available
SCREEN_WIDTH=$(jq -r '.screen_width // 800' "$CONFIG_FILE")
SCREEN_HEIGHT=$(jq -r '.screen_height // 600' "$CONFIG_FILE")

# Start Chromium in kiosk mode with GPU disabled for Pi Zero 2W
chromium \
    --kiosk \
    --window-size=${SCREEN_WIDTH},${SCREEN_HEIGHT} \
    --force-device-scale-factor=1 \
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
    --disable-prompt-on-repost \
    --disable-background-timer-throttling \
    --disable-backgrounding-occluded-windows \
    --disable-renderer-backgrounding \
    --touch-events=enabled \
    --enable-touch-drag-drop \
    --ignore-certificate-errors \
    --password-store=basic \
    --disable-gpu \
    --disable-gpu-compositing \
    --disable-software-rasterizer \
    --disable-accelerated-2d-canvas \
    --disable-accelerated-video-decode \
    --num-raster-threads=2 \
    --disable-breakpad \
    --disable-crash-reporter \
    --disable-extensions \
    --disable-hang-monitor \
    --no-memcheck \
    "$KIOSK_URL" 2>&1 | tee -a "$LOG_FILE"
KIOSK_SCRIPT

chmod +x "${INSTALL_DIR}/start_kiosk.sh"
chown ${CURRENT_USER}:${CURRENT_USER} "${INSTALL_DIR}/start_kiosk.sh"
print_success "Kiosk launcher created."

# ============================================================
# Create Heartbeat Script
# ============================================================
print_status "Creating heartbeat script..."

# Prepare the config file path for the heartbeat script
HEARTBEAT_CONFIG_PATH="${INSTALL_DIR}/device_config.json"

cat > "${INSTALL_DIR}/heartbeat.sh" << HEARTBEAT_SCRIPT
#!/bin/bash

# ============================================================
# MMSU Attendance Device Heartbeat
# Sends periodic heartbeat to server to indicate device is online
# Checks for scheduled auto-shutdown time
# ============================================================

CONFIG_FILE="${HEARTBEAT_CONFIG_PATH}"
LOG_FILE="/var/log/mmsu-attendance/heartbeat.log"
SHUTDOWN_EXECUTED_FILE="/tmp/mmsu_shutdown_executed_today"
LAST_TIME_SYNC_FILE="/tmp/mmsu_last_time_sync"
TIME_SYNC_INTERVAL=3600  # Sync time every hour (in seconds)

# Ensure log directory exists
mkdir -p "\$(dirname "\$LOG_FILE")" 2>/dev/null || true

log() {
    echo "[\$(date '+%Y-%m-%d %H:%M:%S')] \$1" >> "\$LOG_FILE" 2>/dev/null || \
    echo "[\$(date '+%Y-%m-%d %H:%M:%S')] \$1"
}

sync_time_with_server() {
    local SERVER_TIME="\$1"
    
    # Skip if no server time provided
    if [ -z "\$SERVER_TIME" ] || [ "\$SERVER_TIME" = "null" ] || [ "\$SERVER_TIME" = "None" ]; then
        return
    fi
    
    # Check if we should sync (once per hour to avoid too frequent changes)
    local CURRENT_EPOCH=\$(date +%s)
    if [ -f "\$LAST_TIME_SYNC_FILE" ]; then
        local LAST_SYNC=\$(cat "\$LAST_TIME_SYNC_FILE" 2>/dev/null || echo "0")
        local TIME_SINCE_SYNC=\$((CURRENT_EPOCH - LAST_SYNC))
        if [ \$TIME_SINCE_SYNC -lt \$TIME_SYNC_INTERVAL ]; then
            return
        fi
    fi
    
    # Get local time and server time in comparable format
    local LOCAL_TIME=\$(date -u '+%Y-%m-%d %H:%M:%S')
    
    # Calculate time difference (in seconds)
    local LOCAL_EPOCH=\$(date -u -d "\$LOCAL_TIME" +%s 2>/dev/null || date +%s)
    local SERVER_EPOCH=\$(date -u -d "\$SERVER_TIME" +%s 2>/dev/null)
    
    if [ -z "\$SERVER_EPOCH" ]; then
        log "TIME SYNC: Could not parse server time: \$SERVER_TIME"
        return
    fi
    
    local TIME_DIFF=\$((SERVER_EPOCH - LOCAL_EPOCH))
    local ABS_DIFF=\${TIME_DIFF#-}  # Absolute value
    
    # Only sync if difference is more than 30 seconds
    if [ \$ABS_DIFF -gt 30 ]; then
        log "TIME SYNC: Local time differs from server by \${TIME_DIFF}s"
        log "TIME SYNC: Setting system time to: \$SERVER_TIME UTC"
        
        # Set the system time (requires root/sudo)
        if /usr/bin/sudo /bin/date -u -s "\$SERVER_TIME" > /dev/null 2>&1; then
            log "TIME SYNC: System time synchronized successfully"
            # Also sync hardware clock if available
            /usr/bin/sudo /sbin/hwclock -w 2>/dev/null || true
        else
            log "TIME SYNC: Failed to set system time (permission denied?)"
        fi
    fi
    
    # Record last sync time
    echo "\$CURRENT_EPOCH" > "\$LAST_TIME_SYNC_FILE"
}

execute_shutdown() {
    log "=========================================="
    log "AUTO-SHUTDOWN: Scheduled shutdown initiated"
    log "=========================================="
    sync
    sleep 3
    /usr/bin/sudo /sbin/shutdown -h now
}

check_auto_shutdown() {
    local SHUTDOWN_ENABLED="\$1"
    local SHUTDOWN_TIME="\$2"
    
    # Skip if auto-shutdown is not enabled
    if [ "\$SHUTDOWN_ENABLED" != "true" ] && [ "\$SHUTDOWN_ENABLED" != "True" ]; then
        return
    fi
    
    # Skip if no shutdown time is set
    if [ -z "\$SHUTDOWN_TIME" ] || [ "\$SHUTDOWN_TIME" = "null" ] || [ "\$SHUTDOWN_TIME" = "None" ]; then
        return
    fi
    
    # Get current time in HH:MM format
    CURRENT_TIME=\$(date '+%H:%M')
    CURRENT_DATE=\$(date '+%Y-%m-%d')
    
    # Check if we already executed shutdown today (to prevent multiple shutdowns)
    if [ -f "\$SHUTDOWN_EXECUTED_FILE" ]; then
        LAST_SHUTDOWN_DATE=\$(cat "\$SHUTDOWN_EXECUTED_FILE" 2>/dev/null)
        if [ "\$LAST_SHUTDOWN_DATE" = "\$CURRENT_DATE" ]; then
            return
        fi
    fi
    
    # Compare times - shutdown if current time matches or is within 1 minute after scheduled time
    CURRENT_MINUTES=\$((10#\$(echo \$CURRENT_TIME | cut -d: -f1) * 60 + 10#\$(echo \$CURRENT_TIME | cut -d: -f2)))
    SHUTDOWN_MINUTES=\$((10#\$(echo \$SHUTDOWN_TIME | cut -d: -f1) * 60 + 10#\$(echo \$SHUTDOWN_TIME | cut -d: -f2)))
    
    # Check if current time is within shutdown window (scheduled time to scheduled time + 1 minute)
    if [ \$CURRENT_MINUTES -ge \$SHUTDOWN_MINUTES ] && [ \$CURRENT_MINUTES -lt \$((SHUTDOWN_MINUTES + 2)) ]; then
        log "Auto-shutdown time reached: \$SHUTDOWN_TIME (current: \$CURRENT_TIME)"
        
        # Mark that we executed shutdown today
        echo "\$CURRENT_DATE" > "\$SHUTDOWN_EXECUTED_FILE"
        
        execute_shutdown
    fi
}

send_heartbeat() {
    if [ ! -f "\$CONFIG_FILE" ]; then
        log "ERROR: Config file not found: \$CONFIG_FILE"
        return 1
    fi
    
    SERVER_URL=\$(jq -r '.server_url' "\$CONFIG_FILE" 2>/dev/null)
    DEVICE_ID=\$(jq -r '.device_id' "\$CONFIG_FILE" 2>/dev/null)
    
    if [ -z "\$SERVER_URL" ] || [ "\$SERVER_URL" = "null" ]; then
        log "ERROR: Server URL not configured"
        return 1
    fi
    
    if [ -z "\$DEVICE_ID" ] || [ "\$DEVICE_ID" = "null" ] || [ "\$DEVICE_ID" = "" ]; then
        log "No device ID configured yet, skipping heartbeat"
        return 1
    fi
    
    # Get current IP address
    IP_ADDRESS=\$(hostname -I 2>/dev/null | awk '{print \$1}')
    
    # Ensure SERVER_URL has http:// prefix
    if [[ ! "\$SERVER_URL" =~ ^https?:// ]]; then
        SERVER_URL="http://\${SERVER_URL}"
    fi
    
    # Send heartbeat and capture response
    RESPONSE=\$(curl -s -X POST "\${SERVER_URL}/api/rpi/heartbeat" \
        -H "Content-Type: application/json" \
        -d "{\"device_id\": \"\${DEVICE_ID}\", \"ip_address\": \"\${IP_ADDRESS}\"}" \
        --connect-timeout 10 \
        --max-time 30 2>/dev/null)
    
    CURL_EXIT=\$?
    
    if [ \$CURL_EXIT -eq 0 ] && [ -n "\$RESPONSE" ]; then
        # Use Python for reliable JSON parsing
        PARSED=\$(echo "\$RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    shutdown_enabled = str(data.get('auto_shutdown_enabled', False))
    shutdown_time = data.get('auto_shutdown_time', '')
    server_time = data.get('server_time', '')
    if shutdown_time is None:
        shutdown_time = ''
    if server_time is None:
        server_time = ''
    print(f'{shutdown_enabled}|{shutdown_time}|{server_time}')
except Exception as e:
    print('False||')
" 2>/dev/null)
        
        SHUTDOWN_ENABLED=\$(echo "\$PARSED" | cut -d'|' -f1)
        SHUTDOWN_TIME=\$(echo "\$PARSED" | cut -d'|' -f2)
        SERVER_TIME=\$(echo "\$PARSED" | cut -d'|' -f3)
        
        # Sync time with server (runs periodically)
        sync_time_with_server "\$SERVER_TIME"
        
        # Check for scheduled auto-shutdown
        check_auto_shutdown "\$SHUTDOWN_ENABLED" "\$SHUTDOWN_TIME"
        
        # Only log occasionally to reduce log spam
        if [ \$((RANDOM % 6)) -eq 0 ]; then
            if [ "\$SHUTDOWN_ENABLED" = "True" ] && [ -n "\$SHUTDOWN_TIME" ]; then
                log "Heartbeat OK (auto-shutdown scheduled: \$SHUTDOWN_TIME)"
            else
                log "Heartbeat OK"
            fi
        fi
    else
        log "ERROR: Failed to send heartbeat (curl exit: \$CURL_EXIT)"
    fi
}

# Main loop
log "=========================================="
log "MMSU Heartbeat Service Started"
log "Config: \$CONFIG_FILE"
log "Auto-shutdown check enabled"
log "Time sync with server enabled (hourly)"
log "=========================================="

# Clear old flags on boot
rm -f "\$SHUTDOWN_EXECUTED_FILE" 2>/dev/null
rm -f "\$LAST_TIME_SYNC_FILE" 2>/dev/null

# Use 10 second interval for responsive auto-shutdown
INTERVAL=10

while true; do
    send_heartbeat
    sleep \$INTERVAL
done
HEARTBEAT_SCRIPT

chmod +x "${INSTALL_DIR}/heartbeat.sh"
chown ${CURRENT_USER}:${CURRENT_USER} "${INSTALL_DIR}/heartbeat.sh"
print_success "Heartbeat script created."

# ============================================================
# Create Xinitrc for Auto-Start
# ============================================================
print_status "Configuring X auto-start..."

cat > "/home/${CURRENT_USER}/.xinitrc" << XINITRC
#!/bin/bash

# Wait for input devices before starting window manager
sleep 3

# Set screen resolution (lower resolution for better performance on Pi Zero 2W)
xrandr --output HDMI-1 --mode ${SCREEN_WIDTH}x${SCREEN_HEIGHT} 2>/dev/null || \
xrandr --output HDMI-0 --mode ${SCREEN_WIDTH}x${SCREEN_HEIGHT} 2>/dev/null || \
xrandr -s ${SCREEN_WIDTH}x${SCREEN_HEIGHT} 2>/dev/null || true

# Apply screen rotation via xrandr (backup method)
# 0=normal, 1=right(90°), 2=inverted(180°), 3=left(270°)
ROTATION=${DISPLAY_ROTATE}
case \$ROTATION in
    1) xrandr --output HDMI-1 --rotate right 2>/dev/null || xrandr --output HDMI-0 --rotate right 2>/dev/null || true ;;
    2) xrandr --output HDMI-1 --rotate inverted 2>/dev/null || xrandr --output HDMI-0 --rotate inverted 2>/dev/null || true ;;
    3) xrandr --output HDMI-1 --rotate left 2>/dev/null || xrandr --output HDMI-0 --rotate left 2>/dev/null || true ;;
esac

# Start window manager (with cursor enabled for mouse input)
matchbox-window-manager -use_titlebar no &

# Wait for window manager to initialize
sleep 2

# Start the kiosk
exec /home/\$(whoami)/attendance/start_kiosk.sh
XINITRC

chmod +x "/home/${CURRENT_USER}/.xinitrc"
chown ${CURRENT_USER}:${CURRENT_USER} "/home/${CURRENT_USER}/.xinitrc"
print_success "X auto-start configured."

# ============================================================
# Configure udev rules for input devices
# ============================================================
print_status "Configuring input device rules..."

cat > "/etc/udev/rules.d/99-input-permissions.rules" << 'UDEVRULES'
# Allow all users to access input devices
SUBSYSTEM=="input", GROUP="input", MODE="0666"
KERNEL=="event*", SUBSYSTEM=="input", GROUP="input", MODE="0666"
KERNEL=="mouse*", SUBSYSTEM=="input", GROUP="input", MODE="0666"

# HID devices (barcode scanners, etc.)
SUBSYSTEM=="hidraw", GROUP="input", MODE="0666"
SUBSYSTEM=="usb", ATTR{bInterfaceClass}=="03", GROUP="input", MODE="0666"
UDEVRULES

# Add user to input group
usermod -a -G input ${CURRENT_USER}

# Reload udev rules
udevadm control --reload-rules
udevadm trigger

print_success "Input device rules configured."

# ============================================================
# Create Systemd Service for Kiosk
# ============================================================
print_status "Creating systemd service..."

cat > "/etc/systemd/system/${SERVICE_NAME}.service" << EOF
[Unit]
Description=MMSU Attendance Kiosk
After=network-online.target systemd-udev-settle.service
Wants=network-online.target
Requires=systemd-udev-settle.service

[Service]
Type=simple
User=${CURRENT_USER}
Environment=DISPLAY=:0
ExecStartPre=/bin/sleep 15
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

# Create log directory
mkdir -p /var/log/mmsu-attendance
chown ${CURRENT_USER}:${CURRENT_USER} /var/log/mmsu-attendance
chmod 755 /var/log/mmsu-attendance
print_success "Log directory created: /var/log/mmsu-attendance"

# Configure passwordless sudo for power commands and time sync
print_status "Configuring passwordless sudo for power and time commands..."
cat > "/etc/sudoers.d/mmsu-attendance" << EOF
# Allow attendance user to run power commands without password
${CURRENT_USER} ALL=(ALL) NOPASSWD: /sbin/reboot
${CURRENT_USER} ALL=(ALL) NOPASSWD: /sbin/shutdown
${CURRENT_USER} ALL=(ALL) NOPASSWD: /sbin/poweroff
${CURRENT_USER} ALL=(ALL) NOPASSWD: /usr/sbin/reboot
${CURRENT_USER} ALL=(ALL) NOPASSWD: /usr/sbin/shutdown
${CURRENT_USER} ALL=(ALL) NOPASSWD: /usr/sbin/poweroff
# Allow time synchronization
${CURRENT_USER} ALL=(ALL) NOPASSWD: /bin/date
${CURRENT_USER} ALL=(ALL) NOPASSWD: /sbin/hwclock
EOF
chmod 440 /etc/sudoers.d/mmsu-attendance
print_success "Passwordless sudo configured for power and time commands"

cat > "/etc/systemd/system/attendance-heartbeat.service" << EOF
[Unit]
Description=MMSU Attendance Heartbeat Service
Documentation=https://github.com/RGC-rubenium/MMSU-Attendance
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${CURRENT_USER}
Group=${CURRENT_USER}
WorkingDirectory=${INSTALL_DIR}
ExecStart=/bin/bash ${INSTALL_DIR}/heartbeat.sh
Restart=always
RestartSec=10
StandardOutput=append:/var/log/mmsu-attendance/heartbeat.log
StandardError=append:/var/log/mmsu-attendance/heartbeat.log

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
# Wait for input devices before starting X
sleep 5

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
systemctl start attendance-heartbeat.service

# Verify heartbeat service started
sleep 2
if systemctl is-active --quiet attendance-heartbeat.service; then
    print_success "Heartbeat service started and running."
else
    print_warning "Heartbeat service enabled but may not be running yet (will start on next boot)."
fi

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
echo "=== Kiosk Logs ==="
tail -f /home/$(logname)/attendance/kiosk.log
EOF
chmod +x /usr/local/bin/attendance-logs

# View heartbeat logs command
cat > "/usr/local/bin/attendance-heartbeat-logs" << 'EOF'
#!/bin/bash
echo "=== Heartbeat Logs ==="
tail -f /var/log/mmsu-attendance/heartbeat.log
EOF
chmod +x /usr/local/bin/attendance-heartbeat-logs

# Restart heartbeat service command
cat > "/usr/local/bin/attendance-heartbeat-restart" << 'EOF'
#!/bin/bash
echo "Restarting heartbeat service..."
sudo systemctl restart attendance-heartbeat.service
sudo systemctl status attendance-heartbeat.service
EOF
chmod +x /usr/local/bin/attendance-heartbeat-restart

# Heartbeat status command (for debugging)
cat > "/usr/local/bin/attendance-heartbeat-status" << 'EOF'
#!/bin/bash
echo "=== Heartbeat Service Status ==="
echo ""
echo "Service Status:"
sudo systemctl status attendance-heartbeat.service --no-pager
echo ""
echo "=== Last 20 Log Lines ==="
tail -20 /var/log/mmsu-attendance/heartbeat.log 2>/dev/null || echo "No log file found"
echo ""
echo "=== Config File Check ==="
CONFIG_FILE="/home/$(logname)/attendance/device_config.json"
if [ -f "$CONFIG_FILE" ]; then
    echo "Config file exists: $CONFIG_FILE"
    echo "Contents:"
    cat "$CONFIG_FILE" | jq . 2>/dev/null || cat "$CONFIG_FILE"
else
    echo "ERROR: Config file not found: $CONFIG_FILE"
fi
echo ""
echo "=== Heartbeat Script Check ==="
SCRIPT_FILE="/home/$(logname)/attendance/heartbeat.sh"
if [ -f "$SCRIPT_FILE" ]; then
    echo "Script file exists: $SCRIPT_FILE"
    echo "Permissions: $(ls -la $SCRIPT_FILE)"
else
    echo "ERROR: Script file not found: $SCRIPT_FILE"
fi
EOF
chmod +x /usr/local/bin/attendance-heartbeat-status

# View config command
cat > "/usr/local/bin/attendance-config" << 'EOF'
#!/bin/bash
cat /home/$(logname)/attendance/device_config.json | jq .
EOF
chmod +x /usr/local/bin/attendance-config

# Reset device command
cat > "/usr/local/bin/attendance-reset" << 'EOF'
#!/bin/bash
echo "This will fully reset the device registration. Are you sure? (y/n)"
read -r CONFIRM
if [ "$CONFIRM" = "y" ]; then
    CONFIG_FILE="/home/$(logname)/attendance/device_config.json"
    
    echo "Clearing device configuration..."
    jq '.device_id = "" | .pairing_code = "" | .setup_complete = false' "$CONFIG_FILE" > "${CONFIG_FILE}.tmp"
    mv "${CONFIG_FILE}.tmp" "$CONFIG_FILE"
    
    echo "Clearing browser cache and storage..."
    CHROMIUM_DIR="/home/$(logname)/.config/chromium"
    rm -rf "${CHROMIUM_DIR}/Default/Local Storage"/* 2>/dev/null
    rm -rf "${CHROMIUM_DIR}/Default/Session Storage"/* 2>/dev/null
    rm -rf "${CHROMIUM_DIR}/Default/IndexedDB"/* 2>/dev/null
    rm -rf "${CHROMIUM_DIR}/Default/Cookies"* 2>/dev/null
    rm -rf "${CHROMIUM_DIR}/Default/Cache"/* 2>/dev/null
    rm -rf "${CHROMIUM_DIR}/GPUCache"/* 2>/dev/null
    rm -rf "/home/$(logname)/.cache/chromium"/* 2>/dev/null
    
    echo "Device fully reset. Rebooting..."
    sudo reboot
fi
EOF
chmod +x /usr/local/bin/attendance-reset

# Check input devices command
cat > "/usr/local/bin/attendance-check-input" << 'EOF'
#!/bin/bash
echo "=== Input Devices ==="
cat /proc/bus/input/devices
echo ""
echo "=== USB Devices ==="
lsusb
echo ""
echo "=== xinput list ==="
DISPLAY=:0 xinput --list 2>/dev/null || echo "X not running"
EOF
chmod +x /usr/local/bin/attendance-check-input

# Rotate screen command
cat > "/usr/local/bin/attendance-rotate" << 'EOF'
#!/bin/bash
echo "Screen Rotation Options:"
echo "  1) Portrait (90° - rotated right)"
echo "  2) Portrait Inverted (270° - rotated left)" 
echo "  3) Landscape (default - no rotation)"
echo "  4) Landscape Inverted (180° - upside down)"
read -p "Select orientation [1-4]: " CHOICE

case \$CHOICE in
    1) ROTATE=1; XROTATE="right" ;;
    2) ROTATE=3; XROTATE="left" ;;
    3) ROTATE=0; XROTATE="normal" ;;
    4) ROTATE=2; XROTATE="inverted" ;;
    *) echo "Invalid choice"; exit 1 ;;
esac

# Apply xrandr rotation immediately
DISPLAY=:0 xrandr --output HDMI-1 --rotate \$XROTATE 2>/dev/null || \
DISPLAY=:0 xrandr --output HDMI-0 --rotate \$XROTATE 2>/dev/null || \
echo "Could not apply xrandr rotation"

# Update boot config for persistence
if [ -f /boot/firmware/config.txt ]; then
    CONFIG_TXT="/boot/firmware/config.txt"
else
    CONFIG_TXT="/boot/config.txt"
fi

sudo sed -i '/^display_rotate=/d' "\$CONFIG_TXT"
sudo sed -i '/^display_hdmi_rotate=/d' "\$CONFIG_TXT"

if [ "\$ROTATE" != "0" ]; then
    echo "display_rotate=\$ROTATE" | sudo tee -a "\$CONFIG_TXT" > /dev/null
    echo "display_hdmi_rotate=\$ROTATE" | sudo tee -a "\$CONFIG_TXT" > /dev/null
fi

echo "Rotation applied. Reboot for full effect."
EOF
chmod +x /usr/local/bin/attendance-rotate

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
echo "  attendance-restart          - Restart the kiosk"
echo "  attendance-logs             - View kiosk logs"
echo "  attendance-heartbeat-logs   - View heartbeat service logs"
echo "  attendance-heartbeat-restart- Restart heartbeat service"
echo "  attendance-config           - View current configuration"
echo "  attendance-reset            - Reset device pairing"
echo "  attendance-check-input      - Check input devices status"
echo ""
echo "Services:"
echo "  attendance-kiosk.service    - Kiosk browser service"
echo "  attendance-heartbeat.service- Background heartbeat (for remote commands)"
echo ""
print_warning "The system will now reboot to apply changes."
echo ""
read -p "Press Enter to reboot or Ctrl+C to cancel..."

reboot