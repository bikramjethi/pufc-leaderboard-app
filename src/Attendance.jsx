import { useState, useMemo } from "react";
import matchData2026 from "./data/attendance-data/2026.json";
import { AttendanceLeaderboard } from "./AttendanceLeaderboard.jsx";

const matchDataByYear = {
  2026: matchData2026,
};

// Available years for tracker (game-by-game data) - starts from 2026
const trackerYears = ["2026"];

// Available years for leaderboard (summary data) - starts from 2025
const leaderboardYears = ["2025", "2026"];

// Format date like "4th Jan", "21st Feb", etc.
const formatDate = (dateStr) => {
  const [day, month] = dateStr.split("/");
  const dayNum = parseInt(day, 10);

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const monthName = months[parseInt(month, 10) - 1];

  // Add ordinal suffix
  const suffix = (d) => {
    if (d > 3 && d < 21) return "th";
    switch (d % 10) {
      case 1:
        return "st";
      case 2:
        return "nd";
      case 3:
        return "rd";
      default:
        return "th";
    }
  };

  return `${dayNum}${suffix(dayNum)} ${monthName}`;
};

// Helper function to get all players from attendance object
const getAllPlayersFromAttendance = (attendance) => {
  if (!attendance || typeof attendance !== 'object') return [];
  
  const players = [];
  Object.values(attendance).forEach(teamPlayers => {
    if (Array.isArray(teamPlayers)) {
      teamPlayers.forEach(player => {
        if (player && player.name) {
          players.push(player);
        }
      });
    }
  });
  return players;
};

// Helper function to get all player names from attendance
const getAllPlayerNames = (attendance) => {
  return getAllPlayersFromAttendance(attendance).map(p => p.name);
};

// Helper function to find player in attendance and get their data
const getPlayerFromAttendance = (attendance, playerName) => {
  if (!attendance || typeof attendance !== 'object') return null;
  
  for (const [team, players] of Object.entries(attendance)) {
    if (Array.isArray(players)) {
      const found = players.find(p => p.name === playerName);
      if (found) return { ...found, team };
    }
  }
  return null;
};

// Helper function to get winning team from scoreline
const getWinningTeam = (scoreline) => {
  if (!scoreline || typeof scoreline !== 'object') return null;
  
  const teams = Object.keys(scoreline);
  if (teams.length !== 2) return null;
  
  const [team1, team2] = teams;
  const score1 = scoreline[team1] || 0;
  const score2 = scoreline[team2] || 0;
  
  if (score1 > score2) return team1;
  if (score2 > score1) return team2;
  return 'DRAW';
};

// Get player result for a match
const getPlayerResult = (match, playerName) => {
  if (!match.matchPlayed || match.matchCancelled) return null;
  
  const playerData = getPlayerFromAttendance(match.attendance, playerName);
  if (!playerData) return null;
  
  const winningTeam = getWinningTeam(match.scoreline);
  if (winningTeam === 'DRAW') return "D";
  if (playerData.team === winningTeam) return "W";
  return "L";
};

// Check if player is in attendance
const isPlayerInAttendance = (attendance, playerName) => {
  return getPlayerFromAttendance(attendance, playerName) !== null;
};

// Get color class for team color
const getColorClass = (color) => {
  const colorMap = {
    RED: "team-color-red",
    BLUE: "team-color-blue",
    WHITE: "team-color-white",
    BLACK: "team-color-black",
    YELLOW: "team-color-yellow",
  };
  return colorMap[color] || "team-color-default";
};

// Render scoreline with color indicators
const renderScoreline = (scoreline) => {
  if (!scoreline || typeof scoreline !== 'object') return null;
  
  const teams = Object.keys(scoreline);
  if (teams.length === 0) return null;
  
  return (
    <span className="match-scoreline">
      {teams.map((team, index) => (
        <span key={team} className="scoreline-item">
          <span className={`team-color-indicator ${getColorClass(team)}`}></span>
          <span className="score-value">{scoreline[team]}</span>
          {index < teams.length - 1 && <span className="score-separator">-</span>}
        </span>
      ))}
    </span>
  );
};

