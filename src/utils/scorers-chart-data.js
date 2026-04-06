import matchData2024 from "../data/attendance-data/2024.json";
import matchData2025 from "../data/attendance-data/2025.json";
import matchData2026 from "../data/attendance-data/2026.json";

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
      const g = Number(p.goals) || 0;
      if (g <= 0) continue;
      const key = p.name;
      byName.set(key, (byName.get(key) || 0) + g);
    }
  }
  return byName;
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
 * @returns {{ chartData: object[], topPlayers: string[], weekLabels: string[], seasonLabel: string, dataSeasons: string[] } | null}
 */
export function buildScorersChartData({ dataSeason, topN = 10 } = {}) {
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

  const chartData = weekOrder.map((wk, idx) => {
    const row = {
      weekLabel: `Week ${idx + 1}`,
      weekKey: wk,
    };
    const b = goalsByWeek.get(wk);
    for (const player of topPlayers) {
      const add = b.get(player) || 0;
      cumulative[player] += add;
      row[player] = cumulative[player];
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
