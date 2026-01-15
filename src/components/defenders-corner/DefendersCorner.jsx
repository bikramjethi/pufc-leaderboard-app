import { useState, useMemo } from "react";
import { config } from "../../leaderboard-config.js";
import { getPlayerImage } from "../../utils/playerImages.js";
import "./DefendersCorner.css";

// Dynamically import all available match data files
const matchDataModules = import.meta.glob('../../data/attendance-data/20*.json', { eager: true });
const leaderboardDataModules = import.meta.glob('../../data/leaderboard-data/20*.json', { eager: true });

// Build data objects
const matchDataByYear = {};
Object.entries(matchDataModules).forEach(([path, module]) => {
  const yearMatch = path.match(/(\d{4})\.json$/);
  if (yearMatch) {
    matchDataByYear[yearMatch[1]] = module.default;
  }
});

const leaderboardDataByYear = {};
Object.entries(leaderboardDataModules).forEach(([path, module]) => {
  const yearMatch = path.match(/(\d{4})\.json$/);
  if (yearMatch) {
    leaderboardDataByYear[yearMatch[1]] = module.default;
  }
});

// Get configured seasons
const getLeaderboardSeasons = () => config.DEFENDERS_CORNER?.seasons || ["2024", "2025", "2026"];
const getTrackerSeasons = () => config.DEFENDERS_CORNER?.trackerSeasons || ["2025", "2026"];
const getDefenderPositions = () => config.DEFENDERS_CORNER?.defenderPositions || ["DEF", "GK", "CB", "LB", "RB", "LWB", "RWB"];

// Helper to check if a position string indicates a defender
const isDefenderPosition = (positionStr) => {
  if (!positionStr) return false;
  const defPositions = getDefenderPositions();
  const positions = positionStr.toUpperCase().split('/');
  return positions.some(p => defPositions.includes(p.trim()));
};

// Helper to get valid matches
const getValidMatches = (year) => {
  const data = matchDataByYear[year];
  if (!data?.matches) return [];
  return data.matches.filter(m => m.matchPlayed && !m.matchCancelled);
};

// Helper to get winning team
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

// Get players from attendance
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

// Helper to check if trackable
const isTrackablePlayer = (name) => {
  if (!name) return false;
  if (name === 'Others') return false;
  if (/\+\d+$/.test(name)) return false;
  return true;
};

