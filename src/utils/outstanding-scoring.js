/**
 * Scan attendance JSON for single-match goal hauls (e.g. double hat-trick = 6+).
 */

const attendanceModules = import.meta.glob("../data/attendance-data/*.json", {
  eager: true,
});

function loadSeasonData(season) {
  for (const [key, mod] of Object.entries(attendanceModules)) {
    if (key.includes(`/${season}.json`)) return mod.default || mod;
  }
  return null;
}

function matchSortTime(matchId) {
  if (!matchId) return 0;
  const parts = String(matchId).split("-");
  if (parts.length >= 3) {
    const [d, m, y] = parts;
    const t = new Date(`${y}-${m}-${d}`).getTime();
    return Number.isNaN(t) ? 0 : t;
  }
  return 0;
}

/** @param {Record<string, number>} scoreline */
export function formatScorelineShort(scoreline) {
  if (!scoreline || typeof scoreline !== "object") return "—";
  const entries = Object.entries(scoreline);
  if (entries.length < 2) return entries.map(([t, s]) => `${t} ${s}`).join(" ");
  const [a, b] = entries;
  return `${a[0]} ${a[1]} – ${b[1]} ${b[0]}`;
}

/**
 * @param {object} options
 * @param {string[]} options.seasons
 * @param {number} options.minGoals
 * @param {number} [options.onlyBackfilledBeforeYear] — if set, matches in seasons strictly before this calendar year need isBackfilled
 */
export function collectOutstandingScoringPerformances({
  seasons,
  minGoals,
  onlyBackfilledBeforeYear,
}) {
  /** @type {Array<{ playerName: string, goals: number, season: string, matchId: string, date: string, day: string, teamColor: string, scoreline: Record<string, number>, ownGoals: number }>} */
  const flat = [];

  for (const season of seasons) {
    const data = loadSeasonData(season);
    if (!data?.matches) continue;
    const seasonYear = parseInt(season, 10);

    for (const m of data.matches) {
      if (!m.matchPlayed || m.matchCancelled) continue;
      if (
        onlyBackfilledBeforeYear != null &&
        seasonYear < onlyBackfilledBeforeYear &&
        !m.isBackfilled
      ) {
        continue;
      }

      const att = m.attendance;
      if (!att || typeof att !== "object") continue;

      for (const [teamColor, players] of Object.entries(att)) {
        if (!Array.isArray(players)) continue;
        for (const p of players) {
          if (!p?.name) continue;
          const g = Number(p.goals) || 0;
          if (g < minGoals) continue;
          flat.push({
            playerName: p.name,
            goals: g,
            season,
            matchId: m.id,
            date: m.date || m.id,
            day: m.day || "",
            teamColor,
            scoreline: m.scoreline && typeof m.scoreline === "object" ? { ...m.scoreline } : {},
            ownGoals: Number(p.ownGoals) || 0,
          });
        }
      }
    }
  }

  const byPlayer = new Map();
  for (const perf of flat) {
    if (!byPlayer.has(perf.playerName)) byPlayer.set(perf.playerName, []);
    byPlayer.get(perf.playerName).push(perf);
  }

  const rows = Array.from(byPlayer.entries()).map(([name, performances]) => ({
    name,
    count: performances.length,
    performances: [...performances].sort(
      (a, b) => matchSortTime(b.matchId) - matchSortTime(a.matchId)
    ),
  }));

  rows.sort(
    (a, b) =>
      b.count - a.count || a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  );

  return { rows, totalPerformances: flat.length };
}
