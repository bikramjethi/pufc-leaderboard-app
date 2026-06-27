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
    matches: matchesRes.data || [],
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

