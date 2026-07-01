import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from "@supabase/supabase-js";
import ws from "ws";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: { persistSession: false },
        realtime: { transport: ws },
      })
    : null;

// Middleware
app.use(cors());
app.use(express.json());

const readJsonSafe = (filePath, fallback = null) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
};

const writeJson = (filePath, data) => {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

const mapWeeklyMatchRow = (row) => ({
  id: row.id,
  date: row.date || "",
  day: row.day || "Midweek",
  matchPlayed: !!row.match_played,
  matchCancelled: !!row.match_cancelled,
  isTournament: !!row.is_tournament,
  isFullHouse: !!row.is_full_house,
  isBackfilled: !!row.is_backfilled,
  team1RotatingGoalie: !!row.team1_rotating_goalie,
  team2RotatingGoalie: !!row.team2_rotating_goalie,
  attendance: row.attendance || {},
  scoreline: row.scoreline || {},
  totalGoals: Number(row.total_goals || 0),
});

const mapStatsRow = (row) => ({
  id: Number(row.id || 0),
  name: row.player_name || "",
  position: Array.isArray(row.position) ? row.position : ["MID"],
  matches: Number(row.matches || 0),
  wins: Number(row.wins || 0),
  losses: Number(row.losses || 0),
  draws: Number(row.draws || 0),
  cleanSheets: Number(row.clean_sheets || 0),
  goals: Number(row.goals || 0),
  hatTricks: Number(row.hat_tricks || 0),
  ownGoals: Number(row.own_goals || 0),
  weekendStats: {
    matches: Number(row.weekend_matches || 0),
    wins: Number(row.weekend_wins || 0),
    losses: Number(row.weekend_losses || 0),
    draws: Number(row.weekend_draws || 0),
    cleanSheets: Number(row.weekend_clean_sheets || 0),
    goals: Number(row.weekend_goals || 0),
    hatTricks: Number(row.weekend_hat_tricks || 0),
    ownGoals: Number(row.weekend_own_goals || 0),
  },
  weekdayStats: {
    matches: Number(row.weekday_matches || 0),
    wins: Number(row.weekday_wins || 0),
    losses: Number(row.weekday_losses || 0),
    draws: Number(row.weekday_draws || 0),
    cleanSheets: Number(row.weekday_clean_sheets || 0),
    goals: Number(row.weekday_goals || 0),
    hatTricks: Number(row.weekday_hat_tricks || 0),
    ownGoals: Number(row.weekday_own_goals || 0),
  },
});

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

app.post('/api/backfill-from-supabase', async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({
        error: "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for backfill.",
      });
    }

    const season = Number(req.body?.season);
    if (!Number.isFinite(season)) {
      return res.status(400).json({ error: "Valid numeric season is required." });
    }

    const seasonRowRes = await supabaseAdmin
      .from("weekly_tracker_seasons")
      .select("*")
      .eq("season_year", season)
      .maybeSingle();
    if (seasonRowRes.error) throw seasonRowRes.error;
    if (!seasonRowRes.data) {
      return res.status(404).json({ error: `No weekly tracker season found for ${season}.` });
    }

    const matchesRes = await supabaseAdmin
      .from("weekly_tracker_matches")
      .select("*")
      .eq("season_year", season)
      .order("match_date", { ascending: true });
    if (matchesRes.error) throw matchesRes.error;

    const weeklyJson = {
      season,
      totalGoals: Number(seasonRowRes.data.total_goals || 0),
      weekendGoals: Number(seasonRowRes.data.weekend_goals || 0),
      weekdayGoals: Number(seasonRowRes.data.weekday_goals || 0),
      matches: (matchesRes.data || []).map(mapWeeklyMatchRow),
    };
    const weeklyPath = path.join(__dirname, `../src/data/attendance-data/${season}.json`);
    writeJson(weeklyPath, weeklyJson);

    const touchedFiles = [weeklyPath];

    if (season >= 2026) {
      const summaryRes = await supabaseAdmin
        .from("attendance_leaderboard_summary")
        .select("*")
        .eq("season_year", season)
        .maybeSingle();
      if (summaryRes.error) throw summaryRes.error;

      const attendancePlayersRes = await supabaseAdmin
        .from("attendance_leaderboard_players")
        .select("*")
        .eq("season_year", season)
        .order("sno", { ascending: true });
      if (attendancePlayersRes.error) throw attendancePlayersRes.error;

      const summary = {
        totalGames: Number(summaryRes.data?.total_games || 0),
        midweekGames: Number(summaryRes.data?.midweek_games || 0),
        weekendGames: Number(summaryRes.data?.weekend_games || 0),
      };
      const attendancePlayers = (attendancePlayersRes.data || []).map((row) => {
        const midweekGames = Number(row.midweek_games || 0);
        const weekendGames = Number(row.weekend_games || 0);
        const totalGames = Number(row.total_games || 0);
        return {
          category: row.category || "Others",
          sno: Number(row.sno || 0),
          name: row.player_name || "",
          midweekGames,
          weekendGames,
          totalGames,
          midweekPercentage:
            summary.midweekGames > 0 ? Math.round((midweekGames / summary.midweekGames) * 100) : 0,
          weekendPercentage:
            summary.weekendGames > 0 ? Math.round((weekendGames / summary.weekendGames) * 100) : 0,
          totalPercentage:
            summary.totalGames > 0 ? Math.round((totalGames / summary.totalGames) * 100) : 0,
          games2024: row.games_2024 == null ? null : Number(row.games_2024),
          difference: row.difference == null ? null : Number(row.difference),
          notes: row.notes ?? null,
        };
      });

      const attendanceLeaderboardPath = path.join(
        __dirname,
        `../src/data/attendance-data/leaderboard/${season}.json`
      );
      writeJson(attendanceLeaderboardPath, { season, summary, players: attendancePlayers });
      touchedFiles.push(attendanceLeaderboardPath);

      const statsRes = await supabaseAdmin
        .from("stats_leaderboard_players")
        .select("*")
        .eq("season_year", season)
        .order("id", { ascending: true });
      if (statsRes.error) throw statsRes.error;
      const statsPath = path.join(__dirname, `../src/data/leaderboard-data/${season}.json`);
      writeJson(statsPath, (statsRes.data || []).map(mapStatsRow));
      touchedFiles.push(statsPath);

      const playersRes = await supabaseAdmin
        .from("players")
        .select("player_name,group_availability,position,is_tracked,exclude_from_fresh_legs")
        .order("player_name", { ascending: true });
      if (playersRes.error) throw playersRes.error;

      const profilesPath = path.join(__dirname, "../src/data/player-profiles.json");
      const existingProfiles = readJsonSafe(profilesPath, []);
      const existingByName = new Map(
        (Array.isArray(existingProfiles) ? existingProfiles : []).map((p) => [
          String(p?.name || "").trim().toLowerCase(),
          p,
        ])
      );

      const mergedProfiles = (playersRes.data || []).map((row) => {
        const name = row.player_name || "";
        const existing = existingByName.get(String(name).trim().toLowerCase()) || {};
        return {
          ...existing,
          name,
          position: Array.isArray(row.position) ? row.position : ["MID"],
          groupAvailibility: row.group_availability || "ALLGAMES",
          isTracked: row.is_tracked !== false,
          excludeFromFreshLegs: row.exclude_from_fresh_legs === true,
        };
      });
      writeJson(profilesPath, mergedProfiles);
      touchedFiles.push(profilesPath);
    }

    return res.json({
      success: true,
      season,
      filesUpdated: touchedFiles.map((p) => path.relative(path.join(__dirname, ".."), p)),
    });
  } catch (error) {
    console.error("❌ Backfill error:", error);
    return res.status(500).json({ error: error.message || "Backfill failed." });
  }
});

// Start server
app.listen(PORT, () => {
  console.log('\n🏟️  PUFC Match Save Server');
  console.log('═'.repeat(40));
  console.log(`✅ Running on http://localhost:${PORT}`);
  console.log(`📝 POST /api/save-match - Save match data`);
  console.log(`🔁 POST /api/backfill-from-supabase - Backfill JSONs from Supabase`);
  console.log(`📋 GET /api/matches/:year - Get matches for year`);
  console.log(`👥 GET /api/players - Get player profiles`);
  console.log('═'.repeat(40));
  console.log('\nWaiting for requests...\n');
});

