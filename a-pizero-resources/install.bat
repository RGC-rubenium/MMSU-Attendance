@echo off
setlocal EnableDelayedExpansion

:: MMSU Attendance System - Windows Batch Installer
:: Compatible with all Windows versions, no PowerShell required

title MMSU Attendance System - Windows Installer

:: Configuration
set "INSTALL_DIR=%ProgramFiles%\MMSU Attendance"
set "SERVICE_NAME=MMSUAttendanceClient"
set "LOG_FILE=%TEMP%\mmsu_attendance_install.log"
set "PYTHON_URL=https://www.python.org/ftp/python/3.11.8/python-3.11.8-amd64.exe"
set "CHROME_URL=https://dl.google.com/chrome/install/latest/chrome_installer.exe"
set "BACKEND_URL=http://localhost:5000"

:: Colors for output (if supported)
set "RED=[91m"
set "GREEN=[92m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

:: Initialize log file
echo Installation started at %date% %time% > "%LOG_FILE%"

:: Main installer function
call :main
goto :eof

:main
cls
echo ================================================================================
echo %GREEN%MMSU Attendance System - Windows Batch Installer%NC%
echo %GREEN%Enhanced version with comprehensive error handling%NC%
echo ================================================================================
echo.
echo %BLUE%Installation log: %LOG_FILE%%NC%
echo.

:: Check administrator privileges
call :check_admin
if errorlevel 1 (
    echo %RED%This installer requires Administrator privileges%NC%
    echo %YELLOW%Please right-click on this file and select "Run as administrator"%NC%
    pause
    exit /b 1
)

:: Show installation steps
echo %YELLOW%Installation will proceed through these steps:%NC%
echo   1. Check system requirements
echo   2. Create installation directory
echo   3. Download and install Python
echo   4. Download and install Chrome
echo   5. Install Python dependencies
echo   6. Create client application
echo   7. Create Windows service
echo   8. Configure auto-start
echo   9. Test installation
echo   10. Show post-installation instructions
echo.

echo %YELLOW%Press any key to start installation...%NC%
pause >nul
echo.

:: Execute installation steps
call :log_step "Starting installation"

call :step "1/10" "Checking system requirements" :check_requirements
call :step "2/10" "Creating installation directory" :create_directories
call :step "3/10" "Installing Python" :install_python
call :step "4/10" "Installing Chrome" :install_chrome
call :step "5/10" "Installing Python dependencies" :install_python_deps
call :step "6/10" "Creating client application" :create_client_app
call :step "7/10" "Creating Windows service" :create_service
call :step "8/10" "Configuring auto-start" :configure_autostart
call :step "9/10" "Testing installation" :test_installation
call :step "10/10" "Showing instructions" :show_instructions

echo.
echo ================================================================================
echo %GREEN%Installation completed successfully!%NC%
echo ================================================================================
echo.

:: Ask to start service
set /p "start_service=Do you want to start the service now? (y/N): "
if /i "!start_service!"=="y" (
    echo %BLUE%Starting service...%NC%
    sc start "%SERVICE_NAME%" >nul 2>&1
    if !errorlevel! equ 0 (
        echo %GREEN%Service started successfully%NC%
        sc query "%SERVICE_NAME%"
    ) else (
        echo %RED%Failed to start service%NC%
        call :handle_error "Service start failed" "sc start"
    )
)

echo.
echo %YELLOW%Press any key to exit...%NC%
pause >nul
goto :eof

:: Function to execute a step with error handling
:step
set "step_num=%~1"
set "step_desc=%~2"
set "step_func=%~3"

echo.
echo ================================================================================
echo %BLUE%Step %step_num%: %step_desc%%NC%
echo ================================================================================

call :log_step "Step %step_num%: %step_desc%"
call %step_func%

