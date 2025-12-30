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

### Main Leaderboard App

```bash
npm install
npm run dev
```

The main app will run on `http://localhost:5173`

### Admin Panel

A separate admin app is available for managing leaderboard data:

```bash
cd admin
npm install
npm run dev
```

The admin app will run on `http://localhost:5174`

See `admin/README.md` for more details.

## Dynamic Scripts

The project includes utility scripts for maintaining and updating data files. These scripts help ensure data consistency and automate calculations.

### Update Attendance Percentages

The `update-attendance-percentages.js` script calculates and updates attendance percentages in leaderboard JSON files based on the summary totals.

**What it does:**
- Calculates `midweekPercentage` = `(player.midweekGames / summary.midweekGames) * 100`
- Calculates `weekendPercentage` = `(player.weekendGames / summary.weekendGames) * 100`
- Calculates `totalPercentage` = `(player.totalGames / summary.totalGames) * 100`
- Updates the JSON file with corrected percentages
- Provides a summary of changes made

**Usage:**

```bash
# Update percentages for a specific year
npm run update-percentages 2025

# Or use node directly
node scripts/update-attendance-percentages.js 2026

# Defaults to 2025 if no year is specified
npm run update-percentages
```

**Example Output:**
```
📊 Updating Ashish:
   MW: 96% → 96%
   WE: 89% → 87%
   Total: 93% → 92%

✅ Successfully updated 2025.json
   📝 Updated: 15 players
   ✓ Unchanged: 20 players
   📊 Total players: 35
```

**When to use:**
- After manually updating game counts in the JSON file
- When percentages in the JSON don't match the calculated values
- To ensure data consistency before committing changes

**Note:** The attendance leaderboard component calculates percentages dynamically at runtime, so this script is primarily for keeping the JSON data accurate and consistent.

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

