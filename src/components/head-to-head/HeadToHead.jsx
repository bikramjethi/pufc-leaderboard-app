import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { config } from "../../leaderboard-config.js";
import { getPlayerImage } from "../../utils/playerImages.js";
import "./HeadToHead.css";

// Dynamically import all available match data files
const matchDataModules = import.meta.glob('../../data/attendance-data/20*.json', { eager: true });

// Build matchDataByYear object from imported modules
const matchDataByYear = {};
Object.entries(matchDataModules).forEach(([path, module]) => {
  const yearMatch = path.match(/(\d{4})\.json$/);
  if (yearMatch) {
    matchDataByYear[yearMatch[1]] = module.default;
  }
});

// Get available seasons for the selector
const getSelectableSeasons = () => {
  const configSeasons = config.H2H?.seasons || ["2025", "2026"];
  return Object.keys(matchDataByYear)
    .filter(year => configSeasons.includes(year))
    .sort((a, b) => b - a);
};

// Helper to get valid matches from a year's data
const getValidMatches = (year, requiresBackfill = true) => {
  const data = matchDataByYear[year];
  if (!data?.matches) return [];
  
  return data.matches.filter(m => {
    if (!m.matchPlayed || m.matchCancelled) return false;
    // For 2024 and 2025, check if backfill is required
    if ((year === "2024" || year === "2025") && requiresBackfill && !m.isBackfilled) return false;
    return true;
  });
};

// Helper to check if a player name is trackable
const isTrackablePlayer = (name) => {
  if (!name) return false;
  if (name === 'Others') return false;
  if (/\+\d+$/.test(name)) return false;
  return true;
};

// Helper to get winning team from scoreline
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

// Helper to get all players from a match's attendance
const getPlayersFromAttendance = (attendance) => {
  if (!attendance || typeof attendance !== 'object') return [];
  const players = [];
  Object.entries(attendance).forEach(([team, teamPlayers]) => {
    if (Array.isArray(teamPlayers)) {
      teamPlayers.forEach(player => {
        if (player && player.name) {
          players.push({ ...player, team });
        }
      });
    }
  });
  return players;
};

// Get unique player names from matches with match counts
const getPlayerStats = (matches) => {
  const playerStats = {};
  matches.forEach(match => {
    const players = getPlayersFromAttendance(match.attendance);
    players.forEach(p => {
      if (isTrackablePlayer(p.name)) {
        if (!playerStats[p.name]) {
          playerStats[p.name] = { name: p.name, matches: 0, goals: 0 };
        }
        playerStats[p.name].matches += 1;
        playerStats[p.name].goals += p.goals || 0;
      }
    });
  });
  return Object.values(playerStats).sort((a, b) => b.matches - a.matches);
};

// Player Card Component
const PlayerCard = ({ player, isSelected, onClick, isMini = false }) => {
  const cardClass = `player-card ${isSelected ? 'selected' : ''} ${isMini ? 'mini' : ''}`;
  
  return (
    <div className={cardClass} onClick={onClick}>
      <div className="player-card-image">
        <img src={getPlayerImage(player.name)} alt={player.name} />
        {isSelected && <div className="selected-indicator">✓</div>}
      </div>
      <div className="player-card-info">
        <span className="player-card-name">{player.name}</span>
        {!isMini && (
          <span className="player-card-stats">
            {player.matches} matches • {player.goals} goals
          </span>
        )}
      </div>
    </div>
  );
};