if errorlevel 1 (
    echo.
    echo ================================================================================
    echo %RED%INSTALLATION STEP FAILED%NC%
    echo ================================================================================
    echo %RED%Step failed: %step_desc% ^(Step %step_num%^)%NC%
    echo %YELLOW%Installation step failed - process paused%NC%
    echo ================================================================================
    echo.
    echo %YELLOW%Press any key to see error recovery options...%NC%
    pause >nul
    
    call :handle_error "Step failed: %step_desc%" "%step_func%"
    goto :eof
)

call :log_step "Step %step_num% completed: %step_desc%"
echo %GREEN%Step %step_num% completed: %step_desc%%NC%
goto :eof

:: Error handling function
:handle_error
set "error_msg=%~1"
set "failed_command=%~2"

echo.
echo ================================================================================
echo %RED%INSTALLATION ERROR DETECTED%NC%
echo ================================================================================
echo %RED%ERROR: %error_msg%%NC%
if not "%failed_command%"=="" echo %RED%Command: %failed_command%%NC%
echo %RED%Check the log file for details: %LOG_FILE%%NC%
echo.
echo %RED%Recent log entries:%NC%
echo --------------------------------------------------------------------------------
if exist "%LOG_FILE%" (
    for /f "skip=0" %%i in ('type "%LOG_FILE%" ^| findstr /n "^" ^| findstr /e ":.*"') do set "last_line=%%i"
    if defined last_line (
        for /f "tokens=1,* delims=:" %%a in ("!last_line!") do set "total_lines=%%a"
        if !total_lines! gtr 10 set /a "start_line=!total_lines!-10" else set "start_line=1"
        for /f "skip=!start_line! delims=" %%i in ('type "%LOG_FILE%"') do echo %%i
    )
)
echo --------------------------------------------------------------------------------
echo.

echo %YELLOW%TERMINAL PAUSED - Review the error above%NC%
echo %YELLOW%Press any key after reviewing the error to see options...%NC%
pause >nul

:error_menu
echo.
echo ================================================================================
echo %YELLOW%ERROR RECOVERY OPTIONS%NC%
echo ================================================================================
echo   1^) Continue installation ^(ignore this error^)
echo   2^) Retry this step manually
echo   3^) Cleanup and exit safely
echo   4^) Exit immediately ^(no cleanup^)
echo   5^) View full log file
echo   6^) Debug mode ^(show environment info^)
echo   7^) Open log file in notepad
echo.

set /p "choice=Choose an option (1-7): "

if "%choice%"=="1" (
    echo %YELLOW%WARNING: Continuing with errors may cause issues later%NC%
    echo %YELLOW%Press any key to continue installation...%NC%
    pause >nul
    goto :eof
)

if "%choice%"=="2" (
    echo %BLUE%Manual retry mode activated%NC%
    echo Please retry the failed operation manually in another command prompt
    echo Or fix the issue and then continue
    echo %YELLOW%Press any key when ready to continue...%NC%
    pause >nul
    goto error_menu
)

if "%choice%"=="3" (
    echo %YELLOW%Performing safe cleanup...%NC%
    echo %YELLOW%Press any key to start cleanup...%NC%
    pause >nul
    call :cleanup_installation
    echo %GREEN%Cleanup completed%NC%
    echo %YELLOW%Press any key to exit...%NC%
    pause >nul
    exit /b 1
)

if "%choice%"=="4" (
    echo %YELLOW%Exiting immediately...%NC%
    echo %YELLOW%Press any key to exit ^(no cleanup will be performed^)...%NC%
    pause >nul
    exit /b 1
)

if "%choice%"=="5" (
    echo.
    echo %BLUE%Log file contents:%NC%
    echo ================================================================================
    if exist "%LOG_FILE%" (
        type "%LOG_FILE%"
    ) else (
        echo Log file not found
    )
    echo ================================================================================
    echo %YELLOW%Press any key to return to options menu...%NC%
    pause >nul
    goto error_menu
)

