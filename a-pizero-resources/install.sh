#!/bin/bash
# filepath: a-pizero-resources/install.sh

# MMSU Attendance System - RPi Zero Installation Script
# Enhanced version with comprehensive error handling and logging

# Don't exit on errors immediately - we'll handle them manually
# set -e  # Exit on any error (disabled for better error visibility)
set -u  # Exit on undefined variables

# Prevent display clearing and terminal closing
export TERM=${TERM:-xterm}
stty -echoctl 2>/dev/null || true

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging setup
LOG_FILE="/tmp/mmsu_attendance_install.log"
INSTALL_DIR="/home/attendance"
SERVICE_NAME="attendance-client"

# Function to print colored output with forced display
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}[$(date '+%Y-%m-%d %H:%M:%S')] ${message}${NC}" | tee -a "$LOG_FILE"
    # Ensure output is flushed
    sync
    sleep 0.1
}

# Function to pause and wait for user input
pause_for_user() {
    local message=${1:-"Press any key to continue..."}
    echo
    print_status "$YELLOW" "⏸️  $message"
    read -n 1 -s -r
    echo
}

# Function to handle errors with persistent display
handle_error() {
    local exit_code=$?
    local line_number=${1:-"unknown"}
    echo
    echo "================================================================================="
    print_status "$RED" "💥 INSTALLATION ERROR DETECTED"
    echo "================================================================================="
    print_status "$RED" "❌ ERROR: Installation failed at line $line_number with exit code $exit_code"
    print_status "$RED" "📄 Check the log file for details: $LOG_FILE"
    echo
    print_status "$RED" "📝 Last few lines of the log:"
    echo "--------------------------------------------------------------------------------"
    tail -20 "$LOG_FILE" 2>/dev/null || echo "Log file not available"
    echo "--------------------------------------------------------------------------------"
    echo
    
    # PAUSE TERMINAL - Wait for user to read the error
    print_status "$YELLOW" "⏸️  TERMINAL PAUSED - Review the error above"
    pause_for_user "Press any key after reviewing the error to see options..."
    
    # Ask user what to do
    while true; do
        echo
        echo "================================================================================="
        print_status "$YELLOW" "❓ ERROR RECOVERY OPTIONS"
        echo "================================================================================="
        echo "  1) 🔄 Continue installation (ignore this error)"
        echo "  2) 🔁 Retry this step manually"
        echo "  3) 🧹 Cleanup and exit safely"
        echo "  4) 🚪 Exit immediately (no cleanup)"
        echo "  5) 📖 View full log file"
        echo "  6) 🛠️  Debug mode (show environment info)"
        echo
        read -p "Choose an option (1-6): " choice
        
        case $choice in
            1) 
                print_status "$YELLOW" "⚠️  Continuing despite error..."
                echo "⚠️  WARNING: Continuing with errors may cause issues later"
                pause_for_user "Press any key to continue installation..."
                return 0 
                ;;
            2) 
                print_status "$BLUE" "🔄 Manual retry mode activated"
                echo "📋 Please retry the failed command manually in another terminal"
                echo "📋 Or fix the issue and then continue"
                pause_for_user "Press any key when ready to continue..."
                ;;
            3) 
                print_status "$YELLOW" "🧹 Performing safe cleanup..."
                pause_for_user "Press any key to start cleanup..."
                cleanup_on_error
                print_status "$GREEN" "✅ Cleanup completed"
                pause_for_user "Press any key to exit..."
                exit $exit_code 
                ;;
            4) 
                print_status "$YELLOW" "🚪 Exiting immediately..."
                pause_for_user "Press any key to exit (no cleanup will be performed)..."
                exit $exit_code 
                ;;
            5) 
                echo
                print_status "$BLUE" "📖 Opening log file..."
                echo "================================================================================="
                less "$LOG_FILE" 2>/dev/null || cat "$LOG_FILE" 2>/dev/null || echo "Cannot open log file"
                echo "================================================================================="
                pause_for_user "Press any key to return to options menu..."
                ;;
            6)
                echo
                print_status "$BLUE" "🛠️  System Debug Information:"
                echo "================================================================================="
                echo "Working Directory: $(pwd)"
                echo "User: $(whoami)"
                echo "OS: $(lsb_release -d 2>/dev/null | cut -f2 || echo 'Unknown')"
                echo "Free Space: $(df -h / | awk 'NR==2 {print $4}')"
                echo "Memory: $(free -h | awk 'NR==2{printf "%.2f GB available\n", $7/1024/1024}')"
                echo "Network: $(ping -c 1 google.com &>/dev/null && echo 'Connected' || echo 'No connection')"
                echo "Python: $(python3 --version 2>/dev/null || echo 'Not available')"
                echo "Last Command Exit Code: $exit_code"
                echo "Script Line: $line_number"
                echo "================================================================================="
                pause_for_user "Press any key to return to options menu..."
                ;;
            *) 
                print_status "$RED" "❌ Invalid choice '$choice', please select 1-6"
                pause_for_user "Press any key to try again..."
                ;;
        esac
    done
}

