import { useState, useMemo, useEffect } from "react";
import { config } from "../../leaderboard-config.js";
import "./FunStats.css";

// Dynamically import all available match data files
// This pattern allows automatic pickup of new season files (2027, 2028, etc.)
const matchDataModules = import.meta.glob('../../data/attendance-data/20*.json', { eager: true });
const leaderboardDataModules = import.meta.glob('../../data/leaderboard-data/20*.json', { eager: true });

// Build matchDataByYear object from imported modules
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

// Get available seasons for the selector (2024+ that have data)
const getSelectableSeasons = () => {
  return Object.keys(matchDataByYear)
    .filter(year => parseInt(year) >= 2024)
    .sort((a, b) => b - a);
};

const toNameKey = (name) => String(name || "").trim().toLowerCase();

const normalizeSeasonOptions = (seasons) => {
  if (!Array.isArray(seasons)) return ["all"];
  const cleaned = seasons
    .map((s) => String(s).trim())
    .filter(Boolean)
    .filter((s) => s === "all" || /^\d{4}$/.test(s));
  return cleaned.length ? [...new Set(cleaned)] : ["all"];
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

// Clutch match: draw OR goal margin <= threshold
const isClutchScoreline = (scoreline, maxGoalDiff = 2) => {
  if (!scoreline || typeof scoreline !== "object") return false;
  const teams = Object.keys(scoreline);
  if (teams.length !== 2) return false;
  const a = Number(scoreline[teams[0]]) || 0;
  const b = Number(scoreline[teams[1]]) || 0;
  return a === b || Math.abs(a - b) <= maxGoalDiff;
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
  const outcomeTabCfg = useMemo(
    () => config.FUN_STATS?.outcomeGoalsTabs || {},
    []
  );
  const clutchCfg = useMemo(
    () => config.FUN_STATS?.clutchGoals || {},
    []
  );
  
  const [selectedSeason, setSelectedSeason] = useState("all");
  const [clutchSeason, setClutchSeason] = useState(clutchCfg.defaultSeason || "all");
  const [outcomeSeasons, setOutcomeSeasons] = useState(() => ({
    wins: outcomeTabCfg.wins?.defaultSeason || "all",
    losses: outcomeTabCfg.losses?.defaultSeason || "all",
    draws: outcomeTabCfg.draws?.defaultSeason || "all",
  }));

  const outcomeTabs = useMemo(() => {
    const defs = [
      { id: "outcome-wins", key: "wins", defaultLabel: "🏆 Winning Goals" },
      { id: "outcome-losses", key: "losses", defaultLabel: "💔 Goals in losing side" },
      { id: "outcome-draws", key: "draws", defaultLabel: "🤝 Goals in drawn games" },
    ];
    return defs.map((d) => {
      const cfg = outcomeTabCfg[d.key] || {};
      const seasons = normalizeSeasonOptions(cfg.seasons);
      const defaultSeason = seasons.includes(String(cfg.defaultSeason))
        ? String(cfg.defaultSeason)
        : (seasons.includes("all") ? "all" : seasons[0]);
      return {
        ...d,
        enabled: cfg.enabled !== false,
        label: cfg.label || d.defaultLabel,
        seasons,
        defaultSeason,
        topN: Number(cfg.topN) > 0 ? Number(cfg.topN) : 10,
      };
    });
  }, [outcomeTabCfg]);

  const clutchTab = useMemo(() => {
    const seasons = normalizeSeasonOptions(clutchCfg.seasons);
    const defaultSeason = seasons.includes(String(clutchCfg.defaultSeason))
      ? String(clutchCfg.defaultSeason)
      : (seasons.includes("all") ? "all" : seasons[0]);
    return {
      id: "clutch-goals",
      enabled: clutchCfg.enabled !== false,
      label: clutchCfg.label || "🔥 Clutch Goals",
      seasons,
      defaultSeason,
      topN: Number(clutchCfg.topN) > 0 ? Number(clutchCfg.topN) : 10,
      maxGoalDiff: Number(clutchCfg.maxGoalDiff) >= 0 ? Number(clutchCfg.maxGoalDiff) : 2,
    };
  }, [clutchCfg]);
  
  // Determine first enabled tab (align with `!== false` defaults used for tab visibility)
  const getDefaultTab = () => {
    if (config.FUN_STATS?.enableColorStats !== false) return "color-stats";
    if (config.FUN_STATS?.enableDreamTeamDuos !== false) return "dream-duos";
    if (config.FUN_STATS?.enableClutchGoals !== false && clutchTab.enabled) return clutchTab.id;
    const firstOutcome = outcomeTabs.find((t) => t.enabled);
    if (config.FUN_STATS?.enableOutcomeGoals !== false && firstOutcome) return firstOutcome.id;
    return "color-stats";
  };

  const validFunStatTabIds = useMemo(() => {
    const ids = [];
    if (config.FUN_STATS?.enableColorStats !== false) ids.push("color-stats");
    if (config.FUN_STATS?.enableDreamTeamDuos !== false) ids.push("dream-duos");
    if (config.FUN_STATS?.enableClutchGoals !== false && clutchTab.enabled) ids.push(clutchTab.id);
    if (config.FUN_STATS?.enableOutcomeGoals !== false) {
      outcomeTabs.filter((t) => t.enabled).forEach((t) => ids.push(t.id));
    }
    return ids;
  }, [clutchTab, outcomeTabs]);

  const [activeSubTab, setActiveSubTab] = useState(getDefaultTab);

  useEffect(() => {
    if (!config.FUN_STATS?.enabled) return;
    if (validFunStatTabIds.length > 0 && !validFunStatTabIds.includes(activeSubTab)) {
      setActiveSubTab(validFunStatTabIds[0]);
    }
  }, [validFunStatTabIds, activeSubTab]);

  useEffect(() => {
    setOutcomeSeasons((prev) => {
      const next = { ...prev };
      outcomeTabs.forEach((tab) => {
        const current = String(prev[tab.key] || "");
        next[tab.key] = tab.seasons.includes(current) ? current : tab.defaultSeason;
      });
      return next;
    });
  }, [outcomeTabs]);

  useEffect(() => {
    setClutchSeason((prev) => (clutchTab.seasons.includes(String(prev)) ? prev : clutchTab.defaultSeason));
  }, [clutchTab]);

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

  // Get match count label based on active tab
  const getMatchCountLabel = () => {
    switch (activeSubTab) {
      case "color-stats": return `${colorStatsMatches.length} matches`;
      case "dream-duos": return "various data sources";
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

  const outcomeGoalsData = useMemo(() => {
    if (config.FUN_STATS?.enableOutcomeGoals === false) return {};

    const outcomeKindByTab = {
      wins: "wins",
      losses: "losses",
      draws: "draws",
    };

    const buildForTab = (tab) => {
      const selected = String(outcomeSeasons[tab.key] || tab.defaultSeason || "all");
      const seasonsToUse = selected === "all"
        ? tab.seasons.filter((s) => s !== "all")
        : [selected];

      /** @type {Record<string, {goals: number, name: string}>} */
      const goalsByPlayer = {};
      seasonsToUse.forEach((year) => {
        const matches = getValidMatches(year, false);
        matches.forEach((match) => {
          if (!match?.scoreline || !match?.attendance) return;
          const winner = getWinningTeam(match.scoreline);
          const players = getPlayersFromAttendance(match.attendance);
          players.forEach((p) => {
            if (!isTrackablePlayer(p.name)) return;
            const g = Number(p.goals) || 0;
            if (g <= 0) return;
            const isWin = winner !== "DRAW" && winner === p.team;
            const isLoss = winner !== "DRAW" && winner !== p.team;
            const isDraw = winner === "DRAW";
            const kind = outcomeKindByTab[tab.key];
            const include = (kind === "wins" && isWin) || (kind === "losses" && isLoss) || (kind === "draws" && isDraw);
            if (!include) return;

            const nk = toNameKey(p.name);
            if (!goalsByPlayer[nk]) goalsByPlayer[nk] = { goals: 0, name: String(p.name).trim() };
            goalsByPlayer[nk].goals += g;
          });
        });
      });

      /** @type {Record<string, {wins:number, losses:number, draws:number}>} */
      const wldByPlayer = {};
      seasonsToUse.forEach((year) => {
        const players = leaderboardDataByYear[year];
        if (!Array.isArray(players)) return;
        players.forEach((p) => {
          if (!isTrackablePlayer(p?.name)) return;
          const nk = toNameKey(p.name);
          if (!wldByPlayer[nk]) {
            wldByPlayer[nk] = { wins: 0, losses: 0, draws: 0 };
          }
          wldByPlayer[nk].wins += Number(p.wins) || 0;
          wldByPlayer[nk].losses += Number(p.losses) || 0;
          wldByPlayer[nk].draws += Number(p.draws) || 0;
        });
      });

      const rows = Object.entries(goalsByPlayer)
        .map(([nk, g]) => {
          const counts = wldByPlayer[nk] || { wins: 0, losses: 0, draws: 0 };
          return {
            key: nk,
            name: g.name,
            goals: g.goals,
            wins: counts.wins,
            losses: counts.losses,
            draws: counts.draws,
          };
        })
        .sort((a, b) => b.goals - a.goals || b.wins - a.wins || a.name.localeCompare(b.name))
        .slice(0, tab.topN);

      return {
        selectedSeason: selected,
        rows,
      };
    };

    return Object.fromEntries(outcomeTabs.map((tab) => [tab.key, buildForTab(tab)]));
  }, [outcomeTabs, outcomeSeasons]);

  const clutchGoalsData = useMemo(() => {
    if (config.FUN_STATS?.enableClutchGoals === false || !clutchTab.enabled) return { rows: [], matchCount: 0 };

    const years = clutchSeason === "all"
      ? clutchTab.seasons.filter((s) => s !== "all")
      : [clutchSeason];

    /** @type {Record<string, {name:string, goals:number}>} */
    const goalsByPlayer = {};
    let clutchMatchCount = 0;

    years.forEach((year) => {
      const matches = getValidMatches(year, false);
      matches.forEach((match) => {
        if (!isClutchScoreline(match.scoreline, clutchTab.maxGoalDiff)) return;
        clutchMatchCount += 1;
        getPlayersFromAttendance(match.attendance).forEach((p) => {
          if (!isTrackablePlayer(p.name)) return;
          const goals = Number(p.goals) || 0;
          if (goals <= 0) return;
          const key = toNameKey(p.name);
          if (!goalsByPlayer[key]) goalsByPlayer[key] = { name: String(p.name).trim(), goals: 0 };
          goalsByPlayer[key].goals += goals;
        });
      });
    });

    const rows = Object.values(goalsByPlayer)
      .sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name))
      .slice(0, clutchTab.topN);

    return { rows, matchCount: clutchMatchCount };
  }, [clutchSeason, clutchTab]);

  // Feature flags
  const enableColorStats = config.FUN_STATS?.enableColorStats !== false;
  const enableDreamDuos = config.FUN_STATS?.enableDreamTeamDuos !== false;
  const enableClutchGoals = config.FUN_STATS?.enableClutchGoals !== false;
  const enableOutcomeGoals = config.FUN_STATS?.enableOutcomeGoals !== false;

  if (!config.FUN_STATS?.enabled) {
    return null;
  }

  // Build tabs list based on enabled features
  const tabs = [
    { id: "color-stats", label: "🎨 Colors", enabled: enableColorStats },
    { id: "dream-duos", label: "🤝 Duos", enabled: enableDreamDuos },
    { id: clutchTab.id, label: clutchTab.label, enabled: enableClutchGoals && clutchTab.enabled },
    ...outcomeTabs.map((t) => ({ id: t.id, label: t.label, enabled: enableOutcomeGoals && t.enabled })),
  ].filter(t => t.enabled);

  const showGlobalSeasonSelector = activeSubTab === "color-stats" || activeSubTab === "dream-duos";

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
        
        {showGlobalSeasonSelector ? (
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
        ) : null}
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

      {/* ========== CLUTCH GOALS ========== */}
      {enableClutchGoals && clutchTab.enabled && activeSubTab === clutchTab.id ? (
        <div className="clutch-goals-section">
          <div className="section-header section-header--with-selector">
            <div>
              <h2>{clutchTab.label}</h2>
              <p className="section-subtitle">
                Top {clutchTab.topN} scorers in clutch games (draws or goal diff ≤ {clutchTab.maxGoalDiff})
              </p>
            </div>
            {clutchTab.seasons.length > 1 ? (
              <div className="fun-stats-season-selector">
                <label htmlFor="fun-stats-clutch-season">Season</label>
                <div className="select-wrapper">
                  <select
                    id="fun-stats-clutch-season"
                    value={clutchSeason}
                    onChange={(e) => setClutchSeason(e.target.value)}
                  >
                    {clutchTab.seasons.map((s) => (
                      <option key={s} value={s}>
                        {s === "all" ? "All Time" : s}
                      </option>
                    ))}
                  </select>
                  <span className="select-arrow">▼</span>
                </div>
              </div>
            ) : null}
          </div>

          {clutchGoalsData.rows.length > 0 ? (
            <div className="clutch-goals-table">
              <div className="clutch-goals-header">
                <span className="col-rank">#</span>
                <span className="col-name">Player</span>
                <span className="col-goals">Clutch Goals</span>
              </div>
              {clutchGoalsData.rows.map((row, idx) => (
                <div key={row.name} className={`clutch-goals-row place-${idx + 1}`}>
                  <span className="col-rank">
                    {idx < 3 ? (idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉") : `#${idx + 1}`}
                  </span>
                  <span className="col-name">{row.name}</span>
                  <span className="col-goals">{row.goals}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-data-message">
              <p>No clutch-goal data available for the selected season.</p>
            </div>
          )}
        </div>
      ) : null}

      {/* ========== OUTCOME GOALS TABS ========== */}
      {enableOutcomeGoals && outcomeTabs.map((tab) => {
        const active = activeSubTab === tab.id && tab.enabled;
        if (!active) return null;
        const data = outcomeGoalsData[tab.key] || { rows: [], selectedSeason: "all" };
        const selectorId = `fun-stats-season-${tab.key}`;
        const showSelector = tab.seasons.length > 1;
        const subtitleSeason = data.selectedSeason === "all" ? "All Time" : data.selectedSeason;
        const countField =
          tab.key === "wins" ? "wins" : tab.key === "losses" ? "losses" : "draws";
        const countHeader = countField === "wins" ? "Wins" : countField === "losses" ? "Losses" : "Draws";
        return (
          <div key={tab.id} className="outcome-goals-section">
            <div className="section-header section-header--with-selector">
              <div>
                <h2>{tab.label}</h2>
                <p className="section-subtitle">
                  Top {tab.topN} players by goals from attendance match sheets with {countHeader.toLowerCase()} from leaderboard data ({subtitleSeason})
                </p>
              </div>
              {showSelector ? (
                <div className="fun-stats-season-selector">
                  <label htmlFor={selectorId}>Season</label>
                  <div className="select-wrapper">
                    <select
                      id={selectorId}
                      value={outcomeSeasons[tab.key] || tab.defaultSeason}
                      onChange={(e) =>
                        setOutcomeSeasons((prev) => ({ ...prev, [tab.key]: e.target.value }))
                      }
                    >
                      {tab.seasons.map((s) => (
                        <option key={s} value={s}>
                          {s === "all" ? "All Time" : s}
                        </option>
                      ))}
                    </select>
                    <span className="select-arrow">▼</span>
                  </div>
                </div>
              ) : null}
            </div>

            {data.rows.length > 0 ? (
              <div className="outcome-table">
                <div className="outcome-header">
                  <span className="col-rank">#</span>
                  <span className="col-name">Player</span>
                  <span className="col-goals">Goals</span>
                  <span className="col-count">{countHeader}</span>
                </div>
                {data.rows.map((p, idx) => (
                  <div key={p.key} className={`outcome-row ${idx === 0 ? "top" : ""}`}>
                    <span className="col-rank">{idx + 1}</span>
                    <span className="col-name">{p.name}</span>
                    <span className="col-goals">{p.goals}</span>
                    <span className="col-count">{p[countField]}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-data-message">
                <p>No scoring data available for the selected season.</p>
              </div>
            )}
          </div>
        );
      })}

    </div>
  );
};