// Carousel Component
const PlayerCarousel = ({ 
  players, 
  selectedPlayer, 
  onSelect, 
  excludePlayer,
  side = 'left' 
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const carouselRef = useRef(null);
  
  // Filter out excluded player
  const availablePlayers = useMemo(() => 
    players.filter(p => p.name !== excludePlayer),
    [players, excludePlayer]
  );
  
  // Find index of selected player
  useEffect(() => {
    if (selectedPlayer) {
      const idx = availablePlayers.findIndex(p => p.name === selectedPlayer);
      if (idx !== -1) {
        setCurrentIndex(idx);
      }
    }
  }, [selectedPlayer, availablePlayers]);
  
  // Visible cards (show 3 on desktop, 1 center + hints on mobile)
  const visibleCount = 3;
  
  const navigate = useCallback((direction) => {
    setCurrentIndex(prev => {
      let newIndex = prev + direction;
      if (newIndex < 0) newIndex = availablePlayers.length - 1;
      if (newIndex >= availablePlayers.length) newIndex = 0;
      return newIndex;
    });
  }, [availablePlayers.length]);
  
  // Touch handlers for mobile swipe
  const minSwipeDistance = 50;
  
  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  
  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };
  
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) navigate(1);
    if (isRightSwipe) navigate(-1);
  };
  
  // Get visible players centered on current index
  const getVisiblePlayers = () => {
    if (availablePlayers.length === 0) return [];
    
    const result = [];
    const halfVisible = Math.floor(visibleCount / 2);
    
    for (let i = -halfVisible; i <= halfVisible; i++) {
      let idx = (currentIndex + i + availablePlayers.length) % availablePlayers.length;
      result.push({
        player: availablePlayers[idx],
        position: i, // -1 = left, 0 = center, 1 = right
        isCenter: i === 0
      });
    }
    
    return result;
  };
  
  const visiblePlayers = getVisiblePlayers();
  const centerPlayer = availablePlayers[currentIndex];
  
  // Auto-select center player
  const handleCenterClick = () => {
    if (centerPlayer) {
      onSelect(centerPlayer.name);
    }
  };
  
  if (availablePlayers.length === 0) {
    return <div className="carousel-empty">No players available</div>;
  }
  
  return (
    <div className={`player-carousel ${side}`}>
      <button 
        className="carousel-nav prev" 
        onClick={() => navigate(-1)}
        aria-label="Previous player"
      >
        ‹
      </button>
      
      <div 
        className="carousel-track"
        ref={carouselRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {visiblePlayers.map(({ player, position, isCenter }) => (
          <div 
            key={player.name}
            className={`carousel-item position-${position} ${isCenter ? 'center' : 'side'}`}
            onClick={() => {
              if (isCenter) {
                handleCenterClick();
              } else {
                navigate(position);
              }
            }}
          >
            <PlayerCard 
              player={player}
              isSelected={selectedPlayer === player.name}
              isMini={!isCenter}
            />
          </div>
        ))}
      </div>
      
      <button 
        className="carousel-nav next" 
        onClick={() => navigate(1)}
        aria-label="Next player"
      >
        ›
      </button>
      
      <div className="carousel-indicator">
        <span className="current">{currentIndex + 1}</span>
        <span className="separator">/</span>
        <span className="total">{availablePlayers.length}</span>
      </div>
    </div>
  );
};

