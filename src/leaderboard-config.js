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
};

