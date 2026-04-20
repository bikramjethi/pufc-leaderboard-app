/**
 * Stats leaderboard column definitions and visibility (see config.STATS_LEADERBOARD.columns).
 */

export const DEFAULT_STATS_LEADERBOARD_COLUMNS = {
  player: true,
  position: true,
  matchesPlayed: true,
  wins: true,
  draws: true,
  losses: true,
  winPercentage: true,
  lossPercentage: true,
  cleanSheets: true,
  goals: true,
  hatTricks: true,
  ownGoals: true,
};

/** @param {{ columns?: Record<string, boolean> } | undefined} statsCfg */
export function mergeStatsLeaderboardColumnConfig(statsCfg) {
  return {
    ...DEFAULT_STATS_LEADERBOARD_COLUMNS,
    ...(statsCfg?.columns && typeof statsCfg.columns === "object"
      ? statsCfg.columns
      : {}),
  };
}

/**
 * Ordered table column definitions. `key` is the player row field used for sort/render.
 */
export const STATS_LEADERBOARD_TABLE_COLUMNS = [
  {
    configKey: "player",
    key: "name",
    label: "Player",
    className: "player-col",
    sortable: true,
    tooltip: "Player Name",
    csvHeader: "Player",
    legend: null,
  },
  {
    configKey: "position",
    key: "position",
    label: "Pos",
    className: "position-col",
    sortable: true,
    tooltip: "Playing Position",
    csvHeader: "Position",
    legend: { abbr: "Pos", text: "Position" },
  },
  {
    configKey: "matchesPlayed",
    key: "matches",
    label: "MP",
    className: "stat-col",
    sortable: true,
    tooltip: "Matches Played",
    csvHeader: "Matches Played",
    legend: { abbr: "MP", text: "Matches Played" },
  },
  {
    configKey: "wins",
    key: "wins",
    label: "W",
    className: "stat-col",
    sortable: true,
    tooltip: "Total Wins",
    csvHeader: "Wins",
    legend: { abbr: "W", text: "Wins" },
  },
  {
    configKey: "draws",
    key: "draws",
    label: "D",
    className: "stat-col",
    sortable: true,
    tooltip: "Total Draws",
    csvHeader: "Draws",
    legend: { abbr: "D", text: "Draws" },
  },
  {
    configKey: "losses",
    key: "losses",
    label: "L",
    className: "stat-col",
    sortable: true,
    tooltip: "Total Losses",
    csvHeader: "Losses",
    legend: { abbr: "L", text: "Losses" },
  },
  {
    configKey: "winPercentage",
    key: "winPct",
    label: "W%",
    className: "stat-col",
    sortable: true,
    tooltip: "Win Percentage",
    csvHeader: "Win %",
    legend: { abbr: "W%", text: "Win Rate" },
  },
  {
    configKey: "lossPercentage",
    key: "lossPct",
    label: "L%",
    className: "stat-col",
    sortable: true,
    tooltip: "Loss Percentage",
    csvHeader: "Loss %",
    legend: { abbr: "L%", text: "Loss Rate" },
  },
  {
    configKey: "cleanSheets",
    key: "cleanSheets",
    label: "CS",
    className: "stat-col",
    sortable: true,
    tooltip: "Clean Sheets",
    csvHeader: "Clean Sheets",
    legend: { abbr: "CS", text: "Clean Sheets" },
  },
  {
    configKey: "goals",
    key: "goals",
    label: "G",
    className: "stat-col",
    sortable: true,
    tooltip: "Goals Scored",
    csvHeader: "Goals",
    legend: { abbr: "G", text: "Goals" },
  },
  {
    configKey: "hatTricks",
    key: "hatTricks",
    label: "HT",
    className: "stat-col",
    sortable: true,
    tooltip: "Hat Tricks",
    csvHeader: "Hat Tricks",
    legend: { abbr: "HT", text: "Hat Tricks" },
  },
];

const OWN_GOALS_COLUMN = {
  configKey: "ownGoals",
  key: "ownGoals",
  label: "OG",
  className: "stat-col",
  sortable: true,
  tooltip: "Own Goals",
  csvHeader: "Own Goals",
  legend: { abbr: "OG", text: "Own Goals" },
};

/**
 * @param {Record<string, boolean>} colVisibility — merged config
 * @param {boolean} hasOwnGoalsData
 */
export function getVisibleStatsLeaderboardTableColumns(colVisibility, hasOwnGoalsData) {
  const base = STATS_LEADERBOARD_TABLE_COLUMNS.filter(
    (c) => colVisibility[c.configKey] !== false
  );
  if (hasOwnGoalsData && colVisibility.ownGoals !== false) {
    return [...base, OWN_GOALS_COLUMN];
  }
  return base;
}

/** Compare panel / stat row keys → STATS_LEADERBOARD.columns config keys */
export const COMPARE_STAT_KEY_TO_COLUMN_CONFIG = {
  matches: "matchesPlayed",
  wins: "wins",
  draws: "draws",
  losses: "losses",
  winPct: "winPercentage",
  lossPct: "lossPercentage",
  cleanSheets: "cleanSheets",
  goals: "goals",
  hatTricks: "hatTricks",
  ownGoals: "ownGoals",
};

/**
 * Pick a valid sort key when the preferred column is hidden.
 * @param {string} preferred — data key e.g. config.DEFAULT_SORT_KEY
 * @param {{ key: string }[]} visibleColumns
 * @param {string} fallback — data key
 */
export function resolveVisibleSortKey(preferred, visibleColumns, fallback = "matches") {
  const keys = new Set(visibleColumns.map((c) => c.key));
  if (keys.has(preferred)) return preferred;
  if (keys.has(fallback)) return fallback;
  const first = visibleColumns[0]?.key;
  return first || "name";
}
