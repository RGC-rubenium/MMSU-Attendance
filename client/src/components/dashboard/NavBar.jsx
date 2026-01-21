import { useState, useEffect } from 'react'
import { SideBarData } from "./SiderBarData";
import './NavBar.css'
import { MdKeyboardArrowDown, MdKeyboardArrowUp } from 'react-icons/md'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function NavBar() {
    const [openIndex, setOpenIndex] = useState(null)
    const location = useLocation()

    // Keep dropdown open when a child route is active
    useEffect(() => {
        const activeIndex = SideBarData.findIndex((item) => {
            if (!Array.isArray(item.subNav)) return false
            return item.subNav.some((sub) => {
                if (!sub.Path) return false
                try {
                    // keep open when current path starts with the sub path
                    return location.pathname === sub.Path || location.pathname.startsWith(sub.Path)
                } catch (e) {
                    return false
                }
            })
        })

        if (activeIndex !== -1) setOpenIndex(activeIndex)
    }, [location.pathname])

    function toggleIndex(i) {
        setOpenIndex((prev) => (prev === i ? null : i))
    }

    const auth = useAuth()

    return (
        <nav className="sidebar" aria-label="Main navigation">
            <ul className="sidebar-list">
                {SideBarData.map((item, index) => {
                    const hasSub = Array.isArray(item.subNav) && item.subNav.length > 0
                    return (
                        <li key={index} className={item.cName}>
                            {hasSub ? (
                                <>
                                    <button
                                        type="button"
                                        className="dropdown-btn"
                                        onClick={() => toggleIndex(index)}
                                        aria-expanded={openIndex === index}
                                    >
                                        <span className="icon">{item.Icon}</span>
                                        <span className="title">{item.title}</span>
                                        <span className="dropdown-caret">
                                            {openIndex === index ? <MdKeyboardArrowUp /> : <MdKeyboardArrowDown />}
                                        </span>
                                    </button>

                                    <ul className={`submenu ${openIndex === index ? 'open' : ''}`}>
                                        {item.subNav.map((sub, sidx) => (
                                            <li key={sidx} className={sub.cName}>
                                                <Link to={sub.Path} className="submenu-link">{sub.title}</Link>
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            ) : (
                                <Link to={item.Path}>
                                    {item.Icon}
                                    <span>{item.title}</span>
                                </Link>
                            )}
                        </li>
                    )
                })}
                <button className="logout-button" type="button" onClick={() => auth && auth.logout ? auth.logout() : null}>Logout</button>
            </ul>
        </nav>
    )
}