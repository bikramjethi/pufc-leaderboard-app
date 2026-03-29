import { useState, useMemo, useRef, useLayoutEffect } from "react";
import matchData2026 from "../../data/attendance-data/2026.json";
import { config } from "../../leaderboard-config.js";
import { FieldViewModal } from "../field-view-modal";

const matchDataByYear = {
  2026: matchData2026,
};

// Get available years from config
const trackerYears = config.ATTENDANCE?.TRACKER?.seasons || ["2026"];

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

// Parse match id "DD-MM-YYYY" for chronological comparison (hover hint on player name)
const getMatchTime = (match) => {
  if (!match?.id) return 0;
  const parts = match.id.split("-");
  if (parts.length >= 3) {
    const [d, m, y] = parts;
    const t = new Date(`${y}-${m}-${d}`).getTime();
    return Number.isNaN(t) ? 0 : t;
  }
  return 0;
};

// Helper to get all player names from attendance object
const getAllPlayerNames = (attendance) => {
  if (!attendance || typeof attendance !== 'object') return [];
  
  const players = [];
  Object.values(attendance).forEach(teamPlayers => {
    if (Array.isArray(teamPlayers)) {
      teamPlayers.forEach(player => {
        if (player && player.name) {
          players.push(player.name);
        }
      });
    }
  });
  return players;
};

// Helper to check if a player is in attendance
const isPlayerInAttendance = (attendance, playerName) => {
  if (!attendance || typeof attendance !== 'object') return false;
  
  return Object.values(attendance).some(teamPlayers => {
    if (Array.isArray(teamPlayers)) {
      return teamPlayers.some(player => player && player.name === playerName);
    }
    return false;
  });
};

/** Most recent played match in the list (same rules as stats) — for initial horizontal scroll */
const getLatestPlayedMatchId = (matchList) => {
  let bestId = null;
  let bestT = -1;
  for (const m of matchList) {
    if (!m.matchPlayed || m.matchCancelled || m.isTournament) continue;
    const t = getMatchTime(m);
    if (t >= bestT) {
      bestT = t;
      bestId = m.id;
    }
  }
  return bestId;
};

/** Latest played (non-cancelled, non-tournament) match the player attended */
const getPlayerLastAttendedMatch = (player, matchList) => {
  let best = null;
  let bestT = -1;
  for (const m of matchList) {
    if (!m.matchPlayed || m.matchCancelled || m.isTournament) continue;
    if (!isPlayerInAttendance(m.attendance, player)) continue;
    const t = getMatchTime(m);
    if (t >= bestT) {
      bestT = t;
      best = m;
    }
  }
  return best;
};

// Helper to get player data from attendance
const getPlayerFromAttendance = (attendance, playerName) => {
  if (!attendance || typeof attendance !== 'object') return null;
  
  for (const teamPlayers of Object.values(attendance)) {
    if (Array.isArray(teamPlayers)) {
      const player = teamPlayers.find(p => p && p.name === playerName);
      if (player) return player;
    }
  }
  return null;
};

// Helper to get player's result (W/L/D) from match
const getPlayerResult = (match, playerName) => {
  if (!match.scoreline || !match.attendance) return null;
  
  const playerData = getPlayerFromAttendance(match.attendance, playerName);
  if (!playerData) return null;
  
  // Find which team the player was on
  let playerTeam = null;
  for (const [team, players] of Object.entries(match.attendance)) {
    if (Array.isArray(players) && players.some(p => p && p.name === playerName)) {
      playerTeam = team;
      break;
    }
  }
  
  if (!playerTeam) return null;
  
  const scores = Object.values(match.scoreline);
  if (scores.length < 2) return null;
  
  const teamIndex = Object.keys(match.scoreline).indexOf(playerTeam);
  const playerScore = scores[teamIndex];
  const opponentScore = scores[1 - teamIndex];
  
  if (playerScore > opponentScore) return "W";
  if (playerScore < opponentScore) return "L";
  return "D";
};

// Render scoreline with team colors
const renderScoreline = (scoreline) => {
  if (!scoreline || Object.keys(scoreline).length === 0) return null;
  
  return (
    <span className="scoreline-display">
      {Object.entries(scoreline).map(([team, score], idx, arr) => (
        <span key={team} className={idx === 0 ? "team-1-score" : "team-2-score"}>
          <span className={`team-score team-${team.toLowerCase()}`} title={team}>
            {score}
          </span>
          {idx < arr.length - 1 && <span className="score-separator">-</span>}
        </span>
      ))}
    </span>
  );
};

