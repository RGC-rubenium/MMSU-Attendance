import Login from './pages/login/sign-in/Login'
import AdminDashboard from './pages/dashboard/AdminDashboard'
import { AuthProvider } from './contexts/AuthContext'
import Dashboard from './pages/dashboard/pages/DashboardContent'
import Student from './pages/dashboard/pages/Student'
import Faculty from './pages/dashboard/pages/Faculty'
import Surveillance from './pages/dashboard/pages/Surveillance'
import SchedulePage from './pages/dashboard/pages/Schedule'
import Scanner from './pages/user-scanner/Scanner'
import TimeInScanner from './pages/user-scanner/TimeInScanner'
import TimeOutScanner from './pages/user-scanner/TimeOutScanner'
import UserProfile from './pages/dashboard/pages/UserProfile'
import AttendanceLogs from './pages/dashboard/pages/AttendanceLogs'
import {BrowserRouter as Router, Routes, Route} from 'react-router-dom'
import ProtectedRoute from './components/auth/ProtectedRoute'
import Event_scheduler from './pages/dashboard/pages/Event_scheduler'
import ClassSchedule from './pages/dashboard/pages/ClassSchedule'
import UserManagement from './pages/dashboard/UserManagement'
import RpiManagement from './components/dashboard/RpiManagement'
import DeviceCheck from './pages/device/DeviceCheck'
import DevicePending from './pages/device/DevicePending'
import DeviceDisabled from './pages/device/DeviceDisabled'
import Settings from './pages/dashboard/pages/Settings'
import './index.css'
import NotFound from './pages/NotFound'





function App() {
  return (
    <>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <Routes>
            {/* Device Management Routes */}
            <Route path="/device/check" element={<DeviceCheck />} />
            <Route path="/device/pending" element={<DevicePending />} />
            <Route path="/device/disabled" element={<DeviceDisabled />} />
            <Route path="/device/register" element={<div style={{height: '100vh'}}><iframe src="/pairing.html" style={{width: '100%', height: '100%', border: 'none'}} title="Device Registration" /></div>} />
            
            {/* Scanner Routes */}
            <Route path="/scanner" element={<Scanner />} />
            <Route path="/scanner/time-in" element={<TimeInScanner />} />
            <Route path="/scanner/time-out" element={<TimeOutScanner />} />
            <Route path="/pairing" element={<div style={{height: '100vh'}}><iframe src="/pairing.html" style={{width: '100%', height: '100%', border: 'none'}} title="Device Pairing" /></div>} />
            
            {/* Auth Routes */}
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
            {/* Registration disabled — user accounts are managed by superadmin */}
            
            {/* Dashboard Routes */}
            <Route path="/dashboard/*" element={<ProtectedRoute allowedRoles={["admin","superadmin"]}><AdminDashboard /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="students" element={<Student />} />
              <Route path="faculty" element={<Faculty />} />
              <Route path="surveillance" element={<Surveillance />} />
              <Route path="schedule" element={<SchedulePage />} />
              <Route path="students/profile" element={<UserProfile />} />
              <Route path="faculty/profile" element={<UserProfile />} />
              <Route path="schedule/events" element={<Event_scheduler />} />
              <Route path="schedule/class-schedule" element={<ClassSchedule />} />
              <Route path="logs/attendance" element={<AttendanceLogs />} />
              <Route path="rpi/management" element={<RpiManagement />} />
              <Route path="settings" element={<ProtectedRoute allowedRoles={["superadmin"]}><Settings /></ProtectedRoute>} />
              <Route path="users" element={<ProtectedRoute allowedRoles={["superadmin"]}><UserManagement /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Route>
            {/* Catch-all for unknown routes */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </Router>
    </>
  )
}

export default App