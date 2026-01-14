import { useState, useEffect } from "react";
import { Leaderboard } from "./Leaderboard.jsx";
import { Attendance } from "./Attendance.jsx";
import { WeeklyTracker } from "./WeeklyTracker.jsx";
import { Roster } from "./Roster.jsx";
import { Insights } from "./Insights.jsx";
import { ScoringTrends } from "./ScoringTrends.jsx";
import { FunStats } from "./FunStats.jsx";
import { MVPLeaderboard } from "./MVPLeaderboard.jsx";
import { MatchEntry } from "./MatchEntry.jsx";
import "./App.css";
import "./FunStats.css";
import { config } from "./leaderboard-config.js";
import { isSmallScreen } from "./utils/isSmallScreen.js";
import { aggregateAllTimeStats } from "./utils/leaderboard-calculations.js";
import { leaderboardData } from "./utils/get-data.js";

// Get available years from config, falling back to data keys
const availableYears = config.STATS_LEADERBOARD?.seasons || Object.keys(leaderboardData).sort((a, b) => b - a);

// Navigation configuration - easy to add new tabs!
const getNavItems = () => [
  {
    group: "Stats",
    items: [
      { id: "leaderboard", label: "Leaderboard", icon: "📊", enabled: true },
      { id: "insights", label: "Insights", icon: "📈", enabled: config.INSIGHTS?.enabled },
      { id: "scoring-trends", label: "Trends", icon: "📉", enabled: config.SCORING_TRENDS?.enabled },
      { id: "fun-stats", label: "Fun Stats", icon: "🎲", enabled: config.FUN_STATS?.enabled },
      { id: "mvp-leaderboard", label: "MVP Leaderboard", icon: "🏆", enabled: config.MVP_LEADERBOARD?.enabled },
    ],
  },
  {
    group: "Attendance",
    items: [
      { id: "attendance", label: "Leaderboard", icon: "📅", enabled: config.ATTENDANCE?.enabled },
      { id: "weekly-tracker", label: "Weekly Tracker", icon: "🗓️", enabled: config.ATTENDANCE?.TRACKER?.enabled },
    ],
  },
  {
    group: "Team",
    items: [
      { id: "midweek-roster", label: "Midweek", icon: "🌙", enabled: true },
      { id: "weekend-roster", label: "Weekend", icon: "☀️", enabled: true },
      { id: "inactive-players", label: "Inactive", icon: "💤", enabled: true },
      { id: "onloan-roster", label: "On Loan", icon: "🔄", enabled: true },
    ],
  },
  {
    group: "Admin",
    items: [
      { id: "match-entry", label: "Match Entry", icon: "📝", enabled: config.MATCH_ENTRY?.enabled },
    ],
  },
];

