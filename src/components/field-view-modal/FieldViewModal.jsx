import { useMemo } from "react";
import "./FieldViewModal.css";

// Position coordinates on a football field (percentage-based)
// Field is divided into two halves - team1 on left, team2 on right
const POSITION_COORDS = {
  // Left half (Team 1) - playing left to right
  team1: {
    GK: { x: 8, y: 50 },
    LB: { x: 22, y: 20 },
    CB: { x: 22, y: 50 },
    RB: { x: 22, y: 80 },
    LM: { x: 36, y: 20 },
    CM: { x: 36, y: 50 },
    RM: { x: 36, y: 80 },
    ST: { x: 46, y: 50 },
  },
  // Right half (Team 2) - playing right to left (mirrored)
  team2: {
    GK: { x: 92, y: 50 },
    RB: { x: 78, y: 20 },  // Swapped - RB is on left from their perspective
    CB: { x: 78, y: 50 },
    LB: { x: 78, y: 80 },  // Swapped - LB is on right from their perspective
    RM: { x: 64, y: 20 },  // Swapped
    CM: { x: 64, y: 50 },
    LM: { x: 64, y: 80 },  // Swapped
    ST: { x: 54, y: 50 },
  },
};

// Offset (in percentage) for duplicate positions so players don't overlap
const DUPLICATE_POSITION_OFFSET = 5;

// Get team color class
const getTeamColorClass = (teamColor) => {
  const color = teamColor?.toUpperCase();
  switch (color) {
    case "RED": return "team-red";
    case "BLUE": return "team-blue";
    case "BLACK": return "team-black";
    case "WHITE": return "team-white";
    case "YELLOW": return "team-yellow";
    default: return "team-default";
  }
};