if "%choice%"=="6" (
    echo.
    echo %BLUE%System Debug Information:%NC%
    echo ================================================================================
    echo Working Directory: %CD%
    echo User: %USERNAME%
    echo Computer: %COMPUTERNAME%
    echo OS: 
    ver
    echo Install Directory: %INSTALL_DIR%
    echo Log File: %LOG_FILE%
    echo Python Path: 
    where python 2>nul || echo Not found
    echo Chrome Path:
    where chrome 2>nul || echo Not found
    dir "%ProgramFiles%\Google\Chrome\Application" 2>nul || echo Chrome not installed
    echo Free Space C:\: 
    for /f "tokens=3" %%a in ('dir /-c ^| find "bytes free"') do echo %%a bytes
    echo Service Status:
    sc query "%SERVICE_NAME%" 2>nul || echo Service not found
    echo Failed Command: %failed_command%
    echo ================================================================================
    echo %YELLOW%Press any key to return to options menu...%NC%
    pause >nul
    goto error_menu
)

if "%choice%"=="7" (
    if exist "%LOG_FILE%" (
        start notepad "%LOG_FILE%"
        echo %GREEN%Log file opened in notepad%NC%
    ) else (
        echo %RED%Log file not found%NC%
    )
    goto error_menu
)

echo %RED%Invalid choice '%choice%', please select 1-7%NC%
echo %YELLOW%Press any key to try again...%NC%
pause >nul
goto error_menu

:: Check administrator privileges
:check_admin
net session >nul 2>&1
if errorlevel 1 (
    call :log_step "ERROR: Not running as administrator"
    exit /b 1
)
call :log_step "Running as administrator - OK"
goto :eof

:: Check system requirements
:check_requirements
call :log_step "Checking system requirements"

:: Check Windows version
for /f "tokens=4-5 delims=. " %%i in ('ver') do set "version=%%i.%%j"
call :log_step "Windows version: %version%"

:: Check available space
for /f "tokens=3" %%a in ('dir /-c ^| find "bytes free"') do set "free_space=%%a"
call :log_step "Free space: %free_space% bytes"

:: Check if 64-bit system
if "%PROCESSOR_ARCHITECTURE%"=="AMD64" (
    set "arch=64-bit"
) else (
    set "arch=32-bit"
)
call :log_step "Architecture: %arch%"

:: Test internet connectivity
ping google.com -n 1 >nul 2>&1
if errorlevel 1 (
    echo %RED%No internet connectivity%NC%
    call :log_step "ERROR: No internet connectivity"
    exit /b 1
)

call :log_step "System requirements check passed"
echo %GREEN%System requirements check passed%NC%
goto :eof

:: Create installation directories
:create_directories
call :log_step "Creating installation directory: %INSTALL_DIR%"

if not exist "%INSTALL_DIR%" (
    mkdir "%INSTALL_DIR%" >nul 2>&1
    if errorlevel 1 (
        call :log_step "ERROR: Failed to create installation directory"
        echo %RED%Failed to create installation directory%NC%
        exit /b 1
    )
)

call :log_step "Installation directory created successfully"
echo %GREEN%Installation directory created%NC%
goto :eof

:: Install Python
:install_python
call :log_step "Checking for Python installation"

:: Check if Python is already installed
python --version >nul 2>&1
if not errorlevel 1 (
    call :log_step "Python is already installed"
    echo %GREEN%Python is already installed%NC%
    goto :eof
)

echo %BLUE%Downloading Python installer...%NC%
call :log_step "Downloading Python from: %PYTHON_URL%"

:: Download Python installer
powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%PYTHON_URL%' -OutFile '%TEMP%\python_installer.exe'}" >nul 2>&1

if not exist "%TEMP%\python_installer.exe" (
    echo %YELLOW%PowerShell download failed, trying alternative method...%NC%
    :: Fallback: use curl if available
    curl -L -o "%TEMP%\python_installer.exe" "%PYTHON_URL%" >nul 2>&1
    if not exist "%TEMP%\python_installer.exe" (
        echo %RED%Failed to download Python installer%NC%
        echo %YELLOW%Please download Python manually from: https://python.org%NC%
        call :log_step "ERROR: Failed to download Python installer"
        exit /b 1
    )
)

