/**
 * Aggregate per-match position counts from attendance JSON.
 * Only counts played, non-cancelled matches.
 */

/** @param {Array<{ name: string, groupAvailibility?: string }>} profiles */
export function buildEligibleProfileMap(profiles) {
  const map = new Map();
  for (const p of profiles) {
    const g = p.groupAvailibility;
    if (g === "INACTIVE" || g === "ONLOAN") continue;
    const key = p.name.toLowerCase().trim();
    if (key) map.set(key, p);
  }
  return map;
}

/**
 * @param {object} seasonData - attendance season file (matches array)
 * @param {Map<string, object>} eligibleByLower - from buildEligibleProfileMap
 * @returns {Map<string, Map<string, number>>} canonical name -> position -> count
 */
export function aggregatePositionsForSeason(seasonData, eligibleByLower) {
  const counts = new Map();
  const matches = seasonData?.matches || [];

  for (const m of matches) {
    if (!m.matchPlayed || m.matchCancelled) continue;
    const att = m.attendance;
    if (!att || typeof att !== "object") continue;

    for (const teamPlayers of Object.values(att)) {
      if (!Array.isArray(teamPlayers)) continue;
      for (const player of teamPlayers) {
        if (!player?.name || player.groupStatus === "ONLOAN") continue;
        const profile = eligibleByLower.get(player.name.toLowerCase().trim());
        if (!profile) continue;

        const pos = String(player.position || "").trim().toUpperCase();
        if (!pos) continue;

        const name = profile.name;
        if (!counts.has(name)) counts.set(name, new Map());
        const byPos = counts.get(name);
        byPos.set(pos, (byPos.get(pos) || 0) + 1);
      }
    }
  }

  return counts;
}

/**
 * @param {Map<string, Map<string, number>>[]} aggs
 * @returns {Map<string, Map<string, number>>}
 */
export function mergePositionAggregates(aggs) {
  const merged = new Map();
  for (const agg of aggs) {
    for (const [name, posMap] of agg) {
      if (!merged.has(name)) merged.set(name, new Map());
      const target = merged.get(name);
      for (const [pos, c] of posMap) {
        target.set(pos, (target.get(pos) || 0) + c);
      }
    }
  }
  return merged;
}
