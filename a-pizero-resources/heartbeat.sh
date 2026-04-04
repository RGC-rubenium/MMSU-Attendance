#!/bin/bash
#
# MMSU Attendance - Heartbeat Service
# Runs in the background to keep the device online status updated
# Also receives and executes commands from the server
#
# This service runs INDEPENDENTLY of the kiosk browser
# allowing the server to send commands even if the browser is frozen
#

CONFIG_FILE="/opt/mmsu-attendance/device.conf"
LOG_FILE="/var/log/mmsu-attendance/heartbeat.log"
INTERVAL=10  # seconds (reduced for faster command response)

# Ensure log directory exists
mkdir -p /var/log/mmsu-attendance

# Load configuration
load_config() {
    if [ -f "$CONFIG_FILE" ]; then
        source "$CONFIG_FILE"
        return 0
    else
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] Config file not found: $CONFIG_FILE" >> "$LOG_FILE"
        return 1
    fi
}

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
    # Also output to stdout for systemd journal
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

get_ip_address() {
    hostname -I 2>/dev/null | awk '{print $1}'
}

# Get the kiosk user (the user running X)
get_kiosk_user() {
    # Try to find the user running X
    local user=$(who | grep -E 'tty[0-9]|:0' | head -1 | awk '{print $1}')
    if [ -z "$user" ]; then
        user="pi"  # Default to pi user
    fi
    echo "$user"
}

execute_command() {
    local COMMAND="$1"
    log "========================================"
    log "Executing command: $COMMAND"
    
    case "$COMMAND" in
        "restart_kiosk")
            log "Restarting kiosk browser..."
            
            # Kill existing chromium processes
            pkill -f chromium-browser || pkill -f chromium || true
            sleep 2
            
            # Get the display and user
            local KIOSK_USER=$(get_kiosk_user)
            
            # Try to restart via systemd first
            if systemctl is-active --quiet mmsu-kiosk.service; then
                log "Restarting via systemd service..."
                systemctl restart mmsu-kiosk.service
            else
                # Fallback: start Chromium directly
                log "Starting Chromium directly as user $KIOSK_USER..."
                local KIOSK_URL="${SERVER_URL}/device?id=${DEVICE_ID}"
                
                sudo -u "$KIOSK_USER" DISPLAY=:0 chromium-browser \
                    --kiosk \
                    --noerrdialogs \
                    --disable-infobars \
                    --disable-translate \
                    --no-first-run \
                    --fast \
                    --fast-start \
                    --disable-features=TranslateUI \
                    --disable-session-crashed-bubble \
                    --disable-restore-session-state \
                    --disk-cache-size=1 \
                    --media-cache-size=1 \
                    "$KIOSK_URL" &
            fi
            
            log "Kiosk restart completed"
            ;;
            
        "reboot")
            log "Rebooting device in 3 seconds..."
            sync
            sleep 3
            sudo reboot
            ;;
            
        "shutdown")
            log "Shutting down device in 3 seconds..."
            sync
            sleep 3
            sudo shutdown -h now
            ;;
            
        "update_config")
            log "Reloading configuration..."
            load_config
            log "Configuration reloaded"
            ;;
            
        *)
            log "Unknown command: $COMMAND"
            ;;
    esac
    log "========================================"
}

send_heartbeat() {
    local IP_ADDRESS=$(get_ip_address)
    local RESPONSE
    local CURL_EXIT_CODE
    
    # Build the heartbeat payload
    local PAYLOAD="{\"device_id\":\"${DEVICE_ID}\",\"ip_address\":\"${IP_ADDRESS}\",\"scanner_mode\":\"${SCANNER_MODE:-both}\"}"
    
    # Send heartbeat
    RESPONSE=$(curl -s -X POST "${SERVER_URL}/api/rpi/heartbeat" \
        -H "Content-Type: application/json" \
        -d "$PAYLOAD" \
        --connect-timeout 10 \
        --max-time 15 \
        2>/dev/null)
    CURL_EXIT_CODE=$?
    
    if [ $CURL_EXIT_CODE -eq 0 ] && [ -n "$RESPONSE" ]; then
        # Try to parse with jq first, fall back to python if jq not available
        local SUCCESS=""
        local COMMAND=""
        local ENABLED=""
        
        if command -v jq &> /dev/null; then
            SUCCESS=$(echo "$RESPONSE" | jq -r '.success // empty' 2>/dev/null)
            COMMAND=$(echo "$RESPONSE" | jq -r '.command // .pending_command // empty' 2>/dev/null)
            ENABLED=$(echo "$RESPONSE" | jq -r '.enabled // empty' 2>/dev/null)
        elif command -v python3 &> /dev/null; then
            SUCCESS=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('success',''))" 2>/dev/null)
            COMMAND=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('command') or d.get('pending_command') or '')" 2>/dev/null)
            ENABLED=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('enabled',''))" 2>/dev/null)
        fi
        
        if [ "$SUCCESS" = "true" ]; then
            # Only log every 6th heartbeat (once per minute) to reduce log spam
            if [ $((HEARTBEAT_COUNT % 6)) -eq 0 ]; then
                log "Heartbeat OK (IP: $IP_ADDRESS)"
            fi
            
            # Check for pending command
            if [ -n "$COMMAND" ] && [ "$COMMAND" != "null" ] && [ "$COMMAND" != "None" ] && [ "$COMMAND" != "" ]; then
                log ">>> RECEIVED COMMAND FROM SERVER: $COMMAND <<<"
                execute_command "$COMMAND"
            fi
            
            # Warn if device was disabled
            if [ "$ENABLED" = "false" ]; then
                log "WARNING: Device has been disabled by administrator"
            fi
            
            return 0
        else
            log "Heartbeat response indicates failure"
            return 1
        fi
    else
        log "ERROR: Failed to connect to server (exit code: $CURL_EXIT_CODE)"
        return 1
    fi
}

# ============================================================
# Main Entry Point
# ============================================================

# Load initial configuration
if ! load_config; then
    echo "Failed to load configuration. Exiting."
    exit 1
fi

log "============================================"
log "MMSU Attendance Heartbeat Service Starting"
log "============================================"
log "Server URL: $SERVER_URL"
log "Device ID: $DEVICE_ID"
log "Scanner Mode: ${SCANNER_MODE:-both}"
log "Heartbeat Interval: ${HEARTBEAT_INTERVAL:-$INTERVAL} seconds"
log "============================================"

# Wait for network to be ready
log "Waiting for network..."
sleep 5

# Counter for reducing log spam
HEARTBEAT_COUNT=0
FAIL_COUNT=0
MAX_CONSECUTIVE_FAILS=30  # Alert after 5 minutes of failures

# Main heartbeat loop
while true; do
    if [ -n "$DEVICE_ID" ] && [ -n "$SERVER_URL" ]; then
        if send_heartbeat; then
            FAIL_COUNT=0
        else
            FAIL_COUNT=$((FAIL_COUNT + 1))
            if [ $FAIL_COUNT -ge $MAX_CONSECUTIVE_FAILS ]; then
                log "CRITICAL: $FAIL_COUNT consecutive heartbeat failures!"
                FAIL_COUNT=0  # Reset to avoid log spam
            fi
        fi
        HEARTBEAT_COUNT=$((HEARTBEAT_COUNT + 1))
    else
        if [ $((HEARTBEAT_COUNT % 6)) -eq 0 ]; then
            log "WARNING: Missing DEVICE_ID or SERVER_URL in configuration"
        fi
    fi
    
    sleep ${HEARTBEAT_INTERVAL:-$INTERVAL}
done
