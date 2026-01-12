import { useState, useEffect } from "react";
import { Leaderboard } from "./Leaderboard.jsx";
import { Attendance } from "./Attendance.jsx";
import { WeeklyTracker } from "./WeeklyTracker.jsx";
import { Roster } from "./Roster.jsx";
import { Insights } from "./Insights.jsx";
import { ScoringTrends } from "./ScoringTrends.jsx";
import "./App.css";
import { config } from "./leaderboard-config.js";
import { isSmallScreen } from "./utils/isSmallScreen.js";
import { aggregateAllTimeStats } from "./utils/leaderboard-calculations.js";
import { leaderboardData } from "./utils/get-data.js";

// Get available years from config, falling back to data keys
const availableYears = config.STATS_LEADERBOARD?.seasons || Object.keys(leaderboardData).sort((a, b) => b - a);

function App() {
  const [activeTab, setActiveTab] = useState("leaderboard");
  // Default year from config, otherwise fall back to first available or all-time
  const defaultYear = config.STATS_LEADERBOARD?.defaultSeason || 
    (availableYears.includes("2026") ? "2026" : "all-time");
  const [selectedYear, setSelectedYear] = useState(defaultYear);
  const [players, setPlayers] = useState(() => {
    return leaderboardData[defaultYear] || aggregateAllTimeStats();
  });
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("pufc-theme") || "dark";
  });
  const [isSmall, setIsSmall] = useState(() => isSmallScreen());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [rosterDropdownOpen, setRosterDropdownOpen] = useState(false);

  // Check if any roster tab is active
  const isRosterActive = ["midweek-roster", "weekend-roster", "inactive-players", "onloan-roster"].includes(activeTab);

  // Close roster dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (rosterDropdownOpen && !e.target.closest('.roster-dropdown-container')) {
        setRosterDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [rosterDropdownOpen]);

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
                : activeTab === "weekly-tracker"
                  ? "Weekly Tracker"
                  : activeTab === "insights"
                    ? "Season Insights"
                    : activeTab === "scoring-trends"
                      ? "Scoring Trends"
                      : activeTab === "midweek-roster"
                        ? "Midweek Roster"
                        : activeTab === "weekend-roster"
                          ? "Weekend Roster"
                          : activeTab === "inactive-players"
                            ? "Inactive Players"
                            : activeTab === "onloan-roster"
                              ? "On Loan Players"
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
          {/* Mobile Hamburger Menu Button */}
          <button
            className="hamburger-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <span className={`hamburger-icon ${mobileMenuOpen ? "open" : ""}`}>
              <span></span>
              <span></span>
              <span></span>
            </span>
          </button>

          {/* Tab Buttons Container */}
          <div className={`tab-buttons ${mobileMenuOpen ? "mobile-open" : ""}`}>
            <button
              className={`tab-btn ${activeTab === "leaderboard" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("leaderboard");
                setMobileMenuOpen(false);
                setRosterDropdownOpen(false);
                // Reset to default year from config when switching back to leaderboard
                const resetYear = config.STATS_LEADERBOARD?.defaultSeason || "2026";
                setSelectedYear(resetYear);
                setPlayers(leaderboardData[resetYear] || aggregateAllTimeStats());
              }}
            >
              📊 {isSmall ? "Board" : "Leaderboard"}
            </button>
            {config.ATTENDANCE?.enabled && (
              <button
                className={`tab-btn ${activeTab === "attendance" ? "active" : ""
                  }`}
                onClick={() => {
                  setActiveTab("attendance");
                  setMobileMenuOpen(false);
                  setRosterDropdownOpen(false);
                }}
              >
                📅 Attendance
              </button>
            )}
            {config.ATTENDANCE?.TRACKER?.enabled && (
              <button
                className={`tab-btn ${activeTab === "weekly-tracker" ? "active" : ""}`}
                onClick={() => {
                  setActiveTab("weekly-tracker");
                  setMobileMenuOpen(false);
                  setRosterDropdownOpen(false);
                }}
              >
                📊 Weekly Tracker
              </button>
            )}
            {config.INSIGHTS?.enabled && (
              <button
                className={`tab-btn ${activeTab === "insights" ? "active" : ""}`}
                onClick={() => {
                  setActiveTab("insights");
                  setMobileMenuOpen(false);
                  setRosterDropdownOpen(false);
                }}
              >
                📈 Insights
              </button>
            )}
            {config.SCORING_TRENDS?.enabled && (
              <button
                className={`tab-btn ${activeTab === "scoring-trends" ? "active" : ""}`}
                onClick={() => {
                  setActiveTab("scoring-trends");
                  setMobileMenuOpen(false);
                  setRosterDropdownOpen(false);
                }}
              >
                📊 Trends
              </button>
            )}

            {/* Desktop Roster Dropdown */}
            <div className="roster-dropdown-container desktop-only">
              <button
                className={`tab-btn roster-dropdown-trigger ${isRosterActive ? "active" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setRosterDropdownOpen(!rosterDropdownOpen);
                }}
              >
                👥 Roster
                <span className={`dropdown-arrow ${rosterDropdownOpen ? "open" : ""}`}>▼</span>
              </button>
              {rosterDropdownOpen && (
                <div className="roster-dropdown-menu">
                  <button
                    className={`roster-dropdown-item ${activeTab === "midweek-roster" ? "active" : ""}`}
                    onClick={() => {
                      setActiveTab("midweek-roster");
                      setRosterDropdownOpen(false);
                    }}
                  >
                    📅 Midweek Roster
                  </button>
                  <button
                    className={`roster-dropdown-item ${activeTab === "weekend-roster" ? "active" : ""}`}
                    onClick={() => {
                      setActiveTab("weekend-roster");
                      setRosterDropdownOpen(false);
                    }}
                  >
                    🌅 Weekend Roster
                  </button>
                  <button
                    className={`roster-dropdown-item ${activeTab === "inactive-players" ? "active" : ""}`}
                    onClick={() => {
                      setActiveTab("inactive-players");
                      setRosterDropdownOpen(false);
                    }}
                  >
                    ⚪ Inactive Players
                  </button>
                  <button
                    className={`roster-dropdown-item ${activeTab === "onloan-roster" ? "active" : ""}`}
                    onClick={() => {
                      setActiveTab("onloan-roster");
                      setRosterDropdownOpen(false);
                    }}
                  >
                    📋 On Loan
                  </button>
                </div>
              )}
            </div>

            {/* Mobile-only roster buttons (shown in hamburger menu) */}
            <button
              className={`tab-btn mobile-only ${activeTab === "midweek-roster" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("midweek-roster");
                setMobileMenuOpen(false);
              }}
            >
              📅 Midweek Roster
            </button>
            <button
              className={`tab-btn mobile-only ${activeTab === "weekend-roster" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("weekend-roster");
                setMobileMenuOpen(false);
              }}
            >
              🌅 Weekend Roster
            </button>
            <button
              className={`tab-btn mobile-only ${activeTab === "inactive-players" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("inactive-players");
                setMobileMenuOpen(false);
              }}
            >
              ⚪ Inactive Players
            </button>
            <button
              className={`tab-btn mobile-only ${activeTab === "onloan-roster" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("onloan-roster");
                setMobileMenuOpen(false);
              }}
            >
              📋 On Loan
            </button>
          </div>

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

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div className="mobile-menu-overlay" onClick={() => setMobileMenuOpen(false)} />
        )}

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
        ) : activeTab === "weekly-tracker" ? (
          <WeeklyTracker />
        ) : activeTab === "insights" ? (
          <Insights />
        ) : activeTab === "scoring-trends" ? (
          <ScoringTrends />
        ) : activeTab === "midweek-roster" ? (
          <Roster type="midweek" />
        ) : activeTab === "weekend-roster" ? (
          <Roster type="weekend" />
        ) : activeTab === "inactive-players" ? (
          <Roster type="inactive" />
        ) : activeTab === "onloan-roster" ? (
          <Roster type="onloan" />
        ) : null}
      </main>

      <footer className="footer">
        <p>© {new Date().getFullYear()} PUFC — All rights reserved</p>
      </footer>
    </div>
  );
}

export default App;
