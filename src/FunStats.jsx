import { useState, useMemo } from "react";
import { config } from "./leaderboard-config.js";
import "./FunStats.css";

// Dynamically import all available match data files
// This pattern allows automatic pickup of new season files (2027, 2028, etc.)
const matchDataModules = import.meta.glob('./data/attendance-data/20*.json', { eager: true });

// Import leaderboard data for MVP calculations
const leaderboardDataModules = import.meta.glob('./data/leaderboard-data/20*.json', { eager: true });

// Build matchDataByYear object from imported modules
const matchDataByYear = {};
Object.entries(matchDataModules).forEach(([path, module]) => {
  const yearMatch = path.match(/(\d{4})\.json$/);
  if (yearMatch) {
    matchDataByYear[yearMatch[1]] = module.default;
  }
});

// Build leaderboardDataByYear object from imported modules
const leaderboardDataByYear = {};
Object.entries(leaderboardDataModules).forEach(([path, module]) => {
  const yearMatch = path.match(/(\d{4})\.json$/);
  if (yearMatch) {
    leaderboardDataByYear[yearMatch[1]] = module.default;
  }
});

// Get available MVP seasons (from leaderboard data)
const getMVPSeasons = () => {
  return Object.keys(leaderboardDataByYear).sort((a, b) => b - a);
};

// Get available seasons from config or discovered files
const getAvailableSeasons = () => {
  const configSeasons = config.FUN_STATS?.seasons || [];
  const discoveredSeasons = Object.keys(matchDataByYear).sort((a, b) => b - a);
  return configSeasons.length > 0 ? configSeasons : discoveredSeasons;
};

