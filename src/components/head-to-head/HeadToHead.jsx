import { useState, useMemo } from "react";
import { config } from "../../leaderboard-config.js";
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
    // For 2025, check if backfill is required
    if (year === "2025" && requiresBackfill && !m.isBackfilled) return false;
    return true;
  });
};

// Helper to check if a player name is trackable (not "Others" or patterns like "David+1")
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

// Get unique player names from matches
const getAllPlayerNames = (matches) => {
  const names = new Set();
  matches.forEach(match => {
    const players = getPlayersFromAttendance(match.attendance);
    players.forEach(p => {
      if (isTrackablePlayer(p.name)) {
        names.add(p.name);
      }
    });
  });
  return Array.from(names).sort();
};

export const HeadToHead = () => {
  const selectableSeasons = getSelectableSeasons();
  const defaultSeason = config.H2H?.defaultSeason || "all";
  
  const [selectedSeason, setSelectedSeason] = useState(defaultSeason);
  const [player1, setPlayer1] = useState("");
  const [player2, setPlayer2] = useState("");

  // Get backfill requirement from config
  const requiresBackfill = config.H2H?.requiresBackfill ?? true;

  // Get matches based on selected season
  const h2hMatches = useMemo(() => {
    if (selectedSeason === "all") {
      return selectableSeasons.flatMap(year => getValidMatches(year, requiresBackfill));
    }
    return getValidMatches(selectedSeason, requiresBackfill);
  }, [selectedSeason, selectableSeasons, requiresBackfill]);

  // All players for selection
  const allPlayers = useMemo(() => getAllPlayerNames(h2hMatches), [h2hMatches]);

  // Match count label
  const matchCountLabel = `${h2hMatches.length} matches`;

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

      <div className="h2h-content">
        <div className="section-header">
          <h2>⚔️ Head to Head</h2>
          <p className="section-subtitle">
            Select two players to compare their record ({matchCountLabel})
          </p>
        </div>

        <div className="h2h-selectors">
          <div className="player-selector">
            <label htmlFor="player1-select">Player 1</label>
            <div className="select-wrapper">
              <select id="player1-select" value={player1} onChange={(e) => setPlayer1(e.target.value)}>
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
              <select id="player2-select" value={player2} onChange={(e) => setPlayer2(e.target.value)}>
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
                      // Parse DD/MM/YYYY format and sort descending (most recent first)
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
                          // When on same team, show their team score vs opponent score
                          <>
                            <span className="team-score">{match.scoreline[match.p1Team]}</span>
                            <span> - </span>
                            <span className="team-score">
                              {match.scoreline[Object.keys(match.scoreline).find(t => t !== match.p1Team)]}
                            </span>
                          </>
                        ) : (
                          // When opposing, show player1's team score first, then player2's
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
          <div className="no-data-message">
            <p>Select two players to see their head-to-head record.</p>
          </div>
        )}
      </div>
    </div>
  );
};

