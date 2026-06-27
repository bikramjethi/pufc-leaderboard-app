// Import all season data
import data2024 from "../data/leaderboard-data/2024.json";
import data2025 from "../data/leaderboard-data/2025.json";
import data2026 from "../data/leaderboard-data/2026.json";
import { config } from "../leaderboard-config";
import { fetchStatsLeaderboardSeason } from "../services/supabase/data";

const leaderboardStaticData = {
    2024: data2024,
    2025: data2025,
    2026: data2026,
};

export const leaderboardData = leaderboardStaticData;

export const getLeaderboardSeason = async (season) => {
  if (!(config.SUPABASE?.enabled && config.SUPABASE?.readModules?.statsLeaderboard)) {
    return leaderboardStaticData[season] || [];
  }
  try {
    return await fetchStatsLeaderboardSeason(season);
  } catch {
    return leaderboardStaticData[season] || [];
  }
};