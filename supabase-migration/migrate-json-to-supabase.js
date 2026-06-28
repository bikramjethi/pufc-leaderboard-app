/* global process */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import ws from "ws";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
  realtime: { transport: ws },
});

const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));

const season = Number(process.argv[2] || 2026);
const attendancePath = path.join(__dirname, `../src/data/attendance-data/${season}.json`);
const attendanceLeaderboardPath = path.join(__dirname, `../src/data/attendance-data/leaderboard/${season}.json`);
const statsLeaderboardPath = path.join(__dirname, `../src/data/leaderboard-data/${season}.json`);
const profilesPath = path.join(__dirname, "../src/data/player-profiles.json");

const attendance = readJson(attendancePath);
const attendanceLeaderboard = readJson(attendanceLeaderboardPath);
const statsLeaderboard = readJson(statsLeaderboardPath);
const profiles = readJson(profilesPath);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableError = (error) => {
  const message = String(error?.message || error?.details || "").toLowerCase();
  return (
    message.includes("econnreset") ||
    message.includes("fetch failed") ||
    message.includes("etimedout") ||
    message.includes("network")
  );
};

const retry = async (label, fn, { maxAttempts = 5, baseDelayMs = 800 } = {}) => {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isRetryableError(error) || attempt === maxAttempts) {
        throw error;
      }
      const delayMs = baseDelayMs * attempt;
      console.warn(
        `Retrying ${label} (${attempt}/${maxAttempts}) after transient error: ${
          error?.message || error?.details || error
        }`
      );
      await sleep(delayMs);
    }
  }
  throw lastError;
};

const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
};

const upsertInChunks = async (label, table, rows, onConflict, chunkSize = 150) => {
  if (!rows.length) return;
  const chunks = chunk(rows, chunkSize);
  for (let i = 0; i < chunks.length; i++) {
    const rowsChunk = chunks[i];
    await retry(`${label} chunk ${i + 1}/${chunks.length}`, async () => {
      const { error } = await supabase.from(table).upsert(rowsChunk, { onConflict });
      if (error) throw error;
    });
    console.log(`  ✓ ${label}: ${Math.min((i + 1) * chunkSize, rows.length)}/${rows.length}`);
  }
};

const dateFromMatchId = (id) => {
  const [d, m, y] = String(id).split("-");
  return `${y}-${m}-${d}`;
};

async function run() {
  console.log(`Migrating season ${season} to Supabase...`);

  const playersRows = profiles.map((p) => ({
    player_name: p.name,
    group_availability: p.groupAvailibility || null,
    is_tracked: p.isTracked !== false,
    position: Array.isArray(p.position) ? p.position : ["MID"],
  }));
  await upsertInChunks("players", "players", playersRows, "player_name", 200);

  await retry("weekly_tracker_seasons", async () => {
    const { error: seasonErr } = await supabase.from("weekly_tracker_seasons").upsert({
      season_year: season,
      total_goals: attendance.totalGoals || 0,
      weekend_goals: attendance.weekendGoals || 0,
      weekday_goals: attendance.weekdayGoals || 0,
      all_players: attendance.allPlayers || [],
    });
    if (seasonErr) throw seasonErr;
  });

  const matchRows = (attendance.matches || []).map((m) => ({
    id: m.id,
    season_year: season,
    match_date: dateFromMatchId(m.id),
    date: m.date || "",
    day: m.day || "Midweek",
    match_played: !!m.matchPlayed,
    match_cancelled: !!m.matchCancelled,
    is_tournament: !!m.isTournament,
    is_full_house: !!m.isFullHouse,
    is_backfilled: !!m.isBackfilled,
    team1_rotating_goalie: !!m.team1RotatingGoalie,
    team2_rotating_goalie: !!m.team2RotatingGoalie,
    attendance: m.attendance || {},
    scoreline: m.scoreline || {},
    total_goals: m.totalGoals || 0,
  }));
  await upsertInChunks("weekly_tracker_matches", "weekly_tracker_matches", matchRows, "id", 80);

  const summaryRow = {
    season_year: season,
    total_games: attendanceLeaderboard.summary?.totalGames || 0,
    midweek_games: attendanceLeaderboard.summary?.midweekGames || 0,
    weekend_games: attendanceLeaderboard.summary?.weekendGames || 0,
  };
  await retry("attendance_leaderboard_summary", async () => {
    const { error } = await supabase.from("attendance_leaderboard_summary").upsert(summaryRow);
    if (error) throw error;
  });

  const attendanceRows = (attendanceLeaderboard.players || []).map((p) => ({
    season_year: season,
    category: p.category || "Others",
    sno: p.sno || 0,
    player_name: p.name,
    midweek_games: p.midweekGames || 0,
    weekend_games: p.weekendGames || 0,
    total_games: p.totalGames || 0,
    games_2024: p.games2024,
    difference: p.difference,
    notes: p.notes || null,
  }));
  await upsertInChunks(
    "attendance_leaderboard_players",
    "attendance_leaderboard_players",
    attendanceRows,
    "season_year,player_name",
    120
  );

  const statsByPlayerName = new Map();
  (statsLeaderboard || []).forEach((p) => {
    const key = String(p.name || "").trim();
    if (!key) return;
    statsByPlayerName.set(key, {
      season_year: season,
      id: p.id,
      player_name: key,
      position: Array.isArray(p.position) ? p.position : ["MID"],
      matches: p.matches || 0,
      wins: p.wins || 0,
      losses: p.losses || 0,
      draws: p.draws || 0,
      clean_sheets: p.cleanSheets || 0,
      goals: p.goals || 0,
      hat_tricks: p.hatTricks || 0,
      own_goals: p.ownGoals || 0,
      weekend_matches: p.weekendStats?.matches || 0,
      weekend_wins: p.weekendStats?.wins || 0,
      weekend_losses: p.weekendStats?.losses || 0,
      weekend_draws: p.weekendStats?.draws || 0,
      weekend_clean_sheets: p.weekendStats?.cleanSheets || 0,
      weekend_goals: p.weekendStats?.goals || 0,
      weekend_hat_tricks: p.weekendStats?.hatTricks || 0,
      weekend_own_goals: p.weekendStats?.ownGoals || 0,
      weekday_matches: p.weekdayStats?.matches || 0,
      weekday_wins: p.weekdayStats?.wins || 0,
      weekday_losses: p.weekdayStats?.losses || 0,
      weekday_draws: p.weekdayStats?.draws || 0,
      weekday_clean_sheets: p.weekdayStats?.cleanSheets || 0,
      weekday_goals: p.weekdayStats?.goals || 0,
      weekday_hat_tricks: p.weekdayStats?.hatTricks || 0,
      weekday_own_goals: p.weekdayStats?.ownGoals || 0,
    });
  });
  const statsRows = Array.from(statsByPlayerName.values());
  await upsertInChunks(
    "stats_leaderboard_players",
    "stats_leaderboard_players",
    statsRows,
    "season_year,player_name",
    120
  );

  console.log("Migration completed.");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