export const HeadToHead = () => {
  const selectableSeasons = getSelectableSeasons();
  const defaultSeason = config.H2H?.defaultSeason || "all";
  
  const [selectedSeason, setSelectedSeason] = useState(defaultSeason);
  const [player1, setPlayer1] = useState("");
  const [player2, setPlayer2] = useState("");

  const requiresBackfill = config.H2H?.requiresBackfill ?? true;

  const h2hMatches = useMemo(() => {
    if (selectedSeason === "all") {
      return selectableSeasons.flatMap(year => getValidMatches(year, requiresBackfill));
    }
    return getValidMatches(selectedSeason, requiresBackfill);
  }, [selectedSeason, selectableSeasons, requiresBackfill]);

  const allPlayerStats = useMemo(() => getPlayerStats(h2hMatches), [h2hMatches]);

  const matchCountLabel = `${h2hMatches.length} matches`;

  const h2hStats = useMemo(() => {
    if (!player1 || !player2 || player1 === player2) {
      return null;
    }

    const stats = {
      player1: { name: player1, wins: 0, losses: 0, draws: 0, goals: 0, matches: 0 },
      player2: { name: player2, wins: 0, losses: 0, draws: 0, goals: 0, matches: 0 },
      together: { wins: 0, losses: 0, draws: 0, matches: 0, goals: 0 },
      matchDetails: [],
    };

    h2hMatches.forEach(match => {
      const players = getPlayersFromAttendance(match.attendance);
      const p1Data = players.find(p => p.name === player1);
      const p2Data = players.find(p => p.name === player2);
      
      if (!p1Data || !p2Data) return;
      
      const winningTeam = getWinningTeam(match.scoreline);
      const sameTeam = p1Data.team === p2Data.team;
      
      const matchDetail = {
        date: match.date,
        day: match.day,
        sameTeam,
        p1Team: p1Data.team,
        p2Team: p2Data.team,
        p1Goals: p1Data.goals || 0,
        p2Goals: p2Data.goals || 0,
        scoreline: match.scoreline,
        result: null,
      };
      
      if (sameTeam) {
        stats.together.matches += 1;
        stats.together.goals += (p1Data.goals || 0) + (p2Data.goals || 0);
        
        if (winningTeam === 'DRAW') {
          stats.together.draws += 1;
          matchDetail.result = 'draw';
        } else if (winningTeam === p1Data.team) {
          stats.together.wins += 1;
          matchDetail.result = 'win';
        } else {
          stats.together.losses += 1;
          matchDetail.result = 'loss';
        }
      } else {
        stats.player1.matches += 1;
        stats.player2.matches += 1;
        stats.player1.goals += p1Data.goals || 0;
        stats.player2.goals += p2Data.goals || 0;
        
        if (winningTeam === 'DRAW') {
          stats.player1.draws += 1;
          stats.player2.draws += 1;
          matchDetail.result = 'draw';
        } else if (winningTeam === p1Data.team) {
          stats.player1.wins += 1;
          stats.player2.losses += 1;
          matchDetail.result = 'p1win';
        } else {
          stats.player1.losses += 1;
          stats.player2.wins += 1;
          matchDetail.result = 'p2win';
        }
      }
      
      stats.matchDetails.push(matchDetail);
    });

    return stats;
  }, [player1, player2, h2hMatches]);

  return (
    <div className="head-to-head">
      {/* Season Selector Header */}
      <div className="h2h-header">
        <div className="h2h-title">
          <h2>⚔️ Head to Head</h2>
          <p className="section-subtitle">
            Swipe or click to select players ({matchCountLabel})
          </p>
        </div>
        <div className="h2h-season-selector">
          <span className="season-label">Season:</span>
          <select 
            value={selectedSeason} 
            onChange={(e) => setSelectedSeason(e.target.value)}
            className="season-select"
          >
            <option value="all">All Time</option>
            {selectableSeasons.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Carousel Player Selection */}
      <div className="h2h-carousel-container">
        <div className="carousel-side left-carousel">
          <div className="carousel-label">Player 1</div>
          <PlayerCarousel
            players={allPlayerStats}
            selectedPlayer={player1}
            onSelect={setPlayer1}
            excludePlayer={player2}
            side="left"
          />
        </div>
        
        <div className="vs-divider">
          <div className="vs-circle">
            <span>VS</span>
          </div>
          {player1 && player2 && (
            <div className="vs-glow"></div>
          )}
        </div>
        
        <div className="carousel-side right-carousel">
          <div className="carousel-label">Player 2</div>
          <PlayerCarousel
            players={allPlayerStats}
            selectedPlayer={player2}
            onSelect={setPlayer2}
            excludePlayer={player1}
            side="right"
          />
        </div>
      </div>

      {/* Comparison Results */}
      {h2hStats && (
        <div className="h2h-results">
          {h2hStats.player1.matches > 0 && (
            <div className="h2h-card versus">
              <h3>⚔️ Against Each Other</h3>
              <div className="h2h-versus-display">
                <div className={`player-stats ${h2hStats.player1.wins > h2hStats.player2.wins ? 'winner' : ''}`}>
                  <img 
                    src={getPlayerImage(player1)} 
                    alt={player1} 
                    className="versus-avatar"
                  />
                  <span className="player-name">{player1}</span>
                  <span className="player-wins">{h2hStats.player1.wins} wins</span>
                  <span className="player-goals">{h2hStats.player1.goals} goals</span>
                </div>
                <div className="versus-center">
                  <span className="draws-count">{h2hStats.player1.draws} draws</span>
                  <span className="matches-count">{h2hStats.player1.matches} matches</span>
                </div>
                <div className={`player-stats ${h2hStats.player2.wins > h2hStats.player1.wins ? 'winner' : ''}`}>
                  <img 
                    src={getPlayerImage(player2)} 
                    alt={player2} 
                    className="versus-avatar"
                  />
                  <span className="player-name">{player2}</span>
                  <span className="player-wins">{h2hStats.player2.wins} wins</span>
                  <span className="player-goals">{h2hStats.player2.goals} goals</span>
                </div>
              </div>
            </div>
          )}

          {h2hStats.together.matches > 0 && (
            <div className="h2h-card together">
              <h3>🤝 Playing Together</h3>
              <div className="together-stats">
                <div className="together-avatars">
                  <img src={getPlayerImage(player1)} alt={player1} />
                  <img src={getPlayerImage(player2)} alt={player2} />
                </div>
                <div className="together-record">
                  <span className="record-win">{h2hStats.together.wins}W</span>
                  <span className="record-draw">{h2hStats.together.draws}D</span>
                  <span className="record-loss">{h2hStats.together.losses}L</span>
                </div>
                <div className="together-details">
                  <span>{h2hStats.together.matches} matches</span>
                  <span>{h2hStats.together.goals} combined goals</span>
                  <span>{((h2hStats.together.wins / h2hStats.together.matches) * 100).toFixed(0)}% win rate</span>
                </div>
              </div>
            </div>
          )}

          {h2hStats.matchDetails.length > 0 && (
            <div className="h2h-card history">
              <h3>📜 Match History</h3>
              <div className="match-history-list">
                {h2hStats.matchDetails
                  .slice()
                  .sort((a, b) => {
                    const [dayA, monthA, yearA] = a.date.split('/').map(Number);
                    const [dayB, monthB, yearB] = b.date.split('/').map(Number);
                    const dateA = new Date(yearA, monthA - 1, dayA);
                    const dateB = new Date(yearB, monthB - 1, dayB);
                    return dateB - dateA;
                  })
                  .map((match, idx) => (
                  <div key={idx} className={`history-item ${match.result}`}>
                    <div className="history-date">
                      <span className="date">{match.date}</span>
                      <span className="day-badge">{match.day}</span>
                    </div>
                    <div className="history-teams">
                      {match.sameTeam ? (
                        <span className="same-team">{player1} & {player2} ({match.p1Team})</span>
                      ) : (
                        <span className="versus-teams">
                          <span className={match.result === 'p1win' ? 'winner' : ''}>{player1} ({match.p1Team})</span>
                          <span className="vs">vs</span>
                          <span className={match.result === 'p2win' ? 'winner' : ''}>{player2} ({match.p2Team})</span>
                        </span>
                      )}
                    </div>
                    <div className="history-score">
                      {match.sameTeam ? (
                        <>
                          <span className="team-score">{match.scoreline[match.p1Team]}</span>
                          <span> - </span>
                          <span className="team-score">
                            {match.scoreline[Object.keys(match.scoreline).find(t => t !== match.p1Team)]}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className={`team-score ${match.result === 'p1win' ? 'winner-score' : ''}`}>
                            {match.scoreline[match.p1Team]}
                          </span>
                          <span> - </span>
                          <span className={`team-score ${match.result === 'p2win' ? 'winner-score' : ''}`}>
                            {match.scoreline[match.p2Team]}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="history-goals">
                      {match.p1Goals > 0 && <span className="goal-badge">{player1}: ⚽{match.p1Goals}</span>}
                      {match.p2Goals > 0 && <span className="goal-badge">{player2}: ⚽{match.p2Goals}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {h2hStats.matchDetails.length === 0 && (
            <div className="no-data-message">
              <p>No matches found where both players participated.</p>
            </div>
          )}
        </div>
      )}

      {(!player1 || !player2) && (
        <div className="selection-prompt">
          <div className="prompt-icon">👆</div>
          <p>Click on a player card to select them</p>
          <p className="prompt-hint">Use arrows or swipe to browse players</p>
        </div>
      )}
    </div>
  );
};
