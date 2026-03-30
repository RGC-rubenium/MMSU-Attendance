# MMSU Attendance System - Windows Installation Script
# Enhanced PowerShell version with comprehensive error handling

param(
    [switch]$Silent = $false,
    [string]$BackendUrl = "",
    [string]$InstallPath = "$env:ProgramFiles\MMSU Attendance"
)

# Requires Administrator privileges
#Requires -RunAsAdministrator

# Script configuration
$ErrorActionPreference = "Continue"
$ProgressPreference = "Continue"

# Color configuration for console output
$Colors = @{
    Red = "Red"
    Green = "Green" 
    Yellow = "Yellow"
    Blue = "Blue"
    Cyan = "Cyan"
    Magenta = "Magenta"
}

# Logging setup
$LogFile = "$env:TEMP\mmsu_attendance_install.log"
$ServiceName = "MMSUAttendanceClient"
$ServiceDisplayName = "MMSU Attendance Client Service"

# Global variables
$InstallationSteps = @()
$CurrentStep = 0
$TotalSteps = 12

# Function to write colored output with logging
function Write-Status {
    param(
        [string]$Message,
        [string]$Color = "White",
        [switch]$NoNewLine = $false
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] $Message"
    
    # Write to console with color
    if ($NoNewLine) {
        Write-Host "[$timestamp] $Message" -ForegroundColor $Color -NoNewline
    } else {
        Write-Host "[$timestamp] $Message" -ForegroundColor $Color
    }
    
    # Write to log file
    Add-Content -Path $LogFile -Value $logEntry -ErrorAction SilentlyContinue
    
    # Ensure output is flushed
    [System.Console]::Out.Flush()
}

# Function to pause and wait for user input
function Pause-ForUser {
    param([string]$Message = "Press any key to continue...")
    
    Write-Host ""
    Write-Status "⏸️ $Message" -Color $Colors.Yellow
    if (-not $Silent) {
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        Write-Host ""
    } else {
        Start-Sleep -Seconds 2
    }
}

