# FieldViewModal Component

## Overview

The `FieldViewModal` component displays a visual representation of a football match on a tactical field diagram. It shows player positions, team formations, match statistics, and individual player achievements (goals, clean sheets, own goals) in an interactive modal overlay.

## Purpose

This component provides a quick visual overview of:
- **Team formations**: Where each player was positioned during the match
- **Match result**: Scoreline and date information
- **Player statistics**: Goals scored, clean sheets, and own goals
- **Team colors**: Visual distinction between teams
- **Special status**: On-loan players are highlighted

## Component Structure

### Props

```javascript
<FieldViewModal 
  match={matchObject}  // Required: Match data object
  onClose={handleClose} // Required: Callback function to close modal
/>
```

### Match Object Structure

The component expects a `match` object with the following structure:

```javascript
{
  date: "15-03-2025",           // Date string (DD-MM-YYYY or DD/MM/YYYY)
  day: "Saturday",               // Day of the week
  isFullHouse: true,             // Optional: Whether all players attended
  attendance: {                  // Required: Player attendance by team
    RED: [                       // Team color (RED, BLUE, BLACK, WHITE, YELLOW)
      {
        name: "Player Name",
        position: "ST",          // Position abbreviation (GK, CB, LB, RB, CM, LM, RM, ST)
        goals: 2,                // Goals scored in this match
        ownGoals: 0,             // Own goals scored
        cleanSheet: true,        // Whether player kept a clean sheet
        groupStatus: "ONLOAN"    // Optional: "ONLOAN" to highlight on-loan players
      },
      // ... more players
    ],
    BLUE: [
      // ... players for team 2
    ]
  },
  scoreline: {                   // Required: Match score
    RED: 3,
    BLUE: 1
  }
}
```

## How It Works

### 1. Team Extraction

The component extracts teams from the `match.attendance` object:
- Each team color becomes a separate team
- Teams are assigned to `team1` (left side) or `team2` (right side)
- Team scores are extracted from `match.scoreline`

### 2. Position Mapping

Players are positioned on the field using predefined coordinates:

**Left Half (Team 1) - Playing Left to Right:**
- `GK`: Goalkeeper (8%, 50%)
- `LB`: Left Back (22%, 20%)
- `CB`: Center Back (22%, 50%)
- `RB`: Right Back (22%, 80%)
- `LM`: Left Midfielder (36%, 20%)
- `CM`: Center Midfielder (36%, 50%)
- `RM`: Right Midfielder (36%, 80%)
- `ST`: Striker (46%, 50%)

**Right Half (Team 2) - Playing Right to Left (Mirrored):**
- `GK`: Goalkeeper (92%, 50%)
- `RB`: Right Back (78%, 20%) - Swapped from team1 perspective
- `CB`: Center Back (78%, 50%)
- `LB`: Left Back (78%, 80%) - Swapped from team1 perspective
- `RM`: Right Midfielder (64%, 20%) - Swapped
- `CM`: Center Midfielder (64%, 50%)
- `LM`: Left Midfielder (64%, 80%) - Swapped
- `ST`: Striker (54%, 50%)

**Note**: Team 2 positions are mirrored because they're playing in the opposite direction.

### 3. Player Rendering

For each player:
1. **Position Lookup**: The player's position is matched against `POSITION_COORDS`
2. **Visual Marker**: A circular badge shows the position abbreviation
3. **Name Tag**: Player name displayed below the marker
4. **Stats Badges**: Icons/badges for:
   - ⚽ Goals (e.g., "⚽ 2")
   - 🧤 Clean Sheet
   - OG Own Goal badge

### 4. Team Color Styling

Team colors are mapped to CSS classes:
- `RED` → `team-red`
- `BLUE` → `team-blue`
- `BLACK` → `team-black`
- `WHITE` → `team-white`
- `YELLOW` → `team-yellow`

### 5. Special Features

- **On-Loan Players**: Highlighted with special styling (`onloan` class)
- **Full House Tag**: Shows "🏠 Full House" if `match.isFullHouse` is true
- **Keyboard Support**: Press `Escape` to close the modal
- **Click Outside**: Clicking the backdrop closes the modal

## Usage Example

```javascript
import { FieldViewModal } from "./FieldViewModal.jsx";
import { useState } from "react";

function MatchViewer() {
  const [selectedMatch, setSelectedMatch] = useState(null);

  const match = {
    date: "15-03-2025",
    day: "Saturday",
    isFullHouse: true,
    attendance: {
      RED: [
        { name: "John", position: "ST", goals: 2, cleanSheet: false },
        { name: "Mike", position: "CM", goals: 0, cleanSheet: false },
        { name: "Tom", position: "GK", goals: 0, cleanSheet: true }
      ],
      BLUE: [
        { name: "Sam", position: "ST", goals: 1, cleanSheet: false },
        { name: "Alex", position: "CB", goals: 0, cleanSheet: false }
      ]
    },
    scoreline: { RED: 2, BLUE: 1 }
  };

  return (
    <>
      <button onClick={() => setSelectedMatch(match)}>
        View Match
      </button>
      
      {selectedMatch && (
        <FieldViewModal 
          match={selectedMatch}
          onClose={() => setSelectedMatch(null)}
        />
      )}
    </>
  );
}
```

## Position Abbreviations

The component recognizes these position abbreviations:

| Abbreviation | Position | Description |
|-------------|----------|-------------|
| `GK` | Goalkeeper | Last line of defense |
| `CB` | Center Back | Central defender |
| `LB` | Left Back | Left side defender |
| `RB` | Right Back | Right side defender |
| `CM` | Center Midfielder | Central midfielder |
| `LM` | Left Midfielder | Left side midfielder |
| `RM` | Right Midfielder | Right side midfielder |
| `ST` | Striker | Forward/attacker |

**Note**: If a player's position doesn't match any of these, they won't be displayed on the field (the function returns `null`).

## Styling

The component uses CSS classes from `FieldViewModal.css`:
- `.field-modal-overlay`: Dark backdrop overlay
- `.field-modal-content`: Main modal container
- `.football-field`: The green field with markings
- `.player-marker`: Individual player positioning
- `.player-circle`: Circular badge with position
- `.stat-badge`: Badges for goals, clean sheets, own goals
- `.team-{color}`: Team-specific color styling

## Accessibility

- Modal has `role="dialog"` and `aria-modal="true"`
- Close button has `aria-label="Close"`
- Keyboard navigation supported (Escape key)
- Click outside to close functionality

## Limitations

1. **Position Support**: Only the 8 standard positions are supported. Players with other positions won't be displayed.
2. **Team Limit**: Designed for 2 teams. More than 2 teams may cause layout issues.
3. **Position Fallback**: If a player has no position or an unrecognized position, they are skipped (not rendered).

## Future Enhancements

Potential improvements:
- Support for more position types (CDM, CAM, LW, RW, etc.)
- Formation lines connecting players
- Player movement/heatmap visualization
- Substitution indicators
- Match timeline/events

