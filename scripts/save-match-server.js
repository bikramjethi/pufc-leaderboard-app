import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// POST /api/save-match
app.post('/api/save-match', (req, res) => {
  try {
    const { year, matchData } = req.body;

    if (!year || !matchData) {
      return res.status(400).json({ error: 'Year and matchData are required' });
    }

    if (!matchData.id) {
      return res.status(400).json({ error: 'Match ID is required' });
    }

    // Load tracker file
    const trackerPath = path.join(__dirname, `../src/data/attendance-data/${year}.json`);
    
    if (!fs.existsSync(trackerPath)) {
      return res.status(404).json({ error: `Tracker file not found for year ${year}` });
    }

    const trackerData = JSON.parse(fs.readFileSync(trackerPath, 'utf8'));
    
    // Find the match index
    const matchIndex = trackerData.matches.findIndex(m => m.id === matchData.id);
    
    if (matchIndex === -1) {
      // If match doesn't exist, add it
      trackerData.matches.push(matchData);
      console.log(`✅ Added new match: ${matchData.id}`);
    } else {
      // Update existing match
      trackerData.matches[matchIndex] = matchData;
      console.log(`✅ Updated match: ${matchData.id}`);
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
    const teams = Object.values(matchData.attendance || {});
    teams.forEach(team => {
      team.forEach(player => allPlayerNames.add(player.name));
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

    console.log(`📁 Saved to: ${trackerPath}`);
    console.log(`📊 Season totals: ${seasonTotalGoals} goals (Weekend: ${seasonWeekendGoals}, Weekday: ${seasonWeekdayGoals})`);

    res.json({ 
      success: true, 
      message: `Match ${matchData.id} saved successfully`,
      seasonStats: {
        totalGoals: seasonTotalGoals,
        weekendGoals: seasonWeekendGoals,
        weekdayGoals: seasonWeekdayGoals,
        totalMatches: playedMatches.length
      }
    });
  } catch (error) {
    console.error('❌ Error saving match:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/matches/:year - Get all matches for a year
app.get('/api/matches/:year', (req, res) => {
  try {
    const { year } = req.params;
    const trackerPath = path.join(__dirname, `../src/data/attendance-data/${year}.json`);
    
    if (!fs.existsSync(trackerPath)) {
      return res.status(404).json({ error: `Tracker file not found for year ${year}` });
    }

    const trackerData = JSON.parse(fs.readFileSync(trackerPath, 'utf8'));
    res.json(trackerData);
  } catch (error) {
    console.error('❌ Error loading matches:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/players - Get all player profiles
app.get('/api/players', (req, res) => {
  try {
    const profilesPath = path.join(__dirname, '../src/data/player-profiles.json');
    const profiles = JSON.parse(fs.readFileSync(profilesPath, 'utf8'));
    res.json(profiles);
  } catch (error) {
    console.error('❌ Error loading players:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log('\n🏟️  PUFC Match Save Server');
  console.log('═'.repeat(40));
  console.log(`✅ Running on http://localhost:${PORT}`);
  console.log(`📝 POST /api/save-match - Save match data`);
  console.log(`📋 GET /api/matches/:year - Get matches for year`);
  console.log(`👥 GET /api/players - Get player profiles`);
  console.log('═'.repeat(40));
  console.log('\nWaiting for requests...\n');
});

