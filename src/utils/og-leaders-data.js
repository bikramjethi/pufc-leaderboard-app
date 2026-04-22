/**
 * Cumulative own-goal totals from every `attendance-data/20*.json` season file
 * (Vite picks up new years automatically via import.meta.glob).
 */

import { formatScorelineShort } from "./outstanding-scoring.js";

const attendanceYearModules = import.meta.glob("../data/attendance-data/20*.json", {
  eager: true,
});

/** @returns {Record<string, { matches?: object[] }>} */
function loadMatchDataByYear() {
  /** @type {Record<string, unknown>} */
  const byYear = {};
  for (const [path, mod] of Object.entries(attendanceYearModules)) {
    const m = path.match(/(\d{4})\.json$/);
    if (!m) continue;
    byYear[m[1]] = mod.default ?? mod;
  }
  return byYear;
}

export const matchDataByYearForOg = loadMatchDataByYear();

export function getOgLeaderSeasonKeys() {
  return Object.keys(matchDataByYearForOg)
    .filter((y) => /^\d{4}$/.test(y))
    .sort((a, b) => Number(a) - Number(b));
}

function isTrackablePlayerName(name) {
  if (!name) return false;
  if (name === "Others") return false;
  if (/\+\d+$/.test(name)) return false;
  return true;
}

function matchSortTime(matchId) {
  if (!matchId) return 0;
  const parts = String(matchId).split("-");
  if (parts.length >= 3) {
    const [d, mo, y] = parts;
    const t = new Date(`${y}-${mo}-${d}`).getTime();
    return Number.isNaN(t) ? 0 : t;
  }
  return 0;
}

/**
 * @param {string} year
 * @param {boolean} requiresBackfill
 */
function getValidMatchesForYear(year, requiresBackfill) {
  const data = matchDataByYearForOg[year];
  if (!data?.matches) return [];
  return data.matches.filter((m) => {
    if (!m.matchPlayed || m.matchCancelled) return false;
    if (m.isTournament) return false;
    if (
      (year === "2024" || year === "2025") &&
      requiresBackfill &&
      !m.isBackfilled
    ) {
      return false;
    }
    return true;
  });
}

/**
 * @param {object} options
 * @param {number} [options.topN=15]
 * @param {boolean} [options.requiresBackfillLegacy=true] — 2024/2025 only count matches with `isBackfilled: true`
 */
export function buildCumulativeOgLeadersData({
  topN = 15,
  requiresBackfillLegacy = true,
} = {}) {
  const seasons = getOgLeaderSeasonKeys();
  /** @type {Map<string, { totalOgs: number, games: object[] }>} */
  const byPlayer = new Map();

  for (const year of seasons) {
    const matches = getValidMatchesForYear(year, requiresBackfillLegacy);
    for (const m of matches) {
      const att = m.attendance;
      if (!att || typeof att !== "object") continue;
      for (const [teamColor, teamPlayers] of Object.entries(att)) {
        if (!Array.isArray(teamPlayers)) continue;
        for (const p of teamPlayers) {
          if (!p?.name || !isTrackablePlayerName(p.name)) continue;
          const ogs = Number(p.ownGoals) || 0;
          if (ogs <= 0) continue;
          const name = p.name;
          if (!byPlayer.has(name)) {
            byPlayer.set(name, { totalOgs: 0, games: [] });
          }
          const row = byPlayer.get(name);
          row.totalOgs += ogs;
          row.games.push({
            season: year,
            matchId: m.id,
            date: m.date || m.id,
            day: m.day || "",
            teamColor,
            ownGoals: ogs,
            scorelineLabel: formatScorelineShort(m.scoreline),
          });
        }
      }
    }
  }

  const sortedDesc = [...byPlayer.entries()].sort(
    (a, b) =>
      b[1].totalOgs - a[1].totalOgs ||
      a[0].localeCompare(b[0], undefined, { sensitivity: "base" })
  );

  const top = sortedDesc.slice(0, Math.max(1, topN));

  for (const [, row] of byPlayer) {
    row.games.sort((a, b) => {
      const sy = Number(b.season) - Number(a.season);
      if (sy !== 0) return sy;
      return matchSortTime(b.matchId) - matchSortTime(a.matchId);
    });
  }

  const ascending = [...top].sort((a, b) => a[1].totalOgs - b[1].totalOgs);
  const maxOgs = ascending.length
    ? Math.max(...ascending.map(([, r]) => r.totalOgs))
    : 0;

  return {
    barData: ascending.map(([playerKey, r]) => ({
      playerKey,
      ogs: r.totalOgs,
    })),
    topPlayers: ascending.map(([name]) => name),
    maxOgs,
    byPlayer,
    seasonKeys: seasons,
    matchCount: seasons.reduce(
      (n, y) => n + getValidMatchesForYear(y, requiresBackfillLegacy).length,
      0
    ),
  };
}
