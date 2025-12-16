# PUFC Leaderboard

A player statistics leaderboard app for our local football club.

## Features

- **News Ticker** — Scrolling witty one-liners and banter about players (customizable!)
- **Season-based data** — View stats per year (2024, 2025, etc.)
- **All-Time leaderboard** — Aggregate career stats across all seasons (default view)
- **Sortable columns** — Click any column header to sort (ascending/descending)
- **Player search** — Filter players by name or position
- **Player comparison** — Select up to 3 players to compare stats side-by-side
- **Player profile modal** — Click any player name to view detailed stats, season history, and career totals
- **Top 3 highlighting** — Top performers highlighted with purple accents (1st, 2nd, 3rd)
- **Position badges** — Color-coded player positions (FWD, MID, DEF, GK, ALL)
- **Win/Loss percentages** — Calculated W% and L% columns
- **Sticky table header** — Column headers stay visible when scrolling
- **Tooltips** — Hover over column headers to see full descriptions
- **Dark/Light theme** — Toggle between themes (preference saved to localStorage)
- **Zebra striping** — Alternating row colors for readability
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
  ENABLE_MAX_HIGHLIGHT: true,    // Highlight top 3 values per column
  ENABLE_PLAYER_MODAL: true,     // Click player name to view detailed profile
  ENABLE_TICKER: true,           // Show news ticker with witty messages

  // Default Settings
  DEFAULT_SORT_KEY: "matches",   // Default column to sort by
  DEFAULT_SORT_DIR: "desc",      // Default sort direction ("asc" or "desc")

  // Comparison Settings
  MAX_COMPARE_PLAYERS: 3,        // Number of players that can be compared
};
```

## News Ticker Messages

Add your own witty one-liners in `src/ticker-messages.js`:

```javascript
export const tickerMessages = [
  "Vinit: The wall that occasionally lets a few through 🧱",
  "Ashish has played more games than some of us have excuses 📊",
  // Add more here!
];
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
- [ ] Player profile pictures
- [ ] Keyboard navigation
- [ ] Position filter buttons

