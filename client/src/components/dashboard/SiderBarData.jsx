import React from "react";
import * as MdIcons from "react-icons/md";
import * as FaIcons from "react-icons/fa";
import * as AiIcons from "react-icons/ai";
import * as IoIcons from "react-icons/io5";
import * as RiIcons from "react-icons/ri";

export const SideBarData = [
    {
        title: 'Dashboard',
        Path: '/dashboard',
        Icon: <MdIcons.MdDashboard/>,
        cName: 'sidebar-text'
    },
    {
        title: 'Users',
        Path: '#',
        Icon: <FaIcons.FaUsers/>,
        cName: 'sidebar-dropdown',
        subNav: [
            {
                title: 'Student',
                Path: '/dashboard/students',
                cName: 'sidebar-subtext'
            },
            {
                title: 'Faculty',
                Path: '/dashboard/faculty',
                cName: 'sidebar-subtext'
            }
        ]
    },
    {
        title: 'Schedule',
        Path: '/dashboard/schedule',
        Icon: <RiIcons.RiCalendarScheduleLine/>,
        cName: 'sidebar-text'
    },
    {
        title: 'Surveillance',
        Path: '/dashboard/surveillance',
        Icon: <IoIcons.IoEye/>,
        cName: 'sidebar-text'
    }
]