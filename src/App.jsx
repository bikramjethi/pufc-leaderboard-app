import { useState, useEffect } from "react";
import { Leaderboard } from "./Leaderboard.jsx";
import { Attendance } from "./Attendance.jsx";
import { Roster } from "./Roster.jsx";
import "./App.css";
import { config } from "./leaderboard-config.js";
import { isSmallScreen } from "./utils/isSmallScreen.js";
import { aggregateAllTimeStats } from "./utils/leaderboard-calculations.js";
import { leaderboardData } from "./utils/get-data.js";

const availableYears = Object.keys(leaderboardData).sort((a, b) => b - a);

// Available years for attendance data
const attendanceYears = ["2026"];

function App() {
  const [activeTab, setActiveTab] = useState("leaderboard");
  const [selectedYear, setSelectedYear] = useState("all-time");
  const [attendanceYear, setAttendanceYear] = useState("2025");
  const [players, setPlayers] = useState(() => aggregateAllTimeStats());
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("pufc-theme") || "dark";
  });
  const [isSmall, setIsSmall] = useState(() => isSmallScreen());

  useEffect(() => {
    if (selectedYear === "all-time") {
      setPlayers(aggregateAllTimeStats());
    } else {
      setPlayers(leaderboardData[selectedYear]);
    }
  }, [selectedYear]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("pufc-theme", theme);
  }, [theme]);

  useEffect(() => {
    const handleResize = () => {
      setIsSmall(isSmallScreen());
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="club-badge">⚽</div>
          <div className="header-text">
            <h1 className="title">PUFC Leaderboard</h1>
            <p className="subtitle">
              {activeTab === "attendance"
                ? `${attendanceYear} Match Attendance`
                : activeTab === "tuesday-roster"
                  ? "Tuesday Roster"
                  : activeTab === "saturday-roster"
                    ? "Saturday Roster"
                    : activeTab === "inactive-players"
                      ? "Inactive Players"
                      : selectedYear === "all-time"
                        ? "All-Time Career Stats"
                        : "Player Statistics"}
            </p>
          </div>
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
        </div>
      </header>

      <main className="main-content">
        {/* Tab Navigation */}
        <div className="tab-nav">
          <button
            className={`tab-btn ${activeTab === "leaderboard" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("leaderboard");
              // Reset to all-time view when switching back to leaderboard
              setSelectedYear("all-time");
              setPlayers(aggregateAllTimeStats());
            }}
          >
            📊 {isSmall ? "Board" : "Leaderboard"}
          </button>
          {config.ENABLE_ATTENDANCE && (
            <button
              className={`tab-btn ${activeTab === "attendance" ? "active" : ""
                }`}
              onClick={() => setActiveTab("attendance")}
            >
              📅 Attendance
            </button>
          )}
          <button
            className={`tab-btn ${activeTab === "tuesday-roster" ? "active" : ""}`}
            onClick={() => setActiveTab("tuesday-roster")}
          >
            Tue
          </button>
          <button
            className={`tab-btn ${activeTab === "saturday-roster" ? "active" : ""}`}
            onClick={() => setActiveTab("saturday-roster")}
          >
            Sat
          </button>
          <button
            className={`tab-btn ${activeTab === "inactive-players" ? "active" : ""}`}
            onClick={() => setActiveTab("inactive-players")}
          >
            ⚪ Inactive
          </button>
          {/* Controls - Season selector for leaderboard and attendance tabs */}
          {(activeTab === "leaderboard" || activeTab === "attendance") && (
            <div className="controls">
              <div className="year-selector">
                <label htmlFor="year-select">Season</label>
                <div className="select-wrapper">
                  {activeTab === "leaderboard" ? (
                    <select
                      id="year-select"
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                    >
                      {availableYears.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                      <option value="all-time">All-Time</option>
                    </select>
                  ) : (
                    <select
                      id="year-select"
                      value={attendanceYear}
                      onChange={(e) => setAttendanceYear(e.target.value)}
                    >
                      {attendanceYears.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  )}
                  <span className="select-arrow">▼</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tab Content */}
        {activeTab === "leaderboard" ? (
          <Leaderboard
            players={players}
            allSeasonData={leaderboardData}
            isAllTime={selectedYear === "all-time"}
          />
        ) : activeTab === "attendance" ? (
          <Attendance year={attendanceYear} />
        ) : activeTab === "tuesday-roster" ? (
          <Roster type="tuesday" />
        ) : activeTab === "saturday-roster" ? (
          <Roster type="saturday" />
        ) : activeTab === "inactive-players" ? (
          <Roster type="inactive" />
        ) : null}
      </main>

      <footer className="footer">
        <p>© {new Date().getFullYear()} PUFC — All rights reserved</p>
      </footer>
    </div>
  );
}

export default App;
