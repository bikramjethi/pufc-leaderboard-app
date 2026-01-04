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

### Sync Stats from Tracker

The `sync-stats.js` script automatically syncs statistics from the tracker file (`src/data/attendance-data/{year}.json`) to both the attendance leaderboard and main leaderboard files. This script processes all matches where `matchPlayed: true` and updates all relevant statistics.

**What it does:**

1. **Reads the tracker file** for the specified year
2. **Processes all played matches** (where `matchPlayed: true` and `matchCancelled: false`)
3. **Updates Attendance Leaderboard** (`src/data/attendance-data/leaderboard/{year}.json`):
   - Counts `midweekGames`, `weekendGames`, and `totalGames` for each player
   - Calculates attendance percentages dynamically
   - Updates summary totals (totalGames, midweekGames, weekendGames)
   - Calculates difference from previous year (if `games2024` exists)
4. **Updates Main Leaderboard** (`src/data/leaderboard-data/{year}.json`):
   - Counts `matches`, `wins`, `losses`, `draws`
   - Counts `goals` (sums all goals scored by player)
   - Counts `hatTricks` (3+ goals in a single match)
   - Counts `cleanSheets`
5. **Handles new players**:
   - Automatically adds new players found in tracker to both leaderboards
   - Gets player position from `player-profiles.json` (defaults to "MID" if not found)
   - Assigns appropriate category for attendance leaderboard based on `groupAvailibility`

**Usage:**

```bash
# Sync stats for a specific year
npm run sync-stats 2026

# Or use node directly
node scripts/sync-stats.js 2026
```

**Example Output:**

```
📊 Processing 1 played matches for 2026...
  ➕ Added new player to attendance leaderboard: Suyash (Others)
  ➕ Added new player to attendance leaderboard: Tejas (Others)
  ➕ Added new player to main leaderboard: Suyash (MID)
  ➕ Added new player to main leaderboard: Tejas (MID)
✅ Successfully synced stats for 2026:
   - Attendance leaderboard: 37 players
   - Main leaderboard: 37 players
   - Total matches processed: 1
```

**Workflow:**

1. **Manually update the tracker file** (`src/data/attendance-data/{year}.json`):
   - Set `matchPlayed: true` for completed matches
   - Add `attendance` array with all players who attended
   - Add `winners` and `losers` arrays (or leave both empty for draws)
   - Add `scorers` array with goal information: `[{ "name": "Player", "goals": 2, "team": "BLUE" }]`
   - Add `cleanSheets` array with players who kept clean sheets
   - Update `scoreline` object: `{ "BLUE": 3, "RED": 2 }`

2. **Run the sync script**:
   ```bash
   npm run sync-stats 2026
   ```

3. **Verify the results** in both leaderboard files

**Important Notes:**

- **Only the tracker file needs manual updates** - the script handles all calculations
- The script processes **all matches** with `matchPlayed: true`, so make sure your tracker is up to date
- **New players** are automatically detected and added to both leaderboards
- Player positions are pulled from `player-profiles.json` - add new players there first for accurate positions
- **Hat tricks** are counted as 3+ goals in a **single match** (not cumulative)
- The script **overwrites** existing stats, so ensure your tracker file is the source of truth

**When to use:**

- After updating match data in the tracker file
- When you've added new matches with `matchPlayed: true`
- When you've added new players to the tracker
- Before committing changes to ensure all stats are synchronized

**File Structure:**

```
src/data/
├── attendance-data/
│   ├── {year}.json              ← Manual updates (tracker)
│   └── leaderboard/
│       └── {year}.json          ← Auto-updated by script
└── leaderboard-data/
    └── {year}.json               ← Auto-updated by script
```

## Build for Production

```bash
npm run build
npm run preview  # Preview the build locally
```

---

## Future Enhancements
- [ ] Favorites / Watchlist
- [ ] Player profile pictures
- [ ] Keyboard navigation
- [ ] Position filter buttons

