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
        cName: 'sidebar-dropdown',
        subNav: [
            {
                title: 'Student Scheduler',
                Path: '/dashboard/schedule/class-schedule',
                cName: 'sidebar-subtext'
            }
            // ,
            // {
            //     title: 'Event Scheduler',
            //     Path: '/dashboard/schedule/events',
            //     cName: 'sidebar-subtext'
            // }
        ]
    },
    {
        title: 'Surveillance',
        Path: '/dashboard/surveillance',
        Icon: <IoIcons.IoEye/>,
        cName: 'sidebar-text'
    },
    {
            title: 'Logs',
            Path: '/dashboard/logs',
        Icon: <AiIcons.AiOutlineFileText/>,
        cName: 'sidebar-dropdown',
        subNav: [
            {
                title: 'Attendance Logs',
                Path: '/dashboard/logs/attendance',
                cName: 'sidebar-subtext'
            }
        ]
    },
    {
        title: 'Settings',
        Path: '/dashboard/settings',
        Icon: <AiIcons.AiOutlineSetting/>,
        cName: 'sidebar-text'
    },
]