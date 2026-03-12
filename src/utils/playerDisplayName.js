import playerProfiles from "../data/player-profiles.json";

const nameSuffixMap = new Map(
  playerProfiles
    .filter((p) => p.nameSuffix && String(p.nameSuffix).trim())
    .map((p) => [p.name.toLowerCase().trim(), String(p.nameSuffix).trim()])
);

/**
 * Returns the display name for a player (name + optional suffix, e.g. emoji).
 * Use for UI display only; keep using canonical name for sort/filter/data keys.
 * @param {string} name - Canonical player name (e.g. from leaderboard/attendance data)
 * @returns {string} Display name, e.g. "Lalit 🍌" or "Lalit"
 */
export function getDisplayName(name) {
  if (!name || name === "Others") return name;
  const key = name.toLowerCase().trim();
  const suffix = nameSuffixMap.get(key);
  if (suffix) return `${name} ${suffix}`;
  return name;
}