# Function to handle errors with interactive recovery
function Handle-Error {
    param(
        [string]$ErrorMessage,
        [string]$Command = "",
        [int]$ExitCode = 1,
        [string]$Step = ""
    )
    
    Write-Host ""
    Write-Host "=" * 80 -ForegroundColor Red
    Write-Status "💥 INSTALLATION ERROR DETECTED" -Color $Colors.Red
    Write-Host "=" * 80 -ForegroundColor Red
    Write-Status "❌ ERROR: $ErrorMessage" -Color $Colors.Red
    if ($Command) {
        Write-Status "📋 Command: $Command" -Color $Colors.Red
    }
    if ($Step) {
        Write-Status "📍 Step: $Step" -Color $Colors.Red
    }
    Write-Status "🔢 Exit Code: $ExitCode" -Color $Colors.Red
    Write-Status "📄 Log File: $LogFile" -Color $Colors.Red
    Write-Host ""
    
    # Show recent log entries
    Write-Status "📝 Recent log entries:" -Color $Colors.Red
    Write-Host "-" * 80 -ForegroundColor Red
    if (Test-Path $LogFile) {
        Get-Content $LogFile -Tail 10 | ForEach-Object { Write-Host $_ -ForegroundColor Gray }
    }
    Write-Host "-" * 80 -ForegroundColor Red
    Write-Host ""
    
    # Pause to show error
    Pause-ForUser "Press any key after reviewing the error to see recovery options..."
    
    # Interactive error recovery
    while ($true) {
        Write-Host ""
        Write-Host "=" * 80 -ForegroundColor Yellow
        Write-Status "❓ ERROR RECOVERY OPTIONS" -Color $Colors.Yellow
        Write-Host "=" * 80 -ForegroundColor Yellow
        Write-Host "  1) 🔄 Continue installation (ignore this error)"
        Write-Host "  2) 🔁 Retry this step manually"
        Write-Host "  3) 🧹 Cleanup and exit safely"
        Write-Host "  4) 🚪 Exit immediately (no cleanup)"
        Write-Host "  5) 📖 View full log file"
        Write-Host "  6) 🛠️ Debug mode (show environment info)"
        Write-Host "  7) 🔍 Open log file in notepad"
        Write-Host ""
        
        if ($Silent) {
            $choice = "1"
            Write-Status "Silent mode: Automatically continuing..." -Color $Colors.Yellow
        } else {
            $choice = Read-Host "Choose an option (1-7)"
        }
        
        switch ($choice) {
            "1" {
                Write-Status "⚠️ Continuing despite error..." -Color $Colors.Yellow
                Write-Host "⚠️ WARNING: Continuing with errors may cause issues later"
                Pause-ForUser "Press any key to continue installation..."
                return $false  # Don't exit, continue
            }
            "2" {
                Write-Status "🔄 Manual retry mode activated" -Color $Colors.Blue
                Write-Host "📋 Please retry the failed operation manually"
                Write-Host "📋 Or fix the issue and then continue"
                Pause-ForUser "Press any key when ready to continue..."
                continue
            }
            "3" {
                Write-Status "🧹 Performing safe cleanup..." -Color $Colors.Yellow
                Pause-ForUser "Press any key to start cleanup..."
                Cleanup-Installation
                Write-Status "✅ Cleanup completed" -Color $Colors.Green
                Pause-ForUser "Press any key to exit..."
                exit $ExitCode
            }
            "4" {
                Write-Status "🚪 Exiting immediately..." -Color $Colors.Yellow
                Pause-ForUser "Press any key to exit (no cleanup will be performed)..."
                exit $ExitCode
            }
            "5" {
                Write-Host ""
                Write-Status "📖 Log file contents:" -Color $Colors.Blue
                Write-Host "=" * 80 -ForegroundColor Blue
                if (Test-Path $LogFile) {
                    Get-Content $LogFile | ForEach-Object { Write-Host $_ -ForegroundColor Gray }
                } else {
                    Write-Host "Log file not found" -ForegroundColor Red
                }
                Write-Host "=" * 80 -ForegroundColor Blue
                Pause-ForUser "Press any key to return to options menu..."
                continue
            }
            "6" {
                Write-Host ""
                Write-Status "🛠️ System Debug Information:" -Color $Colors.Blue
                Write-Host "=" * 80 -ForegroundColor Blue
                Write-Host "Working Directory: $(Get-Location)"
                Write-Host "User: $env:USERNAME"
                Write-Host "Computer: $env:COMPUTERNAME"
                Write-Host "OS: $((Get-WmiObject Win32_OperatingSystem).Caption)"
                Write-Host "PowerShell Version: $($PSVersionTable.PSVersion)"
                Write-Host "Free Space C:\: $([math]::Round((Get-WmiObject Win32_LogicalDisk -Filter "DeviceID='C:'").FreeSpace / 1GB, 2)) GB"
                Write-Host "Memory: $([math]::Round((Get-WmiObject Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 2)) GB"
                $networkTest = Test-NetConnection google.com -Port 80 -WarningAction SilentlyContinue
                Write-Host "Network: $(if($networkTest.TcpTestSucceeded) { 'Connected' } else { 'No connection' })"
                Write-Host "Python: $(try { (python --version 2>&1) } catch { 'Not available' })"
                Write-Host "Error Code: $ExitCode"
                Write-Host "Failed Step: $Step"
                Write-Host "=" * 80 -ForegroundColor Blue
                Pause-ForUser "Press any key to return to options menu..."
                continue
            }
            "7" {
                if (Test-Path $LogFile) {
                    Start-Process notepad.exe -ArgumentList $LogFile
                    Write-Status "📝 Log file opened in notepad" -Color $Colors.Green
                } else {
                    Write-Status "❌ Log file not found" -Color $Colors.Red
                }
                continue
            }
            default {
                Write-Status "❌ Invalid choice '$choice', please select 1-7" -Color $Colors.Red
                Pause-ForUser "Press any key to try again..."
                continue
            }
        }
    }
}

