#!/bin/bash
#
# MMSU Attendance - Heartbeat Service
# Runs in the background to keep the device online status updated
#

CONFIG_FILE="/opt/mmsu-attendance/device.conf"
LOG_FILE="/var/log/mmsu-attendance/heartbeat.log"
INTERVAL=60  # seconds

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

log "Heartbeat service started"
log "Server: $SERVER_URL"
log "Device ID: $DEVICE_ID"
log "Interval: ${HEARTBEAT_INTERVAL:-$INTERVAL} seconds"

while true; do
    if [ -n "$DEVICE_ID" ]; then
        RESPONSE=$(curl -s -X POST "$SERVER_URL/api/rpi/heartbeat" \
            -H "Content-Type: application/json" \
            -d "{\"device_id\": \"$DEVICE_ID\"}" \
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
    
    # Use configured interval or default
    sleep ${HEARTBEAT_INTERVAL:-$INTERVAL}
done
