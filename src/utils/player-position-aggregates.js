/**
 * Aggregate per-match stats from attendance JSON.
 * Only counts played, non-cancelled matches.
 *
 * Listed `position` drives the donut, bars, and flexibility tags.
 * `rotatedGoalie` is counted separately (not as a GK position appearance).
 */

/** @param {Array<{ name: string, groupAvailibility?: string }>} profiles */
export function buildEligibleProfileMap(profiles) {
  const map = new Map();
  for (const p of profiles) {
    if (p.isTracked === false) continue;
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
 * @returns {{ positions: Map<string, Map<string, number>>, rotatedGoalie: Map<string, number> }}
 */
export function aggregateLineupStatsForSeason(seasonData, eligibleByLower) {
  const positions = new Map();
  const rotatedGoalie = new Map();
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

        const name = profile.name;
        const pos = String(player.position || "").trim().toUpperCase();
        if (pos) {
          if (!positions.has(name)) positions.set(name, new Map());
          const byPos = positions.get(name);
          byPos.set(pos, (byPos.get(pos) || 0) + 1);
        }

        if (player.rotatedGoalie) {
          rotatedGoalie.set(name, (rotatedGoalie.get(name) || 0) + 1);
        }
      }
    }
  }

  return { positions, rotatedGoalie };
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

/**
 * @param {Map<string, number>[]} maps
 * @returns {Map<string, number>}
 */
export function mergeRotatedGoalieCounts(maps) {
  const out = new Map();
  for (const m of maps) {
    for (const [name, c] of m) {
      out.set(name, (out.get(name) || 0) + c);
    }
  }
  return out;
}

/**
 * @param {{ positions: Map<string, Map<string, number>>, rotatedGoalie: Map<string, number> }[]} list
 */
export function mergeLineupStatsAggregates(list) {
  return {
    positions: mergePositionAggregates(list.map((s) => s.positions)),
    rotatedGoalie: mergeRotatedGoalieCounts(list.map((s) => s.rotatedGoalie)),
  };
}
