# PUFC Leaderboard

A player statistics leaderboard app for our local football club.

## Features

- **Season-based data** — View stats per year (2024, 2025, etc.)
- **Sortable columns** — Click any column header to sort (ascending/descending)
- **Player search** — Filter players by name or position
- **Player comparison** — Select 2 players to compare stats side-by-side
- **Max value highlighting** — Season leaders highlighted in gold
- **Position badges** — Color-coded player positions (FWD, MID, DEF, GK, ALL)
- **Win/Loss percentages** — Calculated W% and L% columns
- **Matches played tracking** — Default sorting by matches played

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

- [ ] Points system (3 for win, 1 for draw, bonus for goals/clean sheets)
- [ ] Player profile cards (click to expand details)
- [ ] Add/edit player form
- [ ] Export to CSV
- [ ] All-time stats view (aggregate across seasons)
