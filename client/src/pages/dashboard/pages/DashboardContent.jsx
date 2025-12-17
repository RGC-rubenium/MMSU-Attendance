

import './Dashboard.css'
import { MdPeople, MdOutlineCalendarToday, MdSchool } from 'react-icons/md'

export default function Dashboard() {
    const stats = [
        { id: 1, title: 'Students', value: '1,245', icon: <MdPeople size={28} /> },
        { id: 2, title: 'Classes', value: '24', icon: <MdSchool size={28} /> },
        { id: 3, title: 'Present Today', value: '1,032', icon: <MdOutlineCalendarToday size={28} /> },
    ]

    const recent = [
        { id: 1, name: 'Juan Dela Cruz', status: 'Present', time: '08:12 AM' },
        { id: 2, name: 'Maria Santos', status: 'Late', time: '08:45 AM' },
        { id: 3, name: 'Pedro Reyes', status: 'Absent', time: '-' },
    ]

    return (
        <main className="dashboard-main" aria-labelledby="dashboard-title">
            <header className="dashboard-top">
                <h1 id="dashboard-title">Dashboard</h1>
                <p className="dashboard-sub">Overview of attendance and quick actions</p>
            </header>

            <section className="stats-grid" aria-label="Key statistics">
                {stats.map((s) => (
                    <article key={s.id} className="stat-card">
                        <div className="stat-icon" aria-hidden>
                            {s.icon}
                        </div>
                        <div className="stat-body">
                            <div className="stat-value">{s.value}</div>
                            <div className="stat-title">{s.title}</div>
                        </div>
                    </article>
                ))}
            </section>

            <section className="recent" aria-label="Recent attendance">
                <h2 className="section-title">Recent Attendance</h2>
                <div className="table-wrap">
                    <table className="recent-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Status</th>
                                <th>Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recent.map((r) => (
                                <tr key={r.id}>
                                    <td>{r.name}</td>
                                    <td className={`status ${r.status.toLowerCase()}`}>{r.status}</td>
                                    <td>{r.time}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </main>
    )
}