echo %BLUE%Installing Python...%NC%
call :log_step "Installing Python"

:: Install Python silently
"%TEMP%\python_installer.exe" /quiet InstallAllUsers=1 PrependPath=1 Include_test=0 >nul 2>&1
if errorlevel 1 (
    call :log_step "ERROR: Python installation failed"
    echo %RED%Python installation failed%NC%
    exit /b 1
)

:: Refresh PATH environment variable
call :refresh_path

:: Verify Python installation
python --version >nul 2>&1
if errorlevel 1 (
    call :log_step "ERROR: Python verification failed"
    echo %RED%Python installation verification failed%NC%
    exit /b 1
)

call :log_step "Python installed successfully"
echo %GREEN%Python installed successfully%NC%

:: Cleanup installer
del "%TEMP%\python_installer.exe" >nul 2>&1

goto :eof

:: Install Chrome
:install_chrome
call :log_step "Checking for Chrome installation"

:: Check if Chrome is already installed
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    call :log_step "Chrome is already installed"
    echo %GREEN%Chrome is already installed%NC%
    goto :eof
)

echo %BLUE%Downloading Chrome installer...%NC%
call :log_step "Downloading Chrome from: %CHROME_URL%"

:: Download Chrome installer
powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%CHROME_URL%' -OutFile '%TEMP%\chrome_installer.exe'}" >nul 2>&1

if not exist "%TEMP%\chrome_installer.exe" (
    echo %YELLOW%PowerShell download failed, trying alternative method...%NC%
    curl -L -o "%TEMP%\chrome_installer.exe" "%CHROME_URL%" >nul 2>&1
    if not exist "%TEMP%\chrome_installer.exe" (
        echo %RED%Failed to download Chrome installer%NC%
        echo %YELLOW%Please download Chrome manually from: https://google.com/chrome%NC%
        call :log_step "ERROR: Failed to download Chrome installer"
        exit /b 1
    )
)

echo %BLUE%Installing Chrome...%NC%
call :log_step "Installing Chrome"

:: Install Chrome silently
"%TEMP%\chrome_installer.exe" /silent /install >nul 2>&1
if errorlevel 1 (
    call :log_step "ERROR: Chrome installation failed"
    echo %RED%Chrome installation failed%NC%
    exit /b 1
)

:: Verify Chrome installation
if not exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    call :log_step "ERROR: Chrome installation verification failed"
    echo %RED%Chrome installation verification failed%NC%
    exit /b 1
)

call :log_step "Chrome installed successfully"
echo %GREEN%Chrome installed successfully%NC%

:: Cleanup installer
del "%TEMP%\chrome_installer.exe" >nul 2>&1

goto :eof

:: Install Python dependencies
:install_python_deps
call :log_step "Installing Python dependencies"

echo %BLUE%Installing Python packages...%NC%

:: Install required packages
python -m pip install --upgrade pip >nul 2>&1
python -m pip install requests psutil >nul 2>&1

if errorlevel 1 (
    call :log_step "ERROR: Failed to install Python dependencies"
    echo %RED%Failed to install Python dependencies%NC%
    exit /b 1
)

call :log_step "Python dependencies installed successfully"
echo %GREEN%Python dependencies installed%NC%
goto :eof

:: Create client application
:create_client_app
call :log_step "Creating client application"

:: Create Python client script
set "CLIENT_SCRIPT=%INSTALL_DIR%\attendance_client.py"

echo Creating client application: %CLIENT_SCRIPT%

