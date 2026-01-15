import { useState } from "react";
import { AttendanceLeaderboard } from "./AttendanceLeaderboard.jsx";
import { config } from "../../leaderboard-config.js";

// Get available years from config
const leaderboardYears = config.ATTENDANCE?.LEADERBOARD?.seasons || ["2025", "2026"];


export const Attendance = () => {
  // Check if leaderboard sub-tab is enabled
  const isLeaderboardEnabled = config.ATTENDANCE?.LEADERBOARD?.enabled !== false;
  
  const [leaderboardYear, setLeaderboardYear] = useState(
    config.ATTENDANCE?.LEADERBOARD?.defaultSeason || "2026"
  );


  return (
    <div className="attendance">
      {/* Year Selector */}
      {isLeaderboardEnabled && (
        <div className="sub-tab-nav">
          <div className="attendance-year-selector">
            <label htmlFor="attendance-year-select">Season</label>
            <div className="select-wrapper">
              <select
                id="attendance-year-select"
                value={leaderboardYear}
                onChange={(e) => setLeaderboardYear(e.target.value)}
              >
                {leaderboardYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <span className="select-arrow">▼</span>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Content */}
      {isLeaderboardEnabled ? (
        <AttendanceLeaderboard year={leaderboardYear} />
      ) : (
        <div className="attendance-no-data">
          <p>Attendance Leaderboard is disabled</p>
        </div>
      )}
    </div>
  );
};