function App() {
  const [activeTab, setActiveTab] = useState("leaderboard");
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem("pufc-sidebar-collapsed") === "true";
  });

  // Get nav items
  const navItems = getNavItems();

  // Get subtitle based on active tab
  const getSubtitle = () => {
    const subtitles = {
      "leaderboard": selectedYear === "all-time" ? "All-Time Career Stats" : "Player Statistics",
      "attendance": "Attendance Leaderboard",
      "weekly-tracker": "Weekly Tracker",
      "insights": "Season Insights",
      "scoring-trends": "Scoring Trends",
      "fun-stats": "Fun Stats & Head-to-Head",
      "mvp-leaderboard": "MVP Leaderboard",
      "midweek-roster": "Midweek Roster",
      "weekend-roster": "Weekend Roster",
      "inactive-players": "Inactive Players",
      "onloan-roster": "On Loan Players",
      "match-entry": "Match Data Entry Tool",
    };
    return subtitles[activeTab] || "Player Statistics";
  };

  // Save sidebar state to localStorage
  useEffect(() => {
    localStorage.setItem("pufc-sidebar-collapsed", sidebarCollapsed);
  }, [sidebarCollapsed]);

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

  const handleNavClick = (tabId) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
    
    // Reset to default year when switching to leaderboard
    if (tabId === "leaderboard") {
      const resetYear = config.STATS_LEADERBOARD?.defaultSeason || "2026";
      setSelectedYear(resetYear);
      setPlayers(leaderboardData[resetYear] || aggregateAllTimeStats());
    }
  };

  return (
    <div className={`app ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      {/* Sidebar Navigation - Desktop */}
      <aside className={`sidebar ${sidebarCollapsed ? "collapsed" : ""}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <span className="brand-icon">⚽</span>
            {!sidebarCollapsed && <span className="brand-text">PUFC</span>}
          </div>
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? "→" : "←"}
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((group) => {
            const enabledItems = group.items.filter(item => item.enabled);
            if (enabledItems.length === 0) return null;
            
            return (
              <div key={group.group} className="nav-group">
                {!sidebarCollapsed && (
                  <span className="nav-group-label">{group.group}</span>
                )}
                <ul className="nav-items">
                  {enabledItems.map((item) => (
                    <li key={item.id}>
                      <button
                        className={`nav-item ${activeTab === item.id ? "active" : ""}`}
                        onClick={() => handleNavClick(item.id)}
                        title={sidebarCollapsed ? item.label : undefined}
                      >
                        <span className="nav-icon">{item.icon}</span>
                        {!sidebarCollapsed && (
                          <span className="nav-label">{item.label}</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button
            className="theme-toggle-sidebar"
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            <span className="nav-icon">{theme === "dark" ? "☀️" : "🌙"}</span>
            {!sidebarCollapsed && (
              <span className="nav-label">{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-wrapper">
        {/* Floating Expand Button - Desktop only, when sidebar is collapsed */}
        {sidebarCollapsed && !isSmall && (
          <button
            className="sidebar-expand-btn"
            onClick={() => setSidebarCollapsed(false)}
            aria-label="Expand sidebar"
            title="Expand sidebar"
          >
            <span className="expand-icon">☰</span>
          </button>
        )}

        <header className="header">
          <div className="header-content">
            {/* Mobile Hamburger */}
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

            <div className="header-text">
              <h1 className="title">PUFC Leaderboard</h1>
              <p className="subtitle">{getSubtitle()}</p>
            </div>

            {/* Theme toggle for mobile */}
            <button
              className="theme-toggle mobile-only"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>

            {/* Season selector for leaderboard */}
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
        </header>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <>
            <div className="mobile-menu-overlay" onClick={() => setMobileMenuOpen(false)} />
            <div className="mobile-menu">
              {navItems.map((group) => {
                const enabledItems = group.items.filter(item => item.enabled);
                if (enabledItems.length === 0) return null;
                
                return (
                  <div key={group.group} className="mobile-nav-group">
                    <span className="mobile-nav-group-label">{group.group}</span>
                    {enabledItems.map((item) => (
                      <button
                        key={item.id}
                        className={`mobile-nav-item ${activeTab === item.id ? "active" : ""}`}
                        onClick={() => handleNavClick(item.id)}
                      >
                        <span className="nav-icon">{item.icon}</span>
                        <span className="nav-label">{item.label}</span>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          </>
        )}

        <main className="main-content">
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
        ) : activeTab === "fun-stats" ? (
          <FunStats />
        ) : activeTab === "mvp-leaderboard" ? (
          <MVPLeaderboard />
        ) : activeTab === "midweek-roster" ? (
            <Roster type="midweek" />
          ) : activeTab === "weekend-roster" ? (
            <Roster type="weekend" />
          ) : activeTab === "inactive-players" ? (
            <Roster type="inactive" />
          ) : activeTab === "onloan-roster" ? (
            <Roster type="onloan" />
          ) : activeTab === "match-entry" ? (
            <MatchEntry />
          ) : null}
        </main>

        <footer className="footer">
          <p>© {new Date().getFullYear()} PUFC — All rights reserved</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
