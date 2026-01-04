import { useState, useEffect } from "react";
import { Leaderboard } from "./Leaderboard.jsx";
import { Attendance } from "./Attendance.jsx";
import { Roster } from "./Roster.jsx";
import { Insights } from "./Insights.jsx";
import "./App.css";
import { config } from "./leaderboard-config.js";
import { isSmallScreen } from "./utils/isSmallScreen.js";
import { aggregateAllTimeStats } from "./utils/leaderboard-calculations.js";
import { leaderboardData } from "./utils/get-data.js";

const availableYears = Object.keys(leaderboardData).sort((a, b) => b - a);

function App() {
  const [activeTab, setActiveTab] = useState("leaderboard");
  // Default to 2025 if available, otherwise fall back to all-time
  const defaultYear = availableYears.includes("2025") ? "2025" : "all-time";
  const [selectedYear, setSelectedYear] = useState(defaultYear);
  const [players, setPlayers] = useState(() => {
    return defaultYear === "2025" ? leaderboardData["2025"] : aggregateAllTimeStats();
  });
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
                ? "Match Attendance"
                : activeTab === "insights"
                  ? "Season Insights"
                  : activeTab === "midweek-roster"
                    ? "Midweek Roster"
                    : activeTab === "weekend-roster"
                      ? "Weekend Roster"
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
              // Reset to 2025 view when switching back to leaderboard (if available)
              const resetYear = availableYears.includes("2025") ? "2025" : "all-time";
              setSelectedYear(resetYear);
              setPlayers(resetYear === "2025" ? leaderboardData["2025"] : aggregateAllTimeStats());
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
          {config.INSIGHTS?.enabled && (
            <button
              className={`tab-btn ${activeTab === "insights" ? "active" : ""}`}
              onClick={() => setActiveTab("insights")}
            >
              📈 Insights
            </button>
          )}
          <button
            className={`tab-btn ${activeTab === "midweek-roster" ? "active" : ""}`}
            onClick={() => setActiveTab("midweek-roster")}
          >
            Midweek
          </button>
          <button
            className={`tab-btn ${activeTab === "weekend-roster" ? "active" : ""}`}
            onClick={() => setActiveTab("weekend-roster")}
          >
            Weekend
          </button>
          <button
            className={`tab-btn ${activeTab === "inactive-players" ? "active" : ""}`}
            onClick={() => setActiveTab("inactive-players")}
          >
            ⚪ Inactive
          </button>
          {/* Controls - Season selector for leaderboard tab only */}
          {activeTab === "leaderboard" && (
            <div className="controls">
              <div className="year-selector">
                <label htmlFor="year-select">Season</label>
                <div className="select-wrapper">
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
            selectedYear={selectedYear}
          />
        ) : activeTab === "attendance" ? (
          <Attendance />
        ) : activeTab === "insights" ? (
          <Insights />
        ) : activeTab === "midweek-roster" ? (
          <Roster type="midweek" />
        ) : activeTab === "weekend-roster" ? (
          <Roster type="weekend" />
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