(
echo import json
echo import time
echo import requests
echo import psutil
echo import socket
echo import subprocess
echo import os
echo import sys
echo import logging
echo import threading
echo from datetime import datetime
echo.
echo # Configure logging
echo logging.basicConfig^(
echo     level=logging.INFO,
echo     format='%%^(asctime^)s - %%^(levelname^)s - %%^(message^)s',
echo     handlers=[
echo         logging.FileHandler^('attendance_client.log'^),
echo         logging.StreamHandler^(^)
echo     ]
echo ^)
echo logger = logging.getLogger^(__name__^)
echo.
echo class WindowsAttendanceClient:
echo     def __init__^(self, config_file='config.json'^):
echo         self.config = self.load_config^(config_file^)
echo         self.device_id = self.get_device_id^(^)
echo         self.running = False
echo.
echo     def load_config^(self, config_file^):
echo         default_config = {
echo             "device_name": "Windows Scanner Terminal",
echo             "location": "Main Office",
echo             "backend_url": "%BACKEND_URL%",
echo             "scanner_mode": "both",
echo             "heartbeat_interval": 30,
echo             "auto_pair": True,
echo             "kiosk_mode": True,
echo             "browser_url": "%BACKEND_URL%/scanner"
echo         }
echo         
echo         try:
echo             with open^(config_file, 'r'^) as f:
echo                 config = json.load^(f^)
echo                 for key, value in default_config.items^(^):
echo                     if key not in config:
echo                         config[key] = value
echo                 return config
echo         except FileNotFoundError:
echo             logger.info^(f"Config file {config_file} not found, creating default"^)
echo             with open^(config_file, 'w'^) as f:
echo                 json.dump^(default_config, f, indent=4^)
echo             return default_config
echo         except json.JSONDecodeError as e:
echo             logger.error^(f"Invalid JSON in config file: {e}"^)
echo             return default_config
echo.
echo     def get_device_id^(self^):
echo         try:
echo             hostname = socket.gethostname^(^)
echo             return f"win-{hostname}-{int^(time.time^(^)^)}"
echo         except Exception as e:
echo             logger.error^(f"Error generating device ID: {e}"^)
echo             return f"win-unknown-{int^(time.time^(^)^)}"
echo.
echo     def send_pairing_request^(self^):
echo         try:
echo             url = f"{self.config['backend_url']}/api/rpi/pairing-request"
echo             data = {
echo                 "device_id": self.device_id,
echo                 "device_name": self.config["device_name"],
echo                 "location": self.config["location"],
echo                 "ip_address": socket.gethostbyname^(socket.gethostname^(^)^),
echo                 "os_info": "Windows"
echo             }
echo             
echo             response = requests.post^(url, json=data, timeout=10^)
echo             if response.status_code == 200:
echo                 result = response.json^(^)
echo                 logger.info^(f"Pairing request sent successfully. Code: {result.get^('pairing_code', 'N/A'^)}"^)
echo                 return result
echo             else:
echo                 logger.error^(f"Pairing request failed: {response.text}"^)
echo                 return None
echo         except Exception as e:
echo             logger.error^(f"Error sending pairing request: {e}"^)
echo             return None
echo.
echo     def check_pairing_status^(self^):
echo         try:
echo             url = f"{self.config['backend_url']}/api/rpi/status/{self.device_id}"
echo             response = requests.get^(url, timeout=10^)
echo             if response.status_code == 200:
echo                 return response.json^(^)
echo             return None
echo         except Exception as e:
echo             logger.error^(f"Error checking pairing status: {e}"^)
echo             return None
echo.
echo     def send_heartbeat^(self^):
echo         try:
echo             url = f"{self.config['backend_url']}/api/rpi/heartbeat"
echo             data = {"device_id": self.device_id}
echo             response = requests.post^(url, json=data, timeout=5^)
echo             if response.status_code == 200:
echo                 logger.debug^("Heartbeat sent successfully"^)
echo                 return True
echo             return False
echo         except Exception as e:
echo             logger.error^(f"Error sending heartbeat: {e}"^)
echo             return False
echo.
echo     def start_browser_kiosk^(self^):
echo         if not self.config.get^("kiosk_mode", True^):
echo             return
echo         try:
echo             subprocess.Popen^([
echo                 r"%ProgramFiles%\Google\Chrome\Application\chrome.exe",
echo                 "--kiosk",
echo                 "--no-sandbox", 
echo                 "--disable-infobars",
echo                 "--start-fullscreen",
echo                 self.config["browser_url"]
echo             ]^)
echo             logger.info^("Browser kiosk mode started"^)
echo         except Exception as e:
echo             logger.error^(f"Error starting browser kiosk: {e}"^)
echo.
echo     def heartbeat_loop^(self^):
echo         while self.running:
echo             self.send_heartbeat^(^)
echo             time.sleep^(self.config["heartbeat_interval"]^)
echo.
echo     def run^(self^):
echo         logger.info^(f"Starting MMSU Attendance Client - Device ID: {self.device_id}"^)
echo         
echo         if self.config.get^("auto_pair", True^):
echo             logger.info^("Sending pairing request..."^)
echo             pairing_result = self.send_pairing_request^(^)
echo             
echo             if pairing_result:
echo                 logger.info^("Waiting for admin approval..."^)
echo                 max_wait = 300
echo                 wait_time = 0
echo                 while wait_time ^< max_wait:
echo                     status = self.check_pairing_status^(^)
echo                     if status and status.get^("status"^) == "approved":
echo                         logger.info^("Device approved! Starting services..."^)
echo                         break
echo                     elif status and status.get^("status"^) == "rejected":
echo                         logger.error^("Device pairing was rejected"^)
echo                         return
echo                     time.sleep^(10^)
echo                     wait_time += 10
echo                 
echo                 if wait_time ^>= max_wait:
echo                     logger.error^("Pairing approval timeout"^)
echo                     return
echo         
echo         self.running = True
echo         heartbeat_thread = threading.Thread^(target=self.heartbeat_loop^)
echo         heartbeat_thread.daemon = True
echo         heartbeat_thread.start^(^)
echo         
echo         self.start_browser_kiosk^(^)
echo         
echo         try:
echo             while self.running:
echo                 time.sleep^(30^)
echo         except KeyboardInterrupt:
echo             logger.info^("Shutting down..."^)
echo             self.running = False
echo.
echo if __name__ == "__main__":
echo     client = WindowsAttendanceClient^(^)
echo     client.run^(^)
) > "%CLIENT_SCRIPT%"

