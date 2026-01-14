import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Process Match Data from JSON
 * 
 * Usage:
 *   node scripts/process-match.js '{"year":"2025","matchId":"04-01-2025","matchData":{...}}'
 *   
 *   OR pipe from file:
 *   cat match.json | node scripts/process-match.js
 *   
 *   OR use input file:
 *   node scripts/process-match.js --file match.json
 */

async function main() {
  console.log('\n🏟️  PUFC Match Processor');
  console.log('═'.repeat(40));

  let inputJson = '';

  // Check for --file argument
  const fileArgIndex = process.argv.indexOf('--file');
  if (fileArgIndex !== -1 && process.argv[fileArgIndex + 1]) {
    const filePath = process.argv[fileArgIndex + 1];
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      process.exit(1);
    }
    inputJson = fs.readFileSync(filePath, 'utf8');
  } else if (process.argv[2] && !process.argv[2].startsWith('--')) {
    // JSON passed as argument
    inputJson = process.argv[2];
  } else {
    // Read from stdin
    const chunks = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    inputJson = Buffer.concat(chunks).toString('utf8');
  }

  if (!inputJson.trim()) {
    console.error('❌ No input provided');
    console.log('\nUsage:');
    console.log('  node scripts/process-match.js \'{"year":"2025",...}\'');
    console.log('  node scripts/process-match.js --file match.json');
    console.log('  cat match.json | node scripts/process-match.js');
    process.exit(1);
  }

  let data;
  try {
    data = JSON.parse(inputJson);
  } catch (e) {
    console.error('❌ Invalid JSON:', e.message);
    process.exit(1);
  }

  const { year, matchData } = data;

  if (!year || !matchData) {
    console.error('❌ JSON must contain "year" and "matchData" fields');
    process.exit(1);
  }

  if (!matchData.id) {
    console.error('❌ matchData must contain "id" field');
    process.exit(1);
  }

  // Load tracker file
  const trackerPath = path.join(__dirname, `../src/data/attendance-data/${year}.json`);
  
  if (!fs.existsSync(trackerPath)) {
    console.error(`❌ Tracker file not found: ${trackerPath}`);
    process.exit(1);
  }

  const trackerData = JSON.parse(fs.readFileSync(trackerPath, 'utf8'));
  
  console.log(`📅 Processing match: ${matchData.id}`);
  console.log(`📁 Year: ${year}`);

  // Find the match index
  const matchIndex = trackerData.matches.findIndex(m => m.id === matchData.id);
  
  if (matchIndex === -1) {
    // Add new match
    trackerData.matches.push(matchData);
    console.log(`➕ Added new match`);
  } else {
    // Update existing match
    const existing = trackerData.matches[matchIndex];
    if (existing.matchPlayed) {
      console.log(`⚠️  Overwriting existing match data`);
    }
    trackerData.matches[matchIndex] = matchData;
    console.log(`✏️  Updated existing match`);
  }

  // Display match summary
  const teams = Object.keys(matchData.attendance || {});
  if (teams.length === 2) {
    const score = matchData.scoreline;
    console.log(`\n📊 ${teams[0]} ${score[teams[0]]} - ${score[teams[1]]} ${teams[1]}`);
    
    teams.forEach(team => {
      const players = matchData.attendance[team];
      console.log(`\n👕 ${team} (${players.length} players):`);
      players.forEach(p => {
        let stats = [];
        if (p.goals > 0) stats.push(`${p.goals}G`);
        if (p.ownGoals > 0) stats.push(`${p.ownGoals}OG`);
        if (p.cleanSheet) stats.push('CS');
        if (p.groupStatus === 'ONLOAN') stats.push('🔄');
        console.log(`   [${p.position}] ${p.name}${stats.length ? ` (${stats.join(', ')})` : ''}`);
      });
    });
  }

  if (matchData.isBackfilled) {
    console.log(`\n📋 Marked as BACKFILLED`);
  }

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

  // Update allPlayers list
  const allPlayerNames = new Set(trackerData.allPlayers || []);
  teams.forEach(team => {
    const players = matchData.attendance[team] || [];
    players.forEach(p => allPlayerNames.add(p.name));
  });
  trackerData.allPlayers = Array.from(allPlayerNames).sort();

  // Sort matches by date
  trackerData.matches.sort((a, b) => {
    const dateA = a.id.split('-').reverse().join('-');
    const dateB = b.id.split('-').reverse().join('-');
    return new Date(dateA) - new Date(dateB);
  });

  // Save the file
  fs.writeFileSync(trackerPath, JSON.stringify(trackerData, null, 2));

  console.log('\n' + '═'.repeat(40));
  console.log(`✅ Match saved successfully!`);
  console.log(`📁 File: ${trackerPath}`);
  console.log(`📊 Season: ${seasonTotalGoals} goals (Weekend: ${seasonWeekendGoals}, Weekday: ${seasonWeekdayGoals})`);
  console.log(`📋 Total matches: ${playedMatches.length}`);
  console.log('═'.repeat(40));
  console.log('\n💡 Run sync-stats to update leaderboards:');
  console.log(`   node scripts/sync-stats.js ${year}\n`);
}

main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});

