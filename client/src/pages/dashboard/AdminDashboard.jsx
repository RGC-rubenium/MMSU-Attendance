
import NavBar from "../../components/common/NavBar";
import Header from "../../components/dashboard/Header";
import { SideBarData } from "./SiderBarData";
import { Outlet } from "react-router-dom";
import './AdminDashboard.css'
export default function AdminDashboard() {
    return (
    <>
        <Header />
        <div className="admin-dashboard">
            <NavBar SideBarData={SideBarData} />
            <Outlet />
        </div>
    </>
    )
}