export const WeeklyTracker = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [trackerYear, setTrackerYear] = useState(
    config.ATTENDANCE?.TRACKER?.defaultSeason || "2026"
  );
  // Field view modal state
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [showFieldViewModal, setShowFieldViewModal] = useState(false);
  const tableScrollRef = useRef(null);

  // Load match data based on year
  const matchData = matchDataByYear[trackerYear];
  const { matches, allPlayers } = matchData || { matches: [], allPlayers: [] };

  // Filter players by search
  const filteredPlayers = useMemo(() => {
    if (!searchTerm.trim()) return allPlayers;
    const term = searchTerm.toLowerCase();
    return allPlayers.filter((player) => player.toLowerCase().includes(term));
  }, [searchTerm, allPlayers]);

  // Get only played matches (not cancelled, not tournaments)
  const playedMatches = useMemo(() => {
    return matches.filter((m) => m.matchPlayed && !m.matchCancelled && !m.isTournament);
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

  const lastAttendedLabelByPlayer = useMemo(() => {
    const map = new Map();
    for (const player of sortedPlayers) {
      const last = getPlayerLastAttendedMatch(player, matches);
      map.set(
        player,
        last ? `Last attended: ${formatDate(last.date)}` : "No played matches attended yet"
      );
    }
    return map;
  }, [sortedPlayers, matches]);

  // On open (mount) or season change: scroll so the latest played match column is in view
  useLayoutEffect(() => {
    const list = matchData?.matches ?? [];
    if (!list.length) return;
    const container = tableScrollRef.current;
    if (!container) return;

    const run = () => {
      const focusId = getLatestPlayedMatchId(list);
      // Room for sticky Player + % columns (see App.css .sticky-col / .attendance-stat)
      const stickyLeftPad = 190;

      if (!focusId) {
        container.scrollTo({
          left: Math.max(0, container.scrollWidth - container.clientWidth),
          behavior: "smooth",
        });
        return;
      }

      const safeId =
        typeof CSS !== "undefined" && typeof CSS.escape === "function"
          ? CSS.escape(focusId)
          : focusId.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      const th = container.querySelector(`th.match-col[data-match-id="${safeId}"]`);
      if (!th) return;

      const cRect = container.getBoundingClientRect();
      const thRect = th.getBoundingClientRect();
      const xInContent = thRect.left - cRect.left + container.scrollLeft;
      const targetLeft = Math.max(0, xInContent - stickyLeftPad);
      container.scrollTo({ left: targetLeft, behavior: "smooth" });
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(run);
    });
  }, [trackerYear, matchData]);

  const getAttendanceClass = (percentage) => {
    if (percentage >= 80) return "attendance-high";
    if (percentage >= 50) return "attendance-medium";
    return "attendance-low";
  };

  // Get match status class for header styling
  const getMatchHeaderClass = (match) => {
    if (match.matchCancelled) return "match-cancelled";
    if (!match.matchPlayed) return "match-pending";
    let classes = "match-played";
    // Add full house styling only for 2026+ seasons
    if (parseInt(trackerYear) >= 2026 && match.isFullHouse) {
      classes += " match-fullhouse";
    }
    return classes;
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

  if (!config.ATTENDANCE?.TRACKER?.enabled) {
    return null;
  }

  return (
    <div className="attendance">
      {/* Year Selector */}
      <div className="sub-tab-nav">
        <div className="attendance-year-selector">
          <label htmlFor="tracker-year-select">Season</label>
          <div className="select-wrapper">
            <select
              id="tracker-year-select"
              value={trackerYear}
              onChange={(e) => setTrackerYear(e.target.value)}
            >
              {trackerYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <span className="select-arrow">▼</span>
          </div>
        </div>
      </div>

      {matchData ? (
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
                
                // Get all match dates (only for played matches, excluding tournaments)
                const matchDates = matchData.matches
                  .filter((match) => match.matchPlayed && !match.matchCancelled && !match.isTournament)
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
                      (m) => (m.date === date || m.id === date) && m.matchPlayed && !m.matchCancelled && !m.isTournament
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
            <span>
              🏠 {playedMatches.filter((m) => m.isFullHouse).length} full house
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
          <div className="attendance-table-container" ref={tableScrollRef}>
            <table className="attendance-table">
              <thead>
                <tr>
                  <th className="player-col sticky-col">Player</th>
                  <th className="stat-col attendance-stat">%</th>
                  {matches.map((match) => {
                    const isFullHouse = parseInt(trackerYear) >= 2026 && match.isFullHouse;
                    const isClickable = config.ATTENDANCE?.TRACKER?.enableFieldViewModal && match.matchPlayed && !match.matchCancelled;
                    return (
                      <th
                        key={match.id}
                        data-match-id={match.id}
                        className={`match-col ${getMatchHeaderClass(match)}${isClickable ? ' clickable' : ''}`}
                        title={`${match.day} - ${match.date}${match.matchCancelled
                          ? " (Cancelled)"
                          : !match.matchPlayed
                            ? " (Not Yet Played)"
                            : isFullHouse
                              ? " (Full House 🏠) - Click to view field"
                              : isClickable
                                ? " - Click to view field"
                                : ""
                          }`}
                        onClick={isClickable ? () => {
                          setSelectedMatch(match);
                          setShowFieldViewModal(true);
                        } : undefined}
                        style={isClickable ? { cursor: 'pointer' } : undefined}
                      >
                        <div className="match-header">
                          {match.matchPlayed && match.scoreline && renderScoreline(match.scoreline)}
                          {/* <span className="match-day">{match.day.slice(0, 3)}</span> */}
                          <span className="match-date">{formatDate(match.date)}</span>
                          {/* {isFullHouse && <span className="fullhouse-badge">🏠</span>} */}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {sortedPlayers.map((player) => {
                  const stats = playerStats.find((s) => s.player === player);
                  return (
                    <tr key={player} className="player-row">
                      <td
                        className="player-name sticky-col"
                        title={lastAttendedLabelByPlayer.get(player)}
                      >
                        {player}
                      </td>
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
            {parseInt(trackerYear) >= 2026 && (
              <span>
                <span className="fullhouse-indicator">🏠</span> Full House
              </span>
            )}
          </div>
        </>
      ) : (
        <div className="attendance-no-data">
          <p>No tracker data available for {trackerYear}</p>
        </div>
      )}

      {/* Field View Modal */}
      {config.ATTENDANCE?.TRACKER?.enableFieldViewModal && showFieldViewModal && selectedMatch && (
        <FieldViewModal
          match={selectedMatch}
          onClose={() => {
            setShowFieldViewModal(false);
            setSelectedMatch(null);
          }}
        />
      )}
    </div>
  );
};

