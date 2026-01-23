import { useState, useMemo } from "react";
import { config } from "../../leaderboard-config.js";
import "./FunStats.css";

// Dynamically import all available match data files
// This pattern allows automatic pickup of new season files (2027, 2028, etc.)
const matchDataModules = import.meta.glob('../../data/attendance-data/20*.json', { eager: true });

// Build matchDataByYear object from imported modules
const matchDataByYear = {};
Object.entries(matchDataModules).forEach(([path, module]) => {
  const yearMatch = path.match(/(\d{4})\.json$/);
  if (yearMatch) {
    matchDataByYear[yearMatch[1]] = module.default;
  }
});

// Get available seasons for the selector (2024+ that have data)
const getSelectableSeasons = () => {
  return Object.keys(matchDataByYear)
    .filter(year => parseInt(year) >= 2024)
    .sort((a, b) => b - a);
};

// Helper to get valid matches from a year's data
// requiresBackfill: if true, 2024 and 2025 data must have isBackfilled: true
const getValidMatches = (year, requiresBackfill = true) => {
  const data = matchDataByYear[year];
  if (!data?.matches) return [];
  
  return data.matches.filter(m => {
    if (!m.matchPlayed || m.matchCancelled) return false;
    // Skip tournament matches (round-robin days with no individual stats)
    if (m.isTournament) return false;
    // For 2024 and 2025, check if backfill is required
    if ((year === "2024" || year === "2025") && requiresBackfill && !m.isBackfilled) return false;
    return true;
  });
};