# Function to safely execute commands
function Invoke-SafeCommand {
    param(
        [string]$Description,
        [scriptblock]$Command,
        [string]$Step = ""
    )
    
    Write-Status "🔄 $Description" -Color $Colors.Blue
    Write-Status "   Executing command..." -Color $Colors.Blue
    
    try {
        $result = & $Command
        Write-Status "✅ Success: $Description" -Color $Colors.Green
        return $result
    }
    catch {
        Write-Host ""
        Write-Host "=" * 80 -ForegroundColor Red
        Write-Status "💥 COMMAND FAILED" -Color $Colors.Red
        Write-Host "=" * 80 -ForegroundColor Red
        Write-Status "❌ Failed: $Description" -Color $Colors.Red
        Write-Status "📋 Error: $($_.Exception.Message)" -Color $Colors.Red
        Write-Host "=" * 80 -ForegroundColor Red
        
        Pause-ForUser "⏸️ Command failed! Press any key to see error recovery options..."
        
        $shouldExit = Handle-Error -ErrorMessage $_.Exception.Message -Command $Description -Step $Step
        if ($shouldExit) {
            exit 1
        }
    }
}

# Function to cleanup installation on error
function Cleanup-Installation {
    Write-Status "🧹 Cleaning up partial installation..." -Color $Colors.Yellow
    
    try {
        # Stop and remove service
        if (Get-Service $ServiceName -ErrorAction SilentlyContinue) {
            Write-Status "Stopping service..." -Color $Colors.Yellow
            Stop-Service $ServiceName -Force -ErrorAction SilentlyContinue
            Remove-Service $ServiceName -ErrorAction SilentlyContinue
        }
        
        # Remove installation directory
        if (Test-Path $InstallPath) {
            Write-Status "Removing installation directory..." -Color $Colors.Yellow
            Remove-Item $InstallPath -Recurse -Force -ErrorAction SilentlyContinue
        }
        
        # Remove scheduled task
        if (Get-ScheduledTask -TaskName "MMSU Attendance Kiosk" -ErrorAction SilentlyContinue) {
            Write-Status "Removing scheduled task..." -Color $Colors.Yellow
            Unregister-ScheduledTask -TaskName "MMSU Attendance Kiosk" -Confirm:$false -ErrorAction SilentlyContinue
        }
        
        Write-Status "✅ Cleanup completed" -Color $Colors.Green
    }
    catch {
        Write-Status "⚠️ Some cleanup operations failed: $($_.Exception.Message)" -Color $Colors.Yellow
    }
}

# Function to check system requirements
function Test-SystemRequirements {
    Write-Status "🔍 Checking system requirements..." -Color $Colors.Blue
    
    # Check if running as administrator
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        Handle-Error "This script must be run as Administrator" -Step "Requirements Check"
        exit 1
    }
    Write-Status "✅ Running as Administrator" -Color $Colors.Green
    
    # Check Windows version
    $osVersion = [System.Environment]::OSVersion.Version
    if ($osVersion.Major -lt 10) {
        Write-Status "⚠️ Warning: Windows 10 or later recommended" -Color $Colors.Yellow
    }
    Write-Status "✅ OS: $((Get-WmiObject Win32_OperatingSystem).Caption)" -Color $Colors.Green
    
    # Check available space (require at least 2GB)
    $freeSpace = [math]::Round((Get-WmiObject Win32_LogicalDisk -Filter "DeviceID='C:'").FreeSpace / 1GB, 2)
    if ($freeSpace -lt 2) {
        Handle-Error "Insufficient disk space. At least 2GB required, $freeSpace GB available" -Step "Requirements Check"
    }
    Write-Status "✅ Available space: $freeSpace GB" -Color $Colors.Green
    
    # Check internet connectivity
    $networkTest = Test-NetConnection google.com -Port 80 -WarningAction SilentlyContinue
    if (-not $networkTest.TcpTestSucceeded) {
        Handle-Error "No internet connectivity detected" -Step "Requirements Check"
    }
    Write-Status "✅ Internet connectivity" -Color $Colors.Green
    
    Write-Status "✅ System requirements check passed" -Color $Colors.Green
}

