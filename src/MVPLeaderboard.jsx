import { useState, useMemo } from "react";
import { config } from "./leaderboard-config.js";
import { 
  calculateMultiSeasonMVP, 
  MVP_WEIGHTS,
} from "./utils/position-weights.js";
import "./FunStats.css"; // Reuse MVP styles from FunStats.css

// Import leaderboard data for MVP calculations
const leaderboardDataModules = import.meta.glob('./data/leaderboard-data/20*.json', { eager: true });

// Build leaderboardDataByYear object from imported modules
const leaderboardDataByYear = {};
Object.entries(leaderboardDataModules).forEach(([path, module]) => {
  const yearMatch = path.match(/(\d{4})\.json$/);
  if (yearMatch) {
    leaderboardDataByYear[yearMatch[1]] = module.default;
  }
});

// Get available MVP seasons (from config or discovered files)
const getMVPSeasons = () => {
  if (config.MVP_LEADERBOARD?.seasons) {
    return config.MVP_LEADERBOARD.seasons;
  }
  // Fallback to discovered files
  return Object.keys(leaderboardDataByYear).sort((a, b) => b - a);
};

export const MVPLeaderboard = () => {
  const mvpSeasons = getMVPSeasons();
  
  // Season selector for MVP (uses config default)
  const [mvpSelectedSeason, setMvpSelectedSeason] = useState(
    config.MVP_LEADERBOARD?.defaultSeason || "all"
  );

  // ================== MVP INDEX (using leaderboard data with intelligent position weighting) ==================
  const mvpIndex = useMemo(() => {
    if (!config.MVP_LEADERBOARD?.enabled) return null;
    
    const seasonsToUse = mvpSelectedSeason === "all" ? mvpSeasons : [mvpSelectedSeason];
    
    // Step 1: Collect per-season stats for each player
    // This allows us to properly weight goals based on position in EACH season
    const playerSeasonStats = {}; // { playerName: { season: seasonStats } }
    
    seasonsToUse.forEach(year => {
      const yearData = leaderboardDataByYear[year];
      if (!yearData) return;
      
      yearData.forEach(player => {
        // Skip "Others"
        if (player.name === 'Others') return;
        
        if (!playerSeasonStats[player.name]) {
          playerSeasonStats[player.name] = {};
        }
        
        // Get position string from array
        const positionStr = Array.isArray(player.position) 
          ? player.position.join('/') 
          : player.position || 'ALL';
        
        // Store this season's stats with position-specific weighting
        playerSeasonStats[player.name][year] = {
          season: year,
          matches: player.matches || 0,
          wins: player.wins || 0,
          draws: player.draws || 0,
          losses: player.losses || 0,
          goals: player.goals || 0,
          cleanSheets: player.cleanSheets || 0,
          hatTricks: player.hatTricks || 0,
          ownGoals: player.ownGoals || 0,
          position: positionStr,
        };
      });
    });
    
    // Step 2: Aggregate per-season stats using the intelligent algorithm
    const aggregatedStats = {};
    
    Object.entries(playerSeasonStats).forEach(([playerName, seasons]) => {
      const seasonStatsArray = Object.values(seasons);
      
      // Use the intelligent multi-season aggregation
      const aggregated = calculateMultiSeasonMVP(seasonStatsArray);
      
      if (aggregated && aggregated.matches >= 10) { // Minimum 10 matches
        aggregatedStats[playerName] = {
          ...aggregated,
          name: playerName,
        };
      }
    });
    
    // Step 3: Find max matches for attendance normalization
    const maxMatches = Math.max(...Object.values(aggregatedStats).map(p => p.matches), 1);
    
    // Step 4: Calculate MVP scores using updated weights
    // Weights: Win Rate (40%), Weighted Goals/Match (30%), Attendance (25%), Clean Sheets (+5 per CS)
    const results = Object.values(aggregatedStats)
      .map(data => {
        const attendancePct = (data.matches / maxMatches) * 100;
        
        // Normalize weighted goals per match (assume 4.0 is exceptional, scale to 0-100)
        // Using 4.0 instead of 2.0 to prevent high-scoring players from being capped
        const normalizedGoals = Math.min(data.weightedGoalsPerMatch / 4.0 * 100, 100);
        
        // Calculate MVP score with updated weights
        const mvpScore = (
          (data.winPct * MVP_WEIGHTS.WIN_RATE) +
          (normalizedGoals * MVP_WEIGHTS.WEIGHTED_GOALS) +
          (attendancePct * MVP_WEIGHTS.ATTENDANCE) +
          (data.cleanSheets * MVP_WEIGHTS.CLEAN_SHEET_BONUS) +  // Bonus points per clean sheet
          (data.hatTricks * MVP_WEIGHTS.HAT_TRICK_BONUS) -
          (data.ownGoals * MVP_WEIGHTS.OWN_GOAL_PENALTY)
        );
        
        // Build position breakdown string for multi-season players
        let positionDisplay = data.displayPosition;
        let positionDetails = null;
        
        if (data.isMultiPosition && data.seasonContributions) {
          // Show breakdown of positions by season with games played
          positionDetails = data.seasonContributions
            .filter(s => s.matches > 0)
            .map(s => `${s.season}: ${s.position} (${s.matches}G, ${s.posWeight.toFixed(1)}x)`)
            .join(' | ');
        }
        
        return {
          name: data.name,
          matches: data.matches,
          wins: data.wins,
          draws: data.draws,
          losses: data.losses,
          goals: data.goals,
          weightedGoals: data.weightedGoals.toFixed(1),
          cleanSheets: data.cleanSheets,
          hatTricks: data.hatTricks,
          ownGoals: data.ownGoals,
          position: positionDisplay,
          positionDetails,
          isMultiPosition: data.isMultiPosition,
          effectiveMultiplier: data.effectiveMultiplier.toFixed(2),
          winPct: data.winPct.toFixed(1),
          attendancePct: attendancePct.toFixed(1),
          goalsPerMatch: data.goalsPerMatch.toFixed(2),
          weightedGPM: data.weightedGoalsPerMatch.toFixed(2),
          cleanSheetPct: data.cleanSheetPct.toFixed(1),
          mvpScore: mvpScore.toFixed(1),
          // Season breakdown for tooltip/details
          seasonBreakdown: data.seasonContributions,
        };
      })
      .sort((a, b) => parseFloat(b.mvpScore) - parseFloat(a.mvpScore));
    
    return {
      players: results.slice(0, 20),
      totalPlayers: Object.keys(playerSeasonStats).length,
      seasonLabel: mvpSelectedSeason === "all" ? "All Time" : mvpSelectedSeason,
      weights: MVP_WEIGHTS, // Pass weights for display
    };
  }, [mvpSelectedSeason, mvpSeasons]);

  if (!config.MVP_LEADERBOARD?.enabled) {
    return null;
  }

  if (!mvpIndex) {
    return (
      <div className="fun-stats">
        <div className="no-data-message">
          <p>Loading MVP data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fun-stats">
      <div className="mvp-index-section">
        <div className="section-header">
          <div className="mvp-header-row">
            <div>
              <h2>🏆 MVP Leaderboard</h2>
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
              <span className="metric-weight">{(MVP_WEIGHTS.WIN_RATE * 100).toFixed(0)}%</span>
              <span className="metric-name">Win Rate</span>
              <span className="metric-desc">% of matches won with your team</span>
            </div>
            <div className="formula-metric weighted">
              <span className="metric-weight">{(MVP_WEIGHTS.WEIGHTED_GOALS * 100).toFixed(0)}%</span>
              <span className="metric-name">Weighted Goals</span>
              <span className="metric-desc">Goals × Position Multiplier (GK: 4x, DEF: 2.5x, MID: 1.5x, FWD: 1x)</span>
            </div>
            <div className="formula-metric">
              <span className="metric-weight">{(MVP_WEIGHTS.ATTENDANCE * 100).toFixed(0)}%</span>
              <span className="metric-name">Attendance</span>
              <span className="metric-desc">% of max matches played</span>
            </div>
            <div className="formula-metric bonus">
              <span className="metric-weight">+{MVP_WEIGHTS.CLEAN_SHEET_BONUS}</span>
              <span className="metric-name">Clean Sheets</span>
              <span className="metric-desc">Bonus points per clean sheet</span>
            </div>
            <div className="formula-metric bonus">
              <span className="metric-weight">+{MVP_WEIGHTS.HAT_TRICK_BONUS}</span>
              <span className="metric-name">Hat Tricks</span>
              <span className="metric-desc">Bonus points per hat trick</span>
            </div>
          </div>
          <p className="formula-note">
            💡 Position-based weighting ensures fair comparison: A defender's goal counts more than a striker's goal.
            {mvpSelectedSeason === "all" && " For All Time: position multipliers are calculated per-season based on games played."}
          </p>
        </div>

        {mvpIndex.players.length >= 3 && (
          <div className="mvp-podium">
            {mvpIndex.players.slice(0, 3).map((p, idx) => (
              <div key={p.name} className={`podium-spot position-${idx + 1}`}>
                <div className="podium-medal">
                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                </div>
                <div className="podium-name">{p.name}</div>
                <div className="podium-position-badge" title={p.positionDetails || p.position}>
                  {p.position}
                  {p.isMultiPosition && <span className="multi-pos-indicator">⚡</span>}
                </div>
                <div className="podium-multiplier">
                  ×{p.effectiveMultiplier}
                  {p.isMultiPosition && <span className="calc-note">dynamic</span>}
                </div>
                <div className="podium-score">{p.mvpScore}</div>
                <div className="podium-breakdown">
                  <span>{p.winPct}% WR</span>
                  <span>{p.goals}G → {p.weightedGoals}WG</span>
                  <span>{p.matches}M</span>
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
              <span className="col-pos">Pos</span>
              <span className="col-score">Score</span>
              <span className="col-matches">M</span>
              <span className="col-goals">G</span>
              <span className="col-wg">WG</span>
              <span className="col-mult">×</span>
              <span className="col-winrate">WR%</span>
            </div>
            {mvpIndex.players.slice(3).map((p, idx) => (
              <div key={p.name} className="mvp-row" title={p.positionDetails || ''}>
                <span className="col-rank">{idx + 4}</span>
                <span className="col-name">
                  {p.name}
                  {p.isMultiPosition && <span className="multi-pos-dot" title={p.positionDetails}>⚡</span>}
                </span>
                <span className="col-pos">{p.position}</span>
                <span className="col-score">{p.mvpScore}</span>
                <span className="col-matches">{p.matches}</span>
                <span className="col-goals">{p.goals}</span>
                <span className="col-wg">{p.weightedGoals}</span>
                <span className="col-mult">{p.effectiveMultiplier}</span>
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
    </div>
  );
};

