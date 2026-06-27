export const normalizeAttendanceSummary = (summaryRow) => ({
  season: String(summaryRow?.season_year || ""),
  totalGames: Number(summaryRow?.total_games || 0),
  midweekGames: Number(summaryRow?.midweek_games || 0),
  weekendGames: Number(summaryRow?.weekend_games || 0),
});

export const normalizeAttendancePlayer = (row) => ({
  category: row?.category || "Others",
  sno: Number(row?.sno || 0),
  name: row?.player_name || "",
  midweekGames: Number(row?.midweek_games || 0),
  weekendGames: Number(row?.weekend_games || 0),
  totalGames: Number(row?.total_games || 0),
  games2024: row?.games_2024 == null ? null : Number(row.games_2024),
  difference: row?.difference == null ? null : Number(row.difference),
  notes: row?.notes ?? null,
});

export const normalizeStatsPlayer = (row) => ({
  id: Number(row?.id || 0),
  name: row?.player_name || "",
  position: Array.isArray(row?.position) ? row.position : ["MID"],
  matches: Number(row?.matches || 0),
  wins: Number(row?.wins || 0),
  losses: Number(row?.losses || 0),
  draws: Number(row?.draws || 0),
  cleanSheets: Number(row?.clean_sheets || 0),
  goals: Number(row?.goals || 0),
  hatTricks: Number(row?.hat_tricks || 0),
  ownGoals: Number(row?.own_goals || 0),
  weekendStats: {
    matches: Number(row?.weekend_matches || 0),
    wins: Number(row?.weekend_wins || 0),
    losses: Number(row?.weekend_losses || 0),
    draws: Number(row?.weekend_draws || 0),
    cleanSheets: Number(row?.weekend_clean_sheets || 0),
    goals: Number(row?.weekend_goals || 0),
    hatTricks: Number(row?.weekend_hat_tricks || 0),
    ownGoals: Number(row?.weekend_own_goals || 0),
  },
  weekdayStats: {
    matches: Number(row?.weekday_matches || 0),
    wins: Number(row?.weekday_wins || 0),
    losses: Number(row?.weekday_losses || 0),
    draws: Number(row?.weekday_draws || 0),
    cleanSheets: Number(row?.weekday_clean_sheets || 0),
    goals: Number(row?.weekday_goals || 0),
    hatTricks: Number(row?.weekday_hat_tricks || 0),
    ownGoals: Number(row?.weekday_own_goals || 0),
  },
});

