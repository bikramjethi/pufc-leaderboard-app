import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Promisified question function
const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));

// Helper to get numeric input
const getNumber = async (prompt, defaultVal = 0) => {
  const answer = await question(prompt);
  if (answer.trim() === '') return defaultVal;
  const num = parseInt(answer, 10);
  return isNaN(num) ? defaultVal : num;
};

// Helper to get yes/no input
const getYesNo = async (prompt) => {
  const answer = await question(prompt);
  return answer.toLowerCase().startsWith('y');
};

// Load player profiles for groupStatus lookup
const loadPlayerProfiles = () => {
  try {
    const profilesPath = path.join(__dirname, '../src/data/player-profiles.json');
    return JSON.parse(fs.readFileSync(profilesPath, 'utf8'));
  } catch {
    return [];
  }
};

// Get player's default group status from profiles
const getPlayerGroupStatus = (playerName, profiles) => {
  const profile = profiles.find(p => p.name.toLowerCase() === playerName.toLowerCase());
  // Check if player has ONLOAN as their groupAvailibility in player-profiles.json
  if (profile?.groupAvailibility === 'ONLOAN') {
    return 'ONLOAN';
  }
  return 'REGULAR';
};

// Main function
async function main() {
  console.log('\n🏟️  PUFC Match Update Script');
  console.log('═'.repeat(40));

  // Get year from command line argument
  const year = process.argv[2];
  if (!year) {
    console.error('❌ Please provide a year as an argument');
    console.log('   Usage: node scripts/update-match.js 2026');
    rl.close();
    process.exit(1);
  }

  // Load tracker file
  const trackerPath = path.join(__dirname, `../src/data/attendance-data/${year}.json`);
  
  if (!fs.existsSync(trackerPath)) {
    console.error(`❌ Tracker file not found: ${trackerPath}`);
    rl.close();
    process.exit(1);
  }

  const trackerData = JSON.parse(fs.readFileSync(trackerPath, 'utf8'));
  const playerProfiles = loadPlayerProfiles();
  
  console.log(`\n📅 Loaded ${year} tracker with ${trackerData.matches.length} matches\n`);

  // Step 1: Get match ID
  const matchId = await question('🔍 What is the ID of the match you want to update? (e.g., 10-01-2026): ');
  
  const matchIndex = trackerData.matches.findIndex(m => m.id === matchId.trim());
  if (matchIndex === -1) {
    console.error(`❌ Match with ID "${matchId}" not found`);
    rl.close();
    process.exit(1);
  }

  const match = trackerData.matches[matchIndex];
  console.log(`\n✅ Found match: ${match.date} (${match.day})`);
  
  if (match.matchPlayed) {
    const overwrite = await getYesNo('⚠️  This match already has data. Overwrite? (y/n): ');
    if (!overwrite) {
      console.log('👋 Cancelled. No changes made.');
      rl.close();
      return;
    }
  }

  // Step 2: Get team colors
  console.log('\n🎨 Team Colors');
  console.log('─'.repeat(30));
  console.log('  Available: RED, BLUE, BLACK, WHITE, YELLOW');
  const team1Color = (await question('What color does Team 1 wear? ')).toUpperCase().trim();
  const team2Color = (await question('What color does Team 2 wear? ')).toUpperCase().trim();

  if (!team1Color || !team2Color) {
    console.error('❌ Both team colors are required');
    rl.close();
    process.exit(1);
  }

  // Step 3: Get scores
  console.log('\n⚽ Scoreline');
  console.log('─'.repeat(30));
  const team1Score = await getNumber(`How many goals did ${team1Color} score? `);
  const team2Score = await getNumber(`How many goals did ${team2Color} score? `);

  console.log(`\n📊 Score: ${team1Color} ${team1Score} - ${team2Score} ${team2Color}`);

  // Step 4: Get players for each team
  const getTeamPlayers = async (teamColor) => {
    console.log(`\n👥 ${teamColor} Team Players`);
    console.log('─'.repeat(30));
    console.log('Enter player names one by one. Type "done" when finished.\n');

    const players = [];
    let playerNum = 1;

    while (true) {
      const name = await question(`  Player ${playerNum} name (or "done"): `);
      
      if (name.toLowerCase() === 'done') {
        if (players.length === 0) {
          console.log('  ⚠️  You need at least one player!');
          continue;
        }
        break;
      }

      if (!name.trim()) {
        continue;
      }

      // Get player stats
      const goals = await getNumber(`    Goals scored by ${name}? (default: 0): `, 0);
      const ownGoals = await getNumber(`    Own goals by ${name}? (default: 0): `, 0);
      const cleanSheet = await getYesNo(`    Did ${name} keep a clean sheet? (y/n): `);
      
      // Get group status (default based on profile or known status)
      const defaultStatus = getPlayerGroupStatus(name.trim(), playerProfiles);
      let groupStatus = defaultStatus;
      
      if (defaultStatus === 'ONLOAN') {
        console.log(`    ℹ️  ${name} is marked as ON LOAN`);
      }
      
      // Only ask about status if they want to change it
      const changeStatus = await getYesNo(`    Group status is "${groupStatus}". Change it? (y/n): `);
      if (changeStatus) {
        const newStatus = await question('    Enter status (REGULAR/ONLOAN): ');
        if (newStatus.toUpperCase() === 'ONLOAN' || newStatus.toUpperCase() === 'REGULAR') {
          groupStatus = newStatus.toUpperCase();
        }
      }

      players.push({
        name: name.trim(),
        goals,
        ownGoals,
        cleanSheet,
        groupStatus
      });

      playerNum++;
      console.log(`    ✓ Added ${name}\n`);
    }

    return players;
  };

  const team1Players = await getTeamPlayers(team1Color);
  const team2Players = await getTeamPlayers(team2Color);

  // Calculate total goals (regular + own goals)
  const totalRegularGoals = [...team1Players, ...team2Players].reduce((sum, p) => sum + p.goals, 0);
  const totalOwnGoals = [...team1Players, ...team2Players].reduce((sum, p) => sum + p.ownGoals, 0);
  const totalGoals = totalRegularGoals + totalOwnGoals;

  // Validate goals match scoreline
  const scorelineTotal = team1Score + team2Score;
  if (scorelineTotal !== totalGoals) {
    console.log(`\n⚠️  Warning: Scoreline total (${scorelineTotal}) doesn't match player goals (${totalGoals})`);
    console.log(`   Regular goals: ${totalRegularGoals}, Own goals: ${totalOwnGoals}`);
    const proceed = await getYesNo('   Proceed anyway? (y/n): ');
    if (!proceed) {
      console.log('👋 Cancelled. No changes made.');
      rl.close();
      return;
    }
  }

  // Build the updated match object
  const updatedMatch = {
    ...match,
    matchPlayed: true,
    matchCancelled: false,
    attendance: {
      [team1Color]: team1Players,
      [team2Color]: team2Players
    },
    scoreline: {
      [team1Color]: team1Score,
      [team2Color]: team2Score
    },
    totalGoals: scorelineTotal
  };

  // Show summary
  console.log('\n' + '═'.repeat(50));
  console.log('📋 MATCH SUMMARY');
  console.log('═'.repeat(50));
  console.log(`Date: ${updatedMatch.date} (${updatedMatch.day})`);
  console.log(`Score: ${team1Color} ${team1Score} - ${team2Score} ${team2Color}`);
  console.log(`\n${team1Color} Team (${team1Players.length} players):`);
  team1Players.forEach(p => {
    let stats = [];
    if (p.goals > 0) stats.push(`${p.goals} goal${p.goals > 1 ? 's' : ''}`);
    if (p.ownGoals > 0) stats.push(`${p.ownGoals} OG`);
    if (p.cleanSheet) stats.push('CS');
    if (p.groupStatus === 'ONLOAN') stats.push('📋 On Loan');
    console.log(`  • ${p.name}${stats.length ? ` (${stats.join(', ')})` : ''}`);
  });
  console.log(`\n${team2Color} Team (${team2Players.length} players):`);
  team2Players.forEach(p => {
    let stats = [];
    if (p.goals > 0) stats.push(`${p.goals} goal${p.goals > 1 ? 's' : ''}`);
    if (p.ownGoals > 0) stats.push(`${p.ownGoals} OG`);
    if (p.cleanSheet) stats.push('CS');
    if (p.groupStatus === 'ONLOAN') stats.push('📋 On Loan');
    console.log(`  • ${p.name}${stats.length ? ` (${stats.join(', ')})` : ''}`);
  });
  console.log('═'.repeat(50));

  // Confirm save
  const confirmSave = await getYesNo('\n💾 Save this match data? (y/n): ');
  
  if (!confirmSave) {
    console.log('👋 Cancelled. No changes made.');
    rl.close();
    return;
  }

  // Update the match in tracker data
  trackerData.matches[matchIndex] = updatedMatch;

  // Recalculate season totals
  const playedMatches = trackerData.matches.filter(m => m.matchPlayed && !m.matchCancelled);
  let seasonTotalGoals = 0;
  let seasonWeekendGoals = 0;
  let seasonWeekdayGoals = 0;

  playedMatches.forEach(m => {
    const matchGoals = m.totalGoals || 0;
    seasonTotalGoals += matchGoals;
    if (m.day === 'Weekend') {
      seasonWeekendGoals += matchGoals;
    } else if (m.day === 'Midweek') {
      seasonWeekdayGoals += matchGoals;
    }
  });

  trackerData.totalGoals = seasonTotalGoals;
  trackerData.weekendGoals = seasonWeekendGoals;
  trackerData.weekdayGoals = seasonWeekdayGoals;

  // Add any new players to allPlayers list
  const allPlayerNames = new Set(trackerData.allPlayers || []);
  [...team1Players, ...team2Players].forEach(p => allPlayerNames.add(p.name));
  trackerData.allPlayers = Array.from(allPlayerNames).sort();

  // Save the file
  fs.writeFileSync(trackerPath, JSON.stringify(trackerData, null, 2));

  console.log('\n✅ Match data saved successfully!');
  console.log(`   File: ${trackerPath}`);
  console.log(`   Season totals: ${seasonTotalGoals} goals (Weekend: ${seasonWeekendGoals}, Weekday: ${seasonWeekdayGoals})`);
  
  // Prompt to run sync-stats
  const runSync = await getYesNo('\n🔄 Run sync-stats to update leaderboards? (y/n): ');
  if (runSync) {
    console.log('\n📊 Running sync-stats...\n');
    const { execSync } = await import('child_process');
    try {
      execSync(`node ${path.join(__dirname, 'sync-stats.js')} ${year}`, { stdio: 'inherit' });
    } catch (error) {
      console.error('❌ Error running sync-stats:', error.message);
    }
  }

  console.log('\n👋 Done! Goodbye.\n');
  rl.close();
}

// Run the script
main().catch(error => {
  console.error('❌ Error:', error);
  rl.close();
  process.exit(1);
});

