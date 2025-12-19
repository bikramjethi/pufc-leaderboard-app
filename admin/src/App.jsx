import './App.css'
import { CreateAttendanceShell } from './flows/CreateAttendanceShell'

function App() {
    return (
        <div className="admin-app">
            <header className="admin-header">
                <div className="admin-header-content">
                    <div className="admin-logo">
                        <span className="admin-badge">⚽</span>
                        <h1 className="admin-title">PUFC Leaderboard Admin</h1>
                    </div>
                </div>
            </header>

            <main className="admin-main single">
                <CreateAttendanceShell />
            </main>
        </div>
    )
}

export default App

