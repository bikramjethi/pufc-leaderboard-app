import { useState, useMemo } from "react";
import matchData2026 from "./data/attendance-data/2026.json";

const matchDataByYear = {
  2026: matchData2026,
};

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

// Get player result for a match
const getPlayerResult = (match, player) => {
  if (!match.matchPlayed || match.matchCancelled) return null;
  if (!match.attendance.includes(player)) return null;

  if (match.winners?.includes(player)) return "W";
  if (match.losers?.includes(player)) return "L";
  // If both arrays are empty or player is in neither, it's a draw
  if (match.winners?.length === 0 && match.losers?.length === 0) return "D";
  return null;
};

export const Attendance = ({ year }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSubTab, setActiveSubTab] = useState("leaderboard");

  // Load match data based on year
  const matchData = matchDataByYear[year] || matchData2026;
  const { matches, allPlayers } = matchData;

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
        m.attendance.includes(player)
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
    const wasPresent = match.attendance.includes(player);
    const scored = match.scorers?.find((s) => {
      return s.name.toLowerCase() === player.toLowerCase();
    });
    const hadOwnGoal = match.ownGoals?.find((s) => {
      return s.name.toLowerCase() === player.toLowerCase();
    });
    const hadCleanSheet = match.cleanSheets?.includes(player);
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
        {/* Goal stats */}
        {scored && <span className="goal-badge">{scored.goals}</span>}
        {hadCleanSheet && <span className="cs-badge">🧤</span>}
        {hadOwnGoal && <span className="og-badge">OG</span>}
      </div>
    );
  };

  // Get cell class based on match status and attendance
  const getCellClass = (match, player) => {
    if (match.matchCancelled) return "match-cell cancelled";
    if (!match.matchPlayed) return "match-cell pending";

    const wasPresent = match.attendance.includes(player);
    const result = getPlayerResult(match, player);

    let classes = "match-cell";
    classes += wasPresent ? " present" : " absent";
    if (result) classes += ` result-${result.toLowerCase()}`;

    return classes;
  };

  // Get cell tooltip
  const getCellTitle = (match, player) => {
    if (match.matchCancelled) return "Match Cancelled";
    if (!match.matchPlayed) return "Match Not Yet Played";

    const wasPresent = match.attendance.includes(player);
    const scored = match.scorers?.find((s) => s.player === player);
    const hadOwnGoal = match.ownGoals?.includes(player);
    const hadCleanSheet = match.cleanSheets?.includes(player);
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
      if (scored) tip += ` • ${scored.goals} goal(s)`;
      if (hadCleanSheet) tip += " • Clean Sheet";
      if (hadOwnGoal) tip += " • Own Goal";
      return tip;
    }
    return "Absent";
  };

  return (
    <div className="attendance">
      {/* Sub-tab Navigation */}
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
      </div>

      {/* Tracker Content */}
      {activeSubTab === "tracker" && (
        <>
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
          </div>
        </>
      )}

      {/* Leaderboard Content */}
      {activeSubTab === "leaderboard" && (
        <div className="attendance-leaderboard">
          {/* Empty for now - content to be added later */}
        </div>
      )}
    </div>
  );
};
