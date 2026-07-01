import { supabase, isSupabaseConfigured } from "../../lib/supabaseClient";
import {
  normalizeAttendancePlayer,
  normalizeAttendanceSummary,
  normalizeStatsPlayer,
} from "./mappers";

const ensureClient = () => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }
};

const normalizeMatchRow = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    date: row.date || "",
    day: row.day || "Midweek",
    matchPlayed: row.match_played ?? row.matchPlayed ?? false,
    matchCancelled: row.match_cancelled ?? row.matchCancelled ?? false,
    isTournament: row.is_tournament ?? row.isTournament ?? false,
    isFullHouse: row.is_full_house ?? row.isFullHouse ?? false,
    isBackfilled: row.is_backfilled ?? row.isBackfilled ?? false,
    team1RotatingGoalie: row.team1_rotating_goalie ?? row.team1RotatingGoalie ?? false,
    team2RotatingGoalie: row.team2_rotating_goalie ?? row.team2RotatingGoalie ?? false,
    attendance: row.attendance || {},
    scoreline: row.scoreline || {},
    totalGoals: Number(row.total_goals ?? row.totalGoals ?? 0),
  };
};

export const fetchWeeklyTrackerSeason = async (seasonYear) => {
  ensureClient();
  const { data, error } = await supabase
    .from("weekly_tracker_seasons")
    .select("season_year,total_goals,weekend_goals,weekday_goals,all_players")
    .eq("season_year", Number(seasonYear))
    .single();
  if (error) throw error;

  const matchesRes = await supabase
    .from("weekly_tracker_matches")
    .select("*")
    .eq("season_year", Number(seasonYear))
    .order("match_date", { ascending: true });
  if (matchesRes.error) throw matchesRes.error;

  return {
    season: String(data.season_year),
    totalGoals: Number(data.total_goals || 0),
    weekendGoals: Number(data.weekend_goals || 0),
    weekdayGoals: Number(data.weekday_goals || 0),
    allPlayers: Array.isArray(data.all_players) ? data.all_players : [],
    matches: (matchesRes.data || []).map(normalizeMatchRow),
  };
};

export const fetchAttendanceLeaderboard = async (seasonYear) => {
  ensureClient();
  const summaryRes = await supabase
    .from("attendance_leaderboard_summary")
    .select("*")
    .eq("season_year", Number(seasonYear))
    .single();
  if (summaryRes.error) throw summaryRes.error;

  const playersRes = await supabase
    .from("attendance_leaderboard_players")
    .select("*")
    .eq("season_year", Number(seasonYear))
    .order("sno", { ascending: true });
  if (playersRes.error) throw playersRes.error;

  return {
    summary: normalizeAttendanceSummary(summaryRes.data),
    players: (playersRes.data || []).map(normalizeAttendancePlayer),
  };
};

export const fetchStatsLeaderboardSeason = async (seasonYear) => {
  ensureClient();
  const { data, error } = await supabase
    .from("stats_leaderboard_players")
    .select("*")
    .eq("season_year", Number(seasonYear))
    .order("id", { ascending: true });
  if (error) throw error;
  return (data || []).map(normalizeStatsPlayer);
};

export const fetchAvailableSeasonYears = async () => {
  ensureClient();
  const { data, error } = await supabase
    .from("weekly_tracker_seasons")
    .select("season_year")
    .order("season_year", { ascending: false });
  if (error) throw error;
  return (data || []).map((row) => String(row.season_year));
};

export const fetchSeasonMatches = async (seasonYear) => {
  ensureClient();
  const { data, error } = await supabase
    .from("weekly_tracker_matches")
    .select("*")
    .eq("season_year", Number(seasonYear))
    .order("match_date", { ascending: true });
  if (error) throw error;
  return (data || []).map(normalizeMatchRow);
};

export const fetchNextUnfilledMatchId = async (seasonYear) => {
  ensureClient();
  const todayIso = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("weekly_tracker_matches")
    .select("id")
    .eq("season_year", Number(seasonYear))
    .eq("match_played", false)
    .eq("match_cancelled", false)
    .lte("match_date", todayIso)
    .order("match_date", { ascending: true })
    .limit(1);
  if (error) throw error;
  return data?.[0]?.id || "";
};

export const fetchMatchEntryById = async ({ matchId, seasonYear }) => {
  ensureClient();
  if (!matchId?.trim()) return null;

  let query = supabase
    .from("weekly_tracker_matches")
    .select("*")
    .eq("id", matchId.trim());

  if (seasonYear != null) {
    query = query.eq("season_year", Number(seasonYear));
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    date: data.date || "",
    day: data.day || "Midweek",
    matchPlayed: !!data.match_played,
    matchCancelled: !!data.match_cancelled,
    isTournament: !!data.is_tournament,
    isFullHouse: !!data.is_full_house,
    isBackfilled: !!data.is_backfilled,
    team1RotatingGoalie: !!data.team1_rotating_goalie,
    team2RotatingGoalie: !!data.team2_rotating_goalie,
    attendance: data.attendance || {},
    scoreline: data.scoreline || {},
    totalGoals: Number(data.total_goals || 0),
  };
};

export const saveMatchEntry = async ({ year, matchData }) => {
  ensureClient();
  const { data, error } = await supabase.rpc("upsert_match_entry", {
    in_season_year: Number(year),
    in_match_payload: matchData,
  });
  if (error) throw error;
  return data;
};

export const refreshSeasonStats = async (seasonYear) => {
  ensureClient();
  const { data, error } = await supabase.rpc("refresh_season_stats", {
    in_season_year: Number(seasonYear),
  });
  if (error) throw error;
  return data;
};

const normalizePlayerProfileRow = (row) => ({
  name: row?.player_name || "",
  groupAvailibility: row?.group_availability || "ALLGAMES",
  position: Array.isArray(row?.position) ? row.position : ["MID"],
  isTracked: row?.is_tracked !== false,
  excludeFromFreshLegs: row?.exclude_from_fresh_legs === true,
});

export const fetchPlayerProfiles = async () => {
  ensureClient();
  const { data, error } = await supabase
    .from("players")
    .select("player_name,group_availability,position,is_tracked,exclude_from_fresh_legs")
    .order("player_name", { ascending: true });
  if (error) throw error;
  return (data || []).map(normalizePlayerProfileRow);
};

export const upsertPlayerProfile = async (profile) => {
  ensureClient();
  const payload = {
    player_name: String(profile?.name || "").trim(),
    group_availability: String(profile?.groupAvailibility || "ALLGAMES").trim().toUpperCase(),
    position: Array.isArray(profile?.position) ? profile.position : ["MID"],
    is_tracked: profile?.isTracked !== false,
    exclude_from_fresh_legs: profile?.excludeFromFreshLegs === true,
  };
  if (!payload.player_name) throw new Error("Player name is required.");
  const { error } = await supabase.from("players").upsert(payload, { onConflict: "player_name" });
  if (error) throw error;
};

export const deletePlayerProfile = async (playerName) => {
  ensureClient();
  const { error } = await supabase
    .from("players")
    .delete()
    .eq("player_name", String(playerName || "").trim());
  if (error) throw error;
};

export const fetchAppConfig = async (key) => {
  ensureClient();
  const { data, error } = await supabase
    .from("app_config")
    .select("value")
    .eq("key", String(key))
    .maybeSingle();
  if (error) throw error;
  return data?.value ?? null;
};

export const upsertAppConfig = async ({ key, value }) => {
  ensureClient();
  const { error } = await supabase.from("app_config").upsert(
    {
      key: String(key),
      value,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );
  if (error) throw error;
};

