import './UserProfile.css';
import UserHandler from '../../../api/StudentHandler.js';
import React from 'react';
import { useEffect, useState } from "react";

const handler = new UserHandler();

export default function UserProfile() {
    const queryParams = new URLSearchParams(window.location.search);
    const userId = queryParams.get('id');
    const [students, setStudents] = useState([]);

    useEffect(() => {
    // 2. Call the async method
        const getData = async () => {
        const data = await handler.fetchStudents();
        setStudents(data);
        };
        getData();
    },[]);

    console.log(students)

    return (
        <div className="user-profile-page">
            <ul>
                <li>
                    <h1>{userId}</h1>
                </li>
            </ul>
        </div>
    )
}