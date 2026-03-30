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
import './index.css'





function App() {
  return (
    <>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <Routes>
            <Route path="/scanner" element={<Scanner />} />
            <Route path="/scanner/time-in" element={<TimeInScanner />} />
            <Route path="/scanner/time-out" element={<TimeOutScanner />} />
            <Route path="/" element={<Login />} />
            <Route path="/dashboard/*" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>}>
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
            </Route>
          </Routes>
        </AuthProvider>
      </Router>
    </>
  )
}

export default App