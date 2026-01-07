import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const leaderboardPath = path.join(__dirname, '../src/data/leaderboard-data/2026.json');
const data = JSON.parse(fs.readFileSync(leaderboardPath, 'utf8'));

const defaultWeekendStats = {
  matches: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  cleanSheets: 0,
  goals: 0,
  hatTricks: 0,
  ownGoals: 0
};

const defaultWeekdayStats = {
  matches: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  cleanSheets: 0,
  goals: 0,
  hatTricks: 0,
  ownGoals: 0
};

const updatedData = data.map(player => {
  // Add ownGoals if not present
  if (player.ownGoals === undefined) {
    player.ownGoals = 0;
  }
  
  // Add weekendStats if not present
  if (!player.weekendStats) {
    player.weekendStats = { ...defaultWeekendStats };
  }
  
  // Add weekdayStats if not present
  if (!player.weekdayStats) {
    player.weekdayStats = { ...defaultWeekdayStats };
  }
  
  return player;
});

fs.writeFileSync(leaderboardPath, JSON.stringify(updatedData, null, 2));
console.log('✅ Updated all players with ownGoals, weekendStats, and weekdayStats');

