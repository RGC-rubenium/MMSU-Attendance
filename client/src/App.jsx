import Login from './pages/login/sign-in/Login'
import AdminDashboard from './pages/dashboard/AdminDashboard'
import { AuthProvider } from './contexts/AuthContext'
import Dashboard from './pages/dashboard/pages/DashboardContent'
import Student from './pages/dashboard/pages/Student'
import Faculty from './pages/dashboard/pages/Faculty'
import Surveillance from './pages/dashboard/pages/Surveillance'
import SchedulePage from './pages/dashboard/pages/Schedule'
import Scanner from './pages/user-scanner/Scanner'
import UserProfile from './pages/dashboard/pages/UserProfile'
import {BrowserRouter as Router, Routes, Route} from 'react-router-dom'
import ProtectedRoute from './components/auth/ProtectedRoute'
import Event_scheduler from './pages/dashboard/pages/Event_scheduler'
import './index.css'





function App() {
  return (
    <>
      <Router>
        <AuthProvider>
          <Routes>
            <Route path="/scanner" element={<Scanner />} />
            <Route path="/" element={<Login />} />
            <Route path="/dashboard/*" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="students" element={<Student />} />
              <Route path="faculty" element={<Faculty />} />
              <Route path="surveillance" element={<Surveillance />} />
              <Route path="schedule" element={<SchedulePage />} />
              <Route path="students/profile" element={<UserProfile />} />
              <Route path="schedule/events" element={<Event_scheduler />} />
            </Route>
          </Routes>
        </AuthProvider>
      </Router>
    </>
  )
}

export default App