export const DefendersCorner = () => {
  const leaderboardSeasons = getLeaderboardSeasons();
  const trackerSeasons = getTrackerSeasons();
  const minMatches = config.DEFENDERS_CORNER?.minMatches || 5;
  
  const [selectedSeason, setSelectedSeason] = useState(config.DEFENDERS_CORNER?.defaultSeason || "all");
  const [activeTab, setActiveTab] = useState("least-conceded");

  // ==================== TRACKER DATA (for Least Conceded & Duos) ====================
  const allTrackerMatches = useMemo(() => {
    const seasonsToUse = selectedSeason === "all" 
      ? trackerSeasons 
      : trackerSeasons.includes(selectedSeason) ? [selectedSeason] : [];
    return seasonsToUse.flatMap(year => getValidMatches(year));
  }, [selectedSeason, trackerSeasons]);

  // Defender stats from tracker data (for goals conceded calculation)
  const defenderTrackerStats = useMemo(() => {
    const playerStats = {};

    allTrackerMatches.forEach(match => {
      const players = getPlayersFromAttendance(match.attendance);
      const winningTeam = getWinningTeam(match.scoreline);
      
      players.forEach(player => {
        if (!isTrackablePlayer(player.name)) return;
        if (!isDefenderPosition(player.position)) return;

        const team = player.team;
        const oppTeam = Object.keys(match.scoreline).find(t => t !== team);
        const goalsConceded = oppTeam ? (match.scoreline[oppTeam] || 0) : 0;
        const isWin = winningTeam === team;

        if (!playerStats[player.name]) {
          playerStats[player.name] = {
            name: player.name,
            matches: 0,
            wins: 0,
            goals: 0,
            goalsConceded: 0,
            position: player.position || 'DEF',
          };
        }

        playerStats[player.name].matches += 1;
        playerStats[player.name].goals += player.goals || 0;
        playerStats[player.name].goalsConceded += goalsConceded;
        if (isWin) playerStats[player.name].wins += 1;
      });
    });

    return Object.values(playerStats)
      .filter(p => p.matches >= minMatches)
      .map(p => ({
        ...p,
        avgConceded: p.matches > 0 ? (p.goalsConceded / p.matches).toFixed(2) : 0,
      }));
  }, [allTrackerMatches, minMatches]);

  // ==================== LEADERBOARD DATA (for Win Rate, Top Scorers, Most Wins) ====================
  const defenderLeaderboardStats = useMemo(() => {
    const seasonsToUse = selectedSeason === "all" ? leaderboardSeasons : [selectedSeason];
    const playerStats = {};

    seasonsToUse.forEach(year => {
      const yearData = leaderboardDataByYear[year];
      if (!yearData) return;

      yearData.forEach(player => {
        if (player.name === 'Others') return;
        
        const positionStr = Array.isArray(player.position) 
          ? player.position.join('/') 
          : player.position || '';
        
        if (!isDefenderPosition(positionStr)) return;

        if (!playerStats[player.name]) {
          playerStats[player.name] = {
            name: player.name,
            matches: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            goals: 0,
            ownGoals: 0,
            position: positionStr,
          };
        }

        playerStats[player.name].matches += player.matches || 0;
        playerStats[player.name].wins += player.wins || 0;
        playerStats[player.name].draws += player.draws || 0;
        playerStats[player.name].losses += player.losses || 0;
        playerStats[player.name].goals += player.goals || 0;
        playerStats[player.name].ownGoals += player.ownGoals || 0;
      });
    });

    return Object.values(playerStats)
      .filter(p => p.matches >= minMatches)
      .map(p => ({
        ...p,
        winPct: p.matches > 0 ? ((p.wins / p.matches) * 100).toFixed(1) : 0,
        goalsPerMatch: p.matches > 0 ? (p.goals / p.matches).toFixed(2) : 0,
      }));
  }, [selectedSeason, leaderboardSeasons, minMatches]);

  // ==================== DEFENSIVE DUOS FROM TRACKER DATA ====================
  const defensiveDuos = useMemo(() => {
    const duoStats = {};

    allTrackerMatches.forEach(match => {
      const players = getPlayersFromAttendance(match.attendance);
      const winningTeam = getWinningTeam(match.scoreline);
      
      // Group by team
      const teams = {};
      players.forEach(p => {
        if (!isTrackablePlayer(p.name)) return;
        if (!teams[p.team]) teams[p.team] = [];
        teams[p.team].push(p);
      });

      // For each team, find defender pairs
      Object.entries(teams).forEach(([team, teamPlayers]) => {
        const defenders = teamPlayers.filter(p => 
          isDefenderPosition(p.position) || p.position?.toUpperCase().includes('B')
        );

        if (defenders.length < 2) return;

        const oppTeam = Object.keys(match.scoreline).find(t => t !== team);
        const goalsConceded = oppTeam ? (match.scoreline[oppTeam] || 0) : 0;
        const isWin = winningTeam === team;

        // Create pairs
        for (let i = 0; i < defenders.length; i++) {
          for (let j = i + 1; j < defenders.length; j++) {
            const key = [defenders[i].name, defenders[j].name].sort().join('|');
            
            if (!duoStats[key]) {
              duoStats[key] = {
                player1: [defenders[i].name, defenders[j].name].sort()[0],
                player2: [defenders[i].name, defenders[j].name].sort()[1],
                matches: 0,
                wins: 0,
                goalsConceded: 0,
                goalsScored: 0,
              };
            }
            
            duoStats[key].matches += 1;
            duoStats[key].goalsConceded += goalsConceded;
            duoStats[key].goalsScored += (defenders[i].goals || 0) + (defenders[j].goals || 0);
            if (isWin) duoStats[key].wins += 1;
          }
        }
      });
    });

    return Object.values(duoStats)
      .filter(d => d.matches >= 3)
      .map(d => ({
        ...d,
        winRate: ((d.wins / d.matches) * 100).toFixed(1),
        avgConceded: (d.goalsConceded / d.matches).toFixed(2),
        goalsPerMatch: (d.goalsScored / d.matches).toFixed(2),
      }));
  }, [allTrackerMatches]);

  // ==================== OWN GOAL LEADERS (ALL PLAYERS - FROM LEADERBOARD DATA) ====================
  const ownGoalLeaders = useMemo(() => {
    const seasonsToUse = selectedSeason === "all" ? leaderboardSeasons : [selectedSeason];
    const playerStats = {};

    seasonsToUse.forEach(year => {
      const yearData = leaderboardDataByYear[year];
      if (!yearData) return;

      yearData.forEach(player => {
        if (player.name === 'Others') return;
        if (!player.ownGoals || player.ownGoals === 0) return;

        const positionStr = Array.isArray(player.position) 
          ? player.position.join('/') 
          : player.position || '';

        if (!playerStats[player.name]) {
          playerStats[player.name] = {
            name: player.name,
            ownGoals: 0,
            matches: 0,
            position: positionStr,
          };
        }

        playerStats[player.name].ownGoals += player.ownGoals || 0;
        playerStats[player.name].matches += player.matches || 0;
      });
    });

    return Object.values(playerStats)
      .filter(p => p.ownGoals > 0)
      .sort((a, b) => b.ownGoals - a.ownGoals)
      .slice(0, 15);
  }, [selectedSeason, leaderboardSeasons]);

  // ==================== SORTED STATS ====================
  
  // Least goals conceded on avg (TRACKER DATA)
  const leastConceded = useMemo(() => {
    return [...defenderTrackerStats]
      .sort((a, b) => parseFloat(a.avgConceded) - parseFloat(b.avgConceded) || b.matches - a.matches)
      .slice(0, 15);
  }, [defenderTrackerStats]);

  // Most scoring defenders (LEADERBOARD DATA)
  const topScoringDefenders = useMemo(() => {
    return [...defenderLeaderboardStats]
      .filter(p => p.goals > 0)
      .sort((a, b) => b.goals - a.goals || parseFloat(b.goalsPerMatch) - parseFloat(a.goalsPerMatch))
      .slice(0, 15);
  }, [defenderLeaderboardStats]);

  // Highest win % defenders (LEADERBOARD DATA)
  const highestWinPct = useMemo(() => {
    return [...defenderLeaderboardStats]
      .sort((a, b) => parseFloat(b.winPct) - parseFloat(a.winPct) || b.wins - a.wins)
      .slice(0, 15);
  }, [defenderLeaderboardStats]);

  // Most wins defenders (LEADERBOARD DATA)
  const mostWins = useMemo(() => {
    return [...defenderLeaderboardStats]
      .sort((a, b) => b.wins - a.wins || parseFloat(b.winPct) - parseFloat(a.winPct))
      .slice(0, 15);
  }, [defenderLeaderboardStats]);

  // Duo stats sorted (TRACKER DATA)
  const duosByLeastConceded = useMemo(() => {
    return [...defensiveDuos]
      .sort((a, b) => parseFloat(a.avgConceded) - parseFloat(b.avgConceded) || b.matches - a.matches)
      .slice(0, 10);
  }, [defensiveDuos]);

  const duosByScoring = useMemo(() => {
    return [...defensiveDuos]
      .filter(d => d.goalsScored > 0)
      .sort((a, b) => b.goalsScored - a.goalsScored)
      .slice(0, 10);
  }, [defensiveDuos]);

  const duosByWinPct = useMemo(() => {
    return [...defensiveDuos]
      .sort((a, b) => parseFloat(b.winRate) - parseFloat(a.winRate) || b.wins - a.wins)
      .slice(0, 10);
  }, [defensiveDuos]);

  const duosByWins = useMemo(() => {
    return [...defensiveDuos]
      .sort((a, b) => b.wins - a.wins)
      .slice(0, 10);
  }, [defensiveDuos]);

  // Tabs configuration
  const tabs = [
    { id: "least-conceded", label: "🧱 Least Conceded", icon: "🧱", source: "tracker" },
    { id: "top-scorers", label: "⚽ Top Scorers", icon: "⚽", source: "leaderboard" },
    { id: "win-rate", label: "📈 Win Rate", icon: "📈", source: "leaderboard" },
    { id: "most-wins", label: "🏆 Most Wins", icon: "🏆", source: "leaderboard" },
    { id: "duos", label: "🤝 Duos", icon: "🤝", source: "tracker" },
    { id: "own-goals", label: "😅 OG Leaders", icon: "😅", source: "leaderboard" },
  ];

  if (!config.DEFENDERS_CORNER?.enabled) return null;

  const seasonLabel = selectedSeason === "all" ? "All Time" : selectedSeason;
  const trackerMatchCount = allTrackerMatches.length;
  const leaderboardPlayerCount = defenderLeaderboardStats.length;

  // Get data source label for current tab
  const currentTabSource = tabs.find(t => t.id === activeTab)?.source;
  const dataSourceLabel = currentTabSource === "tracker" 
    ? `${trackerMatchCount} tracked matches` 
    : `${leaderboardPlayerCount} defenders`;

  return (
    <div className="defenders-corner">
      <div className="dc-header">
        <div className="dc-title">
          <h2>🛡️ Defenders Corner</h2>
          <p className="dc-subtitle">
            Where the real heroes are celebrated • {seasonLabel}
          </p>
        </div>
        <div className="dc-season-selector">
          <span className="season-label">Season:</span>
          <select 
            value={selectedSeason} 
            onChange={(e) => setSelectedSeason(e.target.value)}
            className="season-select"
          >
            <option value="all">All Time</option>
            {leaderboardSeasons.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="dc-nav">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`dc-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label.split(' ').slice(1).join(' ')}</span>
          </button>
        ))}
      </div>

      <div className="dc-data-source">
        <span className="source-badge">{dataSourceLabel}</span>
      </div>

      <div className="dc-content">
        {/* LEAST GOALS CONCEDED (TRACKER DATA) */}
        {activeTab === "least-conceded" && (
          <div className="dc-section">
            <div className="section-intro">
              <h3>🧱 Least Goals Conceded (Avg)</h3>
              <p>Defenders who let in the fewest goals per match</p>
            </div>
            
            {leastConceded.length >= 3 ? (
              <>
                <div className="dc-podium">
                  {leastConceded.slice(0, 3).map((p, idx) => (
                    <div key={p.name} className={`podium-card position-${idx + 1}`}>
                      <div className="podium-medal">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</div>
                      <div className="podium-image">
                        <img src={getPlayerImage(p.name)} alt={p.name} />
                      </div>
                      <div className="podium-name">{p.name}</div>
                      <div className="podium-position">{p.position}</div>
                      <div className="podium-stat-main">
                        <span className="stat-value">{p.avgConceded}</span>
                        <span className="stat-label">Goals/Match</span>
                      </div>
                      <div className="podium-stat-sub">{p.goalsConceded} total conceded</div>
                      <div className="podium-matches">{p.matches} matches</div>
                    </div>
                  ))}
                </div>

                {leastConceded.length > 3 && (
                  <div className="dc-table">
                    <div className="dc-table-header">
                      <span className="col-rank">#</span>
                      <span className="col-player">Player</span>
                      <span className="col-pos">Pos</span>
                      <span className="col-stat">Avg</span>
                      <span className="col-total">Total</span>
                      <span className="col-matches">M</span>
                    </div>
                    {leastConceded.slice(3).map((p, idx) => (
                      <div key={p.name} className="dc-table-row">
                        <span className="col-rank">{idx + 4}</span>
                        <span className="col-player">{p.name}</span>
                        <span className="col-pos">{p.position}</span>
                        <span className="col-stat">{p.avgConceded}</span>
                        <span className="col-total">{p.goalsConceded}</span>
                        <span className="col-matches">{p.matches}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="no-data">
                <p>Not enough tracker data for this season (min {minMatches} matches)</p>
              </div>
            )}
          </div>
        )}

        {/* TOP SCORING DEFENDERS (LEADERBOARD DATA) */}
        {activeTab === "top-scorers" && (
          <div className="dc-section">
            <div className="section-intro">
              <h3>⚽ Top Scoring Defenders</h3>
              <p>The unlikely goal-scorers from the back line</p>
            </div>
            
            {topScoringDefenders.length >= 3 ? (
              <>
                <div className="dc-podium">
                  {topScoringDefenders.slice(0, 3).map((p, idx) => (
                    <div key={p.name} className={`podium-card position-${idx + 1}`}>
                      <div className="podium-medal">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</div>
                      <div className="podium-image">
                        <img src={getPlayerImage(p.name)} alt={p.name} />
                      </div>
                      <div className="podium-name">{p.name}</div>
                      <div className="podium-position">{p.position}</div>
                      <div className="podium-stat-main">
                        <span className="stat-value">{p.goals}</span>
                        <span className="stat-label">Goals</span>
                      </div>
                      <div className="podium-stat-sub">{p.goalsPerMatch} per match</div>
                      <div className="podium-matches">{p.matches} matches</div>
                    </div>
                  ))}
                </div>

                {topScoringDefenders.length > 3 && (
                  <div className="dc-table">
                    <div className="dc-table-header">
                      <span className="col-rank">#</span>
                      <span className="col-player">Player</span>
                      <span className="col-pos">Pos</span>
                      <span className="col-stat">Goals</span>
                      <span className="col-total">GPM</span>
                      <span className="col-matches">M</span>
                    </div>
                    {topScoringDefenders.slice(3).map((p, idx) => (
                      <div key={p.name} className="dc-table-row">
                        <span className="col-rank">{idx + 4}</span>
                        <span className="col-player">{p.name}</span>
                        <span className="col-pos">{p.position}</span>
                        <span className="col-stat">{p.goals}</span>
                        <span className="col-total">{p.goalsPerMatch}</span>
                        <span className="col-matches">{p.matches}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="no-data">
                <p>No goals from defenders in this period</p>
              </div>
            )}
          </div>
        )}

        {/* WIN RATE (LEADERBOARD DATA) */}
        {activeTab === "win-rate" && (
          <div className="dc-section">
            <div className="section-intro">
              <h3>📈 Highest Win Rate</h3>
              <p>Defenders whose teams win the most</p>
            </div>
            
            {highestWinPct.length >= 3 ? (
              <>
                <div className="dc-podium">
                  {highestWinPct.slice(0, 3).map((p, idx) => (
                    <div key={p.name} className={`podium-card position-${idx + 1}`}>
                      <div className="podium-medal">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</div>
                      <div className="podium-image">
                        <img src={getPlayerImage(p.name)} alt={p.name} />
                      </div>
                      <div className="podium-name">{p.name}</div>
                      <div className="podium-position">{p.position}</div>
                      <div className="podium-stat-main">
                        <span className="stat-value">{p.winPct}%</span>
                        <span className="stat-label">Win Rate</span>
                      </div>
                      <div className="podium-stat-sub">{p.wins}W-{p.draws}D-{p.losses}L</div>
                      <div className="podium-matches">{p.matches} matches</div>
                    </div>
                  ))}
                </div>

                {highestWinPct.length > 3 && (
                  <div className="dc-table">
                    <div className="dc-table-header">
                      <span className="col-rank">#</span>
                      <span className="col-player">Player</span>
                      <span className="col-pos">Pos</span>
                      <span className="col-stat">Win%</span>
                      <span className="col-total">Wins</span>
                      <span className="col-matches">M</span>
                    </div>
                    {highestWinPct.slice(3).map((p, idx) => (
                      <div key={p.name} className="dc-table-row">
                        <span className="col-rank">{idx + 4}</span>
                        <span className="col-player">{p.name}</span>
                        <span className="col-pos">{p.position}</span>
                        <span className="col-stat">{p.winPct}%</span>
                        <span className="col-total">{p.wins}</span>
                        <span className="col-matches">{p.matches}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="no-data">
                <p>Not enough data for this season (min {minMatches} matches)</p>
              </div>
            )}
          </div>
        )}

        {/* MOST WINS (LEADERBOARD DATA) */}
        {activeTab === "most-wins" && (
          <div className="dc-section">
            <div className="section-intro">
              <h3>🏆 Most Wins</h3>
              <p>Defenders with the most victories</p>
            </div>
            
            {mostWins.length >= 3 ? (
              <>
                <div className="dc-podium">
                  {mostWins.slice(0, 3).map((p, idx) => (
                    <div key={p.name} className={`podium-card position-${idx + 1}`}>
                      <div className="podium-medal">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</div>
                      <div className="podium-image">
                        <img src={getPlayerImage(p.name)} alt={p.name} />
                      </div>
                      <div className="podium-name">{p.name}</div>
                      <div className="podium-position">{p.position}</div>
                      <div className="podium-stat-main">
                        <span className="stat-value">{p.wins}</span>
                        <span className="stat-label">Wins</span>
                      </div>
                      <div className="podium-stat-sub">{p.winPct}% win rate</div>
                      <div className="podium-matches">{p.matches} matches</div>
                    </div>
                  ))}
                </div>

                {mostWins.length > 3 && (
                  <div className="dc-table">
                    <div className="dc-table-header">
                      <span className="col-rank">#</span>
                      <span className="col-player">Player</span>
                      <span className="col-pos">Pos</span>
                      <span className="col-stat">Wins</span>
                      <span className="col-total">Win%</span>
                      <span className="col-matches">M</span>
                    </div>
                    {mostWins.slice(3).map((p, idx) => (
                      <div key={p.name} className="dc-table-row">
                        <span className="col-rank">{idx + 4}</span>
                        <span className="col-player">{p.name}</span>
                        <span className="col-pos">{p.position}</span>
                        <span className="col-stat">{p.wins}</span>
                        <span className="col-total">{p.winPct}%</span>
                        <span className="col-matches">{p.matches}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="no-data">
                <p>Not enough data for this season (min {minMatches} matches)</p>
              </div>
            )}
          </div>
        )}

        {/* DEFENSIVE DUOS (TRACKER DATA) */}
        {activeTab === "duos" && (
          <div className="dc-section">
            <div className="section-intro">
              <h3>🤝 Defensive Duos</h3>
              <p>Best defensive partnerships (min 3 matches together)</p>
            </div>
            
            {defensiveDuos.length > 0 ? (
              <div className="duo-categories">
                {/* Least Conceded Duos */}
                <div className="duo-category">
                  <h4>🧱 Tightest Defense (Least Conceded)</h4>
                  <div className="duo-grid">
                    {duosByLeastConceded.slice(0, 5).map((duo, idx) => (
                      <div key={`${duo.player1}-${duo.player2}`} className={`duo-card ${idx === 0 ? 'top-duo' : ''}`}>
                        <div className="duo-rank">#{idx + 1}</div>
                        <div className="duo-images">
                          <img src={getPlayerImage(duo.player1)} alt={duo.player1} />
                          <img src={getPlayerImage(duo.player2)} alt={duo.player2} />
                        </div>
                        <div className="duo-names">
                          <span>{duo.player1}</span>
                          <span className="amp">&</span>
                          <span>{duo.player2}</span>
                        </div>
                        <div className="duo-main-stat">
                          <span className="stat-value">{duo.avgConceded}</span>
                          <span className="stat-label">Goals/Match</span>
                        </div>
                        <div className="duo-matches">{duo.matches} matches</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Scoring Duos */}
                {duosByScoring.length > 0 && (
                  <div className="duo-category">
                    <h4>⚽ Top Scoring Duos</h4>
                    <div className="duo-grid">
                      {duosByScoring.slice(0, 5).map((duo, idx) => (
                        <div key={`${duo.player1}-${duo.player2}`} className={`duo-card ${idx === 0 ? 'top-duo' : ''}`}>
                          <div className="duo-rank">#{idx + 1}</div>
                          <div className="duo-images">
                            <img src={getPlayerImage(duo.player1)} alt={duo.player1} />
                            <img src={getPlayerImage(duo.player2)} alt={duo.player2} />
                          </div>
                          <div className="duo-names">
                            <span>{duo.player1}</span>
                            <span className="amp">&</span>
                            <span>{duo.player2}</span>
                          </div>
                          <div className="duo-main-stat">
                            <span className="stat-value">{duo.goalsScored}</span>
                            <span className="stat-label">Goals</span>
                          </div>
                          <div className="duo-matches">{duo.matches} matches</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Highest Win Rate Duos */}
                <div className="duo-category">
                  <h4>📈 Highest Win Rate</h4>
                  <div className="duo-grid">
                    {duosByWinPct.slice(0, 5).map((duo, idx) => (
                      <div key={`${duo.player1}-${duo.player2}`} className={`duo-card ${idx === 0 ? 'top-duo' : ''}`}>
                        <div className="duo-rank">#{idx + 1}</div>
                        <div className="duo-images">
                          <img src={getPlayerImage(duo.player1)} alt={duo.player1} />
                          <img src={getPlayerImage(duo.player2)} alt={duo.player2} />
                        </div>
                        <div className="duo-names">
                          <span>{duo.player1}</span>
                          <span className="amp">&</span>
                          <span>{duo.player2}</span>
                        </div>
                        <div className="duo-main-stat">
                          <span className="stat-value">{duo.winRate}%</span>
                          <span className="stat-label">Win Rate</span>
                        </div>
                        <div className="duo-matches">{duo.matches} matches • {duo.wins} wins</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Most Wins Duos */}
                <div className="duo-category">
                  <h4>🏆 Most Wins Together</h4>
                  <div className="duo-grid">
                    {duosByWins.slice(0, 5).map((duo, idx) => (
                      <div key={`${duo.player1}-${duo.player2}`} className={`duo-card ${idx === 0 ? 'top-duo' : ''}`}>
                        <div className="duo-rank">#{idx + 1}</div>
                        <div className="duo-images">
                          <img src={getPlayerImage(duo.player1)} alt={duo.player1} />
                          <img src={getPlayerImage(duo.player2)} alt={duo.player2} />
                        </div>
                        <div className="duo-names">
                          <span>{duo.player1}</span>
                          <span className="amp">&</span>
                          <span>{duo.player2}</span>
                        </div>
                        <div className="duo-main-stat">
                          <span className="stat-value">{duo.wins}</span>
                          <span className="stat-label">Wins</span>
                        </div>
                        <div className="duo-matches">{duo.matches} matches • {duo.winRate}% WR</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="no-data">
                <p>Not enough tracker data to identify defensive duos for this period</p>
              </div>
            )}
          </div>
        )}

        {/* OWN GOAL LEADERS - ALL PLAYERS (LEADERBOARD DATA) */}
        {activeTab === "own-goals" && (
          <div className="dc-section">
            <div className="section-intro">
              <h3>😅 Own Goal Leaders</h3>
              <p>The Hall of Unfortunate Moments (all positions)</p>
            </div>
            
            {ownGoalLeaders.length > 0 ? (
              <div className="shame-list">
                {ownGoalLeaders.map((p, idx) => (
                  <div key={p.name} className="shame-card">
                    <div className="shame-rank">#{idx + 1}</div>
                    <div className="shame-image">
                      <img src={getPlayerImage(p.name)} alt={p.name} />
                    </div>
                    <div className="shame-info">
                      <span className="shame-name">{p.name}</span>
                      <span className="shame-position">{p.position}</span>
                    </div>
                    <div className="shame-og">
                      <span className="og-count">{p.ownGoals}</span>
                      <span className="og-label">OG{p.ownGoals > 1 ? 's' : ''}</span>
                    </div>
                    <div className="shame-matches">{p.matches} matches</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-data">
                <p>No own goals recorded! Perfect play! 🎉</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
