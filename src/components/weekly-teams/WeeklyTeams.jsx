import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { config } from "../../leaderboard-config.js";
import "./WeeklyTeams.css";

// Import attendance data dynamically
const attendanceModules = import.meta.glob("../../data/attendance-data/*.json", { eager: true });

// Position coordinates on a football field (percentage-based)
const POSITION_COORDS = {
  team1: {
    GK: { x: 8, y: 50 },
    LB: { x: 22, y: 20 },
    CB: { x: 22, y: 50 },
    RB: { x: 22, y: 80 },
    LWB: { x: 22, y: 15 },
    RWB: { x: 22, y: 85 },
    LM: { x: 36, y: 20 },
    CM: { x: 36, y: 50 },
    RM: { x: 36, y: 80 },
    CDM: { x: 30, y: 50 },
    CAM: { x: 42, y: 50 },
    LW: { x: 44, y: 20 },
    RW: { x: 44, y: 80 },
    ST: { x: 46, y: 50 },
    CF: { x: 46, y: 50 },
  },
  team2: {
    GK: { x: 92, y: 50 },
    RB: { x: 78, y: 20 },
    CB: { x: 78, y: 50 },
    LB: { x: 78, y: 80 },
    RWB: { x: 78, y: 15 },
    LWB: { x: 78, y: 85 },
    RM: { x: 64, y: 20 },
    CM: { x: 64, y: 50 },
    LM: { x: 64, y: 80 },
    CDM: { x: 70, y: 50 },
    CAM: { x: 58, y: 50 },
    RW: { x: 56, y: 20 },
    LW: { x: 56, y: 80 },
    ST: { x: 54, y: 50 },
    CF: { x: 54, y: 50 },
  },
};

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

