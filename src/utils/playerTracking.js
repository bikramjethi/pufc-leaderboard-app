import playerProfiles from "../data/player-profiles.json";

/**
 * Whether a profile row counts toward stats leaderboard, Insights, scorers chart, etc.
 * Missing `isTracked` defaults to true (opt-out only when explicitly false).
 */
export function profileEntryIsTracked(profile) {
  return profile && profile.isTracked !== false;
}

function buildStatsTrackedNameKeySet() {
  const set = new Set();
  for (const p of playerProfiles || []) {
    const raw = p?.name;
    if (!raw) continue;
    const key = String(raw).trim().toLowerCase();
    if (!key || key === "others") continue;
    if (!profileEntryIsTracked(p)) continue;
    set.add(key);
  }
  return set;
}

const STATS_TRACKED_NAME_KEYS = buildStatsTrackedNameKeySet();

/**
 * True if this sheet name is listed in player-profiles.json with isTracked !== false.
 */
export function isStatsTrackedPlayerName(name) {
  if (!name) return false;
  const key = String(name).trim().toLowerCase();
  if (!key || key === "others") return false;
  return STATS_TRACKED_NAME_KEYS.has(key);
}

export function filterPlayersForStatsLeaderboard(players) {
  if (!Array.isArray(players)) return [];
  return players.filter((p) => isStatsTrackedPlayerName(p?.name));
}

/** Per-season arrays for the stats UI (leaderboard modal, etc.). */
export function filterLeaderboardDataByTracked(allSeasonData) {
  if (!allSeasonData || typeof allSeasonData !== "object") return {};
  const out = {};
  for (const [year, list] of Object.entries(allSeasonData)) {
    out[year] = filterPlayersForStatsLeaderboard(list);
  }
  return out;
}
