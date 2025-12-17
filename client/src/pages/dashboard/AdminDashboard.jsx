
import NavBar from "../../components/dashboard/NavBar";
import Header from "../../components/dashboard/Header";
import { Outlet } from "react-router-dom";
import './AdminDashboard.css'
export default function AdminDashboard() {
    return (
    <>
        <Header />
        <div className="admin-dashboard">
            <NavBar />
            <Outlet />
        </div>
    </>
    )
}