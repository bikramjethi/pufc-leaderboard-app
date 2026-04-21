import matchData2024 from "../data/attendance-data/2024.json";
import matchData2025 from "../data/attendance-data/2025.json";
import matchData2026 from "../data/attendance-data/2026.json";
import leaderboardData2024 from "../data/leaderboard-data/2024.json";
import { aggregateAllTimeStats } from "./leaderboard-calculations.js";
import { isStatsTrackedPlayerName } from "./playerTracking.js";

/** Extend this map when adding a new season file. */
const MATCH_DATA_BY_SEASON = {
  "2024": matchData2024,
  "2025": matchData2025,
  "2026": matchData2026,
};

/** @param {unknown} dataSeason */
function normalizeSeasonKeys(dataSeason) {
  if (Array.isArray(dataSeason) && dataSeason.length > 0) {
    return [
      ...new Set(
        dataSeason.map((s) => String(s).trim()).filter(Boolean)
      ),
    ];
  }
  if (typeof dataSeason === "string" && dataSeason.trim()) {
    return [dataSeason.trim()];
  }
  return ["2026"];
}

/** Sorted unique season keys from config (for UI + building a subset). */
export function getConfiguredScorersSeasons(dataSeason) {
  return [...normalizeSeasonKeys(dataSeason)].sort(
    (a, b) => Number(a) - Number(b)
  );
}

const LEADERBOARD_BAR_BY_SEASON = {
  "2024": leaderboardData2024,
};

/**
 * Seasons that should use leaderboard goal totals (bar chart) instead of attendance-based lines.
 * @param {string[] | undefined} seasons — from config.SCORERS_CHART.leaderboardBarSeasons
 */
export function getLeaderboardBarSeasonSet(seasons) {
  const set = new Set();
  if (Array.isArray(seasons)) {
    seasons.forEach((s) => {
      const k = String(s).trim();
      if (k && LEADERBOARD_BAR_BY_SEASON[k]) set.add(k);
    });
  }
  return set;
}

/**
 * Top-N goal scorers for one season from `leaderboard-data/{season}.json` (bar chart).
 * Same shape as {@link buildAllTimeTopScorersBarData}.
 */
export function buildSeasonLeaderboardBarData(seasonKey, topN = 10) {
  const list = LEADERBOARD_BAR_BY_SEASON[String(seasonKey)];
  if (!Array.isArray(list) || list.length === 0) return null;

  const filtered = list.filter(
    (p) =>
      p?.name &&
      String(p.name).trim().toLowerCase() !== "others" &&
      isStatsTrackedPlayerName(p.name)
  );
  const sortedDesc = [...filtered].sort(
    (a, b) => (Number(b.goals) || 0) - (Number(a.goals) || 0)
  );
  const top = sortedDesc.slice(0, Math.max(1, topN));
  const ascending = [...top].sort(
    (a, b) => (Number(a.goals) || 0) - (Number(b.goals) || 0)
  );
  if (ascending.length === 0) return null;

  const maxGoals = Math.max(...ascending.map((p) => Number(p.goals) || 0));

  return {
    barData: ascending.map((p) => ({
      playerKey: p.name,
      goals: Number(p.goals) || 0,
    })),
    topPlayers: ascending.map((p) => p.name),
    maxGoals,
    seasonKey: String(seasonKey),
  };
}

