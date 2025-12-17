import Login from './pages/login/sign-in/Login'
import AdminDashboard from './pages/dashboard/AdminDashboard'
import Dashboard from './pages/dashboard/pages/DashboardContent'
import Student from './pages/dashboard/pages/Student'
import Faculty from './pages/dashboard/pages/Faculty'
import Surveillance from './pages/dashboard/pages/Surveillance'
import SchedulePage from './pages/dashboard/pages/Schedule'
import {BrowserRouter as Router, Routes, Route} from 'react-router-dom'
import NavBar from './components/dashboard/NavBar'
import './index.css'





function App() {
  return (
    <>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/dashboard/*" element={<AdminDashboard />}>
            <Route index element={<Dashboard />} />
            <Route path="students" element={<Student />} />
            <Route path="faculty" element={<Faculty />} />
            <Route path="surveillance" element={<Surveillance />} />
            <Route path="schedule" element={<SchedulePage />} />
          </Route>
        </Routes>
      </Router>
    </>
  )
}

export default App