// Format date for display
const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const parts = dateStr.split(/[-/]/);
  if (parts.length !== 3) return dateStr;
  const [day, month, year] = parts;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${parseInt(day)} ${months[parseInt(month) - 1]}`;
};

// Format date for short display
const formatShortDate = (dateStr) => {
  if (!dateStr) return "";
  const parts = dateStr.split(/[-/]/);
  if (parts.length !== 3) return dateStr;
  const [day, month] = parts;
  return `${day}/${month}`;
};

export const WeeklyTeams = () => {
  const availableSeasons = config.WEEKLY_TEAMS?.seasons || ["2026"];
  const defaultSeason = config.WEEKLY_TEAMS?.defaultSeason || availableSeasons[0];
  
  const [selectedSeason, setSelectedSeason] = useState(defaultSeason);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const carouselRef = useRef(null);
  const matchRefs = useRef({});
  
  // Load attendance data for selected season
  const seasonData = useMemo(() => {
    for (const [key, module] of Object.entries(attendanceModules)) {
      if (key.includes(`/${selectedSeason}.json`)) {
        return module.default || module;
      }
    }
    return null;
  }, [selectedSeason]);

  // Get played matches (including cancelled) sorted by date ascending (oldest first, newest last)
  const matches = useMemo(() => {
    if (!seasonData?.matches) return [];
    
    // Parse date string to Date object for sorting
    const parseDate = (dateStr) => {
      const [day, month, year] = dateStr.split(/[-/]/);
      return new Date(year, parseInt(month) - 1, parseInt(day));
    };
    
    // Get all matches and sort by date ascending (oldest first, newest on right)
    return [...seasonData.matches].sort((a, b) => {
      return parseDate(a.date) - parseDate(b.date);
    });
  }, [seasonData]);

  // Find the index of the latest played match (not cancelled) - will be towards the end
  const latestPlayedMatchIndex = useMemo(() => {
    // Search from the end to find the most recent played match
    for (let i = matches.length - 1; i >= 0; i--) {
      if (matches[i].matchPlayed && !matches[i].matchCancelled) {
        return i;
      }
    }
    return matches.length - 1; // Default to last match
  }, [matches]);

  // Get current match
  const currentMatch = useMemo(() => {
    return matches[currentMatchIndex] || null;
  }, [matches, currentMatchIndex]);

  // Scroll the active match into view
  const scrollToActiveMatch = useCallback((index) => {
    const matchElement = matchRefs.current[index];
    if (matchElement && carouselRef.current) {
      const container = carouselRef.current;
      const elementLeft = matchElement.offsetLeft;
      const elementWidth = matchElement.offsetWidth;
      const containerWidth = container.offsetWidth;
      
      // Calculate scroll position to center the element
      const scrollLeft = elementLeft - (containerWidth / 2) + (elementWidth / 2);
      
      container.scrollTo({
        left: Math.max(0, scrollLeft),
        behavior: 'smooth'
      });
    }
  }, []);

  // Reset to latest played match when season changes
  useEffect(() => {
    setCurrentMatchIndex(latestPlayedMatchIndex);
  }, [selectedSeason, latestPlayedMatchIndex]);

  // Scroll to active match when index changes
  useEffect(() => {
    // Small delay to ensure DOM is updated
    const timer = setTimeout(() => {
      scrollToActiveMatch(currentMatchIndex);
    }, 100);
    return () => clearTimeout(timer);
  }, [currentMatchIndex, scrollToActiveMatch]);

  // Extract teams from match attendance
  const teams = useMemo(() => {
    if (!currentMatch?.attendance) return [];
    
    const teamEntries = Object.entries(currentMatch.attendance);
    return teamEntries.map(([teamColor, players], index) => ({
      color: teamColor,
      players: players || [],
      side: index === 0 ? "team1" : "team2",
      score: currentMatch.scoreline?.[teamColor] ?? 0,
    }));
  }, [currentMatch]);

  // Get position for a player
  const getPlayerPosition = (player, side, playerIndex, totalPlayers) => {
    const pos = player.position?.toUpperCase();
    const coords = POSITION_COORDS[side];
    
    if (pos && coords[pos]) {
      return coords[pos];
    }
    
    // Fallback - spread players vertically if no position
    const yStart = 20;
    const yEnd = 80;
    const yStep = (yEnd - yStart) / Math.max(totalPlayers - 1, 1);
    return {
      x: side === "team1" ? 30 : 70,
      y: yStart + (playerIndex * yStep),
    };
  };

  // Navigate to previous (older) match - left arrow
  const goToPrevMatch = () => {
    if (currentMatchIndex > 0) {
      setCurrentMatchIndex(currentMatchIndex - 1);
    }
  };

  // Navigate to next (newer) match - right arrow
  const goToNextMatch = () => {
    if (currentMatchIndex < matches.length - 1) {
      setCurrentMatchIndex(currentMatchIndex + 1);
    }
  };

  // Handle season change
  const handleSeasonChange = (e) => {
    setSelectedSeason(e.target.value);
  };

  // Check if match was cancelled
  const isCancelled = currentMatch?.matchCancelled;
  const isPlayed = currentMatch?.matchPlayed;
  
  // For seasons prior to 2026, check if match data is backfilled
  const isPriorSeason = parseInt(selectedSeason) < 2026;
  const isBackfilled = currentMatch?.isBackfilled === true;
  const needsBackfill = isPriorSeason && isPlayed && !isCancelled && !isBackfilled;

  return (
    <div className="weekly-teams">
      {/* Header */}
      <div className="wt-header">
        <div className="wt-title">
          <h2>⚽ Weekly Teams</h2>
          <p className="wt-subtitle">Match lineups and player positions</p>
        </div>
        <div className="wt-season-selector">
          <span className="season-label">Season</span>
          <select
            className="season-select"
            value={selectedSeason}
            onChange={handleSeasonChange}
          >
            {availableSeasons.map((season) => (
              <option key={season} value={season}>
                {season}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Match Carousel */}
      {matches.length > 0 ? (
        <>
          <div className="wt-carousel">
            <button
              className="carousel-btn prev"
              onClick={goToPrevMatch}
              disabled={currentMatchIndex <= 0}
              aria-label="Previous match (older)"
            >
              ‹
            </button>
            
            <div className="carousel-matches" ref={carouselRef}>
              {matches.map((match, idx) => {
                const isActive = idx === currentMatchIndex;
                const isCancelledMatch = match.matchCancelled;
                const isPlayedMatch = match.matchPlayed && !match.matchCancelled;
                
                return (
                  <button
                    key={match.id || match.date}
                    ref={(el) => { matchRefs.current[idx] = el; }}
                    className={`carousel-match ${isActive ? "active" : ""} ${isCancelledMatch ? "cancelled" : ""} ${!isPlayedMatch && !isCancelledMatch ? "pending" : ""}`}
                    onClick={() => setCurrentMatchIndex(idx)}
                    title={`${formatDate(match.date)} - ${match.day}${isCancelledMatch ? " (Cancelled)" : ""}${!isPlayedMatch && !isCancelledMatch ? " (Pending)" : ""}`}
                  >
                    <span className="match-date-short">{formatShortDate(match.date)}</span>
                    <span className="match-day-badge">{match.day?.charAt(0)}</span>
                    {isCancelledMatch && <span className="cancelled-badge">✕</span>}
                  </button>
                );
              })}
            </div>
            
            <button
              className="carousel-btn next"
              onClick={goToNextMatch}
              disabled={currentMatchIndex >= matches.length - 1}
              aria-label="Next match (newer)"
            >
              ›
            </button>
          </div>

          {/* Match Info Header */}
          <div className="wt-match-info">
            <div className="match-date-full">
              <span className="date">{formatDate(currentMatch?.date)}</span>
              <span className="day-badge">{currentMatch?.day}</span>
              {currentMatch?.isFullHouse && <span className="fullhouse-badge">🏠 Full House</span>}
            </div>
            
            {!isCancelled && isPlayed && (
              <div className="match-scoreline-header">
                {teams.map((team, idx) => (
                  <span key={team.color} className={`team-score ${getTeamColorClass(team.color)}`}>
                    {team.color} {team.score}
                    {idx === 0 && teams.length > 1 && <span className="score-sep">-</span>}
                  </span>
                ))}
              </div>
            )}
            
            {isCancelled && (
              <div className="match-cancelled-badge">
                <span className="cancelled-icon">⚠️</span>
                <span className="cancelled-text">Match Cancelled</span>
              </div>
            )}
          </div>

          {/* Field View or Cancelled Message or Backfill Message */}
          {isCancelled ? (
            <div className="wt-cancelled-view">
              <div className="cancelled-content">
                <span className="cancelled-emoji">🚫</span>
                <h3>Match Cancelled</h3>
                <p>This match was not played on {formatDate(currentMatch?.date)}</p>
              </div>
            </div>
          ) : needsBackfill ? (
            <div className="wt-cancelled-view">
              <div className="cancelled-content">
                <span className="cancelled-emoji">📋</span>
                <h3>Match data not backfilled yet</h3>
                <p>Lineup data for this match is not available yet</p>
              </div>
            </div>
          ) : isPlayed && teams.length > 0 ? (
            <div className="wt-field-view">
              {/* Football Field */}
              <div className="wt-football-field">
                {/* Field markings */}
                <div className="wt-field-grass">
                  <div className="wt-center-line"></div>
                  <div className="wt-center-circle"></div>
                  <div className="wt-penalty-area left"></div>
                  <div className="wt-penalty-area right"></div>
                  <div className="wt-goal-area left"></div>
                  <div className="wt-goal-area right"></div>
                  <div className="wt-goal left"></div>
                  <div className="wt-goal right"></div>
                </div>

                {/* Players */}
                {teams.map((team) => (
                  team.players.map((player, playerIdx) => {
                    const position = getPlayerPosition(player, team.side, playerIdx, team.players.length);
                    
                    if (!position) return null;
                    
                    const isOnLoan = player.groupStatus === "ONLOAN";
                    const hasGoals = player.goals > 0;
                    const hasOwnGoals = player.ownGoals > 0;
                    const hasCleanSheet = player.cleanSheet;

                    return (
                      <div
                        key={`${team.color}-${player.name}-${playerIdx}`}
                        className={`wt-player-marker ${getTeamColorClass(team.color)} ${isOnLoan ? "onloan" : ""}`}
                        style={{
                          left: `${position.x}%`,
                          top: `${position.y}%`,
                        }}
                        title={`${player.name} (${player.position || "?"})`}
                      >
                        {/* Player circle */}
                        <div className="wt-player-circle">
                          <span className="wt-player-position">{player.position || "?"}</span>
                        </div>
                        
                        {/* Player name */}
                        <div className="wt-player-name-tag">{player.name}</div>
                        
                        {/* Stats badges */}
                        <div className="wt-player-stats-badges">
                          {hasGoals && (
                            <span className="wt-stat-badge goal-stat" title={`${player.goals} goal(s)`}>
                              ⚽ {player.goals}
                            </span>
                          )}
                          {hasCleanSheet && (
                            <span className="wt-stat-badge cs-stat" title="Clean Sheet">
                              🧤
                            </span>
                          )}
                          {hasOwnGoals && (
                            <span className="wt-stat-badge og-stat" title={`${player.ownGoals} own goal(s)`}>
                              OG
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                ))}
              </div>

              {/* Legend */}
              <div className="wt-legend">
                <span className="legend-item">
                  <span className="legend-marker onloan-marker"></span> On Loan
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
          ) : (
            <div className="wt-no-data">
              <p>No lineup data available for this match</p>
            </div>
          )}
        </>
      ) : (
        <div className="wt-no-data">
          <p>No matches found for {selectedSeason} season</p>
        </div>
      )}
    </div>
  );
};