# Function to safely execute commands with error handling
safe_execute() {
    local description="$1"
    shift
    local command="$@"
    
    print_status "$BLUE" "🔄 $description"
    print_status "$BLUE" "   Executing: $command"
    
    if eval "$command" 2>&1 | tee -a "$LOG_FILE"; then
        print_status "$GREEN" "✅ Success: $description"
        return 0
    else
        local exit_code=$?
        echo
        echo "================================================================================="
        print_status "$RED" "💥 COMMAND FAILED"
        echo "================================================================================="
        print_status "$RED" "❌ Failed: $description"
        print_status "$RED" "📋 Command: $command"
        print_status "$RED" "🔢 Exit code: $exit_code"
        echo "================================================================================="
        
        # PAUSE TERMINAL immediately when command fails
        pause_for_user "⏸️  Command failed! Press any key to see error recovery options..."
        
        handle_error "${BASH_LINENO[1]}"
        return $exit_code
    fi
}

# Function to cleanup on error
cleanup_on_error() {
    print_status "$YELLOW" "🧹 Cleaning up partial installation..."
    
    # Stop service if it was created
    if systemctl list-units --full -all | grep -Fq "$SERVICE_NAME.service"; then
        sudo systemctl stop "$SERVICE_NAME.service" 2>/dev/null || true
        sudo systemctl disable "$SERVICE_NAME.service" 2>/dev/null || true
    fi
    
    # Remove service file
    sudo rm -f "/etc/systemd/system/$SERVICE_NAME.service" 2>/dev/null || true
    
    # Remove user if created
    if id "attendance" &>/dev/null; then
        print_status "$YELLOW" "🗑️  Removing attendance user..."
        sudo userdel -r attendance 2>/dev/null || true
    fi
    
    print_status "$YELLOW" "🧹 Cleanup completed"
}

# Function to check command availability
check_command() {
    local cmd=$1
    if ! command -v "$cmd" &> /dev/null; then
        print_status "$RED" "❌ Required command '$cmd' not found"
        return 1
    fi
    return 0
}

# Function to check system requirements
check_requirements() {
    print_status "$BLUE" "🔍 Checking system requirements..."
    
    # Check if running as root
    if [[ $EUID -ne 0 ]]; then
        print_status "$RED" "❌ This script must be run as root (use sudo)"
        exit 1
    fi
    
    # Check OS
    if [[ ! -f /etc/os-release ]]; then
        print_status "$RED" "❌ Cannot determine OS version"
        exit 1
    fi
    
    source /etc/os-release
    print_status "$GREEN" "✅ OS: $PRETTY_NAME"
    
    # Check architecture
    local arch=$(uname -m)
    print_status "$GREEN" "✅ Architecture: $arch"
    
    # Check available space
    local available_space=$(df / | awk 'NR==2 {print $4}')
    if [[ $available_space -lt 1048576 ]]; then  # Less than 1GB
        print_status "$YELLOW" "⚠️  Warning: Less than 1GB free space available"
    fi
    print_status "$GREEN" "✅ Available space: $(($available_space / 1024))MB"
    
    # Check internet connectivity
    if ! ping -c 1 google.com &> /dev/null; then
        print_status "$RED" "❌ No internet connectivity"
        print_status "$YELLOW" "💡 Please check your network connection"
        exit 1
    fi
    print_status "$GREEN" "✅ Internet connectivity"
}

# Function to backup existing files
backup_existing() {
    print_status "$BLUE" "💾 Creating backup of existing files..."
    
    local backup_dir="/tmp/mmsu_attendance_backup_$(date +%s)"
    mkdir -p "$backup_dir"
    
    # Backup existing service file
    if [[ -f "/etc/systemd/system/$SERVICE_NAME.service" ]]; then
        cp "/etc/systemd/system/$SERVICE_NAME.service" "$backup_dir/"
        print_status "$GREEN" "✅ Backed up existing service file"
    fi
    
    # Backup existing user files
    if [[ -d "$INSTALL_DIR" ]]; then
        cp -r "$INSTALL_DIR" "$backup_dir/"
        print_status "$GREEN" "✅ Backed up existing installation directory"
    fi
    
    print_status "$GREEN" "✅ Backup created at: $backup_dir"
}

