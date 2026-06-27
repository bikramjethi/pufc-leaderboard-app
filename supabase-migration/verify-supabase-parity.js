/* global process */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import ws from "ws";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  realtime: { transport: ws },
});

const season = Number(process.argv[2] || 2026);
const localAttendance = JSON.parse(
  fs.readFileSync(path.join(__dirname, `../src/data/attendance-data/${season}.json`), "utf8")
);
const localAttendanceLb = JSON.parse(
  fs.readFileSync(path.join(__dirname, `../src/data/attendance-data/leaderboard/${season}.json`), "utf8")
);
const localStatsLb = JSON.parse(
  fs.readFileSync(path.join(__dirname, `../src/data/leaderboard-data/${season}.json`), "utf8")
);

async function run() {
  const dbMatches = await supabase
    .from("weekly_tracker_matches")
    .select("id")
    .eq("season_year", season);
  const dbSummary = await supabase
    .from("attendance_leaderboard_summary")
    .select("*")
    .eq("season_year", season)
    .single();
  const dbAttendancePlayers = await supabase
    .from("attendance_leaderboard_players")
    .select("player_name")
    .eq("season_year", season);
  const dbStatsPlayers = await supabase
    .from("stats_leaderboard_players")
    .select("player_name")
    .eq("season_year", season);

  if (dbMatches.error || dbSummary.error || dbAttendancePlayers.error || dbStatsPlayers.error) {
    throw new Error(
      [
        dbMatches.error?.message,
        dbSummary.error?.message,
        dbAttendancePlayers.error?.message,
        dbStatsPlayers.error?.message,
      ]
        .filter(Boolean)
        .join(" | ")
    );
  }

  const report = {
    season,
    weeklyTracker: {
      localMatchCount: localAttendance.matches.length,
      dbMatchCount: dbMatches.data.length,
      localTotalGoals: localAttendance.totalGoals || 0,
    },
    attendanceLeaderboard: {
      localPlayers: localAttendanceLb.players.length,
      dbPlayers: dbAttendancePlayers.data.length,
      localSummary: localAttendanceLb.summary,
      dbSummary: dbSummary.data,
    },
    statsLeaderboard: {
      localPlayers: localStatsLb.length,
      dbPlayers: dbStatsPlayers.data.length,
    },
  };

  console.log(JSON.stringify(report, null, 2));
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