/** Parse DD/MM/YYYY from match.date (falls back to id DD-MM-YYYY). */
function parseMatchDate(match) {
  if (match?.date) {
    const parts = String(match.date).split("/").map(Number);
    if (parts.length === 3 && parts.every((n) => !Number.isNaN(n))) {
      const [day, month, year] = parts;
      return new Date(year, month - 1, day);
    }
  }
  if (match?.id && /^\d{2}-\d{2}-\d{4}$/.test(match.id)) {
    const [day, month, year] = match.id.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  return null;
}

/** Monday-start week id (YYYY-MM-DD of Monday), sortable. */
function mondayWeekKey(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dayNum = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dayNum}`;
}

function isOthersName(name) {
  return !name || String(name).trim().toLowerCase() === "others";
}

function collectGoalsForMatch(match) {
  /** @type {Map<string, number>} */
  const byName = new Map();
  const att = match?.attendance;
  if (!att || typeof att !== "object") return byName;
  for (const team of Object.values(att)) {
    if (!Array.isArray(team)) continue;
    for (const p of team) {
      if (!p?.name || isOthersName(p.name)) continue;
      if (!isStatsTrackedPlayerName(p.name)) continue;
      const g = Number(p.goals) || 0;
      if (g <= 0) continue;
      const key = p.name;
      byName.set(key, (byName.get(key) || 0) + g);
    }
  }
  return byName;
}

/** Lowercase trimmed names on the match sheet (any attendance row), excluding "Others". */
function attendanceNamesForMatch(match) {
  /** @type {Set<string>} */
  const set = new Set();
  const att = match?.attendance;
  if (!att || typeof att !== "object") return set;
  for (const team of Object.values(att)) {
    if (!Array.isArray(team)) continue;
    for (const p of team) {
      if (!p?.name || isOthersName(p.name)) continue;
      set.add(String(p.name).trim().toLowerCase());
    }
  }
  return set;
}

/** All sheet names across every included match in a week (case-insensitive union). */
function attendanceNamesOnSheetInWeek(weekMatches) {
  /** @type {Set<string>} */
  const set = new Set();
  for (const match of weekMatches) {
    for (const n of attendanceNamesForMatch(match)) set.add(n);
  }
  return set;
}

function formatSeasonLabel(seasonKeys) {
  const sorted = [...seasonKeys].sort(
    (a, b) => Number(a) - Number(b)
  );
  if (sorted.length === 0) return "";
  if (sorted.length === 1) return sorted[0];
  return sorted.join(", ");
}

/**
 * Build cumulative weekly series for top goal scorers across one or more seasons.
 * @param {object} options
 * @param {string[] | string} [options.dataSeason] — season keys (e.g. ["2026"] or ["2025","2026"])
 * @param {number} options.topN
 * @param {boolean} [options.trackActiveWeeks] — when true, each row gets `__activeWeeks_<player>` = cumulative weeks (so far) with at least one attendance appearance
 * @returns {{ chartData: object[], topPlayers: string[], weekLabels: string[], seasonLabel: string, dataSeasons: string[] } | null}
 */
export function buildScorersChartData({
  dataSeason,
  topN = 10,
  trackActiveWeeks = false,
} = {}) {
  const seasonKeys = normalizeSeasonKeys(dataSeason);
  const allMatches = [];
  const loadedSeasons = [];

  for (const key of seasonKeys) {
    const raw = MATCH_DATA_BY_SEASON[key];
    if (raw?.matches?.length) {
      loadedSeasons.push(key);
      allMatches.push(...raw.matches);
    }
  }

  if (allMatches.length === 0) {
    return null;
  }

  const matches = allMatches
    .filter(
      (m) =>
        m.matchPlayed &&
        !m.matchCancelled &&
        !m.isTournament
    )
    .map((m) => ({ m, t: parseMatchDate(m) }))
    .filter((x) => x.t && !Number.isNaN(x.t.getTime()))
    .sort((a, b) => a.t - b.t);

  if (matches.length === 0) return null;

  /** @type {Map<string, Map<string, number>>} weekKey -> player -> goals in week */
  const goalsByWeek = new Map();
  /** @type {Map<string, object[]> | null} */
  const matchesByWeek = trackActiveWeeks ? new Map() : null;
  const weekOrder = [];
  const seenWeek = new Set();

  for (const { m, t } of matches) {
    const wk = mondayWeekKey(t);
    if (!seenWeek.has(wk)) {
      seenWeek.add(wk);
      weekOrder.push(wk);
    }
    if (!goalsByWeek.has(wk)) goalsByWeek.set(wk, new Map());
    const bucket = goalsByWeek.get(wk);
    for (const [name, g] of collectGoalsForMatch(m)) {
      bucket.set(name, (bucket.get(name) || 0) + g);
    }
    if (matchesByWeek) {
      if (!matchesByWeek.has(wk)) matchesByWeek.set(wk, []);
      matchesByWeek.get(wk).push(m);
    }
  }

  const totalGoals = new Map();
  for (const wk of weekOrder) {
    const b = goalsByWeek.get(wk);
    for (const [name, g] of b) {
      totalGoals.set(name, (totalGoals.get(name) || 0) + g);
    }
  }

  const topPlayers = [...totalGoals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, Math.max(1, topN))
    .map(([name]) => name);

  if (topPlayers.length === 0) return null;

  /** @type {Record<string, number>} */
  const cumulative = Object.fromEntries(topPlayers.map((n) => [n, 0]));
  /** @type {Record<string, number>} */
  const activeWeeks = Object.fromEntries(topPlayers.map((n) => [n, 0]));

  const chartData = weekOrder.map((wk, idx) => {
    const row = {
      weekLabel: `Week ${idx + 1}`,
      weekKey: wk,
    };
    const b = goalsByWeek.get(wk);
    const namesOnSheet =
      trackActiveWeeks && matchesByWeek
        ? attendanceNamesOnSheetInWeek(matchesByWeek.get(wk) || [])
        : null;
    for (const player of topPlayers) {
      const add = b.get(player) || 0;
      cumulative[player] += add;
      row[player] = cumulative[player];
      if (namesOnSheet) {
        const needle = String(player).trim().toLowerCase();
        if (namesOnSheet.has(needle)) activeWeeks[player] += 1;
        row[`__activeWeeks_${player}`] = activeWeeks[player];
      }
    }
    return row;
  });

  return {
    chartData,
    topPlayers,
    weekLabels: chartData.map((r) => r.weekLabel),
    seasonLabel: formatSeasonLabel(loadedSeasons),
    dataSeasons: loadedSeasons,
  };
}

/**
 * Top-N career goal scorers from aggregated leaderboard stats (all seasons in get-data).
 * Bars are ordered ascending by goals (lowest of the top N on the left).
 */
export function buildAllTimeTopScorersBarData(topN = 10) {
  const players = aggregateAllTimeStats();
  const filtered = players.filter(
    (p) => p?.name && String(p.name).trim().toLowerCase() !== "others"
  );
  const sortedDesc = [...filtered].sort(
    (a, b) => (Number(b.goals) || 0) - (Number(a.goals) || 0)
  );
  const top = sortedDesc.slice(0, Math.max(1, topN));
  const ascending = [...top].sort(
    (a, b) => (Number(a.goals) || 0) - (Number(b.goals) || 0)
  );
  if (ascending.length === 0) return null;

  const maxGoals = Math.max(...ascending.map((p) => Number(p.goals) || 0));

  return {
    barData: ascending.map((p) => ({
      playerKey: p.name,
      goals: Number(p.goals) || 0,
    })),
    topPlayers: ascending.map((p) => p.name),
    maxGoals,
  };
}