// Get seasons from 2026 onwards (for features requiring complete tracker data)
const getTrackerSeasons = () => {
  return Object.keys(matchDataByYear)
    .filter(year => parseInt(year) >= 2026)
    .sort((a, b) => b - a);
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

// Helper to get unique player names across all matches (excluding "Others")
const getAllPlayerNames = (matches) => {
  const names = new Set();
  matches.forEach(match => {
    if (match.attendance) {
      getPlayersFromAttendance(match.attendance).forEach(p => {
        if (p.name && p.name !== 'Others') {
          names.add(p.name);
        }
      });
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
  const trackerSeasons = getTrackerSeasons();
  const h2hSeasons = getH2HSeasons();
  const mvpSeasons = getMVPSeasons();
  
  const [selectedSeason, setSelectedSeason] = useState(
    config.FUN_STATS?.defaultSeason || "all"
  );
  
  // Separate season selector for MVP (defaults to "all" for All Time)
  const [mvpSelectedSeason, setMvpSelectedSeason] = useState("all");
  
  // Determine first enabled tab
  const getDefaultTab = () => {
    if (config.FUN_STATS?.enableColorStats) return "color-stats";
    if (config.FUN_STATS?.enableHeadToHead) return "head-to-head";
    if (config.FUN_STATS?.enableHotStreaks) return "hot-streaks";
    if (config.FUN_STATS?.enableDreamTeamDuos) return "dream-duos";
    if (config.FUN_STATS?.enableClutchFactor) return "clutch-factor";
    if (config.FUN_STATS?.enableMVPIndex) return "mvp-index";
    return "color-stats";
  };
  
  const [activeSubTab, setActiveSubTab] = useState(getDefaultTab());
  const [player1, setPlayer1] = useState("");
  const [player2, setPlayer2] = useState("");

  // Get all matches for selected season(s) - for color stats
  const allMatches = useMemo(() => {
    if (selectedSeason === "all") {
      return availableSeasons.flatMap(year => 
        (matchDataByYear[year]?.matches || []).filter(m => m.matchPlayed && !m.matchCancelled)
      );
    }
    return (matchDataByYear[selectedSeason]?.matches || []).filter(m => m.matchPlayed && !m.matchCancelled);
  }, [selectedSeason, availableSeasons]);

  // Get matches from 2026+ only (for streaks, duos win rate, most games together)
  const trackerMatches = useMemo(() => {
    return trackerSeasons.flatMap(year => 
      (matchDataByYear[year]?.matches || []).filter(m => m.matchPlayed && !m.matchCancelled)
    );
  }, [trackerSeasons]);

  // Get matches from 2025+ (for top scoring duos - scorer data is accurate)
  const scorerMatches = useMemo(() => {
    const scorerSeasons = Object.keys(matchDataByYear).filter(year => parseInt(year) >= 2025);
    return scorerSeasons.flatMap(year => 
      (matchDataByYear[year]?.matches || []).filter(m => m.matchPlayed && !m.matchCancelled)
    );
  }, []);

  // Get H2H matches (only from detailed seasons)
  const h2hMatches = useMemo(() => {
    return h2hSeasons.flatMap(year => 
      (matchDataByYear[year]?.matches || []).filter(m => m.matchPlayed && !m.matchCancelled)
    );
  }, [h2hSeasons]);

  // Get all unique players for H2H selection (excluding "Others")
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

  // ================== HOT STREAKS (2026+ data only) ==================
  const hotStreaks = useMemo(() => {
    if (!config.FUN_STATS?.enableHotStreaks) return null;
    
    const playerStreaks = {};
    
    // Sort matches by date for chronological order
    const sortedMatches = [...trackerMatches].sort((a, b) => 
      new Date(a.date.split('/').reverse().join('-')) - new Date(b.date.split('/').reverse().join('-'))
    );
    
    sortedMatches.forEach(match => {
      const players = getPlayersFromAttendance(match.attendance);
      const winningTeam = getWinningTeam(match.scoreline);
      
      players.forEach(player => {
        // Skip "Others"
        if (player.name === 'Others') return;
        
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
      totalMatches: trackerMatches.length,
    };
  }, [trackerMatches]);

  // ================== DREAM TEAM DUOS ==================
  // Different data sources for different metrics:
  // - Win Rate: 2026+ (complete tracker data)
  // - Top Scoring: 2025+ (scorer info is accurate)
  // - Most Games: 2026+ (attendance data is complete)
  const dreamTeamDuos = useMemo(() => {
    if (!config.FUN_STATS?.enableDreamTeamDuos) return null;
    
    // Calculate duo stats for 2026+ (for win rate and most games)
    const duoStatsTracker = {};
    trackerMatches.forEach(match => {
      const players = getPlayersFromAttendance(match.attendance).filter(p => p.name !== 'Others');
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
            
            if (!duoStatsTracker[key]) {
              duoStatsTracker[key] = {
                player1: [p1.name, p2.name].sort()[0],
                player2: [p1.name, p2.name].sort()[1],
                matches: 0,
                wins: 0,
                draws: 0,
                losses: 0,
                combinedGoals: 0,
              };
            }
            
            duoStatsTracker[key].matches += 1;
            duoStatsTracker[key].combinedGoals += (p1.goals || 0) + (p2.goals || 0);
            
            if (winningTeam === p1.team) {
              duoStatsTracker[key].wins += 1;
            } else if (winningTeam === 'DRAW') {
              duoStatsTracker[key].draws += 1;
            } else {
              duoStatsTracker[key].losses += 1;
            }
          }
        }
      });
    });
    
    // Calculate duo scoring stats for 2025+ (for top scoring duos)
    const duoStatsScorer = {};
    scorerMatches.forEach(match => {
      const players = getPlayersFromAttendance(match.attendance).filter(p => p.name !== 'Others');
      
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
            
            if (!duoStatsScorer[key]) {
              duoStatsScorer[key] = {
                player1: [p1.name, p2.name].sort()[0],
                player2: [p1.name, p2.name].sort()[1],
                matches: 0,
                combinedGoals: 0,
              };
            }
            
            duoStatsScorer[key].matches += 1;
            duoStatsScorer[key].combinedGoals += (p1.goals || 0) + (p2.goals || 0);
          }
        }
      });
    });
    
    // Win rate results (2026+ data, min 3 matches)
    const winRateResults = Object.values(duoStatsTracker)
      .filter(d => d.matches >= 3)
      .map(d => ({
        ...d,
        winRate: ((d.wins / d.matches) * 100).toFixed(1),
        goalsPerMatch: (d.combinedGoals / d.matches).toFixed(2),
      }))
      .sort((a, b) => parseFloat(b.winRate) - parseFloat(a.winRate));
    
    // Top scoring results (2025+ data, min 3 matches)
    const scoringResults = Object.values(duoStatsScorer)
      .filter(d => d.matches >= 3)
      .map(d => ({
        ...d,
        goalsPerMatch: (d.combinedGoals / d.matches).toFixed(2),
      }))
      .sort((a, b) => b.combinedGoals - a.combinedGoals);
    
    // Most matches results (2026+ data, min 3 matches)
    const matchesResults = Object.values(duoStatsTracker)
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
  }, [trackerMatches, scorerMatches]);

  // ================== CLUTCH FACTOR (Decisive Scorers only) ==================
  const clutchFactor = useMemo(() => {
    if (!config.FUN_STATS?.enableClutchFactor) return null;
    
    const playerClutch = {};
    
    allMatches.forEach(match => {
      if (!isCloseMatch(match.scoreline)) return;
      
      const players = getPlayersFromAttendance(match.attendance);
      const winningTeam = getWinningTeam(match.scoreline);
      
      players.forEach(player => {
        // Skip "Others"
        if (player.name === 'Others') return;
        
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
    
    const closeMatchCount = allMatches.filter(m => isCloseMatch(m.scoreline)).length;
    
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
  }, [allMatches]);

  // ================== MVP INDEX (using leaderboard data) ==================
  const mvpIndex = useMemo(() => {
    if (!config.FUN_STATS?.enableMVPIndex) return null;
    
    // Aggregate player stats from leaderboard data
    const playerStats = {};
    
    const seasonsToUse = mvpSelectedSeason === "all" ? mvpSeasons : [mvpSelectedSeason];
    
    seasonsToUse.forEach(year => {
      const yearData = leaderboardDataByYear[year];
      if (!yearData) return;
      
      yearData.forEach(player => {
        // Skip "Others"
        if (player.name === 'Others') return;
        
        if (!playerStats[player.name]) {
          playerStats[player.name] = {
            matches: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            goals: 0,
            cleanSheets: 0,
            hatTricks: 0,
            ownGoals: 0,
          };
        }
        
        const ps = playerStats[player.name];
        ps.matches += player.matches || 0;
        ps.wins += player.wins || 0;
        ps.draws += player.draws || 0;
        ps.losses += player.losses || 0;
        ps.goals += player.goals || 0;
        ps.cleanSheets += player.cleanSheets || 0;
        ps.hatTricks += player.hatTricks || 0;
        ps.ownGoals += player.ownGoals || 0;
      });
    });
    
    // Find max matches for attendance calculation
    const maxMatches = Math.max(...Object.values(playerStats).map(p => p.matches), 1);
    
    // Calculate MVP score
    // Formula: (Win% * 0.35) + (Goals/Match * 30) + (Attendance% * 0.20) + (Hat Tricks bonus) + (Clean Sheet% * 0.10) - (Own Goals penalty)
    const results = Object.entries(playerStats)
      .filter(([, data]) => data.matches >= 10) // Minimum 10 matches for MVP consideration
      .map(([name, data]) => {
        const winPct = (data.wins / data.matches) * 100;
        const attendancePct = (data.matches / maxMatches) * 100;
        const goalsPerMatch = data.goals / data.matches;
        const cleanSheetPct = (data.cleanSheets / data.matches) * 100;
        const hatTrickBonus = data.hatTricks * 2; // 2 points per hat trick
        const ownGoalPenalty = data.ownGoals * 1; // 1 point penalty per own goal
        
        const mvpScore = (
          (winPct * 0.35) +
          (goalsPerMatch * 30) +
          (attendancePct * 0.20) +
          (cleanSheetPct * 0.10) +
          hatTrickBonus -
          ownGoalPenalty
        );
        
        return {
          name,
          ...data,
          winPct: winPct.toFixed(1),
          attendancePct: attendancePct.toFixed(1),
          goalsPerMatch: goalsPerMatch.toFixed(2),
          mvpScore: mvpScore.toFixed(1),
        };
      })
      .sort((a, b) => parseFloat(b.mvpScore) - parseFloat(a.mvpScore));
    
    return {
      players: results.slice(0, 20),
      totalPlayers: Object.keys(playerStats).length,
      seasonLabel: mvpSelectedSeason === "all" ? "All Time" : mvpSelectedSeason,
    };
  }, [mvpSelectedSeason, mvpSeasons]);

  // Feature flags
  const enableColorStats = config.FUN_STATS?.enableColorStats !== false;
  const enableHeadToHead = config.FUN_STATS?.enableHeadToHead !== false;
  const enableHotStreaks = config.FUN_STATS?.enableHotStreaks !== false;
  const enableDreamDuos = config.FUN_STATS?.enableDreamTeamDuos !== false;
  const enableClutch = config.FUN_STATS?.enableClutchFactor !== false;
  const enableMVP = config.FUN_STATS?.enableMVPIndex !== false;

  if (!config.FUN_STATS?.enabled) {
    return null;
  }

  // Build tabs list based on enabled features
  const tabs = [
    { id: "color-stats", label: "🎨 Colors", enabled: enableColorStats },
    { id: "head-to-head", label: "⚔️ H2H", enabled: enableHeadToHead },
    { id: "hot-streaks", label: "🔥 Streaks", enabled: enableHotStreaks },
    { id: "dream-duos", label: "🤝 Duos", enabled: enableDreamDuos },
    { id: "clutch-factor", label: "🎯 Clutch", enabled: enableClutch },
    { id: "mvp-index", label: "🏆 MVP", enabled: enableMVP },
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
        
        {/* Season selector - for color stats and MVP only */}
        {(activeSubTab === "color-stats" || activeSubTab === "mvp-index") && (
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

      {/* ========== COLOR STATS ========== */}
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

      {/* ========== HEAD TO HEAD ========== */}
      {activeSubTab === "head-to-head" && enableHeadToHead && (
        <div className="h2h-section">
          <div className="section-header">
            <h2>⚔️ Head to Head</h2>
            <p className="section-subtitle">
              Select two players to compare their record
              <br />
              <small>(Data from {h2hSeasons.join(', ')} • {h2hMatches.length} matches)</small>
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
                    {h2hStats.matchDetails.slice().reverse().map((match, idx) => (
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
                          {Object.entries(match.scoreline).map(([team, score], i) => (
                            <span key={team}>{i > 0 && ' - '}<span className="team-score">{score}</span></span>
                          ))}
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
      )}

      {/* ========== HOT STREAKS (2026+ data) ========== */}
      {activeSubTab === "hot-streaks" && enableHotStreaks && hotStreaks && (
        <div className="hot-streaks-section">
          <div className="section-header">
            <h2>🔥 Hot Streaks</h2>
            <p className="section-subtitle">
              Who's riding the wave of momentum? ({hotStreaks.totalMatches} matches from 2026+)
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
                      <span className="streak-value goal">{p.currentGoalStreak}⚽</span>
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
              Which player pairs dominate together? (Min 3 matches together)
            </p>
          </div>

          <div className="duos-grid">
            <div className="duo-card">
              <h3>🏆 Highest Win Rate</h3>
              <p className="card-subtitle">2026+ data</p>
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
              <p className="card-subtitle">2025+ data</p>
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
              <p className="card-subtitle">2026+ data</p>
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
              Who scores the most when games are tight? ({clutchFactor.totalCloseMatches} close matches with ≤2 goal margin)
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

      {/* ========== MVP INDEX ========== */}
      {activeSubTab === "mvp-index" && enableMVP && mvpIndex && (
        <div className="mvp-index-section">
          <div className="section-header">
            <div className="mvp-header-row">
              <div>
                <h2>🏆 MVP Index</h2>
                <p className="section-subtitle">
                  {mvpIndex.seasonLabel} rankings for players with 10+ matches
                </p>
              </div>
              <div className="mvp-season-selector">
                <label htmlFor="mvp-season">Season</label>
                <div className="select-wrapper">
                  <select
                    id="mvp-season"
                    value={mvpSelectedSeason}
                    onChange={(e) => setMvpSelectedSeason(e.target.value)}
                  >
                    <option value="all">All Time</option>
                    {mvpSeasons.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                  <span className="select-arrow">▼</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mvp-formula-container">
            <h3 className="formula-title">📊 How is MVP Score calculated?</h3>
            <div className="mvp-formula-grid">
              <div className="formula-metric">
                <span className="metric-weight">35%</span>
                <span className="metric-name">Win Rate</span>
                <span className="metric-desc">% of matches won with your team</span>
              </div>
              <div className="formula-metric">
                <span className="metric-weight">30%</span>
                <span className="metric-name">Goals/Match</span>
                <span className="metric-desc">Average goals scored per game</span>
              </div>
              <div className="formula-metric">
                <span className="metric-weight">20%</span>
                <span className="metric-name">Attendance</span>
                <span className="metric-desc">% of max matches played</span>
              </div>
              <div className="formula-metric">
                <span className="metric-weight">10%</span>
                <span className="metric-name">Clean Sheets</span>
                <span className="metric-desc">% of matches with zero conceded</span>
              </div>
              <div className="formula-metric bonus">
                <span className="metric-weight">+2</span>
                <span className="metric-name">Hat Tricks</span>
                <span className="metric-desc">Bonus points per hat trick</span>
              </div>
            </div>
          </div>

          {mvpIndex.players.length >= 3 && (
            <div className="mvp-podium">
              {mvpIndex.players.slice(0, 3).map((p, idx) => (
                <div key={p.name} className={`podium-spot position-${idx + 1}`}>
                  <div className="podium-medal">
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                  </div>
                  <div className="podium-name">{p.name}</div>
                  <div className="podium-score">{p.mvpScore}</div>
                  <div className="podium-breakdown">
                    <span>{p.winPct}% WR</span>
                    <span>{p.goalsPerMatch} GPM</span>
                    <span>{p.matches} M</span>
                    <span>{p.goals} G</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {mvpIndex.players.length > 3 && (
            <div className="mvp-table">
              <div className="mvp-header">
                <span className="col-rank">#</span>
                <span className="col-name">Player</span>
                <span className="col-score">Score</span>
                <span className="col-matches">M</span>
                <span className="col-wins">W</span>
                <span className="col-goals">G</span>
                <span className="col-hattricks">HT</span>
                <span className="col-winrate">WR%</span>
              </div>
              {mvpIndex.players.slice(3).map((p, idx) => (
                <div key={p.name} className="mvp-row">
                  <span className="col-rank">{idx + 4}</span>
                  <span className="col-name">{p.name}</span>
                  <span className="col-score">{p.mvpScore}</span>
                  <span className="col-matches">{p.matches}</span>
                  <span className="col-wins">{p.wins}</span>
                  <span className="col-goals">{p.goals}</span>
                  <span className="col-hattricks">{p.hatTricks}</span>
                  <span className="col-winrate">{p.winPct}%</span>
                </div>
              ))}
            </div>
          )}

          {mvpIndex.players.length === 0 && (
            <div className="no-data-message">
              <p>No players with 10+ matches found for this season.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