# Function to install Chocolatey if not present
function Install-Chocolatey {
    Write-Status "🍫 Checking Chocolatey package manager..." -Color $Colors.Blue
    
    if (Get-Command choco -ErrorAction SilentlyContinue) {
        Write-Status "✅ Chocolatey already installed" -Color $Colors.Green
        return
    }
    
    Write-Status "📦 Installing Chocolatey..." -Color $Colors.Blue
    Invoke-SafeCommand "Installing Chocolatey" {
        Set-ExecutionPolicy Bypass -Scope Process -Force
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
        Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
        RefreshEnv
    } -Step "Chocolatey Installation"
    
    Write-Status "✅ Chocolatey installed successfully" -Color $Colors.Green
}

# Function to install required packages
function Install-RequiredPackages {
    Write-Status "📦 Installing required packages..." -Color $Colors.Blue
    
    $packages = @(
        @{name = "python3"; displayName = "Python 3"},
        @{name = "googlechrome"; displayName = "Google Chrome"},
        @{name = "git"; displayName = "Git"}
    )
    
    $current = 0
    $total = $packages.Count
    
    foreach ($package in $packages) {
        $current++
        Write-Status "📦 Installing $($package.displayName)... ($current/$total)" -Color $Colors.Blue
        
        # Check if already installed
        $installed = choco list --local-only | Where-Object { $_ -match "^$($package.name) " }
        if ($installed) {
            Write-Status "✅ $($package.displayName) already installed" -Color $Colors.Green
            continue
        }
        
        Invoke-SafeCommand "Installing $($package.displayName)" {
            choco install $($package.name) -y --no-progress
        } -Step "Package Installation"
        
        Write-Status "✅ Installed $($package.displayName)" -Color $Colors.Green
        Start-Sleep -Seconds 1
    }
    
    # Refresh environment variables
    RefreshEnv
    
    Write-Status "✅ All packages installed successfully" -Color $Colors.Green
    Pause-ForUser "Package installation complete. Continue?"
}

# Function to install Python dependencies
function Install-PythonDependencies {
    Write-Status "🐍 Installing Python dependencies..." -Color $Colors.Blue
    
    $pipPackages = @("requests", "psutil", "pywin32")
    
    foreach ($package in $pipPackages) {
        Write-Status "🐍 Installing Python package: $package..." -Color $Colors.Blue
        Invoke-SafeCommand "Installing Python package: $package" {
            python -m pip install $package
        } -Step "Python Dependencies"
        Write-Status "✅ Installed Python package: $package" -Color $Colors.Green
    }
    
    Write-Status "✅ Python dependencies installed" -Color $Colors.Green
}

