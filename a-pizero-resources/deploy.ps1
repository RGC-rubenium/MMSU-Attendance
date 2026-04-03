# MMSU Attendance - RPi Deploy Helper for Windows
# PowerShell script to deploy files to Raspberry Pi
#
# Usage: .\deploy.ps1 -Host <pi-hostname-or-ip>
# Example: .\deploy.ps1 -Host raspberrypi.local
#          .\deploy.ps1 -Host 192.168.1.100

param(
    [Parameter(Mandatory=$true)]
    [string]$PiHost,
    
    [string]$PiUser = "pi"
)

Write-Host "========================================"
Write-Host "MMSU Attendance - Raspberry Pi Deployer"
Write-Host "========================================"
Write-Host ""
Write-Host "Target: $PiUser@$PiHost"
Write-Host ""

# Get script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition

# Check if SSH is available
if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: SSH is not available. Please install OpenSSH client." -ForegroundColor Red
    Write-Host "You can enable it via: Settings > Apps > Optional Features > Add a feature > OpenSSH Client"
    exit 1
}

Write-Host "Testing SSH connection..."

# Test SSH connection
$sshTest = ssh -o ConnectTimeout=5 -o BatchMode=yes "$PiUser@$PiHost" "echo connected" 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "Cannot connect to $PiHost" -ForegroundColor Red
    Write-Host "Please ensure:"
    Write-Host "  1. The Raspberry Pi is powered on"
    Write-Host "  2. SSH is enabled"
    Write-Host "  3. The IP/hostname is correct"
    Write-Host "  4. You can SSH manually: ssh $PiUser@$PiHost"
    exit 1
}

Write-Host "SSH connection successful" -ForegroundColor Green
Write-Host ""

Write-Host "Creating target directory on Pi..."
ssh "$PiUser@$PiHost" "mkdir -p /home/$PiUser/mmsu-setup"

Write-Host "Copying files to Raspberry Pi..."

# Copy files
$files = @("setup.sh", "device_config.py", "README.md", "heartbeat.sh")

foreach ($file in $files) {
    $sourcePath = Join-Path $ScriptDir $file
    if (Test-Path $sourcePath) {
        Write-Host "  Copying $file..."
        scp $sourcePath "${PiUser}@${PiHost}:/home/$PiUser/mmsu-setup/"
    } else {
        Write-Host "  Warning: $file not found, skipping..." -ForegroundColor Yellow
    }
}

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Files copied successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "========================================"
    Write-Host "Next steps:"
    Write-Host "========================================"
    Write-Host ""
    Write-Host "1. SSH into the Raspberry Pi:"
    Write-Host "   ssh $PiUser@$PiHost"
    Write-Host ""
    Write-Host "2. Run the setup script:"
    Write-Host "   cd /home/$PiUser/mmsu-setup"
    Write-Host "   sudo bash setup.sh"
    Write-Host ""
    Write-Host "3. Follow the on-screen prompts"
    Write-Host ""
    Write-Host "4. Reboot when finished:"
    Write-Host "   sudo reboot"
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "Error copying files" -ForegroundColor Red
    exit 1
}