# Function to update system packages
update_system() {
    print_status "$BLUE" "📦 Updating system packages..."
    echo
    
    # Update package lists with safe execution
    safe_execute "Updating package lists" "apt update"
    
    echo
    # Upgrade system (optional, ask user)
    read -p "Do you want to upgrade system packages? This may take a while. (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "$BLUE" "⬆️  Upgrading system packages (this may take several minutes)..."
        if apt upgrade -y 2>&1 | tee -a "$LOG_FILE"; then
            print_status "$GREEN" "✅ System packages upgraded successfully"
        else
            print_status "$YELLOW" "⚠️  System upgrade had issues, but continuing..."
        fi
    else
        print_status "$YELLOW" "⏭️  Skipping system upgrade"
    fi
    
    print_status "$GREEN" "✅ System packages updated"
    pause_for_user "Package update complete. Continue?"
}

# Function to install required packages
install_packages() {
    print_status "$BLUE" "📦 Installing required packages..."
    echo
    
    local packages=(
        "python3"
        "python3-pip"
        "chromium-browser"
        "xorg"
        "openbox" 
        "lightdm"
        "git"
        "curl"
        "systemd"
    )
    
    local total=${#packages[@]}
    local current=0
    
    for package in "${packages[@]}"; do
        ((current++))
        print_status "$BLUE" "📦 Installing $package... ($current/$total)"
        
        # Check if already installed
        if dpkg -l | grep -q "^ii  $package "; then
            print_status "$GREEN" "✅ $package already installed"
            continue
        fi
        
        if apt install -y "$package" 2>&1 | tee -a "$LOG_FILE"; then
            print_status "$GREEN" "✅ Installed $package"
        else
            echo
            print_status "$RED" "❌ Failed to install package: $package"
            print_status "$YELLOW" "⏸️  Package installation failed - terminal paused"
            pause_for_user "Press any key to see error recovery options..."
            handle_error "${BASH_LINENO[0]}"
        fi
        
        # Small delay for visibility
        sleep 1
    done
    
    print_status "$GREEN" "✅ All packages installed successfully"
    pause_for_user "Package installation complete. Continue?"
}

# Function to install Python dependencies
install_python_deps() {
    print_status "$BLUE" "🐍 Installing Python dependencies..."
    
    local pip_packages=(
        "requests"
        "pygame"
        "psutil"
    )
    
    for package in "${pip_packages[@]}"; do
        print_status "$BLUE" "🐍 Installing Python package: $package..."
        if ! pip3 install "$package" 2>&1 | tee -a "$LOG_FILE"; then
            print_status "$RED" "❌ Failed to install Python package: $package"
            return 1
        fi
        print_status "$GREEN" "✅ Installed Python package: $package"
    done
    
    print_status "$GREEN" "✅ Python dependencies installed"
}

# Function to create attendance user
create_user() {
    print_status "$BLUE" "👤 Creating attendance user..."
    
    # Check if user already exists
    if id "attendance" &>/dev/null; then
        print_status "$YELLOW" "⚠️  User 'attendance' already exists"
        read -p "Do you want to recreate the user? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            userdel -r attendance 2>/dev/null || true
        else
            print_status "$GREEN" "✅ Using existing user"
            return 0
        fi
    fi
    
    # Create user
    if ! useradd -m -s /bin/bash attendance 2>&1 | tee -a "$LOG_FILE"; then
        print_status "$RED" "❌ Failed to create user 'attendance'"
        return 1
    fi
    
    # Add user to required groups
    local groups=("audio" "video" "plugdev" "gpio" "spi" "i2c")
    for group in "${groups[@]}"; do
        if getent group "$group" > /dev/null; then
            usermod -a -G "$group" attendance
            print_status "$GREEN" "✅ Added user to group: $group"
        else
            print_status "$YELLOW" "⚠️  Group '$group' not found, skipping"
        fi
    done
    
    print_status "$GREEN" "✅ User 'attendance' created successfully"
}

# Function to copy configuration files
copy_files() {
    print_status "$BLUE" "📁 Copying configuration files..."
    
    # Create installation directory
    mkdir -p "$INSTALL_DIR"
    
    # Check if files exist in current directory
    local files=("rpi_config.json" "rpi_attendance_client.py")
    
    for file in "${files[@]}"; do
        if [[ ! -f "$file" ]]; then
            print_status "$RED" "❌ Required file not found: $file"
            print_status "$YELLOW" "💡 Please ensure you're running this script from the correct directory"
            return 1
        fi
        
        cp "$file" "$INSTALL_DIR/"
        print_status "$GREEN" "✅ Copied: $file"
    done
    
    # Set ownership
    chown -R attendance:attendance "$INSTALL_DIR"
    chmod +x "$INSTALL_DIR/rpi_attendance_client.py"
    
    print_status "$GREEN" "✅ Configuration files copied"
}

# Function to create systemd service
create_service() {
    print_status "$BLUE" "⚙️  Creating systemd service..."
    
    local service_file="/etc/systemd/system/$SERVICE_NAME.service"
    
    cat > "$service_file" << EOF
[Unit]
Description=MMSU Attendance Client
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=attendance
Group=attendance
WorkingDirectory=$INSTALL_DIR
ExecStart=/usr/bin/python3 $INSTALL_DIR/rpi_attendance_client.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

# Environment variables
Environment=DISPLAY=:0
Environment=XAUTHORITY=/home/attendance/.Xauthority

# Security settings
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$INSTALL_DIR
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

    # Validate service file
    if ! systemd-analyze verify "$service_file" 2>&1 | tee -a "$LOG_FILE"; then
        print_status "$YELLOW" "⚠️  Service file validation warnings (may be normal)"
    fi
    
    # Reload systemd
    if ! systemctl daemon-reload 2>&1 | tee -a "$LOG_FILE"; then
        print_status "$RED" "❌ Failed to reload systemd"
        return 1
    fi
    
    # Enable service
    if ! systemctl enable "$SERVICE_NAME.service" 2>&1 | tee -a "$LOG_FILE"; then
        print_status "$RED" "❌ Failed to enable service"
        return 1
    fi
    
    print_status "$GREEN" "✅ Systemd service created and enabled"
}

# Function to configure auto-login
configure_autologin() {
    print_status "$BLUE" "🔐 Configuring auto-login..."
    
    local lightdm_conf="/etc/lightdm/lightdm.conf"
    
    # Backup original config
    if [[ -f "$lightdm_conf" ]]; then
        cp "$lightdm_conf" "$lightdm_conf.backup"
        print_status "$GREEN" "✅ Backed up lightdm config"
    fi
    
    # Configure auto-login
    if grep -q "^autologin-user=" "$lightdm_conf"; then
        sed -i 's/^autologin-user=.*/autologin-user=attendance/' "$lightdm_conf"
    else
        sed -i 's/^#autologin-user=/autologin-user=attendance/' "$lightdm_conf"
    fi
    
    print_status "$GREEN" "✅ Auto-login configured"
}

# Function to configure kiosk mode
configure_kiosk() {
    print_status "$BLUE" "🖥️  Configuring kiosk mode..."
    
    # Create openbox config directory
    local openbox_dir="$INSTALL_DIR/.config/openbox"
    mkdir -p "$openbox_dir"
    
    # Create autostart script
    cat > "$openbox_dir/autostart" << 'EOF'
# Disable screen saver
xset s off
xset -dpms
xset s noblank

# Start chromium in kiosk mode
chromium-browser \
    --kiosk \
    --no-sandbox \
    --disable-dev-shm-usage \
    --disable-infobars \
    --disable-restore-session-state \
    --disable-session-crashed-bubble \
    --disable-features=VizDisplayCompositor \
    --start-fullscreen \
    --check-for-update-interval=31536000 \
    http://localhost:8080 &
EOF

    chmod +x "$openbox_dir/autostart"
    chown -R attendance:attendance "$INSTALL_DIR/.config"
    
    print_status "$GREEN" "✅ Kiosk mode configured"
}

# Function to test installation
test_installation() {
    print_status "$BLUE" "🧪 Testing installation..."
    
    # Test Python script syntax
    if ! python3 -m py_compile "$INSTALL_DIR/rpi_attendance_client.py" 2>&1 | tee -a "$LOG_FILE"; then
        print_status "$RED" "❌ Python script has syntax errors"
        return 1
    fi
    print_status "$GREEN" "✅ Python script syntax OK"
    
    # Test service file
    if ! systemctl is-enabled "$SERVICE_NAME.service" &>/dev/null; then
        print_status "$RED" "❌ Service is not enabled"
        return 1
    fi
    print_status "$GREEN" "✅ Service is enabled"
    
    # Test required commands
    local commands=("python3" "chromium-browser")
    for cmd in "${commands[@]}"; do
        if ! check_command "$cmd"; then
            return 1
        fi
        print_status "$GREEN" "✅ Command available: $cmd"
    done
    
    print_status "$GREEN" "✅ Installation test passed"
}

# Function to provide post-installation instructions
post_install_instructions() {
    print_status "$GREEN" "🎉 Installation completed successfully!"
    echo
    print_status "$BLUE" "📋 Post-installation steps:"
    echo
    print_status "$YELLOW" "1. Configure backend URL:"
    echo "   sudo nano $INSTALL_DIR/rpi_config.json"
    echo "   Update 'backend_url' to your server IP"
    echo
    print_status "$YELLOW" "2. Start the service:"
    echo "   sudo systemctl start $SERVICE_NAME.service"
    echo
    print_status "$YELLOW" "3. Check service status:"
    echo "   sudo systemctl status $SERVICE_NAME.service"
    echo
    print_status "$YELLOW" "4. View logs:"
    echo "   sudo journalctl -u $SERVICE_NAME.service -f"
    echo
    print_status "$YELLOW" "5. Reboot to enable auto-login:"
    echo "   sudo reboot"
    echo
    print_status "$GREEN" "📝 Installation log saved to: $LOG_FILE"
}

# Main installation function
main() {
    # Don't set automatic error trap - we handle errors manually
    # trap 'handle_error $LINENO' ERR
    
    # Clear screen but keep it visible
    clear
    echo "================================================================================="
    print_status "$GREEN" "🚀 MMSU Attendance System - RPi Zero Installation Script"
    print_status "$GREEN" "🚀 Starting installation..."
    print_status "$BLUE" "📝 Installation log: $LOG_FILE"
    echo "================================================================================="
    echo
    
    # Clear log file
    > "$LOG_FILE"
    echo "Installation started at $(date)" >> "$LOG_FILE"
    
    # Show installation steps
    print_status "$YELLOW" "📋 Installation will proceed through these steps:"
    echo "   1. Check system requirements"
    echo "   2. Backup existing files"
    echo "   3. Update system packages"
    echo "   4. Install required packages"
    echo "   5. Install Python dependencies"
    echo "   6. Create attendance user"
    echo "   7. Copy configuration files"
    echo "   8. Create systemd service"
    echo "   9. Configure auto-login"
    echo "   10. Configure kiosk mode"
    echo "   11. Test installation"
    echo "   12. Show post-installation instructions"
    echo
    
    pause_for_user "Ready to start installation?"
    
    # Installation steps with progress tracking
    local steps=("check_requirements" "backup_existing" "update_system" "install_packages" "install_python_deps" "create_user" "copy_files" "create_service" "configure_autologin" "configure_kiosk" "test_installation" "post_install_instructions")
    local step_names=("Checking requirements" "Backing up files" "Updating system" "Installing packages" "Installing Python deps" "Creating user" "Copying files" "Creating service" "Configuring auto-login" "Configuring kiosk" "Testing installation" "Showing instructions")
    local total=${#steps[@]}
    
    for i in "${!steps[@]}"; do
        local step=${steps[$i]}
        local step_name=${step_names[$i]}
        local current=$((i + 1))
        
        echo
        echo "================================================================================="
        print_status "$BLUE" "📍 Step $current/$total: $step_name"
        echo "================================================================================="
        
        # Execute step and handle any errors
        if ! $step; then
            echo
            echo "================================================================================="
            print_status "$RED" "💥 INSTALLATION STEP FAILED"
            echo "================================================================================="
            print_status "$RED" "❌ Step failed: $step_name (Step $current/$total)"
            print_status "$YELLOW" "⏸️  Installation step failed - terminal paused"
            echo "================================================================================="
            pause_for_user "Press any key to see error recovery options..."
            handle_error "step_$current"
        fi
        
        print_status "$GREEN" "✅ Step $current/$total completed: $step_name"
    done
    
    echo
    echo "================================================================================="
    print_status "$GREEN" "🎉 Installation completed successfully!"
    echo "================================================================================="
    echo
    
    # Ask if user wants to start the service immediately
    read -p "Do you want to start the service now? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "$BLUE" "🚀 Starting service..."
        if systemctl start "$SERVICE_NAME.service" 2>&1 | tee -a "$LOG_FILE"; then
            sleep 2
            print_status "$GREEN" "✅ Service started successfully"
            systemctl status "$SERVICE_NAME.service" --no-pager
        else
            echo
            print_status "$RED" "❌ Failed to start service"
            print_status "$YELLOW" "⏸️  Service start failed - terminal paused"
            pause_for_user "Press any key to see error recovery options..."
            handle_error "service_start"
        fi
    fi
    
    echo
    pause_for_user "Installation complete! Press any key to exit..."
}

# Run main function
main "$@"