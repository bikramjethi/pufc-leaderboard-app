import { useState, useEffect } from "react";
import { Leaderboard } from "./Leaderboard.jsx";
import "./App.css";

// Import all season data
import data2024 from "./data/2024.json";
import data2025 from "./data/2025.json";

const seasonData = {
  2024: data2024,
  2025: data2025,
};

const availableYears = Object.keys(seasonData).sort((a, b) => b - a);

function App() {
  const [selectedYear, setSelectedYear] = useState(availableYears[0]);
  const [players, setPlayers] = useState(seasonData[selectedYear]);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("pufc-theme") || "dark";
  });

  useEffect(() => {
    setPlayers(seasonData[selectedYear]);
  }, [selectedYear]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("pufc-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          <div className="club-badge">⚽</div>
          <h1 className="title">PUFC Leaderboard</h1>
          <p className="subtitle">Player Statistics</p>
        </div>
      </header>

      <main className="main-content">
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
              </select>
              <span className="select-arrow">▼</span>
            </div>
          </div>
        </div>

        <Leaderboard players={players} allSeasonData={seasonData} />
      </main>

      <footer className="footer">
        <p>© {new Date().getFullYear()} PUFC — All rights reserved</p>
      </footer>
    </div>
  );
}

export default App;