# Function to create installation directory and copy files
function Copy-InstallationFiles {
    Write-Status "📁 Creating installation directory and copying files..." -Color $Colors.Blue
    
    # Create installation directory
    if (-not (Test-Path $InstallPath)) {
        New-Item -ItemType Directory -Path $InstallPath -Force | Out-Null
    }
    
    # Copy Python client script
    $clientScript = Join-Path $PSScriptRoot "windows_attendance_client.py"
    if (-not (Test-Path $clientScript)) {
        # Create the Python client script
        $pythonClientContent = @'
#!/usr/bin/env python3
import json
import time
import requests
import psutil
import socket
import subprocess
import os
import sys
import logging
import threading
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('attendance_client.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class WindowsAttendanceClient:
    def __init__(self, config_file='config.json'):
        self.config = self.load_config(config_file)
        self.device_id = self.get_device_id()
        self.running = False
        
    def load_config(self, config_file):
        default_config = {
            "device_name": "Windows Scanner Terminal",
            "location": "Main Office",
            "backend_url": "http://localhost:5000",
            "scanner_mode": "both",
            "heartbeat_interval": 30,
            "auto_pair": True,
            "kiosk_mode": True,
            "browser_url": "http://localhost:5000/scanner"
        }
        
        try:
            with open(config_file, 'r') as f:
                config = json.load(f)
                # Merge with defaults
                for key, value in default_config.items():
                    if key not in config:
                        config[key] = value
                return config
        except FileNotFoundError:
            logger.info(f"Config file {config_file} not found, creating default")
            with open(config_file, 'w') as f:
                json.dump(default_config, f, indent=4)
            return default_config
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in config file: {e}")
            return default_config
    
    def get_device_id(self):
        """Generate unique device ID based on computer name and MAC address"""
        try:
            hostname = socket.gethostname()
            # Get MAC address of first network adapter
            for interface, addrs in psutil.net_if_addrs().items():
                for addr in addrs:
                    if addr.family == psutil.AF_LINK:  # MAC address
                        mac = addr.address.replace(':', '').replace('-', '').lower()
                        return f"win-{hostname}-{mac[:8]}"
            return f"win-{hostname}-{int(time.time())}"
        except Exception as e:
            logger.error(f"Error generating device ID: {e}")
            return f"win-unknown-{int(time.time())}"
    
    def get_system_info(self):
        """Get current system information"""
        try:
            return {
                "device_id": self.device_id,
                "device_name": self.config["device_name"],
                "location": self.config["location"],
                "ip_address": socket.gethostbyname(socket.gethostname()),
                "hostname": socket.gethostname(),
                "os_info": f"Windows {psutil.disk_usage('/').total // (1024**3)}GB",
                "memory_mb": psutil.virtual_memory().total // (1024**2),
                "cpu_percent": psutil.cpu_percent(),
                "uptime": time.time() - psutil.boot_time()
            }
        except Exception as e:
            logger.error(f"Error getting system info: {e}")
            return {}
    
    def send_pairing_request(self):
        """Send pairing request to backend"""
        try:
            url = f"{self.config['backend_url']}/api/rpi/pairing-request"
            data = {
                "device_id": self.device_id,
                "device_name": self.config["device_name"],
                "location": self.config["location"],
                "ip_address": socket.gethostbyname(socket.gethostname()),
                "mac_address": self.get_mac_address(),
                "os_info": "Windows"
            }
            
            response = requests.post(url, json=data, timeout=10)
            if response.status_code == 200:
                result = response.json()
                logger.info(f"Pairing request sent successfully. Code: {result.get('pairing_code', 'N/A')}")
                return result
            else:
                logger.error(f"Pairing request failed: {response.text}")
                return None
        except Exception as e:
            logger.error(f"Error sending pairing request: {e}")
            return None
    
    def get_mac_address(self):
        """Get MAC address of primary network interface"""
        try:
            for interface, addrs in psutil.net_if_addrs().items():
                for addr in addrs:
                    if addr.family == psutil.AF_LINK:
                        return addr.address
            return "00:00:00:00:00:00"
        except:
            return "00:00:00:00:00:00"
    
    def check_pairing_status(self):
        """Check if device is paired and approved"""
        try:
            url = f"{self.config['backend_url']}/api/rpi/status/{self.device_id}"
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                return response.json()
            return None
        except Exception as e:
            logger.error(f"Error checking pairing status: {e}")
            return None
    
    def send_heartbeat(self):
        """Send heartbeat to backend"""
        try:
            url = f"{self.config['backend_url']}/api/rpi/heartbeat"
            data = {
                "device_id": self.device_id,
                **self.get_system_info()
            }
            
            response = requests.post(url, json=data, timeout=5)
            if response.status_code == 200:
                logger.debug("Heartbeat sent successfully")
                return True
            else:
                logger.warning(f"Heartbeat failed: {response.status_code}")
                return False
        except Exception as e:
            logger.error(f"Error sending heartbeat: {e}")
            return False
    
    def start_browser_kiosk(self):
        """Start browser in kiosk mode"""
        if not self.config.get("kiosk_mode", True):
            logger.info("Kiosk mode disabled in config")
            return
        
        try:
            # Kill any existing Chrome processes
            os.system("taskkill /f /im chrome.exe 2>nul")
            time.sleep(2)
            
            # Start Chrome in kiosk mode
            chrome_args = [
                "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
                "--kiosk",
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--disable-infobars",
                "--disable-restore-session-state",
                "--disable-session-crashed-bubble",
                "--start-fullscreen",
                "--disable-features=VizDisplayCompositor",
                self.config["browser_url"]
            ]
            
            subprocess.Popen(chrome_args, shell=False)
            logger.info("Browser kiosk mode started")
        except Exception as e:
            logger.error(f"Error starting browser kiosk: {e}")
    
    def heartbeat_loop(self):
        """Background heartbeat loop"""
        while self.running:
            self.send_heartbeat()
            time.sleep(self.config["heartbeat_interval"])
    
    def run(self):
        """Main client loop"""
        logger.info(f"Starting MMSU Attendance Client - Device ID: {self.device_id}")
        
        # Check if auto-pairing is enabled
        if self.config.get("auto_pair", True):
            logger.info("Sending pairing request...")
            pairing_result = self.send_pairing_request()
            
            if pairing_result:
                logger.info("Waiting for admin approval...")
                # Wait for approval
                max_wait = 300  # 5 minutes
                wait_time = 0
                while wait_time < max_wait:
                    status = self.check_pairing_status()
                    if status and status.get("status") == "approved":
                        logger.info("Device approved! Starting services...")
                        break
                    elif status and status.get("status") == "rejected":
                        logger.error("Device pairing was rejected")
                        return
                    
                    time.sleep(10)
                    wait_time += 10
                
                if wait_time >= max_wait:
                    logger.error("Pairing approval timeout")
                    return
        
        # Start main services
        self.running = True
        
        # Start heartbeat in background
        heartbeat_thread = threading.Thread(target=self.heartbeat_loop)
        heartbeat_thread.daemon = True
        heartbeat_thread.start()
        
        # Start browser kiosk
        self.start_browser_kiosk()
        
        # Main loop
        try:
            while self.running:
                # Check for configuration updates
                time.sleep(30)
                
        except KeyboardInterrupt:
            logger.info("Shutting down...")
            self.running = False

if __name__ == "__main__":
    client = WindowsAttendanceClient()
    client.run()
'@
        Set-Content -Path $clientScript -Value $pythonClientContent
    }
    
    # Copy files to installation directory
    Copy-Item $clientScript -Destination (Join-Path $InstallPath "attendance_client.py") -Force
    
    # Create config file
    $configPath = Join-Path $InstallPath "config.json"
    $config = @{
        device_name = "Windows Scanner Terminal"
        location = "Main Office"
        backend_url = if ($BackendUrl) { $BackendUrl } else { "http://localhost:5000" }
        scanner_mode = "both"
        heartbeat_interval = 30
        auto_pair = $true
        kiosk_mode = $true
        browser_url = if ($BackendUrl) { "$BackendUrl/scanner" } else { "http://localhost:5000/scanner" }
    } | ConvertTo-Json -Depth 3
    
    Set-Content -Path $configPath -Value $config
    
    Write-Status "✅ Installation files copied" -Color $Colors.Green
}

# Function to create Windows service
function New-AttendanceService {
    Write-Status "⚙️ Creating Windows service..." -Color $Colors.Blue
    
    $servicePath = Join-Path $InstallPath "attendance_client.py"
    $pythonPath = (Get-Command python).Source
    
    # Create service using NSSM (Non-Sucking Service Manager) or PowerShell
    Invoke-SafeCommand "Installing NSSM service manager" {
        choco install nssm -y --no-progress
    } -Step "Service Creation"
    
    # Remove existing service if it exists
    $existingService = Get-Service $ServiceName -ErrorAction SilentlyContinue
    if ($existingService) {
        Write-Status "Removing existing service..." -Color $Colors.Yellow
        Stop-Service $ServiceName -Force -ErrorAction SilentlyContinue
        & nssm remove $ServiceName confirm
    }
    
    Invoke-SafeCommand "Creating Windows service" {
        & nssm install $ServiceName $pythonPath $servicePath
        & nssm set $ServiceName DisplayName $ServiceDisplayName
        & nssm set $ServiceName Description "MMSU Attendance System Client Service"
        & nssm set $ServiceName Start SERVICE_AUTO_START
        & nssm set $ServiceName AppDirectory $InstallPath
        & nssm set $ServiceName AppStdout (Join-Path $InstallPath "service.log")
        & nssm set $ServiceName AppStderr (Join-Path $InstallPath "service.log")
    } -Step "Service Creation"
    
    Write-Status "✅ Windows service created" -Color $Colors.Green
}

# Function to configure auto-start
function Set-AutoStart {
    Write-Status "🔐 Configuring auto-start..." -Color $Colors.Blue
    
    # Create scheduled task for kiosk mode
    $action = New-ScheduledTaskAction -Execute "python" -Argument (Join-Path $InstallPath "attendance_client.py") -WorkingDirectory $InstallPath
    $trigger = New-ScheduledTaskTrigger -AtLogOn
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
    $principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
    
    Invoke-SafeCommand "Creating auto-start scheduled task" {
        Register-ScheduledTask -TaskName "MMSU Attendance Kiosk" -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force
    } -Step "Auto-start Configuration"
    
    Write-Status "✅ Auto-start configured" -Color $Colors.Green
}

# Function to test installation
function Test-Installation {
    Write-Status "🧪 Testing installation..." -Color $Colors.Blue
    
    # Test Python script
    $pythonScript = Join-Path $InstallPath "attendance_client.py"
    Invoke-SafeCommand "Testing Python script syntax" {
        python -m py_compile $pythonScript
    } -Step "Installation Testing"
    
    # Test service
    $service = Get-Service $ServiceName -ErrorAction SilentlyContinue
    if (-not $service) {
        Handle-Error "Service was not created properly" -Step "Installation Testing"
    }
    Write-Status "✅ Service exists" -Color $Colors.Green
    
    # Test required commands
    $commands = @("python", "chrome")
    foreach ($cmd in $commands) {
        if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
            Handle-Error "Required command '$cmd' not found" -Step "Installation Testing"
        }
        Write-Status "✅ Command available: $cmd" -Color $Colors.Green
    }
    
    Write-Status "✅ Installation test passed" -Color $Colors.Green
}

