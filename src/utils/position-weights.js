/**
 * Position Weights for MVP Calculation
 * 
 * These weights are used to normalize goal contributions across different positions.
 * Higher weights mean goals are rarer/more valuable for that position.
 * 
 * The multiplier is applied to goals scored to create "weighted goals" that
 * can be fairly compared across positions.
 */

export const positionWeights = {
  // Goalkeepers - scoring is exceptional
  'GK': 4.0,
  
  // Defenders - scoring is uncommon
  'DEF': 2.5,
  'CB': 2.5,
  'LB': 2.0,
  'RB': 2.0,
  
  // Midfielders - scoring is regular
  'MID': 1.5,
  'CM': 1.5,
  'CDM': 1.8,
  'CAM': 1.2,
  'LM': 1.3,
  'RM': 1.3,
  
  // Forwards/Wingers - scoring is expected
  'FWD': 1.0,
  'ST': 1.0,
  'LW': 1.1,
  'RW': 1.1,
  
  // Versatile - average of all
  'ALL': 1.5,
};

/**
 * Get the weight for a position string that may contain multiple positions
 * e.g., "LW/LB" would average the weights for LW and LB
 * 
 * @param {string} positionStr - Position string (e.g., "FWD", "LW/LB", "MID/DEF")
 * @returns {number} - The calculated weight
 */
export function getPositionWeight(positionStr) {
  if (!positionStr) return 1.0;
  
  // Split by common delimiters
  const positions = positionStr.split(/[/,\s]+/).map(p => p.trim().toUpperCase()).filter(Boolean);
  
  if (positions.length === 0) return 1.0;
  
  // Calculate average weight across all positions
  const weights = positions.map(pos => positionWeights[pos] ?? 1.0);
  const avgWeight = weights.reduce((sum, w) => sum + w, 0) / weights.length;
  
  return avgWeight;
}

/**
 * Calculate weighted goals for a player who played different positions across seasons
 * 
 * @param {Array} seasonStats - Array of { season, goals, matches, position, wins, losses, draws, cleanSheets, hatTricks, ownGoals }
 * @returns {Object} - Aggregated stats with intelligent weighting
 */
export function calculateMultiSeasonMVP(seasonStats) {
  if (!seasonStats || seasonStats.length === 0) {
    return null;
  }
  
  // Calculate per-season weighted contributions
  const seasonContributions = seasonStats.map(season => {
    const posWeight = getPositionWeight(season.position);
    const weightedGoals = (season.goals || 0) * posWeight;
    const matches = season.matches || 0;
    const wins = season.wins || 0;
    const winPct = matches > 0 ? (wins / matches) * 100 : 0;
    
    return {
      ...season,
      posWeight,
      weightedGoals,
      winPct,
      // Per-match rates for this season
      goalsPerMatch: matches > 0 ? season.goals / matches : 0,
      weightedGoalsPerMatch: matches > 0 ? weightedGoals / matches : 0,
      cleanSheetPct: matches > 0 ? (season.cleanSheets || 0) / matches * 100 : 0,
    };
  });
  
  // Aggregate totals
  const totalMatches = seasonContributions.reduce((sum, s) => sum + (s.matches || 0), 0);
  const totalWins = seasonContributions.reduce((sum, s) => sum + (s.wins || 0), 0);
  const totalGoals = seasonContributions.reduce((sum, s) => sum + (s.goals || 0), 0);
  const totalWeightedGoals = seasonContributions.reduce((sum, s) => sum + s.weightedGoals, 0);
  const totalCleanSheets = seasonContributions.reduce((sum, s) => sum + (s.cleanSheets || 0), 0);
  const totalHatTricks = seasonContributions.reduce((sum, s) => sum + (s.hatTricks || 0), 0);
  const totalOwnGoals = seasonContributions.reduce((sum, s) => sum + (s.ownGoals || 0), 0);
  
  // Calculate effective position multiplier (what multiplier would give us the same weighted goals)
  const effectiveMultiplier = totalGoals > 0 ? totalWeightedGoals / totalGoals : 1.0;
  
  // Games-weighted position string (for display)
  const positionBreakdown = seasonContributions
    .filter(s => s.matches > 0)
    .map(s => ({
      position: s.position,
      matches: s.matches,
      weight: s.posWeight,
      contribution: s.matches / totalMatches,
    }));
  
  // Build a descriptive position string showing the blend
  const uniquePositions = [...new Set(seasonContributions.map(s => s.position).filter(Boolean))];
  const displayPosition = uniquePositions.length > 1 
    ? uniquePositions.join(' → ')  // Show position evolution
    : uniquePositions[0] || 'N/A';
  
  return {
    // Totals
    matches: totalMatches,
    wins: totalWins,
    goals: totalGoals,
    weightedGoals: totalWeightedGoals,
    cleanSheets: totalCleanSheets,
    hatTricks: totalHatTricks,
    ownGoals: totalOwnGoals,
    
    // Calculated rates
    winPct: totalMatches > 0 ? (totalWins / totalMatches) * 100 : 0,
    goalsPerMatch: totalMatches > 0 ? totalGoals / totalMatches : 0,
    weightedGoalsPerMatch: totalMatches > 0 ? totalWeightedGoals / totalMatches : 0,
    cleanSheetPct: totalMatches > 0 ? (totalCleanSheets / totalMatches) * 100 : 0,
    
    // Position info
    effectiveMultiplier,
    displayPosition,
    positionBreakdown,
    seasonContributions,
    
    // For debugging/display
    isMultiPosition: uniquePositions.length > 1,
  };
}

/**
 * MVP Formula Weights
 * These can be adjusted to tune the MVP calculation
 */
export const MVP_WEIGHTS = {
  WIN_RATE: 0.40,           // 40% - Winning is crucial
  WEIGHTED_GOALS: 0.30,     // 30% - Position-adjusted goal contribution
  ATTENDANCE: 0.30,         // 30% - Being present matters (Total: 100%)
  CLEAN_SHEET_BONUS: 5,     // +5 points per clean sheet (bonus, not percentage)
  HAT_TRICK_BONUS: 2,       // +2 points per hat trick
  OWN_GOAL_PENALTY: 1,      // -1 point per own goal
};

/**
 * Calculate MVP score using the weighted formula
 * 
 * @param {Object} stats - Player aggregated stats
 * @param {number} maxMatches - Maximum matches played by any player (for attendance normalization)
 * @returns {number} - MVP score
 */
export function calculateMVPScore(stats, maxMatches) {
  const {
    winPct,
    weightedGoalsPerMatch,
    matches,
    cleanSheets,
    hatTricks,
    ownGoals,
  } = stats;
  
  // Normalize attendance (0-100 scale based on max matches)
  const attendancePct = maxMatches > 0 ? (matches / maxMatches) * 100 : 0;
  
  // Normalize weighted goals per match (assume 2.0 is exceptional, scale to 0-100)
  const normalizedGoals = Math.min(weightedGoalsPerMatch / 2.0 * 100, 100);
  
  // Calculate base score
  const score = (
    winPct * MVP_WEIGHTS.WIN_RATE +
    normalizedGoals * MVP_WEIGHTS.WEIGHTED_GOALS +
    attendancePct * MVP_WEIGHTS.ATTENDANCE +
    (cleanSheets * MVP_WEIGHTS.CLEAN_SHEET_BONUS) +  // Bonus points per clean sheet
    (hatTricks * MVP_WEIGHTS.HAT_TRICK_BONUS) -
    (ownGoals * MVP_WEIGHTS.OWN_GOAL_PENALTY)
  );
  
  return score;
}

