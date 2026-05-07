# MMSU Attendance System User Manual
## Table of Contents

1. [Introduction](#1-introduction)
2. [System Overview](#2-system-overview)
3. [Accessing the System](#3-accessing-the-system)
4. [Dashboard Overview](#4-dashboard-overview)
5. [Device Management](#5-device-management)
6. [User Management](#6-user-management)
7. [Attendance Logs](#7-attendance-logs)
8. [Class & Schedule Management](#8-class--schedule-management)
9. [Analytics & Reports](#9-analytics--reports)
10. [Troubleshooting & Support](#10-troubleshooting--support)
11. [Step-by-Step Guides](#step-by-step-guides)

---

## 1. Introduction
The MMSU Attendance System is a comprehensive platform for managing student and faculty attendance using Raspberry Pi devices and a web-based dashboard. This manual provides step-by-step instructions for using the system.

## 2. System Overview
- **Backend:** Python Flask API for device and user management.
- **Frontend:** Web dashboard for administrators and authorized users.
- **Devices:** Raspberry Pi Zero 2W for attendance scanning

## 3. Accessing the System
1. Open your web browser.
2. Navigate to the system's URL.
3. Log in using your assigned credentials.

## 4. Dashboard Overview
- **Navigation Bar:** Access main sections (Dashboard, Devices, Users, Logs, Analytics).
- **User Avatar:** View account settings and log out.

## 5. Device Management
- **View Devices:** See all paired Raspberry Pi devices and their status (online/offline).
- **Pair New Device:** Approve pairing requests from new devices.
- **Device Actions:**
  - Sync time
  - Reboot
  - Shutdown
  - Edit configuration
  - Unpair device
- **Bulk Actions:** Select multiple devices for group actions (reboot, shutdown, sync time).

## 6. User Management
- **Add Student:** Register new Students with required details.
- **Edit User:** Update user information.
- **Delete User:** Remove users from the system.
- **Bulk Import:** Upload CSV files to add multiple users at once.

## 7. Attendance Logs
- **View Logs:** Browse attendance records by date, user, or class.

## 9. Analytics & Reports
- **Dashboard Analytics:** Visualize attendance trends and statistics.

## 10. Troubleshooting & Support
- **Device Offline:** Ensure the device is powered and has a stable 5v 3a source
- **Login Issues:** Reset your password or contact the administrator.

---
---
<div style="page-break-before: always;"></div>


## Step-by-Step Guides

### **Login Page**
---
#### Logging In
1. Open your web browser and go to the system URL.
2. Enter your username and password.
3. Click the **Login** button.
4. If your credentials are correct, you will be redirected to the dashboard.
<br />
<br />
<br />
### **Devices Page**
---
#### Viewing Devices
1. Click on **Devices** in the navigation bar.
2. View the list of all paired Raspberry Pi devices and their status.
<br />
#### Approving a Pairing Request
1. In the **Devices** section, click the **Pairing Requests** tab.
2. Review the list of pending requests.
3. Click **Approve** on the request you want to accept.
<br />
#### Performing Device Actions (Reboot, Shutdown, Sync Time)
1. In the **Devices** tab, locate the device you want to manage.
2. Click the corresponding action button (Reboot, Shutdown, Sync Time) in the device's action menu.
3. Confirm the action if prompted.
<br />
#### Bulk Device Actions
1. Select multiple devices using the checkboxes.
2. Use the **Bulk Action Bar** to perform actions like Reboot All, Shutdown All, or Sync Time All.
<br />
<br />
<br />
### **Users Management Page**
---
#### Adding a New User (Faculty/Student)
1. Click on **Students** in the users dropdown.
2. Click **Add Student**.
3. Fill in the required information.
4. Click **Save** to register the user.
<br />
#### Deleting a Student
1. In the **Student** section of users dropdown , find the student you want to delete.
2. Click the **Edit** or **Delete** button in the side of the search bar.
3. For edits, update the information and save. For deletion, confirm the removal.
<br />
#### Bulk Importing Users
1. In the **Users** section, click **Bulk Import Faculty** or **Bulk Import Students**.
3. Follow instructions indicated within the panel.
2. Upload a xslx file with the required user data.
3. Confirm and process the import.
<br />
<br />
<br />
### **User Profile Page**
---
#### Editing User Information
1. click on **Edit Profile** button
2. change change desired information
3. click on **Save Changes** button to confirm
<br />
#### Deleting user in User Profile Page
1. click on **Delete** button
2. confirm by clicking on **Delete** on the popup panel.
<br />
<br />
<br />
<div style="page-break-before: always;"></div>





## Raspberry Pi Zero 2W: SSH & Automated Kiosk Setup Guide

### 1. Hardware & Imaging
- Use a Raspberry Pi Zero 2W, 8GB+ microSD card, and a 5V 2.5A power supply.
- Download Raspberry Pi Imager and flash **Raspberry Pi OS Lite (64-bit)** to the SD card.
- In Imager settings, enable SSH, set username/password, and configure WiFi.

### 2. First Boot & Network
1. Insert the SD card into the Pi, connect display/keyboard, and power on.
2. Log in with your credentials.
3. If WiFi was not set up, edit `/etc/wpa_supplicant/wpa_supplicant.conf` to add your WiFi details and reboot.
4. (Optional) Set a static IP in `/etc/dhcpcd.conf` for easier management.

### 3. Copying Setup Files
- On your PC, copy the contents of `a-pizero-resources/` to `/home/AttendanceSys/`:
- Or use a USB drive and copy files to `/home/AttendanceSys/`.

### 4. Installation & Configuration
1. On the Pi, run:
  - `cd /home/AttendanceSys`
  - `sudo bash setup.sh`
2. Enter the server URL, device name, and location when prompted.
3. Pick desired Screen layout
4. Pick desired screen resolution (pick recommended)
5. Confirm
5. The script will install required packages, configure kiosk mode, and set up system services.
6. Run `sudo reboot`

### 6. Device Registration & Approval
1. After reboot, click pait device, the Pi will display a pairing code and device ID.
2. Give the pairing code to an admin for approval in the dashboard.
3. Once approved, the device will automatically switch to scanner mode on reboot.

### 7. Management & Troubleshooting
- To check status: `mmsu-status`
- To restart the scanner: `mmsu-restart`
- To reset registration: `mmsu-reset`
- To view logs: `attendance-logs`
- For network issues: check WiFi config, IP address, and ping the server.
- For kiosk/browser issues: check if X server is running, or start manually with `startx /opt/mmsu-attendance/launcher.sh`