export default function Faculty() {
    return (
        <div className="faculty-page-wrapper">
            <div className="faculty-header">
                <h1>Faculty Management</h1>
                <div className="faculty-searchbar">
                    <input type="text" placeholder="Search faculty..." />
                    <button type="button">Search</button>
                </div>
            </div>
            <div className="faculty-content">
                <h2>Faculty Page</h2>
                <p>This is the Faculty page content.</p>
            </div>
        </div>
    )
}