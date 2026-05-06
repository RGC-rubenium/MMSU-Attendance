# MMSU Attendance System User Manual

## Table of Contents
1. Introduction
2. System Overview
3. Accessing the System
4. Dashboard Overview
5. Device Management
6. User Management
7. Attendance Logs
8. Class & Schedule Management
9. Analytics & Reports
10. Troubleshooting & Support

---

## 1. Introduction
The MMSU Attendance System is a comprehensive platform for managing student and faculty attendance using Raspberry Pi devices and a web-based dashboard. This manual provides step-by-step instructions for using the system.

## 2. System Overview
- **Backend:** Python Flask API for device and user management.
- **Frontend:** Web dashboard for administrators and authorized users.
- **Devices:** Raspberry Pi units for attendance scanning and data collection.

## 3. Accessing the System
1. Open your web browser.
2. Navigate to the system's URL (provided by your administrator).
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
- **Add Faculty/Student:** Register new users with required details.
- **Edit User:** Update user information.
- **Delete User:** Remove users from the system.
- **Bulk Import:** Upload CSV files to add multiple users at once.

## 7. Attendance Logs
- **View Logs:** Browse attendance records by date, user, or class.
- **Export Logs:** Download logs for reporting or backup.

## 8. Class & Schedule Management
- **Add/Edit Classes:** Manage class information and schedules.
- **Assign Faculty/Students:** Link users to classes and schedules.

## 9. Analytics & Reports
- **Dashboard Analytics:** Visualize attendance trends and statistics.
- **Generate Reports:** Create and export attendance summaries.

## 10. Troubleshooting & Support
- **Device Offline:** Ensure the device is powered and connected to the network.
- **Login Issues:** Reset your password or contact the administrator.
- **Support:** Refer to the system admin or IT support for unresolved issues.

---


---

## Step-by-Step Guide

### 1. Logging In
1. Open your web browser and go to the system URL.
2. Enter your username and password.
3. Click the **Login** button.
4. If your credentials are correct, you will be redirected to the dashboard.

### 2. Viewing Devices
1. From the navigation bar, click on **Devices**.
2. View the list of all paired Raspberry Pi devices and their status.

### 3. Approving a Pairing Request
1. Go to the **Devices** section.
2. Click the **Pairing Requests** tab.
3. Review the list of pending requests.
4. Click **Approve** on the request you want to accept.

### 4. Performing Device Actions (Reboot, Shutdown, Sync Time)
1. In the **Devices** tab, locate the device you want to manage.
2. Click the corresponding action button (Reboot, Shutdown, Sync Time) in the device's action menu.
3. Confirm the action if prompted.

### 5. Bulk Device Actions
1. Select multiple devices using the checkboxes.
2. Use the **Bulk Action Bar** to perform actions like Reboot All, Shutdown All, or Sync Time All.

### 6. Adding a New User (Faculty/Student)
1. Navigate to the **Users** section.
2. Click **Add Faculty** or **Add Student**.
3. Fill in the required information.
4. Click **Save** to register the user.

### 7. Editing or Deleting a User
1. In the **Users** section, find the user you want to edit or delete.
2. Click the **Edit** or **Delete** button next to their name.
3. For edits, update the information and save. For deletion, confirm the removal.

### 8. Bulk Importing Users
1. Go to the **Users** section.
2. Click **Bulk Import Faculty** or **Bulk Import Students**.
3. Upload a CSV file with the required user data.
4. Confirm and process the import.

### 9. Viewing and Exporting Attendance Logs
1. Click on **Attendance Logs** in the navigation bar.
2. Filter logs by date, user, or class as needed.
3. Click **Export** to download logs.

### 10. Managing Classes and Schedules
1. Go to the **Class Schedule** section.
2. Click **Add Class** or **Edit** to modify existing classes.
3. Assign faculty and students as needed.
4. Save your changes.

### 11. Viewing Analytics and Reports
1. Click on **Analytics** in the navigation bar.
2. Review charts and statistics for attendance trends.
3. Use the **Generate Report** feature to export summaries.

---

For further assistance, contact your system administrator or refer to the official documentation.
