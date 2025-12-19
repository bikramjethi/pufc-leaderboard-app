import { useState } from 'react'
import './App.css'

function App() {
    const [activeSection, setActiveSection] = useState('dashboard')

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

            <main className="admin-main">
                <nav className="admin-sidebar">
                    <button
                        className={`admin-nav-btn ${activeSection === 'dashboard' ? 'active' : ''}`}
                        onClick={() => setActiveSection('dashboard')}
                    >
                        📊 Dashboard
                    </button>
                    <button
                        className={`admin-nav-btn ${activeSection === 'players' ? 'active' : ''}`}
                        onClick={() => setActiveSection('players')}
                    >
                        👥 Players
                    </button>
                    <button
                        className={`admin-nav-btn ${activeSection === 'matches' ? 'active' : ''}`}
                        onClick={() => setActiveSection('matches')}
                    >
                        ⚽ Matches
                    </button>
                    <button
                        className={`admin-nav-btn ${activeSection === 'seasons' ? 'active' : ''}`}
                        onClick={() => setActiveSection('seasons')}
                    >
                        📅 Seasons
                    </button>
                    <button
                        className={`admin-nav-btn ${activeSection === 'settings' ? 'active' : ''}`}
                        onClick={() => setActiveSection('settings')}
                    >
                        ⚙️ Settings
                    </button>
                </nav>

                <div className="admin-content">
                    {activeSection === 'dashboard' && (
                        <div className="admin-section">
                            <h2>Dashboard</h2>
                            <p className="admin-placeholder">
                                Welcome to the PUFC Leaderboard Admin Panel.
                                <br />
                                Select a section from the sidebar to get started.
                            </p>
                            <div className="admin-stats-grid">
                                <div className="admin-stat-card">
                                    <div className="admin-stat-label">Total Players</div>
                                    <div className="admin-stat-value">-</div>
                                </div>
                                <div className="admin-stat-card">
                                    <div className="admin-stat-label">Active Seasons</div>
                                    <div className="admin-stat-value">-</div>
                                </div>
                                <div className="admin-stat-card">
                                    <div className="admin-stat-label">Total Matches</div>
                                    <div className="admin-stat-value">-</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSection === 'players' && (
                        <div className="admin-section">
                            <h2>Player Management</h2>
                            <p className="admin-placeholder">
                                Player management interface coming soon...
                            </p>
                        </div>
                    )}

                    {activeSection === 'matches' && (
                        <div className="admin-section">
                            <h2>Match Management</h2>
                            <p className="admin-placeholder">
                                Match management interface coming soon...
                            </p>
                        </div>
                    )}

                    {activeSection === 'seasons' && (
                        <div className="admin-section">
                            <h2>Season Management</h2>
                            <p className="admin-placeholder">
                                Season management interface coming soon...
                            </p>
                        </div>
                    )}

                    {activeSection === 'settings' && (
                        <div className="admin-section">
                            <h2>Settings</h2>
                            <p className="admin-placeholder">
                                Settings interface coming soon...
                            </p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}

export default App

