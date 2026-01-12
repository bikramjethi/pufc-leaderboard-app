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
      enableFieldViewModal: false,      // Show field view modal when clicking match headers
    },
  },

  // Insights Settings
  INSIGHTS: {
    enabled: true,               // Show/hide the Insights tab
    seasons: ["2024", "2025"],  // Seasons available in the Insights tab
    defaultSeason: "2025",       // Default season shown on Insights tab
  },

  // Scoring Trends Settings
  SCORING_TRENDS: {
    enabled: true,               // Show/hide the Scoring Trends tab
    seasons: ["2026", "2025"],   // Seasons with per-match data available
    defaultSeason: "2026",       // Default season shown on Scoring Trends tab
    enableScoringTrends: false,   // Show/hide the "Scoring Trends" sub-tab (graph view)
    enableScorersTrend: true,   // Show/hide the "Scorers Trend" sub-tab (weekly top scorers table)
    enableScoringDiffs: false,   // Show/hide the "Scoring Diffs" sub-tab (goal differences view)
  },
};

