/**
 * Leaderboard Configuration
 * 
 * This file contains constants that control the functionality of the leaderboard.
 * Modify these values to enable/disable features.
 */

export const config = {
  // Feature Toggles
  ENABLE_COMPARISON: true,      // Show checkboxes and allow player comparison
  ENABLE_SEARCH: true,           // Show search input for filtering players
  ENABLE_MAX_HIGHLIGHT: true,    // Highlight max values in gold
  ENABLE_PLAYER_MODAL: true,     // Click player name to view detailed profile
  ENABLE_TICKER: true,           // Show news ticker with witty messages

  // Default Settings
  DEFAULT_SORT_KEY: "matches",   // Default column to sort by
  DEFAULT_SORT_DIR: "desc",      // Default sort direction ("asc" or "desc")

  // Comparison Settings
  MAX_COMPARE_PLAYERS: 3,        // Maximum players that can be compared

  // Stats Leaderboard Settings (Main leaderboard tab)
  STATS_LEADERBOARD: {
    enabled: true,                      // Show/hide the Stats Leaderboard tab
    seasons: ["2024", "2025", "2026"],  // Available seasons
    defaultSeason: "2026",              // Default season to load
  },

  // Attendance Settings (Attendance tab)
  ATTENDANCE: {
    enabled: true,                      // Show/hide the Attendance tab

    // Attendance Leaderboard sub-tab settings
    LEADERBOARD: {
      enabled: true,                    // Show/hide the Leaderboard sub-tab
      seasons: ["2025", "2026"],        // Available seasons
      defaultSeason: "2026",            // Default season to load
    },

    // Attendance Weekly Tracker settings
    TRACKER: {
      enabled: true,                    // Show/hide the Tracker sub-tab
      seasons: ["2026"],                // Available seasons (per-match data starts from 2026)
      defaultSeason: "2026",            // Default season to load
      enableFieldViewModal: true,      // Show field view modal when clicking match headers
    },
  },

  // Insights Settings
  INSIGHTS: {
    enabled: true,               // Show/hide the Insights tab
    seasons: ["2024", "2025", "2026"],  // Seasons available in the Insights tab
    defaultSeason: "2026",       // Default season shown on Insights tab
  },

  // Scoring Trends Settings
  SCORING_TRENDS: {
    enabled: true,               // Show/hide the Scoring Trends tab
    seasons: ["2026", "2025", "2024"],   // Seasons with per-match data available
    defaultSeason: "2026",       // Default season shown on Scoring Trends tab
    enableScoringTrends: true,   // Show/hide the "Scoring Trends" sub-tab (graph view)
    enableScorersTrend: true,   // Show/hide the "Scorers Trend" sub-tab (weekly top scorers table)
    enableScoringDiffs: true,   // Show/hide the "Scoring Diffs" sub-tab (goal differences view)
  },

  // Head to Head Settings (Standalone Tab)
  H2H: {
    enabled: true,                     // Show/hide the H2H tab
    seasons: ["2024", "2025", "2026"],         // Seasons with per-match data available
    defaultSeason: "all",              // Default: "all" for combined, or specific year
    requiresBackfill: true,            // 2024 and 2025 data must have isBackfilled: true
  },

  // Fun Stats Settings
  FUN_STATS: {
    enabled: true,                     // Show/hide the Fun Stats tab
    seasons: ["2024", "2025", "2026"],         // Seasons with per-match data available (auto-picks up new years)
    defaultSeason: "all",              // Default: "all" for combined, or specific year
    enableColorStats: true,            // Show/hide the Color Win Rates feature
    
    // Additional Fun Stats Features
    enableHotStreaks: true,            // 🔥 Player winning/scoring streaks (2026+ data only)
    enableDreamTeamDuos: true,         // 🤝 Best performing player pairs
    enableClutchFactor: true,          // 🎯 Decisive scorers in close games (≤2 goal margin)
    enableOGLeaders: true,             // 😅 Own Goal Leaders (Hall of Unfortunate Moments)
    
    // Which features require isBackfilled:true for 2024 and 2025 data
    // true = only include 2024/2025 matches marked as backfilled (complete data required)
    // false = include all 2024/2025 matches (scoreline data is sufficient)
    requiresBackfill: {
      colorStats: false,               // Scoreline data is sufficient for color win rates
      hotStreaks: true,                // Requires complete player attendance data
      duosWinRate: true,               // Requires complete attendance for team composition
      duosTopScoring: false,           // Scorer info is captured accurately
      duosMostGames: true,             // Requires complete attendance data
      clutchFactor: false,             // Scorer info + scoreline is sufficient
      ogLeaders: true,                 // Requires complete player data to track own goals
    },
  },

  // MVP Leaderboard Settings
  MVP_LEADERBOARD: {
    enabled: true,                     // Show/hide the MVP Leaderboard tab
    seasons: ["2024", "2025", "2026"], // Available seasons for MVP calculation
    defaultSeason: "all",              // Default season ("all" for All Time, or specific year)
  },

  // Match Entry Admin Tool
  MATCH_ENTRY: {
    enabled: true,                     // Show/hide the Match Entry tab (admin tool)
    backfillYear: 2026,                // Years before this are marked as backfilled
  },

  // Create Lineup Admin Tool
  CREATE_LINEUP: {
    enabled: true,                     // Show/hide the Create Lineup tab (admin tool)
  },

  // Weekly Teams Settings
  WEEKLY_TEAMS: {
    enabled: true,                     // Show/hide the Weekly Teams tab
    seasons: ["2024", "2025", "2026"],         // Seasons with per-match attendance data
    defaultSeason: "2026",             // Default season to load
  },

  // Defenders Corner Settings
  DEFENDERS_CORNER: {
    enabled: true,                     // Show/hide the Defenders Corner tab
    seasons: ["2024", "2025", "2026"], // Available seasons for defender stats
    trackerSeasons: ["2024", "2025", "2026"],  // Seasons with per-match tracker data
    defaultSeason: "all",              // Default season ("all" for All Time)
    minMatches: 5,                     // Minimum matches for leaderboard eligibility
    defenderPositions: ["GK", "CB", "LB", "RB"], // Only these 4 positions are considered as defenders
  },

  // Hall of Fame Settings
  HALL_OF_FAME: {
    enabled: true,                      // Show/hide the Hall of Fame tab
  },
};

