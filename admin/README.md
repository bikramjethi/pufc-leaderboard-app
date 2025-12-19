# PUFC Leaderboard Admin

Admin panel for managing PUFC Leaderboard data.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

The admin app will run on `http://localhost:5174`

## Features (Planned)

- **Player Management**: Add, edit, and manage player profiles
- **Match Management**: Record match results, attendance, and statistics
- **Season Management**: Manage seasons and year-based data
- **Data Import/Export**: Import from CSV, export to JSON
- **Bulk Operations**: Update multiple records at once

## Project Structure

```
admin/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/          # Page components
│   ├── utils/          # Utility functions and scripts
│   ├── App.jsx         # Main app component
│   └── main.jsx        # Entry point
├── public/             # Static assets
└── package.json        # Dependencies
```

## Data Location

The admin app reads from and writes to:
- `../src/data/leaderboard-data/` - Season statistics
- `../src/data/attendance-data/` - Match attendance data
- `../src/data/player-profiles.json` - Player profiles