# Function to show post-installation instructions
function Show-PostInstallInstructions {
    Write-Host ""
    Write-Host "=" * 80 -ForegroundColor Green
    Write-Status "🎉 Installation completed successfully!" -Color $Colors.Green
    Write-Host "=" * 80 -ForegroundColor Green
    Write-Host ""
    Write-Status "📋 Post-installation steps:" -Color $Colors.Blue
    Write-Host ""
    Write-Status "1. Configure backend URL:" -Color $Colors.Yellow
    Write-Host "   Edit: $InstallPath\config.json"
    Write-Host "   Update 'backend_url' to your server IP"
    Write-Host ""
    Write-Status "2. Start the service:" -Color $Colors.Yellow
    Write-Host "   Start-Service $ServiceName"
    Write-Host ""
    Write-Status "3. Check service status:" -Color $Colors.Yellow
    Write-Host "   Get-Service $ServiceName"
    Write-Host ""
    Write-Status "4. View logs:" -Color $Colors.Yellow
    Write-Host "   Get-Content $InstallPath\service.log -Tail 20 -Wait"
    Write-Host ""
    Write-Status "5. Access admin interface:" -Color $Colors.Yellow
    Write-Host "   http://your-server-ip:5000/dashboard"
    Write-Host ""
    Write-Status "📝 Installation log saved to: $LogFile" -Color $Colors.Green
    Write-Host ""
}

