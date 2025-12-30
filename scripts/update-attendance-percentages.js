#!/usr/bin/env node

/**
 * Script to calculate and update attendance percentages in leaderboard JSON files
 * 
 * Calculates:
 * - midweekPercentage = (player.midweekGames / summary.midweekGames) * 100
 * - weekendPercentage = (player.weekendGames / summary.weekendGames) * 100
 * - totalPercentage = (player.totalGames / summary.totalGames) * 100
 * 
 * Usage: node scripts/update-attendance-percentages.js [year]
 * Example: node scripts/update-attendance-percentages.js 2025
 * 
 * Or use npm script: npm run update-percentages [year]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get year from command line argument or default to 2025
const year = process.argv[2] || '2025';

// Path to the JSON file
const jsonPath = path.join(__dirname, '..', 'src', 'data', 'attendance-data', 'leaderboard', `${year}.json`);

// Check if file exists
if (!fs.existsSync(jsonPath)) {
  console.error(`❌ File not found: ${jsonPath}`);
  process.exit(1);
}

// Read the JSON file
let data;
try {
  const fileContent = fs.readFileSync(jsonPath, 'utf8');
  data = JSON.parse(fileContent);
} catch (error) {
  console.error(`❌ Error reading or parsing JSON file: ${error.message}`);
  process.exit(1);
}

// Validate data structure
if (!data.summary || !data.players || !Array.isArray(data.players)) {
  console.error(`❌ Invalid JSON structure. Expected: { summary: {...}, players: [...] }`);
  process.exit(1);
}

const { summary, players } = data;

// Validate summary has required fields
if (typeof summary.midweekGames !== 'number' || 
    typeof summary.weekendGames !== 'number' || 
    typeof summary.totalGames !== 'number') {
  console.error(`❌ Summary missing required fields: midweekGames, weekendGames, totalGames`);
  process.exit(1);
}

// Calculate percentages for each player
let updatedCount = 0;
let unchangedCount = 0;

const updatedPlayers = players.map((player) => {
  // Calculate percentages
  const midweekPercentage = summary.midweekGames > 0
    ? Math.round((player.midweekGames / summary.midweekGames) * 100)
    : 0;
  
  const weekendPercentage = summary.weekendGames > 0
    ? Math.round((player.weekendGames / summary.weekendGames) * 100)
    : 0;
  
  const totalPercentage = summary.totalGames > 0
    ? Math.round((player.totalGames / summary.totalGames) * 100)
    : 0;
  
  // Check if percentages need updating
  const needsUpdate = 
    player.midweekPercentage !== midweekPercentage ||
    player.weekendPercentage !== weekendPercentage ||
    player.totalPercentage !== totalPercentage;
  
  if (needsUpdate) {
    updatedCount++;
    console.log(`📊 Updating ${player.name}:`);
    if (player.midweekPercentage !== midweekPercentage) {
      console.log(`   MW: ${player.midweekPercentage}% → ${midweekPercentage}%`);
    }
    if (player.weekendPercentage !== weekendPercentage) {
      console.log(`   WE: ${player.weekendPercentage}% → ${weekendPercentage}%`);
    }
    if (player.totalPercentage !== totalPercentage) {
      console.log(`   Total: ${player.totalPercentage}% → ${totalPercentage}%`);
    }
  } else {
    unchangedCount++;
  }
  
  // Return updated player object
  return {
    ...player,
    midweekPercentage,
    weekendPercentage,
    totalPercentage,
  };
});

// Create updated data object
const updatedData = {
  ...data,
  players: updatedPlayers,
};

// Write back to file
try {
  fs.writeFileSync(
    jsonPath,
    JSON.stringify(updatedData, null, 2) + '\n',
    'utf8'
  );
  
  console.log(`\n✅ Successfully updated ${year}.json`);
  console.log(`   📝 Updated: ${updatedCount} players`);
  console.log(`   ✓ Unchanged: ${unchangedCount} players`);
  console.log(`   📊 Total players: ${players.length}`);
  console.log(`\n📋 Summary for ${year}:`);
  console.log(`   Total Games: ${summary.totalGames}`);
  console.log(`   Midweek Games: ${summary.midweekGames}`);
  console.log(`   Weekend Games: ${summary.weekendGames}`);
} catch (error) {
  console.error(`❌ Error writing file: ${error.message}`);
  process.exit(1);
}

