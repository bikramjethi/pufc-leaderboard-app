# PUFC Leaderboard

A player statistics leaderboard app for our local football club.

## Features

- **Season-based data** — View stats per year (2024, 2025, etc.)
- **All-Time leaderboard** — Aggregate career stats across all seasons
- **Sortable columns** — Click any column header to sort (ascending/descending)
- **Player search** — Filter players by name or position
- **Player comparison** — Select multiple players to compare stats side-by-side
- **Player profile modal** — Click any player name to view detailed stats, season history, and career totals
- **Max value highlighting** — Season leaders highlighted in gold
- **Position badges** — Color-coded player positions (FWD, MID, DEF, GK, ALL)
- **Win/Loss percentages** — Calculated W% and L% columns
- **Matches played tracking** — Default sorting by matches played
- **Sticky table header** — Column headers stay visible when scrolling
- **Tooltips** — Hover over column headers to see full descriptions
- **Dark/Light theme** — Toggle between themes (preference saved to localStorage)
- **Configurable** — Toggle features on/off via config file

## Stats Tracked

| Column | Description |
|--------|-------------|
| MP | Matches Played |
| W | Wins |
| D | Draws |
| L | Losses |
| W% | Win Rate |
| L% | Loss Rate |
| CS | Clean Sheets |
| G | Goals |
| HT | Hat Tricks |

## Configuration

The leaderboard can be customized via `src/leaderboard-config.js`:

```javascript
export const config = {
  // Feature Toggles
  ENABLE_COMPARISON: true,       // Show checkboxes and allow player comparison
  ENABLE_SEARCH: true,           // Show search input for filtering players
  ENABLE_MAX_HIGHLIGHT: true,    // Highlight max values in gold
  ENABLE_PLAYER_MODAL: true,     // Click player name to view detailed profile

  // Default Settings
  DEFAULT_SORT_KEY: "matches",   // Default column to sort by
  DEFAULT_SORT_DIR: "desc",      // Default sort direction ("asc" or "desc")

  // Comparison Settings
  MAX_COMPARE_PLAYERS: 2,        // Number of players that can be compared (2+)
};
```

## Getting Started

```bash
npm install
npm run dev
```

## Build for Production

```bash
npm run build
npm run preview  # Preview the build locally
```

---

## Future Enhancements
- [ ] Export to CSV
- [ ] Favorites / Watchlist
- [ ] Profile pic
- [ ] Personalised player description

