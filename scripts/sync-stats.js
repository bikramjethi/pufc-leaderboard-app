import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const year = process.argv[2];

if (!year) {
  console.error('❌ Please provide a year as an argument (e.g., node scripts/sync-stats.js 2026)');
  process.exit(1);
}

// File paths
const trackerPath = path.join(__dirname, `../src/data/attendance-data/${year}.json`);
const attendanceLeaderboardPath = path.join(__dirname, `../src/data/attendance-data/leaderboard/${year}.json`);
const mainLeaderboardPath = path.join(__dirname, `../src/data/leaderboard-data/${year}.json`);
const playerProfilesPath = path.join(__dirname, `../src/data/player-profiles.json`);

// Default stats structure for weekend/weekday
const createEmptyStats = () => ({
  matches: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  cleanSheets: 0,
  goals: 0,
  hatTricks: 0,
  ownGoals: 0
});

try {
  // Read all necessary files
  const trackerData = JSON.parse(fs.readFileSync(trackerPath, 'utf8'));
  const attendanceLeaderboard = JSON.parse(fs.readFileSync(attendanceLeaderboardPath, 'utf8'));
  const mainLeaderboard = JSON.parse(fs.readFileSync(mainLeaderboardPath, 'utf8'));
  const playerProfiles = JSON.parse(fs.readFileSync(playerProfilesPath, 'utf8'));

  // Get played matches only
  const playedMatches = trackerData.matches.filter(m => m.matchPlayed && !m.matchCancelled);

  console.log(`📊 Processing ${playedMatches.length} played matches for ${year}...`);

  // Initialize stats maps
  const attendanceStats = new Map();
  const leaderboardStats = new Map();

  // Process each played match
  playedMatches.forEach((match) => {
    const isMidweek = match.day === 'Midweek';
    const isWeekend = match.day === 'Weekend';

    // Process attendance
    match.attendance?.forEach((playerName) => {
      if (!attendanceStats.has(playerName)) {
        attendanceStats.set(playerName, {
          midweekGames: 0,
          weekendGames: 0,
          totalGames: 0,
        });
      }
      const stats = attendanceStats.get(playerName);
      if (isMidweek) stats.midweekGames++;
      if (isWeekend) stats.weekendGames++;
      stats.totalGames++;
    });

    // Process leaderboard stats
    match.attendance?.forEach((playerName) => {
      if (!leaderboardStats.has(playerName)) {
        leaderboardStats.set(playerName, {
          // Overall stats
          matches: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          goals: 0,
          hatTricks: 0,
          cleanSheets: 0,
          ownGoals: 0,
          // Weekend and weekday stats
          weekendStats: createEmptyStats(),
          weekdayStats: createEmptyStats(),
        });
      }
      const stats = leaderboardStats.get(playerName);
      const periodStats = isWeekend ? stats.weekendStats : stats.weekdayStats;
      
      // Update match counts
      stats.matches++;
      periodStats.matches++;

      // Determine result
      const isWinner = match.winners?.includes(playerName);
      const isLoser = match.losers?.includes(playerName);
      const isDraw = match.winners?.length === 0 && match.losers?.length === 0;
      
      if (isWinner) {
        stats.wins++;
        periodStats.wins++;
      } else if (isLoser) {
        stats.losses++;
        periodStats.losses++;
      } else if (isDraw) {
        stats.draws++;
        periodStats.draws++;
      }

      // Count goals and hat tricks
      const playerScorers = match.scorers?.filter(s => s.name === playerName) || [];
      let matchGoals = 0;
      playerScorers.forEach((scorer) => {
        matchGoals += scorer.goals || 0;
      });
      stats.goals += matchGoals;
      periodStats.goals += matchGoals;
      
      // Hat trick is 3+ goals in a single match
      if (matchGoals >= 3) {
        stats.hatTricks++;
        periodStats.hatTricks++;
      }

      // Count clean sheets - handle both array of strings and array of objects
      let hasCleanSheet = false;
      if (match.cleanSheets && Array.isArray(match.cleanSheets)) {
        if (typeof match.cleanSheets[0] === 'string') {
          hasCleanSheet = match.cleanSheets.includes(playerName);
        } else {
          hasCleanSheet = match.cleanSheets.some(cs => cs.name === playerName);
        }
      }
      if (hasCleanSheet) {
        stats.cleanSheets++;
        periodStats.cleanSheets++;
      }

      // Count own goals
      const playerOwnGoals = match.ownGoals?.filter(og => og.name === playerName) || [];
      let matchOwnGoals = 0;
      playerOwnGoals.forEach((og) => {
        matchOwnGoals += og.goals || 1; // Default to 1 if goals not specified
      });
      stats.ownGoals += matchOwnGoals;
      periodStats.ownGoals += matchOwnGoals;
    });
  });

  // Update attendance leaderboard
  const summary = {
    totalGames: playedMatches.length,
    midweekGames: playedMatches.filter(m => m.day === 'Midweek').length,
    weekendGames: playedMatches.filter(m => m.day === 'Weekend').length,
  };

  attendanceLeaderboard.summary = summary;

  // Create a map of existing players by name
  const existingAttendancePlayers = new Map();
  attendanceLeaderboard.players.forEach((player) => {
    existingAttendancePlayers.set(player.name, player);
  });

  // Update existing players and add new ones
  attendanceStats.forEach((stats, playerName) => {
    let player = existingAttendancePlayers.get(playerName);

    if (!player) {
      // New player - need to determine category
      // Check if player exists in player profiles
      const profile = playerProfiles.find(p => p.name === playerName);
      let category = 'Others';
      
      if (profile) {
        if (profile.groupAvailibility === 'ALLGAMES') category = 'ALLGAMES';
        else if (profile.groupAvailibility === 'WEEKEND') category = 'WEEKEND';
        else if (profile.groupAvailibility === 'MIDWEEK') category = 'MIDWEEK';
      }

      // Find max sno in the category
      const categoryPlayers = attendanceLeaderboard.players.filter(p => p.category === category);
      const maxSno = categoryPlayers.length > 0 
        ? Math.max(...categoryPlayers.map(p => p.sno))
        : 0;

      player = {
        category: category,
        sno: maxSno + 1,
        name: playerName,
        midweekGames: 0,
        weekendGames: 0,
        totalGames: 0,
        midweekPercentage: 0,
        weekendPercentage: 0,
        totalPercentage: 0,
        games2024: 0, // New player, no 2024 data
        difference: null,
        notes: null,
      };
      attendanceLeaderboard.players.push(player);
      existingAttendancePlayers.set(playerName, player);
      console.log(`  ➕ Added new player to attendance leaderboard: ${playerName} (${category})`);
    }

    // Update stats
    player.midweekGames = stats.midweekGames;
    player.weekendGames = stats.weekendGames;
    player.totalGames = stats.totalGames;

    // Calculate percentages
    player.midweekPercentage = summary.midweekGames > 0
      ? Math.round((player.midweekGames / summary.midweekGames) * 100)
      : 0;
    player.weekendPercentage = summary.weekendGames > 0
      ? Math.round((player.weekendGames / summary.weekendGames) * 100)
      : 0;
    player.totalPercentage = summary.totalGames > 0
      ? Math.round((player.totalGames / summary.totalGames) * 100)
      : 0;

    // Calculate difference if games2024 exists
    if (player.games2024 !== null && player.games2024 !== undefined) {
      player.difference = player.totalGames - player.games2024;
    }
  });

  // Update main leaderboard
  const existingLeaderboardPlayers = new Map();
  mainLeaderboard.forEach((player) => {
    existingLeaderboardPlayers.set(player.name, player);
  });

  // Get max ID
  const maxId = mainLeaderboard.length > 0
    ? Math.max(...mainLeaderboard.map(p => p.id))
    : 0;

  // Track total own goals for logging
  let totalOwnGoals = 0;

  // Update existing players and add new ones
  leaderboardStats.forEach((stats, playerName) => {
    let player = existingLeaderboardPlayers.get(playerName);

    if (!player) {
      // New player - get position from profiles or default to ["MID"]
      const profile = playerProfiles.find(p => p.name === playerName);
      // Position is always an array
      const position = profile?.position && Array.isArray(profile.position) 
        ? profile.position 
        : ['MID'];

      player = {
        id: maxId + 1 + Array.from(leaderboardStats.keys()).indexOf(playerName),
        name: playerName,
        position: position,
        matches: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        cleanSheets: 0,
        goals: 0,
        hatTricks: 0,
        ownGoals: 0,
        weekendStats: createEmptyStats(),
        weekdayStats: createEmptyStats(),
      };
      mainLeaderboard.push(player);
      existingLeaderboardPlayers.set(playerName, player);
      console.log(`  ➕ Added new player to main leaderboard: ${playerName} (${position})`);
    }

    // Ensure the player has weekendStats and weekdayStats (for existing players)
    if (!player.weekendStats) {
      player.weekendStats = createEmptyStats();
    }
    if (!player.weekdayStats) {
      player.weekdayStats = createEmptyStats();
    }
    if (player.ownGoals === undefined) {
      player.ownGoals = 0;
    }

    // Update overall stats
    player.matches = stats.matches;
    player.wins = stats.wins;
    player.losses = stats.losses;
    player.draws = stats.draws;
    player.goals = stats.goals;
    player.hatTricks = stats.hatTricks;
    player.cleanSheets = stats.cleanSheets;
    player.ownGoals = stats.ownGoals;
    
    // Update weekend stats
    player.weekendStats = { ...stats.weekendStats };
    
    // Update weekday stats
    player.weekdayStats = { ...stats.weekdayStats };

    totalOwnGoals += stats.ownGoals;
  });

  // Calculate and update goal totals in tracker file
  let totalGoals = 0;
  let weekendGoals = 0;
  let weekdayGoals = 0;

  playedMatches.forEach((match) => {
    // Calculate totalGoals for match if not present
    let matchTotalGoals = match.totalGoals;
    if (matchTotalGoals === undefined) {
      matchTotalGoals = 0;
      if (match.scorers && Array.isArray(match.scorers)) {
        matchTotalGoals = match.scorers.reduce((sum, scorer) => {
          return sum + (scorer.goals || 0);
        }, 0);
      }
      match.totalGoals = matchTotalGoals;
    }

    // Add to appropriate totals
    totalGoals += matchTotalGoals;
    if (match.day === 'Weekend') {
      weekendGoals += matchTotalGoals;
    } else if (match.day === 'Midweek') {
      weekdayGoals += matchTotalGoals;
    }
  });

  // Update tracker file with goal totals
  trackerData.totalGoals = totalGoals;
  trackerData.weekendGoals = weekendGoals;
  trackerData.weekdayGoals = weekdayGoals;

  // Reorder tracker data to have goals at top
  const { season, totalGoals: tg, weekendGoals: wg, weekdayGoals: wdg, matches, allPlayers } = trackerData;
  const reorderedTracker = {
    season,
    totalGoals: tg,
    weekendGoals: wg,
    weekdayGoals: wdg,
    matches,
    allPlayers
  };

  // Write updated files
  fs.writeFileSync(trackerPath, JSON.stringify(reorderedTracker, null, 2));
  fs.writeFileSync(attendanceLeaderboardPath, JSON.stringify(attendanceLeaderboard, null, 2));
  fs.writeFileSync(mainLeaderboardPath, JSON.stringify(mainLeaderboard, null, 2));

  console.log(`✅ Successfully synced stats for ${year}:`);
  console.log(`   - Attendance leaderboard: ${attendanceLeaderboard.players.length} players`);
  console.log(`   - Main leaderboard: ${mainLeaderboard.length} players`);
  console.log(`   - Total matches processed: ${playedMatches.length}`);
  console.log(`   - Total goals: ${totalGoals} (Weekend: ${weekendGoals}, Weekday: ${weekdayGoals})`);
  console.log(`   - Total own goals: ${totalOwnGoals}`);
} catch (error) {
  console.error('❌ Error syncing stats:', error);
  process.exit(1);
}
