#!/bin/bash
#
# Quick Deploy Script
# Run this from your computer to copy files to a Raspberry Pi
#
# Usage: ./deploy.sh <pi-hostname-or-ip>
# Example: ./deploy.sh 192.168.1.100
#

if [ -z "$1" ]; then
    echo "Usage: ./deploy.sh <pi-hostname-or-ip>"
    echo "Example: ./deploy.sh raspberrypi.local"
    echo "         ./deploy.sh 192.168.1.100"
    exit 1
fi

PI_HOST="$1"
PI_USER="${PI_USER:-pi}"

echo "========================================"
echo "MMSU Attendance - Raspberry Pi Deployer"
echo "========================================"
echo ""
echo "Target: $PI_USER@$PI_HOST"
echo ""

# Check if SSH connection works
echo "Testing SSH connection..."
ssh -o ConnectTimeout=5 -o BatchMode=yes "$PI_USER@$PI_HOST" exit 2>/dev/null

if [ $? -ne 0 ]; then
    echo "❌ Cannot connect to $PI_HOST"
    echo "   Please ensure:"
    echo "   1. The Raspberry Pi is powered on"
    echo "   2. SSH is enabled"
    echo "   3. The IP/hostname is correct"
    echo "   4. You can SSH manually: ssh $PI_USER@$PI_HOST"
    exit 1
fi

echo "✓ SSH connection successful"
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Copying files to Raspberry Pi..."

# Create target directory
ssh "$PI_USER@$PI_HOST" "mkdir -p /home/$PI_USER/mmsu-setup"

# Copy files
scp "$SCRIPT_DIR/setup.sh" "$PI_USER@$PI_HOST:/home/$PI_USER/mmsu-setup/"
scp "$SCRIPT_DIR/device_config.py" "$PI_USER@$PI_HOST:/home/$PI_USER/mmsu-setup/"
scp "$SCRIPT_DIR/README.md" "$PI_USER@$PI_HOST:/home/$PI_USER/mmsu-setup/"

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ Files copied successfully!"
    echo ""
    echo "========================================"
    echo "Next steps:"
    echo "========================================"
    echo ""
    echo "1. SSH into the Raspberry Pi:"
    echo "   ssh $PI_USER@$PI_HOST"
    echo ""
    echo "2. Run the setup script:"
    echo "   cd /home/$PI_USER/mmsu-setup"
    echo "   sudo bash setup.sh"
    echo ""
    echo "3. Follow the on-screen prompts"
    echo ""
    echo "4. Reboot when finished:"
    echo "   sudo reboot"
    echo ""
else
    echo ""
    echo "❌ Error copying files"
    exit 1
fi
