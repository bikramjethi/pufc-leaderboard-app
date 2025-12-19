import { useState, useEffect } from "react";
import { Leaderboard } from "./Leaderboard.jsx";
import { Attendance } from "./Attendance.jsx";
import { Roster } from "./Roster.jsx";
import "./App.css";
import { config } from "./leaderboard-config.js";
import { isSmallScreen } from "./utils/isSmallScreen.js";

// Import all season data
import data2024 from "./data/leaderboard-data/2024.json";
import data2025 from "./data/leaderboard-data/2025.json";

const seasonData = {
  2024: data2024,
  2025: data2025,
};

const availableYears = Object.keys(seasonData).sort((a, b) => b - a);

// Aggregate all seasons into "All-Time" stats
const aggregateAllTimeStats = () => {
  const playerMap = new Map();

  Object.values(seasonData).forEach((seasonPlayers) => {
    seasonPlayers.forEach((player) => {
      const key = player.name; // Use name as unique identifier across seasons

      if (playerMap.has(key)) {
        const existing = playerMap.get(key);
        playerMap.set(key, {
          ...existing,
          matches: (existing.matches || 0) + (player.matches || 0),
          wins: (existing.wins || 0) + (player.wins || 0),
          draws: (existing.draws || 0) + (player.draws || 0),
          losses: (existing.losses || 0) + (player.losses || 0),
          goals: (existing.goals || 0) + (player.goals || 0),
          cleanSheets: (existing.cleanSheets || 0) + (player.cleanSheets || 0),
          hatTricks: (existing.hatTricks || 0) + (player.hatTricks || 0),
          seasonsPlayed: existing.seasonsPlayed + 1,
        });
      } else {
        playerMap.set(key, {
          id: `alltime-${key.replace(/\s+/g, "-").toLowerCase()}`, // Unique ID based on name
          name: player.name,
          position: player.position,
          matches: player.matches || 0,
          wins: player.wins || 0,
          draws: player.draws || 0,
          losses: player.losses || 0,
          goals: player.goals || 0,
          cleanSheets: player.cleanSheets || 0,
          hatTricks: player.hatTricks || 0,
          seasonsPlayed: 1,
        });
      }
    });
  });

  return Array.from(playerMap.values());
};

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
      setPlayers(seasonData[selectedYear]);
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
            allSeasonData={seasonData}
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