// Helper to check if a player name is trackable (not "Others" or patterns like "David+1")
const isTrackablePlayer = (name) => {
  if (!name) return false;
  if (name === 'Others') return false;
  // Skip patterns like "David+1", "Ashish+2" etc.
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

// Helper to check if match is close (≤2 goal margin, including draws)
const isCloseMatch = (scoreline) => {
  if (!scoreline || typeof scoreline !== 'object') return false;
  const scores = Object.values(scoreline);
  if (scores.length !== 2) return false;
  return Math.abs(scores[0] - scores[1]) <= 2;
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

// Color configuration for display
const colorConfig = {
  RED: { bg: '#dc2626', text: '#fff', name: 'Red' },
  BLUE: { bg: '#2563eb', text: '#fff', name: 'Blue' },
  BLACK: { bg: '#1f2937', text: '#fff', name: 'Black' },
  WHITE: { bg: '#f8fafc', text: '#1f2937', name: 'White', border: '#cbd5e1' },
  YELLOW: { bg: '#eab308', text: '#1f2937', name: 'Yellow' },
};

export const FunStats = () => {
  const selectableSeasons = getSelectableSeasons();
  
  const [selectedSeason, setSelectedSeason] = useState("all");
  
  // Determine first enabled tab
  const getDefaultTab = () => {
    if (config.FUN_STATS?.enableColorStats) return "color-stats";
    if (config.FUN_STATS?.enableHotStreaks) return "hot-streaks";
    if (config.FUN_STATS?.enableDreamTeamDuos) return "dream-duos";
    if (config.FUN_STATS?.enableClutchFactor) return "clutch-factor";
    return "color-stats";
  };
  
  const [activeSubTab, setActiveSubTab] = useState(getDefaultTab());

  // Get backfill requirements from config
  const backfillReqs = config.FUN_STATS?.requiresBackfill || {};

  // Matches for different features based on their backfill requirements
  const colorStatsMatches = useMemo(() => {
    const req = backfillReqs.colorStats ?? false;
    if (selectedSeason === "all") {
      return selectableSeasons.flatMap(year => getValidMatches(year, req));
    }
    return getValidMatches(selectedSeason, req);
  }, [selectedSeason, selectableSeasons, backfillReqs.colorStats]);
  
  const streakMatches = useMemo(() => {
    const req = backfillReqs.hotStreaks ?? true;
    if (selectedSeason === "all") {
      return selectableSeasons.flatMap(year => getValidMatches(year, req));
    }
    return getValidMatches(selectedSeason, req);
  }, [selectedSeason, selectableSeasons, backfillReqs.hotStreaks]);
  
  const clutchMatches = useMemo(() => {
    const req = backfillReqs.clutchFactor ?? false;
    if (selectedSeason === "all") {
      return selectableSeasons.flatMap(year => getValidMatches(year, req));
    }
    return getValidMatches(selectedSeason, req);
  }, [selectedSeason, selectableSeasons, backfillReqs.clutchFactor]);

  // Duos have different requirements per metric
  const duosWinRateMatches = useMemo(() => {
    const req = backfillReqs.duosWinRate ?? true;
    if (selectedSeason === "all") {
      return selectableSeasons.flatMap(year => getValidMatches(year, req));
    }
    return getValidMatches(selectedSeason, req);
  }, [selectedSeason, selectableSeasons, backfillReqs.duosWinRate]);
  
  const duosScoringMatches = useMemo(() => {
    const req = backfillReqs.duosTopScoring ?? false;
    if (selectedSeason === "all") {
      return selectableSeasons.flatMap(year => getValidMatches(year, req));
    }
    return getValidMatches(selectedSeason, req);
  }, [selectedSeason, selectableSeasons, backfillReqs.duosTopScoring]);
  
  const duosGamesMatches = useMemo(() => {
    const req = backfillReqs.duosMostGames ?? true;
    if (selectedSeason === "all") {
      return selectableSeasons.flatMap(year => getValidMatches(year, req));
    }
    return getValidMatches(selectedSeason, req);
  }, [selectedSeason, selectableSeasons, backfillReqs.duosMostGames]);
  
  // OG Leaders matches (requires backfilled data for complete player tracking)
  const ogLeadersMatches = useMemo(() => {
    const req = backfillReqs.ogLeaders ?? true;
    if (selectedSeason === "all") {
      return selectableSeasons.flatMap(year => getValidMatches(year, req));
    }
    return getValidMatches(selectedSeason, req);
  }, [selectedSeason, selectableSeasons, backfillReqs.ogLeaders]);

  // Get match count label based on active tab
  const getMatchCountLabel = () => {
    switch (activeSubTab) {
      case "color-stats": return `${colorStatsMatches.length} matches`;
      case "hot-streaks": return `${streakMatches.length} matches`;
      case "dream-duos": return "various data sources";
      case "clutch-factor": return `${clutchMatches.length} matches`;
      case "og-leaders": return `${ogLeadersMatches.length} matches`;
      default: return "";
    }
  };
  const matchCountLabel = getMatchCountLabel();

  // Calculate color statistics based on selected season
  const colorStats = useMemo(() => {
    const stats = {};
    
    colorStatsMatches.forEach(match => {
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
  }, [colorStatsMatches]);

  // ================== HOT STREAKS (based on selected season) ==================
  const hotStreaks = useMemo(() => {
    if (!config.FUN_STATS?.enableHotStreaks) return null;
    
    const playerStreaks = {};
    
    // Sort matches by date for chronological order
    const sortedMatches = [...streakMatches].sort((a, b) => 
      new Date(a.date.split('/').reverse().join('-')) - new Date(b.date.split('/').reverse().join('-'))
    );
    
    sortedMatches.forEach(match => {
      const players = getPlayersFromAttendance(match.attendance);
      const winningTeam = getWinningTeam(match.scoreline);
      
      players.forEach(player => {
        // Skip non-trackable players (Others, David+1 patterns, etc.)
        if (!isTrackablePlayer(player.name)) return;
        
        if (!playerStreaks[player.name]) {
          playerStreaks[player.name] = {
            currentWinStreak: 0,
            maxWinStreak: 0,
            currentGoalStreak: 0,
            maxGoalStreak: 0,
            currentUnbeatenStreak: 0,
            maxUnbeatenStreak: 0,
            totalMatches: 0,
            totalGoals: 0,
            totalWins: 0,
          };
        }
        
        const ps = playerStreaks[player.name];
        ps.totalMatches += 1;
        ps.totalGoals += player.goals || 0;
        
        const isWin = winningTeam === player.team;
        const isDraw = winningTeam === 'DRAW';
        const hasGoal = (player.goals || 0) > 0;
        
        // Win streak
        if (isWin) {
          ps.currentWinStreak += 1;
          ps.totalWins += 1;
          ps.maxWinStreak = Math.max(ps.maxWinStreak, ps.currentWinStreak);
        } else {
          ps.currentWinStreak = 0;
        }
        
        // Goal streak
        if (hasGoal) {
          ps.currentGoalStreak += 1;
          ps.maxGoalStreak = Math.max(ps.maxGoalStreak, ps.currentGoalStreak);
        } else {
          ps.currentGoalStreak = 0;
        }
        
        // Unbeaten streak
        if (isWin || isDraw) {
          ps.currentUnbeatenStreak += 1;
          ps.maxUnbeatenStreak = Math.max(ps.maxUnbeatenStreak, ps.currentUnbeatenStreak);
        } else {
          ps.currentUnbeatenStreak = 0;
        }
      });
    });
    
    // Filter players with at least 3 matches
    const results = Object.entries(playerStreaks)
      .filter(([, data]) => data.totalMatches >= 3)
      .map(([name, data]) => ({ name, ...data }));
    
    return {
      byCurrentWin: [...results].sort((a, b) => b.currentWinStreak - a.currentWinStreak).slice(0, 10),
      byMaxWin: [...results].sort((a, b) => b.maxWinStreak - a.maxWinStreak).slice(0, 10),
      byCurrentGoal: [...results].filter(p => p.currentGoalStreak > 0).sort((a, b) => b.currentGoalStreak - a.currentGoalStreak).slice(0, 10),
      byMaxGoal: [...results].sort((a, b) => b.maxGoalStreak - a.maxGoalStreak).slice(0, 10),
      byUnbeaten: [...results].sort((a, b) => b.currentUnbeatenStreak - a.currentUnbeatenStreak).slice(0, 10),
      totalMatches: streakMatches.length,
    };
  }, [streakMatches]);

  // ================== DREAM TEAM DUOS (different data sources per metric) ==================
  const dreamTeamDuos = useMemo(() => {
    if (!config.FUN_STATS?.enableDreamTeamDuos) return null;
    
    // Helper to calculate duo stats from matches
    const calcDuoStats = (matches) => {
      const duoStats = {};
      matches.forEach(match => {
        const players = getPlayersFromAttendance(match.attendance).filter(p => isTrackablePlayer(p.name));
        const winningTeam = getWinningTeam(match.scoreline);
        
        const teams = {};
        players.forEach(p => {
          if (!teams[p.team]) teams[p.team] = [];
          teams[p.team].push(p);
        });
        
        Object.values(teams).forEach(teamPlayers => {
          for (let i = 0; i < teamPlayers.length; i++) {
            for (let j = i + 1; j < teamPlayers.length; j++) {
              const p1 = teamPlayers[i];
              const p2 = teamPlayers[j];
              const key = [p1.name, p2.name].sort().join('|');
              
              if (!duoStats[key]) {
                duoStats[key] = {
                  player1: [p1.name, p2.name].sort()[0],
                  player2: [p1.name, p2.name].sort()[1],
                  matches: 0,
                  wins: 0,
                  draws: 0,
                  losses: 0,
                  combinedGoals: 0,
                };
              }
              
              duoStats[key].matches += 1;
              duoStats[key].combinedGoals += (p1.goals || 0) + (p2.goals || 0);
              
              if (winningTeam === p1.team) {
                duoStats[key].wins += 1;
              } else if (winningTeam === 'DRAW') {
                duoStats[key].draws += 1;
              } else {
                duoStats[key].losses += 1;
              }
            }
          }
        });
      });
      return duoStats;
    };
    
    // Calculate duo stats with different data sources
    const winRateDuoStats = calcDuoStats(duosWinRateMatches);
    const scoringDuoStats = calcDuoStats(duosScoringMatches);
    const gamesDuoStats = calcDuoStats(duosGamesMatches);
    
    // Win rate results (min 3 matches) - uses backfill-required data
    const winRateResults = Object.values(winRateDuoStats)
      .filter(d => d.matches >= 3)
      .map(d => ({
        ...d,
        winRate: ((d.wins / d.matches) * 100).toFixed(1),
        goalsPerMatch: (d.combinedGoals / d.matches).toFixed(2),
      }))
      .sort((a, b) => parseFloat(b.winRate) - parseFloat(a.winRate));
    
    // Top scoring results (min 3 matches) - doesn't require backfill
    const scoringResults = Object.values(scoringDuoStats)
      .filter(d => d.matches >= 3)
      .map(d => ({
        ...d,
        goalsPerMatch: (d.combinedGoals / d.matches).toFixed(2),
      }))
      .sort((a, b) => b.combinedGoals - a.combinedGoals);
    
    // Most matches results (min 3 matches) - uses backfill-required data
    const matchesResults = Object.values(gamesDuoStats)
      .filter(d => d.matches >= 3)
      .map(d => ({
        ...d,
        winRate: ((d.wins / d.matches) * 100).toFixed(1),
      }))
      .sort((a, b) => b.matches - a.matches);
    
    return {
      topWinRate: winRateResults.slice(0, 10),
      topGoalScoring: scoringResults.slice(0, 10),
      mostMatches: matchesResults.slice(0, 10),
    };
  }, [duosWinRateMatches, duosScoringMatches, duosGamesMatches]);

  // ================== CLUTCH FACTOR (Decisive Scorers only, based on selected season) ==================
  const clutchFactor = useMemo(() => {
    if (!config.FUN_STATS?.enableClutchFactor) return null;
    
    const playerClutch = {};
    
    clutchMatches.forEach(match => {
      if (!isCloseMatch(match.scoreline)) return;
      
      const players = getPlayersFromAttendance(match.attendance);
      const winningTeam = getWinningTeam(match.scoreline);
      
      players.forEach(player => {
        // Skip non-trackable players (Others, David+1 patterns, etc.)
        if (!isTrackablePlayer(player.name)) return;
        
        if (!playerClutch[player.name]) {
          playerClutch[player.name] = {
            closeMatches: 0,
            closeWins: 0,
            goalsInCloseGames: 0,
          };
        }
        
        const pc = playerClutch[player.name];
        pc.closeMatches += 1;
        pc.goalsInCloseGames += player.goals || 0;
        
        if (winningTeam === player.team) {
          pc.closeWins += 1;
        }
      });
    });
    
    const closeMatchCount = clutchMatches.filter(m => isCloseMatch(m.scoreline)).length;
    
    const results = Object.entries(playerClutch)
      .filter(([, data]) => data.goalsInCloseGames > 0)
      .map(([name, data]) => ({
        name,
        ...data,
      }))
      .sort((a, b) => b.goalsInCloseGames - a.goalsInCloseGames);
    
    return {
      totalCloseMatches: closeMatchCount,
      topDecisiveScorers: results.slice(0, 15),
    };
  }, [clutchMatches]);

  // ================== OWN GOAL LEADERS (all players, all positions) ==================
  const ogLeaders = useMemo(() => {
    if (!config.FUN_STATS?.enableOGLeaders) return null;
    
    const playerOGs = {};
    
    ogLeadersMatches.forEach(match => {
      const players = getPlayersFromAttendance(match.attendance);
      
      players.forEach(player => {
        // Skip non-trackable players (Others, David+1 patterns, etc.)
        if (!isTrackablePlayer(player.name)) return;
        
        const ownGoals = player.ownGoals || 0;
        if (ownGoals === 0) return;
        
        if (!playerOGs[player.name]) {
          playerOGs[player.name] = {
            name: player.name,
            ownGoals: 0,
            matchesWithOG: 0,
            position: player.position || '',
          };
        }
        
        playerOGs[player.name].ownGoals += ownGoals;
        playerOGs[player.name].matchesWithOG += 1;
        // Update position to most recent
        if (player.position) {
          playerOGs[player.name].position = player.position;
        }
      });
    });
    
    return Object.values(playerOGs)
      .filter(p => p.ownGoals > 0)
      .sort((a, b) => b.ownGoals - a.ownGoals || b.matchesWithOG - a.matchesWithOG)
      .slice(0, 15);
  }, [ogLeadersMatches]);

  // Feature flags
  const enableColorStats = config.FUN_STATS?.enableColorStats !== false;
  const enableHotStreaks = config.FUN_STATS?.enableHotStreaks !== false;
  const enableDreamDuos = config.FUN_STATS?.enableDreamTeamDuos !== false;
  const enableClutch = config.FUN_STATS?.enableClutchFactor !== false;
  const enableOGLeaders = config.FUN_STATS?.enableOGLeaders !== false;

  if (!config.FUN_STATS?.enabled) {
    return null;
  }

  // Build tabs list based on enabled features
  const tabs = [
    { id: "color-stats", label: "🎨 Colors", enabled: enableColorStats },
    { id: "hot-streaks", label: "🔥 Streaks", enabled: enableHotStreaks },
    { id: "dream-duos", label: "🤝 Duos", enabled: enableDreamDuos },
    { id: "clutch-factor", label: "🎯 Clutch", enabled: enableClutch },
    { id: "og-leaders", label: "😅 OG Leaders", enabled: enableOGLeaders },
  ].filter(t => t.enabled);

  return (
    <div className="fun-stats">
      {/* Sub-tab Navigation */}
      <div className="fun-stats-nav">
        <div className="fun-stats-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`fun-stats-tab ${activeSubTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveSubTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        {/* Global Season selector - available on all tabs */}
        <div className="fun-stats-season-selector">
          <label htmlFor="fun-stats-season">Season</label>
          <div className="select-wrapper">
            <select
              id="fun-stats-season"
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value)}
            >
              <option value="all">All Time</option>
              {selectableSeasons.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <span className="select-arrow">▼</span>
          </div>
        </div>
      </div>

      {/* ========== COLOR STATS ========== */}
      {activeSubTab === "color-stats" && enableColorStats && (
        <div className="color-stats-section">
          <div className="section-header">
            <h2>🎨 Team Color Win Rates</h2>
            <p className="section-subtitle">
              Which jersey color brings the best luck? ({matchCountLabel})
            </p>
          </div>

          <div className="color-stats-grid">
            {colorStats.map((stat, idx) => {
              const colorCfg = colorConfig[stat.color] || { bg: '#6b7280', text: '#fff', name: stat.color };
              const isTop = idx === 0;
              
              return (
                <div key={stat.color} className={`color-stat-card ${isTop ? 'top-color' : ''}`}>
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
        </div>
      )}

      {/* ========== HOT STREAKS ========== */}
      {activeSubTab === "hot-streaks" && enableHotStreaks && hotStreaks && (
        <div className="hot-streaks-section">
          <div className="section-header">
            <h2>🔥 Hot Streaks</h2>
            <p className="section-subtitle">
              Who's riding the wave of momentum? ({matchCountLabel})
            </p>
          </div>

          <div className="streaks-grid">
            <div className="streak-card">
              <h3>🏆 Current Win Streak</h3>
              <div className="streak-list">
                {hotStreaks.byCurrentWin.slice(0, 5).map((p, idx) => (
                  <div key={p.name} className={`streak-item ${idx === 0 ? 'top' : ''}`}>
                    <span className="rank">#{idx + 1}</span>
                    <span className="name">{p.name}</span>
                    <span className="streak-value fire">{p.currentWinStreak}🔥</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="streak-card">
              <h3>⚡ Best Ever Win Streak</h3>
              <div className="streak-list">
                {hotStreaks.byMaxWin.slice(0, 5).map((p, idx) => (
                  <div key={p.name} className={`streak-item ${idx === 0 ? 'top' : ''}`}>
                    <span className="rank">#{idx + 1}</span>
                    <span className="name">{p.name}</span>
                    <span className="streak-value">{p.maxWinStreak}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="streak-card">
              <h3>⚽ Current Goal Streak</h3>
              <div className="streak-list">
                {hotStreaks.byCurrentGoal.length > 0 ? (
                  hotStreaks.byCurrentGoal.slice(0, 5).map((p, idx) => (
                    <div key={p.name} className={`streak-item ${idx === 0 ? 'top' : ''}`}>
                      <span className="rank">#{idx + 1}</span>
                      <span className="name">{p.name}</span>
                      <span className="streak-value goal-streak">{p.currentGoalStreak}⚽</span>
                    </div>
                  ))
                ) : (
                  <div className="no-streak">No active scoring streaks</div>
                )}
              </div>
            </div>

            <div className="streak-card">
              <h3>🛡️ Current Unbeaten Run</h3>
              <div className="streak-list">
                {hotStreaks.byUnbeaten.slice(0, 5).map((p, idx) => (
                  <div key={p.name} className={`streak-item ${idx === 0 ? 'top' : ''}`}>
                    <span className="rank">#{idx + 1}</span>
                    <span className="name">{p.name}</span>
                    <span className="streak-value unbeaten">{p.currentUnbeatenStreak}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== DREAM TEAM DUOS ========== */}
      {activeSubTab === "dream-duos" && enableDreamDuos && dreamTeamDuos && (
        <div className="dream-duos-section">
          <div className="section-header">
            <h2>🤝 Dream Team Duos</h2>
            <p className="section-subtitle">
              Which player pairs dominate together? ({matchCountLabel}, min 3 matches)
            </p>
          </div>

          <div className="duos-grid">
            <div className="duo-card">
              <h3>🏆 Highest Win Rate</h3>
              <div className="duo-list">
                {dreamTeamDuos.topWinRate.slice(0, 5).map((d, idx) => (
                  <div key={`${d.player1}-${d.player2}`} className={`duo-item ${idx === 0 ? 'top' : ''}`}>
                    <span className="rank">#{idx + 1}</span>
                    <div className="duo-names">
                      <span>{d.player1}</span>
                      <span className="amp">&</span>
                      <span>{d.player2}</span>
                    </div>
                    <div className="duo-stats">
                      <span className="win-rate">{d.winRate}%</span>
                      <span className="record">{d.wins}W-{d.draws}D-{d.losses}L</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="duo-card">
              <h3>⚽ Top Scoring Duos</h3>
              <div className="duo-list">
                {dreamTeamDuos.topGoalScoring.slice(0, 5).map((d, idx) => (
                  <div key={`${d.player1}-${d.player2}`} className={`duo-item ${idx === 0 ? 'top' : ''}`}>
                    <span className="rank">#{idx + 1}</span>
                    <div className="duo-names">
                      <span>{d.player1}</span>
                      <span className="amp">&</span>
                      <span>{d.player2}</span>
                    </div>
                    <div className="duo-stats">
                      <span className="goals">{d.combinedGoals} goals</span>
                      <span className="gpm">{d.goalsPerMatch} GPM</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="duo-card">
              <h3>🎮 Most Games Together</h3>
              <div className="duo-list">
                {dreamTeamDuos.mostMatches.slice(0, 5).map((d, idx) => (
                  <div key={`${d.player1}-${d.player2}`} className={`duo-item ${idx === 0 ? 'top' : ''}`}>
                    <span className="rank">#{idx + 1}</span>
                    <div className="duo-names">
                      <span>{d.player1}</span>
                      <span className="amp">&</span>
                      <span>{d.player2}</span>
                    </div>
                    <div className="duo-stats">
                      <span className="matches">{d.matches} matches</span>
                      <span className="win-rate">{d.winRate}% WR</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== CLUTCH FACTOR (Decisive Scorers only) ========== */}
      {activeSubTab === "clutch-factor" && enableClutch && clutchFactor && (
        <div className="clutch-factor-section">
          <div className="section-header">
            <h2>🎯 Decisive Scorers</h2>
            <p className="section-subtitle">
              Who scores the most when games are tight? ({clutchFactor.totalCloseMatches} close matches, ≤2 goal margin)
            </p>
          </div>

          {/* Top 3 Podium */}
          {clutchFactor.topDecisiveScorers.length >= 3 && (
            <div className="decisive-podium">
              {clutchFactor.topDecisiveScorers.slice(0, 3).map((p, idx) => (
                <div key={p.name} className={`decisive-spot position-${idx + 1}`}>
                  <div className="decisive-medal">
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                  </div>
                  <div className="decisive-name">{p.name}</div>
                  <div className="decisive-goals">
                    <span className="goals-count">{p.goalsInCloseGames}</span>
                    <span className="goals-label">goals</span>
                  </div>
                  <div className="decisive-matches">
                    in {p.closeMatches} close games
                  </div>
                  <div className="decisive-avg">
                    {(p.goalsInCloseGames / p.closeMatches).toFixed(2)} per match
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Rest of the list */}
          {clutchFactor.topDecisiveScorers.length > 3 && (
            <div className="decisive-table">
              <div className="decisive-header">
                <span className="col-rank">#</span>
                <span className="col-name">Player</span>
                <span className="col-goals">Goals</span>
                <span className="col-matches">Matches</span>
                <span className="col-avg">Avg</span>
              </div>
              {clutchFactor.topDecisiveScorers.slice(3).map((p, idx) => (
                <div key={p.name} className="decisive-row">
                  <span className="col-rank">{idx + 4}</span>
                  <span className="col-name">{p.name}</span>
                  <span className="col-goals">{p.goalsInCloseGames}</span>
                  <span className="col-matches">{p.closeMatches}</span>
                  <span className="col-avg">{(p.goalsInCloseGames / p.closeMatches).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}

          {clutchFactor.topDecisiveScorers.length === 0 && (
            <div className="no-data-message">
              <p>No goals scored in close games yet.</p>
            </div>
          )}
        </div>
      )}

      {/* ========== OWN GOAL LEADERS ========== */}
      {activeSubTab === "og-leaders" && enableOGLeaders && ogLeaders && (
        <div className="og-leaders-section">
          <div className="section-header">
            <h2>😅 Own Goal Leaders</h2>
            <p className="section-subtitle">
              The Hall of Unfortunate Moments ({matchCountLabel})
            </p>
          </div>

          {ogLeaders.length > 0 ? (
            <div className="og-leaders-list">
              {ogLeaders.map((p, idx) => (
                <div key={p.name} className={`og-leader-card ${idx === 0 ? 'top-og' : ''}`}>
                  <div className="og-rank">
                    {idx === 0 ? '👑' : `#${idx + 1}`}
                  </div>
                  <div className="og-player-info">
                    <span className="og-player-name">{p.name}</span>
                    {p.position && <span className="og-position">{p.position}</span>}
                  </div>
                  <div className="og-stats">
                    <div className="og-count">
                      <span className="og-number">{p.ownGoals}</span>
                      <span className="og-label">OG{p.ownGoals > 1 ? 's' : ''}</span>
                    </div>
                    <div className="og-matches">
                      in {p.matchesWithOG} match{p.matchesWithOG > 1 ? 'es' : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-data-message">
              <p>No own goals recorded! Perfect play! 🎉</p>
            </div>
          )}
        </div>
      )}

    </div>
  );
};