# Main installation function
function Start-Installation {
    # Clear log file
    if (Test-Path $LogFile) {
        Remove-Item $LogFile -Force
    }
    "Installation started at $(Get-Date)" | Add-Content $LogFile
    
    Clear-Host
    Write-Host "=" * 80 -ForegroundColor Green
    Write-Status "🚀 MMSU Attendance System - Windows Installation Script" -Color $Colors.Green
    Write-Status "🚀 Starting installation..." -Color $Colors.Green
    Write-Status "📝 Installation log: $LogFile" -Color $Colors.Blue
    Write-Host "=" * 80 -ForegroundColor Green
    Write-Host ""
    
    # Show installation steps
    Write-Status "📋 Installation will proceed through these steps:" -Color $Colors.Yellow
    $stepNames = @(
        "Check system requirements",
        "Install Chocolatey package manager", 
        "Install required packages",
        "Install Python dependencies",
        "Create installation directory",
        "Copy configuration files", 
        "Create Windows service",
        "Configure auto-start",
        "Test installation",
        "Show post-installation instructions"
    )
    
    for ($i = 0; $i -lt $stepNames.Count; $i++) {
        Write-Host "   $($i + 1). $($stepNames[$i])"
    }
    Write-Host ""
    
    if (-not $Silent) {
        Pause-ForUser "Ready to start installation?"
    }
    
    # Installation steps
    $steps = @(
        { Test-SystemRequirements },
        { Install-Chocolatey },
        { Install-RequiredPackages },
        { Install-PythonDependencies },
        { Copy-InstallationFiles },
        { New-AttendanceService },
        { Set-AutoStart },
        { Test-Installation },
        { Show-PostInstallInstructions }
    )
    
    $TotalSteps = $steps.Count
    
    for ($i = 0; $i -lt $steps.Count; $i++) {
        $CurrentStep = $i + 1
        $stepName = $stepNames[$i]
        
        Write-Host ""
        Write-Host "=" * 80 -ForegroundColor Blue
        Write-Status "📍 Step $CurrentStep/$TotalSteps: $stepName" -Color $Colors.Blue
        Write-Host "=" * 80 -ForegroundColor Blue
        
        try {
            & $steps[$i]
            Write-Status "✅ Step $CurrentStep/$TotalSteps completed: $stepName" -Color $Colors.Green
        }
        catch {
            Write-Status "❌ Step $CurrentStep/$TotalSteps failed: $stepName" -Color $Colors.Red
            $shouldExit = Handle-Error -ErrorMessage $_.Exception.Message -Step "Step $CurrentStep"
            if ($shouldExit) {
                exit 1
            }
        }
    }
    
    Write-Host ""
    Write-Host "=" * 80 -ForegroundColor Green
    Write-Status "🎉 Installation completed successfully!" -Color $Colors.Green
    Write-Host "=" * 80 -ForegroundColor Green
    Write-Host ""
    
    # Ask if user wants to start the service immediately
    if (-not $Silent) {
        $startNow = Read-Host "Do you want to start the service now? (y/N)"
        if ($startNow -eq 'y' -or $startNow -eq 'Y') {
            Write-Status "🚀 Starting service..." -Color $Colors.Blue
            try {
                Start-Service $ServiceName
                Start-Sleep -Seconds 2
                $serviceStatus = Get-Service $ServiceName
                Write-Status "✅ Service started successfully - Status: $($serviceStatus.Status)" -Color $Colors.Green
            }
            catch {
                Write-Status "❌ Failed to start service: $($_.Exception.Message)" -Color $Colors.Red
                Handle-Error -ErrorMessage $_.Exception.Message -Step "Service Start"
            }
        }
    }
    
    Write-Host ""
    if (-not $Silent) {
        Pause-ForUser "Installation complete! Press any key to exit..."
    }
}

# Script entry point
try {
    Start-Installation
}
catch {
    Write-Status "❌ Unexpected error occurred: $($_.Exception.Message)" -Color $Colors.Red
    Handle-Error -ErrorMessage $_.Exception.Message -Step "Main Execution"
}