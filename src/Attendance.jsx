import { useState, useMemo } from "react";
import matchData from "./data/2025_match_data.json";

// Format date like "4th Jan", "21st Feb", etc.
const formatDate = (dateStr) => {
  const [day, month] = dateStr.split("/");
  const dayNum = parseInt(day, 10);
  
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthName = months[parseInt(month, 10) - 1];
  
  // Add ordinal suffix
  const suffix = (d) => {
    if (d > 3 && d < 21) return "th";
    switch (d % 10) {
      case 1: return "st";
      case 2: return "nd";
      case 3: return "rd";
      default: return "th";
    }
  };
  
  return `${dayNum}${suffix(dayNum)} ${monthName}`;
};

export const Attendance = ({ year }) => { // eslint-disable-line no-unused-vars
  const [searchTerm, setSearchTerm] = useState("");

  // For now, only 2025 data exists. Ready for future years.
  // TODO: Use `year` prop to load different match data when available
  const { matches, allPlayers } = matchData;

  // Filter players by search
  const filteredPlayers = useMemo(() => {
    if (!searchTerm.trim()) return allPlayers;
    const term = searchTerm.toLowerCase();
    return allPlayers.filter((player) => player.toLowerCase().includes(term));
  }, [searchTerm, allPlayers]);

  // Calculate attendance stats for each player
  const playerStats = useMemo(() => {
    return allPlayers.map((player) => {
      const attended = matches.filter((m) => m.attendance.includes(player)).length;
      const percentage = matches.length > 0 ? Math.round((attended / matches.length) * 100) : 0;
      return { player, attended, total: matches.length, percentage };
    });
  }, [matches, allPlayers]);

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

  return (
    <div className="attendance">
      {/* Search */}
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
                  className="match-col"
                  title={`${match.day} - ${match.date}`}
                >
                  <div className="match-header">
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
                  <td className={`stat attendance-stat ${getAttendanceClass(stats?.percentage || 0)}`}>
                    {stats?.percentage || 0}%
                  </td>
                  {matches.map((match) => {
                    const wasPresent = match.attendance.includes(player);
                    const scored = match.scorers.find((s) => s.player === player);
                    const hadOwnGoal = match.ownGoals.includes(player);
                    const hadCleanSheet = match.cleanSheets.includes(player);

                    return (
                      <td 
                        key={match.id} 
                        className={`match-cell ${wasPresent ? "present" : "absent"}`}
                        title={
                          wasPresent
                            ? `Present${scored ? ` • ${scored.goals} goal(s)` : ""}${hadCleanSheet ? " • Clean Sheet" : ""}${hadOwnGoal ? " • Own Goal" : ""}`
                            : "Absent"
                        }
                      >
                        <div className="attendance-indicator">
                          {wasPresent ? (
                            <span className="check">✓</span>
                          ) : (
                            <span className="cross">✗</span>
                          )}
                          {scored && <span className="goal-badge">{scored.goals}</span>}
                          {hadCleanSheet && <span className="cs-badge">🧤</span>}
                          {hadOwnGoal && <span className="og-badge">OG</span>}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="legend attendance-legend">
        <span><span className="check">✓</span> Present</span>
        <span><span className="cross">✗</span> Absent</span>
        <span><span className="goal-badge">2</span> Goals Scored</span>
        <span>🧤 Clean Sheet</span>
        <span><span className="og-badge">OG</span> Own Goal</span>
      </div>
    </div>
  );
};

