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

export const getLeaderboardSeasonWithSource = async (season) => {
  const seasonNum = Number(season);
  if (Number.isFinite(seasonNum) && seasonNum < 2026) {
    return {
      data: leaderboardStaticData[season] || [],
      source: "json-fallback",
    };
  }
  if (!(config.SUPABASE?.enabled && config.SUPABASE?.readModules?.statsLeaderboard)) {
    return {
      data: leaderboardStaticData[season] || [],
      source: "json-fallback",
    };
  }
  try {
    const data = await fetchStatsLeaderboardSeason(season);
    return { data, source: "supabase" };
  } catch {
    return {
      data: leaderboardStaticData[season] || [],
      source: "json-fallback",
    };
  }
};