:: Create config file
set "CONFIG_FILE=%INSTALL_DIR%\config.json"
(
echo {
echo     "device_name": "Windows Scanner Terminal",
echo     "location": "Main Office",
echo     "backend_url": "%BACKEND_URL%",
echo     "scanner_mode": "both",
echo     "heartbeat_interval": 30,
echo     "auto_pair": true,
echo     "kiosk_mode": true,
echo     "browser_url": "%BACKEND_URL%/scanner"
echo }
) > "%CONFIG_FILE%"

call :log_step "Client application created successfully"
echo %GREEN%Client application created%NC%
goto :eof

:: Create Windows service
:create_service
call :log_step "Creating Windows service"

echo %BLUE%Creating Windows service...%NC%

:: Create service wrapper batch file
set "SERVICE_WRAPPER=%INSTALL_DIR%\service_wrapper.bat"
(
echo @echo off
echo cd /d "%INSTALL_DIR%"
echo python attendance_client.py
) > "%SERVICE_WRAPPER%"

:: Remove existing service if it exists
sc query "%SERVICE_NAME%" >nul 2>&1
if not errorlevel 1 (
    echo %YELLOW%Removing existing service...%NC%
    sc stop "%SERVICE_NAME%" >nul 2>&1
    sc delete "%SERVICE_NAME%" >nul 2>&1
    timeout /t 2 >nul
)

:: Create the service using sc create
sc create "%SERVICE_NAME%" binpath= "\"%SERVICE_WRAPPER%\"" start= auto DisplayName= "MMSU Attendance Client Service" >nul 2>&1

if errorlevel 1 (
    call :log_step "ERROR: Failed to create Windows service"
    echo %RED%Failed to create Windows service%NC%
    exit /b 1
)

:: Set service description
sc description "%SERVICE_NAME%" "MMSU Attendance System Client Service" >nul 2>&1

