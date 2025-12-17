import './Student.css'

export default function Student() {
    return (
        <div className='usersContent'>

            <div className="users-search-bar">
                <input type="text" placeholder="Search students..." />
                <button type="button">Search</button>
            </div>
            <div className="users-list">
                <h2>Student Management</h2>
            </div>
        </div>
    )
}