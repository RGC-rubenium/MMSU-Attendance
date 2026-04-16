// SmsAPI.js
// API utility for queueing SMS via backend

const API_BASE = '/api/send_sms'; // Adjust if backend is on a different port or path

export async function queueSMS({ mobile_num, student_name, attendance_type, attendance_time }) {
  try {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mobile_num,
        student_name,
        attendance_type,
        attendance_time,
      }),
    });
    return await response.json();
  } catch (error) {
    return { success: false, message: error.message };
  }
}
