import { useState, useMemo } from "react";
import { config } from "./leaderboard-config.js";

// Dynamically import all available match data files
// This pattern allows automatic pickup of new season files (2027, 2028, etc.)
const matchDataModules = import.meta.glob('./data/attendance-data/20*.json', { eager: true });

// Build matchDataByYear object from imported modules
const matchDataByYear = {};
Object.entries(matchDataModules).forEach(([path, module]) => {
  const yearMatch = path.match(/(\d{4})\.json$/);
  if (yearMatch) {
    matchDataByYear[yearMatch[1]] = module.default;
  }
});

// Get available seasons from config or discovered files
const getAvailableSeasons = () => {
  const configSeasons = config.FUN_STATS?.seasons || [];
  const discoveredSeasons = Object.keys(matchDataByYear).sort((a, b) => b - a);
  // Use config seasons if specified, otherwise use discovered
  return configSeasons.length > 0 ? configSeasons : discoveredSeasons;
};

// Get H2H seasons (detailed per-match data from 2026+)
const getH2HSeasons = () => {
  const configSeasons = config.FUN_STATS?.headToHeadSeasons || ["2026"];
  return configSeasons.filter(year => matchDataByYear[year]);
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

// Helper to get unique player names across all matches
const getAllPlayerNames = (matches) => {
  const names = new Set();
  matches.forEach(match => {
    if (match.attendance) {
      getPlayersFromAttendance(match.attendance).forEach(p => names.add(p.name));
    }
  });
  return Array.from(names).sort();
};

// Color configuration for display
const colorConfig = {
  RED: { bg: '#dc2626', text: '#fff', name: 'Red' },
  BLUE: { bg: '#2563eb', text: '#fff', name: 'Blue' },
  BLACK: { bg: '#1f2937', text: '#fff', name: 'Black' },
  WHITE: { bg: '#f8fafc', text: '#1f2937', name: 'White', border: '#cbd5e1' },
  YELLOW: { bg: '#eab308', text: '#1f2937', name: 'Yellow' },
};

export const FunStats = () => {
  const availableSeasons = getAvailableSeasons();
  const h2hSeasons = getH2HSeasons();
  
  const [selectedSeason, setSelectedSeason] = useState(
    config.FUN_STATS?.defaultSeason || "all"
  );
  const [activeSubTab, setActiveSubTab] = useState(
    config.FUN_STATS?.enableColorStats ? "color-stats" : "head-to-head"
  );
  const [player1, setPlayer1] = useState("");
  const [player2, setPlayer2] = useState("");

  // Get all matches for selected season(s)
  const allMatches = useMemo(() => {
    if (selectedSeason === "all") {
      return availableSeasons.flatMap(year => 
        (matchDataByYear[year]?.matches || []).filter(m => m.matchPlayed && !m.matchCancelled)
      );
    }
    return (matchDataByYear[selectedSeason]?.matches || []).filter(m => m.matchPlayed && !m.matchCancelled);
  }, [selectedSeason, availableSeasons]);

  // Get H2H matches (only from detailed seasons)
  const h2hMatches = useMemo(() => {
    return h2hSeasons.flatMap(year => 
      (matchDataByYear[year]?.matches || []).filter(m => m.matchPlayed && !m.matchCancelled)
    );
  }, [h2hSeasons]);

  // Get all unique players for H2H selection
  const allPlayers = useMemo(() => getAllPlayerNames(h2hMatches), [h2hMatches]);

  // Calculate color statistics
  const colorStats = useMemo(() => {
    const stats = {};
    
    allMatches.forEach(match => {
      if (!match.scoreline) return;
      
      const teams = Object.keys(match.scoreline);
      const winningTeam = getWinningTeam(match.scoreline);
      
      teams.forEach(team => {
        if (!stats[team]) {
          stats[team] = { wins: 0, losses: 0, draws: 0, goalsFor: 0, goalsAgainst: 0 };
        }
        
        const myScore = match.scoreline[team];
        const oppTeam = teams.find(t => t !== team);
        const oppScore = match.scoreline[oppTeam];
        
        stats[team].goalsFor += myScore;
        stats[team].goalsAgainst += oppScore;
        
        if (winningTeam === 'DRAW') {
          stats[team].draws += 1;
        } else if (winningTeam === team) {
          stats[team].wins += 1;
        } else {
          stats[team].losses += 1;
        }
      });
    });
    
    // Calculate percentages and sort by win rate
    return Object.entries(stats)
      .map(([color, data]) => {
        const total = data.wins + data.losses + data.draws;
        const winPct = total > 0 ? ((data.wins / total) * 100).toFixed(1) : 0;
        const goalDiff = data.goalsFor - data.goalsAgainst;
        return {
          color,
          ...data,
          total,
          winPct: parseFloat(winPct),
          goalDiff,
          goalsPerMatch: total > 0 ? (data.goalsFor / total).toFixed(2) : 0,
        };
      })
      .sort((a, b) => b.winPct - a.winPct);
  }, [allMatches]);

  // Calculate head-to-head stats between two players
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
      
      // Both players must be in the match
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
        // They played together
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
        // They played against each other
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

  const enableColorStats = config.FUN_STATS?.enableColorStats !== false;
  const enableHeadToHead = config.FUN_STATS?.enableHeadToHead !== false;

  if (!config.FUN_STATS?.enabled) {
    return null;
  }

  return (
    <div className="fun-stats">
      {/* Sub-tab Navigation */}
      <div className="fun-stats-nav">
        {enableColorStats && (
          <button
            className={`fun-stats-tab ${activeSubTab === "color-stats" ? "active" : ""}`}
            onClick={() => setActiveSubTab("color-stats")}
          >
            🎨 Color Stats
          </button>
        )}
        {enableHeadToHead && (
          <button
            className={`fun-stats-tab ${activeSubTab === "head-to-head" ? "active" : ""}`}
            onClick={() => setActiveSubTab("head-to-head")}
          >
            ⚔️ Head to Head
          </button>
        )}
        
        {/* Season selector - only for color stats */}
        {activeSubTab === "color-stats" && (
          <div className="fun-stats-season-selector">
            <label htmlFor="fun-stats-season">Season</label>
            <div className="select-wrapper">
              <select
                id="fun-stats-season"
                value={selectedSeason}
                onChange={(e) => setSelectedSeason(e.target.value)}
              >
                <option value="all">All Seasons</option>
                {availableSeasons.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <span className="select-arrow">▼</span>
            </div>
          </div>
        )}
      </div>

      {/* Color Stats View */}
      {activeSubTab === "color-stats" && enableColorStats && (
        <div className="color-stats-section">
          <div className="section-header">
            <h2>🎨 Team Color Win Rates</h2>
            <p className="section-subtitle">
              Which jersey color brings the best luck? ({allMatches.length} matches analyzed)
            </p>
          </div>

          <div className="color-stats-grid">
            {colorStats.map((stat, idx) => {
              const colorCfg = colorConfig[stat.color] || { 
                bg: '#6b7280', text: '#fff', name: stat.color 
              };
              const isTop = idx === 0;
              
              return (
                <div 
                  key={stat.color} 
                  className={`color-stat-card ${isTop ? 'top-color' : ''}`}
                  style={{
                    '--color-bg': colorCfg.bg,
                    '--color-text': colorCfg.text,
                    '--color-border': colorCfg.border || colorCfg.bg,
                  }}
                >
                  <div className="color-badge" style={{ 
                    backgroundColor: colorCfg.bg, 
                    color: colorCfg.text,
                    border: colorCfg.border ? `2px solid ${colorCfg.border}` : 'none'
                  }}>
                    {colorCfg.name}
                    {isTop && <span className="crown">👑</span>}
                  </div>
                  
                  <div className="color-win-rate">
                    <span className="win-pct">{stat.winPct}%</span>
                    <span className="win-label">Win Rate</span>
                  </div>
                  
                  <div className="color-record">
                    <span className="record-item win">{stat.wins}W</span>
                    <span className="record-item draw">{stat.draws}D</span>
                    <span className="record-item loss">{stat.losses}L</span>
                  </div>
                  
                  <div className="color-extra-stats">
                    <div className="extra-stat">
                      <span className="extra-value">{stat.goalsFor}</span>
                      <span className="extra-label">Goals</span>
                    </div>
                    <div className="extra-stat">
                      <span className="extra-value" style={{ color: stat.goalDiff >= 0 ? '#22c55e' : '#ef4444' }}>
                        {stat.goalDiff > 0 ? '+' : ''}{stat.goalDiff}
                      </span>
                      <span className="extra-label">GD</span>
                    </div>
                    <div className="extra-stat">
                      <span className="extra-value">{stat.goalsPerMatch}</span>
                      <span className="extra-label">GPM</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {colorStats.length === 0 && (
            <div className="no-data-message">
              <p>No match data available for the selected season.</p>
            </div>
          )}
        </div>
      )}

      {/* Head to Head View */}
      {activeSubTab === "head-to-head" && enableHeadToHead && (
        <div className="h2h-section">
          <div className="section-header">
            <h2>⚔️ Head to Head</h2>
            <p className="section-subtitle">
              Select two players to compare their record when they face each other
              <br />
              <small>(Using data from {h2hSeasons.join(', ')} • {h2hMatches.length} matches)</small>
            </p>
          </div>

          <div className="h2h-selectors">
            <div className="player-selector">
              <label htmlFor="player1-select">Player 1</label>
              <div className="select-wrapper">
                <select
                  id="player1-select"
                  value={player1}
                  onChange={(e) => setPlayer1(e.target.value)}
                >
                  <option value="">Select player...</option>
                  {allPlayers.filter(p => p !== player2).map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                <span className="select-arrow">▼</span>
              </div>
            </div>

            <div className="vs-badge">VS</div>

            <div className="player-selector">
              <label htmlFor="player2-select">Player 2</label>
              <div className="select-wrapper">
                <select
                  id="player2-select"
                  value={player2}
                  onChange={(e) => setPlayer2(e.target.value)}
                >
                  <option value="">Select player...</option>
                  {allPlayers.filter(p => p !== player1).map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                <span className="select-arrow">▼</span>
              </div>
            </div>
          </div>

          {h2hStats && (
            <div className="h2h-results">
              {/* Against Each Other */}
              {h2hStats.player1.matches > 0 && (
                <div className="h2h-card versus">
                  <h3>⚔️ Against Each Other</h3>
                  <div className="h2h-versus-display">
                    <div className={`player-stats ${h2hStats.player1.wins > h2hStats.player2.wins ? 'winner' : ''}`}>
                      <span className="player-name">{player1}</span>
                      <span className="player-wins">{h2hStats.player1.wins} wins</span>
                      <span className="player-goals">{h2hStats.player1.goals} goals</span>
                    </div>
                    <div className="versus-center">
                      <span className="draws-count">{h2hStats.player1.draws} draws</span>
                      <span className="matches-count">{h2hStats.player1.matches} matches</span>
                    </div>
                    <div className={`player-stats ${h2hStats.player2.wins > h2hStats.player1.wins ? 'winner' : ''}`}>
                      <span className="player-name">{player2}</span>
                      <span className="player-wins">{h2hStats.player2.wins} wins</span>
                      <span className="player-goals">{h2hStats.player2.goals} goals</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Playing Together */}
              {h2hStats.together.matches > 0 && (
                <div className="h2h-card together">
                  <h3>🤝 Playing Together</h3>
                  <div className="together-stats">
                    <div className="together-record">
                      <span className="record-win">{h2hStats.together.wins}W</span>
                      <span className="record-draw">{h2hStats.together.draws}D</span>
                      <span className="record-loss">{h2hStats.together.losses}L</span>
                    </div>
                    <div className="together-details">
                      <span>{h2hStats.together.matches} matches</span>
                      <span>{h2hStats.together.goals} combined goals</span>
                      <span>
                        {((h2hStats.together.wins / h2hStats.together.matches) * 100).toFixed(0)}% win rate
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Match History */}
              {h2hStats.matchDetails.length > 0 && (
                <div className="h2h-card history">
                  <h3>📜 Match History</h3>
                  <div className="match-history-list">
                    {h2hStats.matchDetails.slice().reverse().map((match, idx) => (
                      <div key={idx} className={`history-item ${match.result}`}>
                        <div className="history-date">
                          <span className="date">{match.date}</span>
                          <span className="day-badge">{match.day}</span>
                        </div>
                        <div className="history-teams">
                          {match.sameTeam ? (
                            <span className="same-team">
                              {player1} & {player2} ({match.p1Team})
                            </span>
                          ) : (
                            <span className="versus-teams">
                              <span className={match.result === 'p1win' ? 'winner' : ''}>
                                {player1} ({match.p1Team})
                              </span>
                              <span className="vs">vs</span>
                              <span className={match.result === 'p2win' ? 'winner' : ''}>
                                {player2} ({match.p2Team})
                              </span>
                            </span>
                          )}
                        </div>
                        <div className="history-score">
                          {Object.entries(match.scoreline).map(([team, score], i) => (
                            <span key={team}>
                              {i > 0 && ' - '}
                              <span className="team-score">{score}</span>
                            </span>
                          ))}
                        </div>
                        <div className="history-goals">
                          {match.p1Goals > 0 && (
                            <span className="goal-badge">{player1}: ⚽{match.p1Goals}</span>
                          )}
                          {match.p2Goals > 0 && (
                            <span className="goal-badge">{player2}: ⚽{match.p2Goals}</span>
                          )}
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
            <div className="no-data-message">
              <p>Select two players to see their head-to-head record.</p>
            </div>
          )}

          {player1 && player2 && player1 === player2 && (
            <div className="no-data-message">
              <p>Please select two different players.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

