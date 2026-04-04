#!/bin/bash
#
# MMSU Attendance - Heartbeat Service
# Runs in the background to keep the device online status updated
# Also receives and executes commands from the server
#

CONFIG_FILE="/opt/mmsu-attendance/device.conf"
LOG_FILE="/var/log/mmsu-attendance/heartbeat.log"
INTERVAL=10  # seconds (reduced for faster command response)

# Load configuration
if [ -f "$CONFIG_FILE" ]; then
    source "$CONFIG_FILE"
else
    echo "Config file not found: $CONFIG_FILE"
    exit 1
fi

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

execute_command() {
    local COMMAND="$1"
    log "Executing command: $COMMAND"
    
    case "$COMMAND" in
        "restart_kiosk")
            log "Restarting kiosk browser..."
            pkill -f chromium
            sleep 2
            # The kiosk service will automatically restart Chromium
            systemctl --user restart kiosk 2>/dev/null || {
                # Fallback: start Chromium manually
                DISPLAY=:0 chromium --kiosk --noerrdialogs --disable-infobars \
                    --disable-translate --no-first-run --fast --fast-start \
                    --disable-features=TranslateUI \
                    --disk-cache-size=1 --media-cache-size=1 \
                    "${SERVER_URL}/device?id=${DEVICE_ID}" &
            }
            log "Kiosk restart completed"
            ;;
        "reboot")
            log "Rebooting device..."
            sync
            sleep 2
            sudo reboot
            ;;
        "shutdown")
            log "Shutting down device..."
            sync
            sleep 2
            sudo shutdown -h now
            ;;
        *)
            log "Unknown command: $COMMAND"
            ;;
    esac
}

log "Heartbeat service started"
log "Server: $SERVER_URL"
log "Device ID: $DEVICE_ID"
log "Interval: ${HEARTBEAT_INTERVAL:-$INTERVAL} seconds"

while true; do
    if [ -n "$DEVICE_ID" ]; then
        # Get current IP address
        IP_ADDRESS=$(hostname -I | awk '{print $1}')
        
        RESPONSE=$(curl -s -X POST "$SERVER_URL/api/rpi/heartbeat" \
            -H "Content-Type: application/json" \
            -d "{\"device_id\": \"$DEVICE_ID\", \"ip_address\": \"$IP_ADDRESS\"}" \
            --connect-timeout 10 \
            --max-time 30 2>&1)
        
        if [ $? -eq 0 ]; then
            SUCCESS=$(echo "$RESPONSE" | jq -r '.success' 2>/dev/null)
            if [ "$SUCCESS" = "true" ]; then
                log "Heartbeat sent successfully"
                
                # Check if device is still enabled
                ENABLED=$(echo "$RESPONSE" | jq -r '.enabled' 2>/dev/null)
                if [ "$ENABLED" = "false" ]; then
                    log "WARNING: Device has been disabled"
                fi
                
                # Check if server returned a command to execute
                COMMAND=$(echo "$RESPONSE" | jq -r '.command' 2>/dev/null)
                if [ -n "$COMMAND" ] && [ "$COMMAND" != "null" ]; then
                    log "Received command from server: $COMMAND"
                    execute_command "$COMMAND"
                fi
            else
                ERROR=$(echo "$RESPONSE" | jq -r '.message' 2>/dev/null)
                log "Heartbeat failed: $ERROR"
            fi
        else
            log "ERROR: Could not connect to server"
        fi
    else
        log "WARNING: No device ID configured"
    fi
    
    # Use configured interval or default (10 seconds for fast command response)
    sleep ${HEARTBEAT_INTERVAL:-$INTERVAL}
done