export const Attendance = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSubTab, setActiveSubTab] = useState("leaderboard");
  // Separate year states for leaderboard and tracker
  const [leaderboardYear, setLeaderboardYear] = useState("2026");
  const [trackerYear, setTrackerYear] = useState("2026");

  // Get current year based on active sub-tab
  const currentYear = activeSubTab === "leaderboard" ? leaderboardYear : trackerYear;

  // Load match data based on year (only for tracker)
  const matchData = matchDataByYear[currentYear];
  const { matches, allPlayers } = matchData || { matches: [], allPlayers: [] };

  // Filter players by search
  const filteredPlayers = useMemo(() => {
    if (!searchTerm.trim()) return allPlayers;
    const term = searchTerm.toLowerCase();
    return allPlayers.filter((player) => player.toLowerCase().includes(term));
  }, [searchTerm, allPlayers]);

  // Get only played matches (not cancelled)
  const playedMatches = useMemo(() => {
    return matches.filter((m) => m.matchPlayed && !m.matchCancelled);
  }, [matches]);

  // Calculate attendance stats for each player (only for played matches)
  const playerStats = useMemo(() => {
    return allPlayers.map((player) => {
      const attended = playedMatches.filter((m) =>
        isPlayerInAttendance(m.attendance, player)
      ).length;
      const percentage =
        playedMatches.length > 0
          ? Math.round((attended / playedMatches.length) * 100)
          : 0;
      return { player, attended, total: playedMatches.length, percentage };
    });
  }, [playedMatches, allPlayers]);

  // Sort players by attendance percentage (descending)
  const sortedPlayers = useMemo(() => {
    return [...filteredPlayers].sort((a, b) => {
      const statsA = playerStats.find((s) => s.player === a);
      const statsB = playerStats.find((s) => s.player === b);
      return (statsB?.percentage || 0) - (statsA?.percentage || 0);
    });
  }, [filteredPlayers, playerStats]);

  const getAttendanceClass = (percentage) => {
    if (percentage >= 80) return "attendance-high";
    if (percentage >= 50) return "attendance-medium";
    return "attendance-low";
  };

  // Get match status class for header styling
  const getMatchHeaderClass = (match) => {
    if (match.matchCancelled) return "match-cancelled";
    if (!match.matchPlayed) return "match-pending";
    return "match-played";
  };

  // Render cell content based on match status
  const renderCellContent = (match, player) => {
    // Cancelled match - supersedes all other flags
    if (match.matchCancelled) {
      return (
        <div className="attendance-indicator">
          <span className="cancelled" title="Match Cancelled">
            🚫
          </span>
        </div>
      );
    }

    // Match not yet played
    if (!match.matchPlayed) {
      return (
        <div className="attendance-indicator">
          <span className="pending" title="Match Not Yet Played">
            —
          </span>
        </div>
      );
    }

    // Match was played - show attendance data
    const playerData = getPlayerFromAttendance(match.attendance, player);
    const wasPresent = playerData !== null;
    const result = getPlayerResult(match, player);

    return (
      <div className="attendance-indicator">
        {/* Result indicator (W/L/D) */}
        {result && (
          <span className={`result-badge result-${result.toLowerCase()}`}>
            {result}
          </span>
        )}
        {/* Attendance indicator (only show if no result or absent) */}
        {!wasPresent && <span className="cross">✗</span>}
        {/* Goal stats from player data */}
        {playerData?.goals > 0 && <span className="goal-badge">{playerData.goals}</span>}
        {playerData?.cleanSheet && <span className="cs-badge">🧤</span>}
        {playerData?.ownGoals > 0 && <span className="og-badge">OG</span>}
      </div>
    );
  };

  // Get cell class based on match status and attendance
  const getCellClass = (match, player) => {
    if (match.matchCancelled) return "match-cell cancelled";
    if (!match.matchPlayed) return "match-cell pending";

    const playerData = getPlayerFromAttendance(match.attendance, player);
    const wasPresent = playerData !== null;
    const result = getPlayerResult(match, player);

    let classes = "match-cell";
    classes += wasPresent ? " present" : " absent";
    if (result) classes += ` result-${result.toLowerCase()}`;
    
    // Add ONLOAN class for players on loan
    if (playerData?.groupStatus === "ONLOAN") {
      classes += " onloan";
    }

    return classes;
  };

  // Get cell tooltip
  const getCellTitle = (match, player) => {
    if (match.matchCancelled) return "Match Cancelled";
    if (!match.matchPlayed) return "Match Not Yet Played";

    const playerData = getPlayerFromAttendance(match.attendance, player);
    const wasPresent = playerData !== null;
    const result = getPlayerResult(match, player);

    if (wasPresent) {
      let tip =
        result === "W"
          ? "Won"
          : result === "L"
            ? "Lost"
            : result === "D"
              ? "Draw"
              : "Present";
      if (playerData?.goals > 0) tip += ` • ${playerData.goals} goal(s)`;
      if (playerData?.cleanSheet) tip += " • Clean Sheet";
      if (playerData?.ownGoals > 0) tip += " • Own Goal";
      if (playerData?.groupStatus === "ONLOAN") tip += " • On Loan";
      return tip;
    }
    return "Absent";
  };

  return (
    <div className="attendance">
      {/* Sub-tab Navigation with Year Selectors */}
      <div className="sub-tab-nav">
        <button
          className={`sub-tab-btn ${activeSubTab === "leaderboard" ? "active" : ""}`}
          onClick={() => setActiveSubTab("leaderboard")}
        >
          🏆 Leaderboard
        </button>
        <button
          className={`sub-tab-btn ${activeSubTab === "tracker" ? "active" : ""}`}
          onClick={() => setActiveSubTab("tracker")}
        >
          📊 Tracker
        </button>
        
        {/* Year Selector - Different options for leaderboard vs tracker */}
        <div className="attendance-year-selector">
          <label htmlFor="attendance-year-select">Season</label>
          <div className="select-wrapper">
            <select
              id="attendance-year-select"
              value={currentYear}
              onChange={(e) => {
                const newYear = e.target.value;
                if (activeSubTab === "leaderboard") {
                  setLeaderboardYear(newYear);
                } else {
                  setTrackerYear(newYear);
                }
              }}
            >
              {(activeSubTab === "leaderboard" ? leaderboardYears : trackerYears).map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <span className="select-arrow">▼</span>
          </div>
        </div>
      </div>

      {/* Tracker Content */}
      {activeSubTab === "tracker" && matchData && (
        <>
          {/* Search and Download */}
          <div className="tracker-actions">
            <div className="search-container">
              <input
                type="text"
                className="search-input"
                placeholder="Search players..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button className="search-clear" onClick={() => setSearchTerm("")}>
                  ✕
                </button>
              )}
            </div>
            <button
              className="download-csv-btn-compact"
              onClick={() => {
                // Get all unique player names from all matches
                const allPlayersSet = new Set();
                matchData.matches.forEach((match) => {
                  if (match.attendance && typeof match.attendance === 'object') {
                    getAllPlayerNames(match.attendance).forEach(name => allPlayersSet.add(name));
                  }
                });
                
                // Sort players alphabetically
                const sortedPlayersCSV = Array.from(allPlayersSet).sort();
                
                // Get all match dates (only for played matches)
                const matchDates = matchData.matches
                  .filter((match) => match.matchPlayed && !match.matchCancelled)
                  .map((match) => match.date || match.id)
                  .sort();
                
                // Create CSV rows
                const csvRows = [];
                
                // Header row: Player, then all match dates
                csvRows.push(["Player", ...matchDates].join(","));
                
                // For each player, create a row with 1 if they attended, blank if not
                sortedPlayersCSV.forEach((player) => {
                  const row = [player];
                  matchDates.forEach((date) => {
                    const match = matchData.matches.find(
                      (m) => (m.date === date || m.id === date) && m.matchPlayed && !m.matchCancelled
                    );
                    const attended = match && isPlayerInAttendance(match.attendance, player);
                    row.push(attended ? "1" : "");
                  });
                  csvRows.push(row.join(","));
                });

                // Create CSV content
                const csvContent = csvRows.join("\n");
                
                // Create blob and download
                const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                const link = document.createElement("a");
                const url = URL.createObjectURL(blob);
                link.setAttribute("href", url);
                link.setAttribute("download", `attendance-tracker-${trackerYear}.csv`);
                link.style.visibility = "hidden";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              title="Download CSV"
            >
              📥 Download CSV
            </button>
          </div>

      {/* Stats Summary */}
      <div className="attendance-summary">
        <span>📊 {playedMatches.length} matches played</span>
        <span>
          📅 {matches.filter((m) => !m.matchPlayed && !m.matchCancelled).length}{" "}
          upcoming
        </span>
        <span>
          🚫 {matches.filter((m) => m.matchCancelled).length} cancelled
        </span>
        {matchData?.totalGoals !== undefined && (
          <span>⚽ {matchData.totalGoals} total goals</span>
        )}
        {matchData?.weekendGoals !== undefined && (
          <span>🏖️ {matchData.weekendGoals} weekend goals</span>
        )}
        {matchData?.weekdayGoals !== undefined && (
          <span>📅 {matchData.weekdayGoals} weekday goals</span>
        )}
      </div>

      {/* Attendance Table */}
      <div className="attendance-table-container">
        <table className="attendance-table">
          <thead>
            <tr>
              <th className="player-col sticky-col">Player</th>
              <th className="stat-col attendance-stat">%</th>
              {matches.map((match) => (
                <th
                  key={match.id}
                  className={`match-col ${getMatchHeaderClass(match)}`}
                  title={`${match.day} - ${match.date}${match.matchCancelled
                    ? " (Cancelled)"
                    : !match.matchPlayed
                      ? " (Not Yet Played)"
                      : ""
                    }`}
                >
                  <div className="match-header">
                    {match.matchPlayed && match.scoreline && renderScoreline(match.scoreline)}
                    <span className="match-day">{match.day.slice(0, 3)}</span>
                    <span className="match-date">{formatDate(match.date)}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedPlayers.map((player) => {
              const stats = playerStats.find((s) => s.player === player);
              return (
                <tr key={player} className="player-row">
                  <td className="player-name sticky-col">{player}</td>
                  <td
                    className={`stat attendance-stat ${getAttendanceClass(
                      stats?.percentage || 0
                    )}`}
                  >
                    {stats?.percentage || 0}%
                  </td>
                  {matches.map((match) => (
                    <td
                      key={match.id}
                      className={getCellClass(match, player)}
                      title={getCellTitle(match, player)}
                    >
                      {renderCellContent(match, player)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

          {/* Legend */}
          <div className="legend attendance-legend">
            <span>
              <span className="result-badge result-w">W</span> Won
            </span>
            <span>
              <span className="result-badge result-l">L</span> Lost
            </span>
            <span>
              <span className="result-badge result-d">D</span> Draw
            </span>
            <span>
              <span className="cross">✗</span> Absent
            </span>
            <span>
              <span className="pending">—</span> Not Played
            </span>
            <span>
              <span className="cancelled">🚫</span> Cancelled
            </span>
            <span>
              <span className="goal-badge">2</span> Goals
            </span>
            <span>🧤 Clean Sheet</span>
            <span>
              <span className="og-badge">OG</span> Own Goal
            </span>
            <span>
              <span className="onloan-indicator"></span> On Loan
            </span>
          </div>
        </>
      )}

      {/* Leaderboard Content */}
      {activeSubTab === "leaderboard" && (
        <AttendanceLeaderboard year={leaderboardYear} />
      )}
      
      {/* Tracker - No data message */}
      {activeSubTab === "tracker" && !matchData && (
        <div className="attendance-no-data">
          <p>No tracker data available for {trackerYear}</p>
        </div>
      )}
    </div>
  );
};
