import './UserProfile.css';
import userHandler from '../../../api/UserHandler';
import React from 'react';

export default function UserProfile() {
    const queryParams = new URLSearchParams(window.location.search);
    const userId = queryParams.get('id');

    const result = userHandler.fetchStudents();
    console.log(result);
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