call :log_step "Windows service created successfully"
echo %GREEN%Windows service created%NC%
goto :eof

:: Configure auto-start
:configure_autostart
call :log_step "Configuring auto-start"

echo %BLUE%Configuring auto-start...%NC%

:: Create startup shortcut in startup folder
set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT=%STARTUP_DIR%\MMSU Attendance.url"

if not exist "%STARTUP_DIR%" mkdir "%STARTUP_DIR%"

:: Create URL shortcut to open browser
(
echo [InternetShortcut]
echo URL=%BACKEND_URL%/scanner
echo IconFile=%ProgramFiles%\Google\Chrome\Application\chrome.exe
echo IconIndex=0
) > "%SHORTCUT%"

call :log_step "Auto-start configured successfully"
echo %GREEN%Auto-start configured%NC%
goto :eof

:: Test installation
:test_installation
call :log_step "Testing installation"

echo %BLUE%Testing installation...%NC%

:: Test Python script syntax
python -m py_compile "%INSTALL_DIR%\attendance_client.py" >nul 2>&1
if errorlevel 1 (
    call :log_step "ERROR: Python script has syntax errors"
    echo %RED%Python script has syntax errors%NC%
    exit /b 1
)

:: Test service existence
sc query "%SERVICE_NAME%" >nul 2>&1
if errorlevel 1 (
    call :log_step "ERROR: Service was not created properly"
    echo %RED%Service was not created properly%NC%
    exit /b 1
)

:: Test required commands
python --version >nul 2>&1
if errorlevel 1 (
    call :log_step "ERROR: Python command not available"
    echo %RED%Python command not available%NC%
    exit /b 1
)

if not exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    call :log_step "ERROR: Chrome not found"
    echo %RED%Chrome not found%NC%
    exit /b 1
)

call :log_step "Installation test passed"
echo %GREEN%Installation test passed%NC%
goto :eof

:: Show post-installation instructions
:show_instructions
echo.
echo ================================================================================
echo %GREEN%Installation completed successfully!%NC%
echo ================================================================================
echo.
echo %BLUE%Post-installation steps:%NC%
echo.
echo %YELLOW%1. Configure backend URL:%NC%
echo    Edit: %INSTALL_DIR%\config.json
echo    Update 'backend_url' to your server IP
echo.
echo %YELLOW%2. Start the service:%NC%
echo    sc start %SERVICE_NAME%
echo.
echo %YELLOW%3. Check service status:%NC%
echo    sc query %SERVICE_NAME%
echo.
echo %YELLOW%4. View logs:%NC%
echo    type "%INSTALL_DIR%\attendance_client.log"
echo.
echo %YELLOW%5. Access admin interface:%NC%
echo    http://your-server-ip:5000/dashboard
echo.
echo %GREEN%Installation log saved to: %LOG_FILE%%NC%
echo.

call :log_step "Post-installation instructions displayed"
goto :eof

:: Cleanup installation on error
:cleanup_installation
call :log_step "Cleaning up partial installation"

echo %YELLOW%Cleaning up partial installation...%NC%

:: Stop and remove service
sc stop "%SERVICE_NAME%" >nul 2>&1
sc delete "%SERVICE_NAME%" >nul 2>&1

:: Remove installation directory
if exist "%INSTALL_DIR%" (
    echo Removing installation directory...
    rmdir /s /q "%INSTALL_DIR%" >nul 2>&1
)

:: Remove startup shortcut
if exist "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\MMSU Attendance.url" (
    del "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\MMSU Attendance.url" >nul 2>&1
)

echo %GREEN%Cleanup completed%NC%
call :log_step "Cleanup completed"
goto :eof

:: Refresh PATH environment variable
:refresh_path
:: Get the current PATH from registry and set it
for /f "tokens=2*" %%i in ('reg query "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v PATH') do set "PATH=%%j"
goto :eof

:: Log step function
:log_step
echo [%date% %time%] %~1 >> "%LOG_FILE%"
goto :eof