// Format date
const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const [day, month, year] = dateStr.split(/[-/]/);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${parseInt(day)} ${months[parseInt(month) - 1]} ${year}`;
};

export const FieldViewModal = ({ match, onClose }) => {
  // Extract teams from attendance
  const teams = useMemo(() => {
    if (!match?.attendance) return [];
    const team1Rotating = !!match.team1RotatingGoalie;
    const team2Rotating = !!match.team2RotatingGoalie;
    const teamEntries = Object.entries(match.attendance);
    return teamEntries.map(([teamColor, players], index) => ({
      color: teamColor,
      players: Array.isArray(players) ? players : [],
      side: index === 0 ? "team1" : "team2",
      score: match.scoreline?.[teamColor] ?? 0,
      rotatingGoalie: index === 0 ? team1Rotating : team2Rotating,
    }));
  }, [match]);

  // Get base position for a player (no duplicate offset)
  const getPlayerPosition = (player, side) => {
    const pos = player.position?.toUpperCase();
    const coords = POSITION_COORDS[side];
    if (pos && coords[pos]) {
      return { ...coords[pos] };
    }
    return null;
  };

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle escape key
  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div 
      className="field-modal-overlay" 
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
    >
      <div className="field-modal-content">
        {/* Header */}
        <div className="field-modal-header">
          <div className="field-modal-title">
            <span className="match-date">{formatDate(match.date)}</span>
            <span className="match-day">{match.day}</span>
            {match.isFullHouse && <span className="fullhouse-tag">🏠 Full House</span>}
          </div>
          <div className="field-modal-scoreline">
            {teams.map((team, idx) => (
              <span key={team.color} className={`team-score-header ${getTeamColorClass(team.color)}`}>
                {team.color} {team.score}
                {idx === 0 && teams.length > 1 && <span className="vs">-</span>}
              </span>
            ))}
          </div>
          <button className="field-modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Football Field */}
        <div className="football-field">
          {/* Field markings */}
          <div className="field-grass">
            <div className="center-line"></div>
            <div className="center-circle"></div>
            <div className="penalty-area left"></div>
            <div className="penalty-area right"></div>
            <div className="goal-area left"></div>
            <div className="goal-area right"></div>
            <div className="goal left"></div>
            <div className="goal right"></div>
          </div>

          {/* Rotating GK placeholder (only for team with flag set) */}
          {teams.map((team) => {
            if (!team.rotatingGoalie) return null;
            const gkCoords = POSITION_COORDS[team.side].GK;
            return (
              <div
                key={`${team.color}-rotating-gk`}
                className={`player-marker rotating-gk-placeholder ${getTeamColorClass(team.color)}`}
                style={{ left: `${gkCoords.x}%`, top: `${gkCoords.y}%` }}
                title="Rotating goalkeeper"
              >
                <div className="player-circle">
                  <span className="player-position">Rotating GK</span>
                </div>
                <div className="player-name-tag">—</div>
              </div>
            );
          })}

          {/* Players */}
          {teams.map((team) => {
            const posCount = {};
            (team.players || []).forEach((p) => {
              const pos = (p.position || "").toUpperCase();
              if (pos) posCount[pos] = (posCount[pos] || 0) + 1;
            });
            const posIndex = {};
            return (team.players || []).map((player, playerIdx) => {
              if (team.rotatingGoalie && (player.position || "").toUpperCase() === "GK") return null;
              const basePosition = getPlayerPosition(player, team.side);
              if (!basePosition) return null;
              const pos = (player.position || "").toUpperCase();
              const idx = posIndex[pos] ?? 0;
              posIndex[pos] = idx + 1;
              const total = posCount[pos] || 1;
              const offsetY = total > 1 ? (idx - (total - 1) / 2) * DUPLICATE_POSITION_OFFSET : 0;
              const position = { ...basePosition, y: basePosition.y + offsetY };
              const isOnLoan = player.groupStatus === "ONLOAN";
              const isRotatedGoalie = !!player.rotatedGoalie;
              const hasGoals = player.goals > 0;
              const hasOwnGoals = player.ownGoals > 0;
              const hasCleanSheet = player.cleanSheet;

              return (
                <div
                  key={`${team.color}-${player.name}-${playerIdx}`}
                  className={`player-marker ${getTeamColorClass(team.color)} ${isOnLoan ? "onloan" : ""} ${isRotatedGoalie ? "rotated-goalie" : ""}`}
                  style={{
                    left: `${position.x}%`,
                    top: `${position.y}%`,
                  }}
                  title={`${player.name} (${player.position || "?"})${isRotatedGoalie ? " – rotated in goal" : ""}`}
                >
                  {/* Player circle */}
                  <div className="player-circle">
                    <span className="player-position">{player.position || "?"}</span>
                  </div>
                  {/* Player name */}
                  <div className="player-name-tag">{player.name}</div>
                  {/* Rotated GK badge */}
                  {isRotatedGoalie && (
                    <span className="stat-badge rotated-gk-badge" title="Rotated as goalkeeper">
                      RG
                    </span>
                  )}
                  {/* Stats badges */}
                  <div className="player-stats-badges">
                    {hasGoals && (
                      <span className="stat-badge goal-stat" title={`${player.goals} goal(s)`}>
                        ⚽ {player.goals}
                      </span>
                    )}
                    {hasCleanSheet && (
                      <span className="stat-badge cs-stat" title="Clean Sheet">
                        🧤
                      </span>
                    )}
                    {hasOwnGoals && (
                      <span className="stat-badge og-stat" title={`${player.ownGoals} own goal(s)`}>
                        OG
                      </span>
                    )}
                  </div>
                </div>
              );
            });
          })}
        </div>

        {/* Legend */}
        <div className="field-modal-legend">
          <span className="legend-item">
            <span className="legend-marker onloan-legend"></span> On Loan Player
          </span>
          <span className="legend-item">
            <span className="legend-marker rotated-goalie-legend"></span> Rotated GK
          </span>
          <span className="legend-item">
            <span className="legend-icon">⚽</span> Goals
          </span>
          <span className="legend-item">
            <span className="legend-icon">🧤</span> Clean Sheet
          </span>
          <span className="legend-item">
            <span className="legend-badge og">OG</span> Own Goal
          </span>
        </div>
      </div>
    </div>
  );
};

