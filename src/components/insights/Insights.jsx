import { useState, useMemo } from "react";
import { leaderboardData } from "../../utils/get-data.js";
import {
  filterPlayersForStatsLeaderboard,
  isStatsTrackedPlayerName,
} from "../../utils/playerTracking.js";
import { config } from "../../leaderboard-config.js";
import matchData2026 from "../../data/attendance-data/2026.json";
import attendanceLeaderboard2025 from "../../data/attendance-data/leaderboard/2025.json";
import attendanceLeaderboard2026 from "../../data/attendance-data/leaderboard/2026.json";
import { trivia2024 } from "../../data/insights/2024.js";
import { trivia2025 } from "../../data/insights/2025.js";
import { trivia2026 } from "../../data/insights/2026.js";
import playerProfiles from "../../data/player-profiles.json";

const triviaByYear = {
  2024: trivia2024,
  2025: trivia2025,
  2026: trivia2026,
};

const matchDataByYear = {
  2026: matchData2026,
};

const attendanceLeaderboardByYear = {
  2025: attendanceLeaderboard2025,
  2026: attendanceLeaderboard2026,
};

const availableSeasons = config.INSIGHTS?.seasons || ["2024", "2025", "2026"];
const IGNORED_PLAYERS = new Set(["others"]);

const parseMatchDate = (id) => {
  const [d, m, y] = String(id || "").split("-");
  if (!d || !m || !y) return 0;
  const t = new Date(`${y}-${m}-${d}`).getTime();
  return Number.isNaN(t) ? 0 : t;
};

const isRealPlayer = (name) => {
  const normalized = String(name || "").trim().toLowerCase();
  return Boolean(normalized) && !IGNORED_PLAYERS.has(normalized);
};

const normalizePositionGroup = (position) => {
  const p = String(position || "").toUpperCase();
  if (p === "GK") return "GK";
  if (["CB", "LB", "RB", "DEF"].includes(p)) return "DEF";
  if (["CM", "LM", "RM", "MID"].includes(p)) return "MID";
  if (["ST", "FWD", "CF"].includes(p)) return "FWD";
  if (p === "ALL") return "ALL";
  return "OTHER";
};

const getTeamResult = (match, team) => {
  const scoreline = match?.scoreline || {};
  if (!(team in scoreline)) return null;
  const goalsFor = Number(scoreline[team]) || 0;
  const goalsAgainst = Object.entries(scoreline)
    .filter(([t]) => t !== team)
    .reduce((sum, [, goals]) => sum + (Number(goals) || 0), 0);
  const points = goalsFor > goalsAgainst ? 3 : goalsFor === goalsAgainst ? 1 : 0;
  return { goalsFor, goalsAgainst, points };
};

const buildProfilePositionMap = () => {
  const map = new Map();
  (playerProfiles || []).forEach((p) => {
    if (!isRealPlayer(p?.name)) return;
    if (p.isTracked === false) return;
    const groups = Array.isArray(p?.position)
      ? p.position.map(normalizePositionGroup).filter((g) => g !== "OTHER")
      : [];
    map.set(p.name, new Set(groups.length ? groups : ["ALL"]));
  });
  return map;
};

const calculateAdvancedInsights = (matches, leaderboardData, profilePositionMap) => {
  const validMatches = (matches || [])
    .filter((m) => m?.matchPlayed && !m?.matchCancelled && !m?.isTournament)
    .sort((a, b) => parseMatchDate(a.id) - parseMatchDate(b.id));

  const winRateByPlayer = new Map(
    (leaderboardData || [])
      .filter((p) => isRealPlayer(p?.name))
      .map((p) => [p.name, p.matches > 0 ? (p.wins / p.matches) * 100 : 50])
  );

  const upsetDriverMap = new Map();
  const attendanceByPlayer = new Map();
  const totalByDay = { combined: validMatches.length, weekend: 0, midweek: 0 };

  for (let i = 0; i < validMatches.length; i++) {
    const match = validMatches[i];
    const teams = Object.keys(match?.attendance || {});
    const isWeekend = match.day === "Weekend";
    const dayKey = isWeekend ? "weekend" : "midweek";
    totalByDay[dayKey] += 1;

    // Team-level calculations
    const teamStrength = {};
    const teamResult = {};
    teams.forEach((team) => {
      const players = (match.attendance?.[team] || []).filter(
        (p) => isRealPlayer(p?.name) && isStatsTrackedPlayerName(p.name)
      );
      const strengths = players.map((p) => winRateByPlayer.get(p.name) ?? 50);
      teamStrength[team] = strengths.length
        ? strengths.reduce((a, b) => a + b, 0) / strengths.length
        : 50;
      teamResult[team] = getTeamResult(match, team);

      players.forEach((p) => {
        if (!isStatsTrackedPlayerName(p.name)) return;
        if (!attendanceByPlayer.has(p.name)) {
          attendanceByPlayer.set(p.name, { combined: 0, weekend: 0, midweek: 0 });
        }
        attendanceByPlayer.get(p.name).combined += 1;
        attendanceByPlayer.get(p.name)[dayKey] += 1;
      });
    });

    // Upset drivers (winner weaker by >=5 rating points)
    const scoreEntries = Object.entries(match.scoreline || {});
    if (scoreEntries.length >= 2) {
      const sorted = [...scoreEntries].sort((a, b) => Number(b[1]) - Number(a[1]));
      const [winner, loser] = sorted;
      if (Number(winner[1]) !== Number(loser[1])) {
        const winningTeam = winner[0];
        const losingTeam = loser[0];
        const winningStrength = teamStrength[winningTeam] ?? 50;
        const losingStrength = teamStrength[losingTeam] ?? 50;
        if (winningStrength + 5 < losingStrength) {
          const scorers = (match.attendance?.[winningTeam] || []).filter(
            (p) => isRealPlayer(p?.name) && (Number(p?.goals) || 0) > 0
          );
          scorers.forEach((p) => {
            if (!isStatsTrackedPlayerName(p.name)) return;
            if (!upsetDriverMap.has(p.name)) upsetDriverMap.set(p.name, { name: p.name, upsets: 0, goals: 0, points: 0 });
            const curr = upsetDriverMap.get(p.name);
            const g = Number(p.goals) || 0;
            curr.upsets += 1;
            curr.goals += g;
            curr.points += g * 2 + 1;
          });
        }
      }
    }
  }

  const upsetDrivers = Array.from(upsetDriverMap.values())
    .filter((d) => isStatsTrackedPlayerName(d.name))
    .sort((a, b) => b.points - a.points || b.goals - a.goals)
    .slice(0, 5);

  const perfectAttendance = {
    combined: [],
    weekend: [],
    midweek: [],
  };
  Array.from(attendanceByPlayer.entries()).forEach(([name, a]) => {
    if (!isStatsTrackedPlayerName(name)) return;
    if (totalByDay.combined > 0 && a.combined === totalByDay.combined) perfectAttendance.combined.push(name);
    if (totalByDay.weekend > 0 && a.weekend === totalByDay.weekend) perfectAttendance.weekend.push(name);
    if (totalByDay.midweek > 0 && a.midweek === totalByDay.midweek) perfectAttendance.midweek.push(name);
  });

  return {
    upsetDrivers,
    perfectAttendance,
  };
};

const buildQuarterNarrative = (quarterKey, quarterInsights) => {
  if (!quarterInsights) return null;
  const combinedGpm = quarterInsights.matches > 0 ? quarterInsights.totalGoals / quarterInsights.matches : 0;
  const weekendGpm = quarterInsights.weekendMatches > 0
    ? quarterInsights.weekendGoals / quarterInsights.weekendMatches
    : 0;
  const midweekGpm = quarterInsights.weekdayMatches > 0
    ? quarterInsights.weekdayGoals / quarterInsights.weekdayMatches
    : 0;
  const fullHouseRate = quarterInsights.matches > 0
    ? (quarterInsights.fullHouseMatches / quarterInsights.matches) * 100
    : 0;
  const weekendFullHouseRate = quarterInsights.weekendMatches > 0
    ? (quarterInsights.fullHouseWeekendMatches / quarterInsights.weekendMatches) * 100
    : 0;
  const midweekFullHouseRate = quarterInsights.weekdayMatches > 0
    ? (quarterInsights.fullHouseWeekdayMatches / quarterInsights.weekdayMatches) * 100
    : 0;

  const title =
    combinedGpm >= 7
      ? `${quarterKey} was an attacking quarter`
      : combinedGpm >= 5
      ? `${quarterKey} was balanced`
      : `${quarterKey} was tight and tactical`;

  const subtitle = `Goals/game — Combined ${combinedGpm.toFixed(1)}, Weekend ${weekendGpm.toFixed(1)}, Midweek ${midweekGpm.toFixed(1)}`;

  const bullets = [
    `Games split — Combined ${quarterInsights.matches}, Weekend ${quarterInsights.weekendMatches}, Midweek ${quarterInsights.weekdayMatches}.`,
    `Full-house rate — Combined ${fullHouseRate.toFixed(0)}%, Weekend ${weekendFullHouseRate.toFixed(0)}%, Midweek ${midweekFullHouseRate.toFixed(0)}%.`,
    quarterInsights.perfectAttendance?.combined?.length
      ? `Perfect attendance this quarter: ${quarterInsights.perfectAttendance.combined.join(", ")}.`
      : "Perfect attendance this quarter: no player attended all available games.",
  ];

  return { title, subtitle, bullets };
};

// Helper function to get quarter from date
const getQuarter = (dateStr) => {
  const [, month] = dateStr.split("/");
  const monthNum = parseInt(month, 10);
  if (monthNum >= 1 && monthNum <= 3) return 1;
  if (monthNum >= 4 && monthNum <= 6) return 2;
  if (monthNum >= 7 && monthNum <= 9) return 3;
  return 4;
};

// Helper function to get all players from attendance object
const getAllPlayersFromAttendance = (attendance) => {
  if (!attendance || typeof attendance !== 'object') return [];
  
  const players = [];
  Object.values(attendance).forEach(teamPlayers => {
    if (Array.isArray(teamPlayers)) {
      teamPlayers.forEach(player => {
        if (player && player.name) {
          players.push(player);
        }
      });
    }
  });
  return players;
};

// Helper function to get scorers from attendance object
const getScorersFromAttendance = (attendance) => {
  if (!attendance || typeof attendance !== 'object') return [];
  
  const scorers = [];
  Object.entries(attendance).forEach(([team, players]) => {
    if (Array.isArray(players)) {
      players.forEach(player => {
        if (player && player.name && player.goals > 0) {
          scorers.push({
            name: player.name,
            goals: player.goals,
            team: team
          });
        }
      });
    }
  });
  return scorers;
};

// Helper function to get clean sheets from attendance object
const getCleanSheetsFromAttendance = (attendance) => {
  if (!attendance || typeof attendance !== 'object') return [];
  
  const cleanSheets = [];
  Object.values(attendance).forEach(teamPlayers => {
    if (Array.isArray(teamPlayers)) {
      teamPlayers.forEach(player => {
        if (player && player.name && player.cleanSheet) {
          cleanSheets.push(player.name);
        }
      });
    }
  });
  return cleanSheets;
};

// Helper function to get top N players, but include all tied first place players if more than N
const getTopNWithTies = (players, getValue, n = 3) => {
  if (!players || players.length === 0) return [];
  
  // Sort by value (descending)
  const sorted = [...players].sort((a, b) => getValue(b) - getValue(a));
  
  if (sorted.length === 0) return [];
  
  const firstValue = getValue(sorted[0]);
  
  // Find all players tied for first place
  const firstPlacePlayers = sorted.filter(p => getValue(p) === firstValue);
  
  // If first place has more than N players, return all of them
  if (firstPlacePlayers.length > n) {
    return firstPlacePlayers;
  }
  
  // Otherwise, return top N
  return sorted.slice(0, n);
};

// Calculate overall season insights
const calculateOverallInsights = (leaderboardData, attendanceData, trackerData = null) => {
  if (!leaderboardData || leaderboardData.length === 0) return null;

  leaderboardData = filterPlayersForStatsLeaderboard(leaderboardData);
  if (leaderboardData.length === 0) return null;

  const insights = {
    totalPlayers: leaderboardData.length,
    totalGoals: leaderboardData.reduce((sum, p) => sum + (p.goals || 0), 0),
    totalHatTricks: leaderboardData.reduce((sum, p) => sum + (p.hatTricks || 0), 0),
    topScorers: [],
    bestWinRate: [],
    lowestWinRate: [],
    highestLossPct: [],
    lowestLossPct: [],
    highestHatTricks: [],
    cleanSheets: [],
    totalFullHouse: 0, // Only tracked from 2026 onwards
    totalFullHouseWeekend: 0,
    totalFullHouseWeekday: 0,
    upsetDrivers: [],
  };

  // Find top scorers (top 3, or all tied first place if more than 3)
  const eligibleScorers = leaderboardData.filter((p) => p.name !== "Others" && (p.goals || 0) > 0);
  insights.topScorers = getTopNWithTies(eligibleScorers, (p) => p.goals || 0, 3);

  // Find best win rate (minimum 10 matches) - top 3
  const eligibleForWinRate = leaderboardData
    .filter((p) => p.name !== "Others" && p.matches >= 10)
    .map((p) => ({
      ...p,
      winRate: p.matches > 0 ? (p.wins / p.matches) * 100 : 0,
    }));
  insights.bestWinRate = getTopNWithTies(eligibleForWinRate, (p) => p.winRate, 3);

  // Find lowest win rate (minimum 10 matches) - top 3
  const eligibleForLowestWinRate = leaderboardData
    .filter((p) => p.name !== "Others" && p.matches >= 10)
    .map((p) => ({
      ...p,
      winRate: p.matches > 0 ? (p.wins / p.matches) * 100 : 0,
    }));
  // For lowest, we need to reverse the sort
  const sortedLowestWinRate = [...eligibleForLowestWinRate].sort((a, b) => a.winRate - b.winRate);
  if (sortedLowestWinRate.length > 0) {
    const lowestValue = sortedLowestWinRate[0].winRate;
    const tiedLowest = sortedLowestWinRate.filter((p) => p.winRate === lowestValue);
    if (tiedLowest.length > 3) {
      insights.lowestWinRate = tiedLowest;
    } else {
      insights.lowestWinRate = sortedLowestWinRate.slice(0, 3);
    }
  }

  // Find highest loss percentage (minimum 10 matches) - top 3
  const eligibleForLossPct = leaderboardData
    .filter((p) => p.name !== "Others" && p.matches >= 10)
    .map((p) => ({
      ...p,
      lossPct: p.matches > 0 ? (p.losses / p.matches) * 100 : 0,
    }));
  insights.highestLossPct = getTopNWithTies(eligibleForLossPct, (p) => p.lossPct, 3);

  // Find lowest loss percentage (minimum 10 matches) - top 3
  const eligibleForLowestLossPct = leaderboardData
    .filter((p) => p.name !== "Others" && p.matches >= 10)
    .map((p) => ({
      ...p,
      lossPct: p.matches > 0 ? (p.losses / p.matches) * 100 : 0,
    }));
  // For lowest, we need to reverse the sort
  const sortedLowestLossPct = [...eligibleForLowestLossPct].sort((a, b) => a.lossPct - b.lossPct);
  if (sortedLowestLossPct.length > 0) {
    const lowestValue = sortedLowestLossPct[0].lossPct;
    const tiedLowest = sortedLowestLossPct.filter((p) => p.lossPct === lowestValue);
    if (tiedLowest.length > 3) {
      insights.lowestLossPct = tiedLowest;
    } else {
      insights.lowestLossPct = sortedLowestLossPct.slice(0, 3);
    }
  }

  // Find highest hat tricks - top 3
  const eligibleForHatTricks = leaderboardData.filter((p) => p.name !== "Others" && (p.hatTricks || 0) > 0);
  insights.highestHatTricks = getTopNWithTies(eligibleForHatTricks, (p) => p.hatTricks || 0, 3);

  // Get all players with clean sheets
  const cleanSheets = leaderboardData
    .filter((p) => p.name !== "Others" && p.cleanSheets > 0)
    .map((p) => ({ name: p.name, cleanSheets: p.cleanSheets }))
    .sort((a, b) => b.cleanSheets - a.cleanSheets);
  insights.cleanSheets = cleanSheets;

  // Add attendance insights if available
  if (attendanceData) {
    insights.totalGames = attendanceData.summary?.totalGames || 0;
    insights.midweekGames = attendanceData.summary?.midweekGames || 0;
    insights.weekendGames = attendanceData.summary?.weekendGames || 0;
    const eligibleForAttendance =
      attendanceData.players?.filter(
        (p) => p.name !== "Others" && isStatsTrackedPlayerName(p.name)
      ) || [];
    const topAttended = getTopNWithTies(eligibleForAttendance, (p) => p.totalGames || 0, 3);
    insights.mostAttended = topAttended.map((p) => ({
      name: p.name,
      totalGames: p.totalGames || 0,
    }));
  } else {
    // If no attendance data, calculate most attended from leaderboard data (matches played)
    const eligibleForAttendance = leaderboardData.filter(
      (p) => p.name !== "Others" && isStatsTrackedPlayerName(p.name)
    );
    const topAttended = getTopNWithTies(eligibleForAttendance, (p) => p.matches || 0, 3);
    insights.mostAttended = topAttended.map((p) => ({
      name: p.name,
      totalGames: p.matches || 0,
    }));
  }

  // Calculate full house matches (only for 2026+)
  if (trackerData && parseInt(trackerData.season) >= 2026) {
    const fullHouseMatches = trackerData.matches.filter(
      (m) => m.matchPlayed && !m.matchCancelled && !m.isTournament && m.isFullHouse === true
    );
    insights.totalFullHouse = fullHouseMatches.length;
    insights.totalFullHouseWeekend = fullHouseMatches.filter((m) => m.day === "Weekend").length;
    insights.totalFullHouseWeekday = fullHouseMatches.filter((m) => m.day === "Midweek").length;

    const advanced = calculateAdvancedInsights(trackerData.matches, leaderboardData, buildProfilePositionMap());
    insights.upsetDrivers = advanced.upsetDrivers;
  }

  return insights;
};

// Calculate quarterly insights for 2026
const calculateQuarterlyInsights = (trackerData, leaderboardData, quarter) => {
  if (!trackerData || !trackerData.matches) return null;

  leaderboardData = filterPlayersForStatsLeaderboard(leaderboardData || []);

  // Filter matches for the quarter (excluding tournaments)
  const quarterMatches = trackerData.matches.filter((match) => {
    if (!match.matchPlayed || match.matchCancelled) return false;
    if (match.isTournament) return false;
    return getQuarter(match.date) === quarter;
  });

  if (quarterMatches.length === 0) return null;

  const insights = {
    matches: quarterMatches.length,
    totalGoals: quarterMatches.reduce((sum, m) => sum + (m.totalGoals || 0), 0),
    weekendGoals: quarterMatches
      .filter((m) => m.day === "Weekend")
      .reduce((sum, m) => sum + (m.totalGoals || 0), 0),
    weekdayGoals: quarterMatches
      .filter((m) => m.day === "Midweek")
      .reduce((sum, m) => sum + (m.totalGoals || 0), 0),
    weekendMatches: quarterMatches.filter((m) => m.day === "Weekend").length,
    weekdayMatches: quarterMatches.filter((m) => m.day === "Midweek").length,
    topScorers: [],
    mostAttended: [],
    cleanSheets: [],
    fullHouseMatches: 0, // Only tracked from 2026 onwards
    fullHouseWeekendMatches: 0,
    fullHouseWeekdayMatches: 0,
    perfectAttendance: { combined: [], weekend: [], midweek: [] },
    storyBullets: [],
    narrativeTitle: "",
    narrativeSubtitle: "",
  };

  // Calculate top scorers for the quarter - get scorers from attendance object
  const scorerMap = new Map();
  quarterMatches.forEach((match) => {
    const scorers = getScorersFromAttendance(match.attendance);
    scorers.forEach((scorer) => {
      if (!isStatsTrackedPlayerName(scorer.name)) return;
      const current = scorerMap.get(scorer.name) || 0;
      scorerMap.set(scorer.name, current + (scorer.goals || 0));
    });
  });

  const topScorers = Array.from(scorerMap.entries())
    .map(([name, goals]) => ({ name, goals }))
    .sort((a, b) => b.goals - a.goals)
    .slice(0, 3);
  insights.topScorers = topScorers;

  // Calculate most attended - get player names from attendance object
  const attendanceMap = new Map();
  quarterMatches.forEach((match) => {
    const players = getAllPlayersFromAttendance(match.attendance);
    players.forEach((player) => {
      if (!isStatsTrackedPlayerName(player.name)) return;
      const current = attendanceMap.get(player.name) || 0;
      attendanceMap.set(player.name, current + 1);
    });
  });

  const mostAttendedList = Array.from(attendanceMap.entries())
    .map(([name, games]) => ({ name, games }))
    .sort((a, b) => b.games - a.games);
  const topAttended = getTopNWithTies(mostAttendedList, (p) => p.games, 3);
  insights.mostAttended = topAttended;

  // Calculate clean sheets for the quarter - get from attendance object
  const cleanSheetsMap = new Map();
  quarterMatches.forEach((match) => {
    const cleanSheetPlayers = getCleanSheetsFromAttendance(match.attendance);
    cleanSheetPlayers.forEach((playerName) => {
      if (!isStatsTrackedPlayerName(playerName)) return;
      const current = cleanSheetsMap.get(playerName) || 0;
      cleanSheetsMap.set(playerName, current + 1);
    });
  });

  const cleanSheets = Array.from(cleanSheetsMap.entries())
    .map(([name, count]) => ({ name, cleanSheets: count }))
    .sort((a, b) => b.cleanSheets - a.cleanSheets);
  insights.cleanSheets = cleanSheets;

  // Calculate full house matches (only for 2026+)
  if (parseInt(trackerData.season) >= 2026) {
    const fullHouseMatches = quarterMatches.filter((m) => m.isFullHouse === true);
    insights.fullHouseMatches = fullHouseMatches.length;
    insights.fullHouseWeekendMatches = fullHouseMatches.filter((m) => m.day === "Weekend").length;
    insights.fullHouseWeekdayMatches = fullHouseMatches.filter((m) => m.day === "Midweek").length;
  }

  const advanced = calculateAdvancedInsights(quarterMatches, leaderboardData, buildProfilePositionMap());
  insights.perfectAttendance = advanced.perfectAttendance;
  const quarterKey = `Q${quarter}`;
  const narrative = buildQuarterNarrative(quarterKey, insights);
  insights.narrativeTitle = narrative?.title || "";
  insights.narrativeSubtitle = narrative?.subtitle || "";
  insights.storyBullets = narrative?.bullets || [];

  return insights;
};

export const Insights = () => {
  // Default to configured defaultSeason or most recent available season
  const defaultSeason = config.INSIGHTS?.defaultSeason || 
    (availableSeasons.length > 0 ? availableSeasons[availableSeasons.length - 1] : "2026");
  const [selectedSeason, setSelectedSeason] = useState(defaultSeason);

  // Load data based on season
  const leaderboardDataForSeason = useMemo(() => {
    return filterPlayersForStatsLeaderboard(leaderboardData[selectedSeason] || []);
  }, [selectedSeason]);
  
  // Load attendance leaderboard data
  // Note: 2025 attendance data is incomplete, so we'll only use it for basic stats
  const attendanceDataForSeason = useMemo(() => {
    return attendanceLeaderboardByYear[selectedSeason] || null;
  }, [selectedSeason]);
  
  const trackerDataForSeason = useMemo(() => {
    return selectedSeason === "2026" ? matchDataByYear[2026] : null;
  }, [selectedSeason]);

  // Calculate overall insights
  const overallInsights = useMemo(() => {
    return calculateOverallInsights(
      leaderboardDataForSeason,
      attendanceDataForSeason,
      trackerDataForSeason
    );
  }, [leaderboardDataForSeason, attendanceDataForSeason, trackerDataForSeason]);

  // Calculate quarterly insights (only for 2026)
  const quarterlyInsights = useMemo(() => {
    if (selectedSeason !== "2026" || !trackerDataForSeason) return null;

    return {
      q1: calculateQuarterlyInsights(trackerDataForSeason, leaderboardDataForSeason, 1),
      q2: calculateQuarterlyInsights(trackerDataForSeason, leaderboardDataForSeason, 2),
      q3: calculateQuarterlyInsights(trackerDataForSeason, leaderboardDataForSeason, 3),
      q4: calculateQuarterlyInsights(trackerDataForSeason, leaderboardDataForSeason, 4),
    };
  }, [selectedSeason, trackerDataForSeason, leaderboardDataForSeason]);

  // Load trivia data for the season
  const triviaData = useMemo(() => {
    return triviaByYear[selectedSeason] || [];
  }, [selectedSeason]);

  if (!overallInsights) {
    return (
      <div className="insights">
        <p>No data available for {selectedSeason}</p>
      </div>
    );
  }

  return (
    <div className="insights">
      {/* Season Selector */}
      <div className="insights-header">
        <div className="insights-year-selector">
          <label htmlFor="insights-year-select">Season</label>
          <div className="select-wrapper">
            <select
              id="insights-year-select"
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value)}
            >
              {availableSeasons.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <span className="select-arrow">▼</span>
          </div>
        </div>
      </div>

      {/* Overall Season Insights */}
      <section className="insights-section">
        <h2 className="insights-heading">Overall Season Insights</h2>
        <div className="insights-grid">
          <div className="insight-card">
            <div className="insight-label">Total Players</div>
            <div className="insight-value">{overallInsights.totalPlayers}</div>
          </div>
          <div className="insight-card">
            <div className="insight-label">Total Goals</div>
            <div className="insight-value">{overallInsights.totalGoals}</div>
          </div>
          {overallInsights.totalHatTricks > 0 && (
            <div className="insight-card">
              <div className="insight-label">Total Hat Tricks</div>
              <div className="insight-value">{overallInsights.totalHatTricks}</div>
            </div>
          )}
          {overallInsights.totalGames !== undefined && (
            <>
              <div className="insight-card">
                <div className="insight-label">Total Games Played</div>
                <div className="insight-value">{overallInsights.totalGames}</div>
              </div>
              <div className="insight-card">
                <div className="insight-label">Midweek Games</div>
                <div className="insight-value">{overallInsights.midweekGames}</div>
              </div>
              <div className="insight-card">
                <div className="insight-label">Weekend Games</div>
                <div className="insight-value">{overallInsights.weekendGames}</div>
              </div>
              {parseInt(selectedSeason) >= 2026 && overallInsights.totalFullHouse !== undefined && (
                <>
                  <div className="insight-card fullhouse-card">
                    <div className="insight-label">🏠 Full House Matches</div>
                    <div className="insight-value">{overallInsights.totalFullHouse}</div>
                  </div>
                  <div className="insight-card fullhouse-card">
                    <div className="insight-label">🏠 Weekend Full House</div>
                    <div className="insight-value">{overallInsights.totalFullHouseWeekend}</div>
                  </div>
                  <div className="insight-card fullhouse-card">
                    <div className="insight-label">🏠 Weekday Full House</div>
                    <div className="insight-value">{overallInsights.totalFullHouseWeekday}</div>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Top Performers */}
        <div className="insights-highlights">
          {overallInsights.topScorers && overallInsights.topScorers.length > 0 && (
            <div className="highlight-item">
              <span className="highlight-label">🏆 Top Scorers:</span>
              <span className="highlight-value">
                {overallInsights.topScorers
                  .map((p) => `${p.name} (${p.goals || 0} goals)`)
                  .join(", ")}
              </span>
            </div>
          )}
          {overallInsights.highestHatTricks && overallInsights.highestHatTricks.length > 0 && (
            <div className="highlight-item">
              <span className="highlight-label">🎩 Most Hat Tricks:</span>
              <span className="highlight-value">
                {overallInsights.highestHatTricks
                  .map((p) => `${p.name} (${p.hatTricks || 0} hat tricks)`)
                  .join(", ")}
              </span>
            </div>
          )}
          {overallInsights.bestWinRate && overallInsights.bestWinRate.length > 0 && (
            <div className="highlight-item">
              <span className="highlight-label">✅ Best Win Rate:</span>
              <span className="highlight-value">
                {overallInsights.bestWinRate
                  .map((p) => `${p.name} (${Math.round(p.winRate)}%)`)
                  .join(", ")}
              </span>
            </div>
          )}
          {overallInsights.lowestWinRate && overallInsights.lowestWinRate.length > 0 && (
            <div className="highlight-item">
              <span className="highlight-label">📉 Lowest Win Rate:</span>
              <span className="highlight-value">
                {overallInsights.lowestWinRate
                  .map((p) => `${p.name} (${Math.round(p.winRate)}%)`)
                  .join(", ")}
              </span>
            </div>
          )}
          {overallInsights.highestLossPct && overallInsights.highestLossPct.length > 0 && (
            <div className="highlight-item">
              <span className="highlight-label">📈 Highest Loss %:</span>
              <span className="highlight-value">
                {overallInsights.highestLossPct
                  .map((p) => `${p.name} (${Math.round(p.lossPct)}%)`)
                  .join(", ")}
              </span>
            </div>
          )}
          {overallInsights.lowestLossPct && overallInsights.lowestLossPct.length > 0 && (
            <div className="highlight-item">
              <span className="highlight-label">📉 Lowest Loss %:</span>
              <span className="highlight-value">
                {overallInsights.lowestLossPct
                  .map((p) => `${p.name} (${Math.round(p.lossPct)}%)`)
                  .join(", ")}
              </span>
            </div>
          )}
          {overallInsights.mostAttended && overallInsights.mostAttended.length > 0 && (
            <div className="highlight-item">
              <span className="highlight-label">📅 Most Attended:</span>
              <span className="highlight-value">
                {overallInsights.mostAttended
                  .map((p) => `${p.name} (${p.totalGames} games)`)
                  .join(", ")}
              </span>
            </div>
          )}
          {overallInsights.upsetDrivers && overallInsights.upsetDrivers.length > 0 && (
            <div className="highlight-item">
              <span className="highlight-label">🚨 Upset Drivers:</span>
              <span className="highlight-value">
                {overallInsights.upsetDrivers
                  .slice(0, 3)
                  .map((p) => `${p.name} (${p.goals} goals in upsets)`)
                  .join(", ")}
              </span>
            </div>
          )}
        </div>

        {/* Clean Sheets Section */}
        {overallInsights.cleanSheets && overallInsights.cleanSheets.length > 0 && (
          <div className="insights-clean-sheets">
            <h3 className="clean-sheets-heading">🧤 Clean Sheets</h3>
            <div className="clean-sheets-list">
              {overallInsights.cleanSheets.map((player) => (
                <div key={player.name} className="clean-sheet-item">
                  <span className="clean-sheet-name">{player.name}</span>
                  <span className="clean-sheet-count">{player.cleanSheets}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Trivia Section */}
      {triviaData && triviaData.length > 0 && (
        <section className="insights-section insights-trivia-section">
          <h2 className="insights-heading">🎯 Season Trivia</h2>
          <div className="trivia-container">
            {triviaData.map((trivia, index) => (
              <div key={index} className="trivia-item">
                <div className="trivia-icon">💡</div>
                <div className="trivia-content">
                  <p className="trivia-text">{trivia}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Quarterly Insights (only for 2026) */}
      {selectedSeason === "2026" && quarterlyInsights && (
        <>
          {quarterlyInsights.q1 && (
            <section className="insights-section">
              <h2 className="insights-heading">Q1 Insights (Jan - Mar)</h2>
              <div className="insights-grid">
                <div className="insight-card">
                  <div className="insight-label">Matches</div>
                  <div className="insight-value">{quarterlyInsights.q1.matches}</div>
                </div>
                <div className="insight-card">
                  <div className="insight-label">Weekend Games</div>
                  <div className="insight-value">{quarterlyInsights.q1.weekendMatches}</div>
                </div>
                <div className="insight-card">
                  <div className="insight-label">Midweek Games</div>
                  <div className="insight-value">{quarterlyInsights.q1.weekdayMatches}</div>
                </div>
                <div className="insight-card">
                  <div className="insight-label">Total Goals</div>
                  <div className="insight-value">{quarterlyInsights.q1.totalGoals}</div>
                </div>
                <div className="insight-card">
                  <div className="insight-label">Weekend Goals</div>
                  <div className="insight-value">{quarterlyInsights.q1.weekendGoals}</div>
                </div>
                <div className="insight-card">
                  <div className="insight-label">Weekday Goals</div>
                  <div className="insight-value">{quarterlyInsights.q1.weekdayGoals}</div>
                </div>
                <div className="insight-card fullhouse-card">
                  <div className="insight-label">🏠 Full House</div>
                  <div className="insight-value">{quarterlyInsights.q1.fullHouseMatches}</div>
                </div>
                <div className="insight-card fullhouse-card">
                  <div className="insight-label">🏠 Weekend Full House</div>
                  <div className="insight-value">{quarterlyInsights.q1.fullHouseWeekendMatches}</div>
                </div>
                <div className="insight-card fullhouse-card">
                  <div className="insight-label">🏠 Weekday Full House</div>
                  <div className="insight-value">{quarterlyInsights.q1.fullHouseWeekdayMatches}</div>
                </div>
              </div>
              {(quarterlyInsights.q1.narrativeTitle ||
                quarterlyInsights.q1.storyBullets?.length > 0 ||
                quarterlyInsights.q1.perfectAttendance?.combined?.length > 0 ||
                quarterlyInsights.q1.topScorers.length > 0 ||
                (quarterlyInsights.q1.mostAttended &&
                  Array.isArray(quarterlyInsights.q1.mostAttended) &&
                  quarterlyInsights.q1.mostAttended.length > 0)) && (
                <div className="insights-highlights">
                  {quarterlyInsights.q1.narrativeTitle && (
                    <div className="highlight-item">
                      <span className="highlight-label">🗂 Quarter Narrative:</span>
                      <span className="highlight-value">
                        {quarterlyInsights.q1.narrativeTitle} — {quarterlyInsights.q1.narrativeSubtitle}
                      </span>
                    </div>
                  )}
                  {quarterlyInsights.q1.storyBullets?.length > 0 && (
                    <div className="highlight-item">
                      <span className="highlight-label">📝 Story of the Quarter:</span>
                      <span className="highlight-value">{quarterlyInsights.q1.storyBullets.join(" ")}</span>
                    </div>
                  )}
                  {quarterlyInsights.q1.perfectAttendance?.combined?.length > 0 && (
                    <div className="highlight-item">
                      <span className="highlight-label">⭐ Perfect Attendance:</span>
                      <span className="highlight-value">
                        Combined: {quarterlyInsights.q1.perfectAttendance.combined.join(", ")}
                        {quarterlyInsights.q1.perfectAttendance.weekend.length
                          ? ` | Weekend: ${quarterlyInsights.q1.perfectAttendance.weekend.join(", ")}`
                          : ""}
                        {quarterlyInsights.q1.perfectAttendance.midweek.length
                          ? ` | Midweek: ${quarterlyInsights.q1.perfectAttendance.midweek.join(", ")}`
                          : ""}
                      </span>
                    </div>
                  )}
                  {quarterlyInsights.q1.topScorers.length > 0 && (
                    <div className="highlight-item">
                      <span className="highlight-label">⚽ Top Scorers:</span>
                      <span className="highlight-value">
                        {quarterlyInsights.q1.topScorers.map((s) => `${s.name} (${s.goals})`).join(", ")}
                      </span>
                    </div>
                  )}
                  {quarterlyInsights.q1.mostAttended &&
                    Array.isArray(quarterlyInsights.q1.mostAttended) &&
                    quarterlyInsights.q1.mostAttended.length > 0 && (
                      <div className="highlight-item">
                        <span className="highlight-label">📅 Most Attended:</span>
                        <span className="highlight-value">
                          {quarterlyInsights.q1.mostAttended
                            .map((p) => `${p.name} (${p.games} games)`)
                            .join(", ")}
                        </span>
                      </div>
                    )}
                </div>
              )}
            </section>
          )}

          {quarterlyInsights.q2 && (
            <section className="insights-section">
              <h2 className="insights-heading">Q2 Insights (Apr - Jun)</h2>
              <div className="insights-grid">
                <div className="insight-card">
                  <div className="insight-label">Matches</div>
                  <div className="insight-value">{quarterlyInsights.q2.matches}</div>
                </div>
                <div className="insight-card">
                  <div className="insight-label">Weekend Games</div>
                  <div className="insight-value">{quarterlyInsights.q2.weekendMatches}</div>
                </div>
                <div className="insight-card">
                  <div className="insight-label">Midweek Games</div>
                  <div className="insight-value">{quarterlyInsights.q2.weekdayMatches}</div>
                </div>
                <div className="insight-card">
                  <div className="insight-label">Total Goals</div>
                  <div className="insight-value">{quarterlyInsights.q2.totalGoals}</div>
                </div>
                <div className="insight-card">
                  <div className="insight-label">Weekend Goals</div>
                  <div className="insight-value">{quarterlyInsights.q2.weekendGoals}</div>
                </div>
                <div className="insight-card">
                  <div className="insight-label">Weekday Goals</div>
                  <div className="insight-value">{quarterlyInsights.q2.weekdayGoals}</div>
                </div>
                <div className="insight-card fullhouse-card">
                  <div className="insight-label">🏠 Full House</div>
                  <div className="insight-value">{quarterlyInsights.q2.fullHouseMatches}</div>
                </div>
                <div className="insight-card fullhouse-card">
                  <div className="insight-label">🏠 Weekend Full House</div>
                  <div className="insight-value">{quarterlyInsights.q2.fullHouseWeekendMatches}</div>
                </div>
                <div className="insight-card fullhouse-card">
                  <div className="insight-label">🏠 Weekday Full House</div>
                  <div className="insight-value">{quarterlyInsights.q2.fullHouseWeekdayMatches}</div>
                </div>
              </div>
              {(quarterlyInsights.q2.narrativeTitle ||
                quarterlyInsights.q2.storyBullets?.length > 0 ||
                quarterlyInsights.q2.perfectAttendance?.combined?.length > 0 ||
                quarterlyInsights.q2.topScorers.length > 0 ||
                (quarterlyInsights.q2.mostAttended &&
                  Array.isArray(quarterlyInsights.q2.mostAttended) &&
                  quarterlyInsights.q2.mostAttended.length > 0)) && (
                <div className="insights-highlights">
                  {quarterlyInsights.q2.narrativeTitle && (
                    <div className="highlight-item">
                      <span className="highlight-label">🗂 Quarter Narrative:</span>
                      <span className="highlight-value">
                        {quarterlyInsights.q2.narrativeTitle} — {quarterlyInsights.q2.narrativeSubtitle}
                      </span>
                    </div>
                  )}
                  {quarterlyInsights.q2.storyBullets?.length > 0 && (
                    <div className="highlight-item">
                      <span className="highlight-label">📝 Story of the Quarter:</span>
                      <span className="highlight-value">{quarterlyInsights.q2.storyBullets.join(" ")}</span>
                    </div>
                  )}
                  {quarterlyInsights.q2.perfectAttendance?.combined?.length > 0 && (
                    <div className="highlight-item">
                      <span className="highlight-label">⭐ Perfect Attendance:</span>
                      <span className="highlight-value">
                        Combined: {quarterlyInsights.q2.perfectAttendance.combined.join(", ")}
                        {quarterlyInsights.q2.perfectAttendance.weekend.length
                          ? ` | Weekend: ${quarterlyInsights.q2.perfectAttendance.weekend.join(", ")}`
                          : ""}
                        {quarterlyInsights.q2.perfectAttendance.midweek.length
                          ? ` | Midweek: ${quarterlyInsights.q2.perfectAttendance.midweek.join(", ")}`
                          : ""}
                      </span>
                    </div>
                  )}
                  {quarterlyInsights.q2.topScorers.length > 0 && (
                    <div className="highlight-item">
                      <span className="highlight-label">⚽ Top Scorers:</span>
                      <span className="highlight-value">
                        {quarterlyInsights.q2.topScorers.map((s) => `${s.name} (${s.goals})`).join(", ")}
                      </span>
                    </div>
                  )}
                  {quarterlyInsights.q2.mostAttended &&
                    Array.isArray(quarterlyInsights.q2.mostAttended) &&
                    quarterlyInsights.q2.mostAttended.length > 0 && (
                      <div className="highlight-item">
                        <span className="highlight-label">📅 Most Attended:</span>
                        <span className="highlight-value">
                          {quarterlyInsights.q2.mostAttended
                            .map((p) => `${p.name} (${p.games} games)`)
                            .join(", ")}
                        </span>
                      </div>
                    )}
                </div>
              )}
              {quarterlyInsights.q2.cleanSheets && quarterlyInsights.q2.cleanSheets.length > 0 && (
                <div className="insights-clean-sheets">
                  <h3 className="clean-sheets-heading">🧤 Clean Sheets</h3>
                  <div className="clean-sheets-list">
                    {quarterlyInsights.q2.cleanSheets.map((player) => (
                      <div key={player.name} className="clean-sheet-item">
                        <span className="clean-sheet-name">{player.name}</span>
                        <span className="clean-sheet-count">{player.cleanSheets}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {quarterlyInsights.q3 && (
            <section className="insights-section">
              <h2 className="insights-heading">Q3 Insights (Jul - Sep)</h2>
              <div className="insights-grid">
                <div className="insight-card">
                  <div className="insight-label">Matches</div>
                  <div className="insight-value">{quarterlyInsights.q3.matches}</div>
                </div>
                <div className="insight-card">
                  <div className="insight-label">Weekend Games</div>
                  <div className="insight-value">{quarterlyInsights.q3.weekendMatches}</div>
                </div>
                <div className="insight-card">
                  <div className="insight-label">Midweek Games</div>
                  <div className="insight-value">{quarterlyInsights.q3.weekdayMatches}</div>
                </div>
                <div className="insight-card">
                  <div className="insight-label">Total Goals</div>
                  <div className="insight-value">{quarterlyInsights.q3.totalGoals}</div>
                </div>
                <div className="insight-card">
                  <div className="insight-label">Weekend Goals</div>
                  <div className="insight-value">{quarterlyInsights.q3.weekendGoals}</div>
                </div>
                <div className="insight-card">
                  <div className="insight-label">Weekday Goals</div>
                  <div className="insight-value">{quarterlyInsights.q3.weekdayGoals}</div>
                </div>
                <div className="insight-card fullhouse-card">
                  <div className="insight-label">🏠 Full House</div>
                  <div className="insight-value">{quarterlyInsights.q3.fullHouseMatches}</div>
                </div>
                <div className="insight-card fullhouse-card">
                  <div className="insight-label">🏠 Weekend Full House</div>
                  <div className="insight-value">{quarterlyInsights.q3.fullHouseWeekendMatches}</div>
                </div>
                <div className="insight-card fullhouse-card">
                  <div className="insight-label">🏠 Weekday Full House</div>
                  <div className="insight-value">{quarterlyInsights.q3.fullHouseWeekdayMatches}</div>
                </div>
              </div>
              {(quarterlyInsights.q3.narrativeTitle ||
                quarterlyInsights.q3.storyBullets?.length > 0 ||
                quarterlyInsights.q3.perfectAttendance?.combined?.length > 0 ||
                quarterlyInsights.q3.topScorers.length > 0 ||
                (quarterlyInsights.q3.mostAttended &&
                  Array.isArray(quarterlyInsights.q3.mostAttended) &&
                  quarterlyInsights.q3.mostAttended.length > 0)) && (
                <div className="insights-highlights">
                  {quarterlyInsights.q3.narrativeTitle && (
                    <div className="highlight-item">
                      <span className="highlight-label">🗂 Quarter Narrative:</span>
                      <span className="highlight-value">
                        {quarterlyInsights.q3.narrativeTitle} — {quarterlyInsights.q3.narrativeSubtitle}
                      </span>
                    </div>
                  )}
                  {quarterlyInsights.q3.storyBullets?.length > 0 && (
                    <div className="highlight-item">
                      <span className="highlight-label">📝 Story of the Quarter:</span>
                      <span className="highlight-value">{quarterlyInsights.q3.storyBullets.join(" ")}</span>
                    </div>
                  )}
                  {quarterlyInsights.q3.perfectAttendance?.combined?.length > 0 && (
                    <div className="highlight-item">
                      <span className="highlight-label">⭐ Perfect Attendance:</span>
                      <span className="highlight-value">
                        Combined: {quarterlyInsights.q3.perfectAttendance.combined.join(", ")}
                        {quarterlyInsights.q3.perfectAttendance.weekend.length
                          ? ` | Weekend: ${quarterlyInsights.q3.perfectAttendance.weekend.join(", ")}`
                          : ""}
                        {quarterlyInsights.q3.perfectAttendance.midweek.length
                          ? ` | Midweek: ${quarterlyInsights.q3.perfectAttendance.midweek.join(", ")}`
                          : ""}
                      </span>
                    </div>
                  )}
                  {quarterlyInsights.q3.topScorers.length > 0 && (
                    <div className="highlight-item">
                      <span className="highlight-label">⚽ Top Scorers:</span>
                      <span className="highlight-value">
                        {quarterlyInsights.q3.topScorers.map((s) => `${s.name} (${s.goals})`).join(", ")}
                      </span>
                    </div>
                  )}
                  {quarterlyInsights.q3.mostAttended &&
                    Array.isArray(quarterlyInsights.q3.mostAttended) &&
                    quarterlyInsights.q3.mostAttended.length > 0 && (
                      <div className="highlight-item">
                        <span className="highlight-label">📅 Most Attended:</span>
                        <span className="highlight-value">
                          {quarterlyInsights.q3.mostAttended
                            .map((p) => `${p.name} (${p.games} games)`)
                            .join(", ")}
                        </span>
                      </div>
                    )}
                </div>
              )}
              {quarterlyInsights.q3.cleanSheets && quarterlyInsights.q3.cleanSheets.length > 0 && (
                <div className="insights-clean-sheets">
                  <h3 className="clean-sheets-heading">🧤 Clean Sheets</h3>
                  <div className="clean-sheets-list">
                    {quarterlyInsights.q3.cleanSheets.map((player) => (
                      <div key={player.name} className="clean-sheet-item">
                        <span className="clean-sheet-name">{player.name}</span>
                        <span className="clean-sheet-count">{player.cleanSheets}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {quarterlyInsights.q4 && (
            <section className="insights-section">
              <h2 className="insights-heading">Q4 Insights (Oct - Dec)</h2>
              <div className="insights-grid">
                <div className="insight-card">
                  <div className="insight-label">Matches</div>
                  <div className="insight-value">{quarterlyInsights.q4.matches}</div>
                </div>
                <div className="insight-card">
                  <div className="insight-label">Weekend Games</div>
                  <div className="insight-value">{quarterlyInsights.q4.weekendMatches}</div>
                </div>
                <div className="insight-card">
                  <div className="insight-label">Midweek Games</div>
                  <div className="insight-value">{quarterlyInsights.q4.weekdayMatches}</div>
                </div>
                <div className="insight-card">
                  <div className="insight-label">Total Goals</div>
                  <div className="insight-value">{quarterlyInsights.q4.totalGoals}</div>
                </div>
                <div className="insight-card">
                  <div className="insight-label">Weekend Goals</div>
                  <div className="insight-value">{quarterlyInsights.q4.weekendGoals}</div>
                </div>
                <div className="insight-card">
                  <div className="insight-label">Weekday Goals</div>
                  <div className="insight-value">{quarterlyInsights.q4.weekdayGoals}</div>
                </div>
                <div className="insight-card fullhouse-card">
                  <div className="insight-label">🏠 Full House</div>
                  <div className="insight-value">{quarterlyInsights.q4.fullHouseMatches}</div>
                </div>
                <div className="insight-card fullhouse-card">
                  <div className="insight-label">🏠 Weekend Full House</div>
                  <div className="insight-value">{quarterlyInsights.q4.fullHouseWeekendMatches}</div>
                </div>
                <div className="insight-card fullhouse-card">
                  <div className="insight-label">🏠 Weekday Full House</div>
                  <div className="insight-value">{quarterlyInsights.q4.fullHouseWeekdayMatches}</div>
                </div>
              </div>
              {(quarterlyInsights.q4.narrativeTitle ||
                quarterlyInsights.q4.storyBullets?.length > 0 ||
                quarterlyInsights.q4.perfectAttendance?.combined?.length > 0 ||
                quarterlyInsights.q4.topScorers.length > 0 ||
                (quarterlyInsights.q4.mostAttended &&
                  Array.isArray(quarterlyInsights.q4.mostAttended) &&
                  quarterlyInsights.q4.mostAttended.length > 0)) && (
                <div className="insights-highlights">
                  {quarterlyInsights.q4.narrativeTitle && (
                    <div className="highlight-item">
                      <span className="highlight-label">🗂 Quarter Narrative:</span>
                      <span className="highlight-value">
                        {quarterlyInsights.q4.narrativeTitle} — {quarterlyInsights.q4.narrativeSubtitle}
                      </span>
                    </div>
                  )}
                  {quarterlyInsights.q4.storyBullets?.length > 0 && (
                    <div className="highlight-item">
                      <span className="highlight-label">📝 Story of the Quarter:</span>
                      <span className="highlight-value">{quarterlyInsights.q4.storyBullets.join(" ")}</span>
                    </div>
                  )}
                  {quarterlyInsights.q4.perfectAttendance?.combined?.length > 0 && (
                    <div className="highlight-item">
                      <span className="highlight-label">⭐ Perfect Attendance:</span>
                      <span className="highlight-value">
                        Combined: {quarterlyInsights.q4.perfectAttendance.combined.join(", ")}
                        {quarterlyInsights.q4.perfectAttendance.weekend.length
                          ? ` | Weekend: ${quarterlyInsights.q4.perfectAttendance.weekend.join(", ")}`
                          : ""}
                        {quarterlyInsights.q4.perfectAttendance.midweek.length
                          ? ` | Midweek: ${quarterlyInsights.q4.perfectAttendance.midweek.join(", ")}`
                          : ""}
                      </span>
                    </div>
                  )}
                  {quarterlyInsights.q4.topScorers.length > 0 && (
                    <div className="highlight-item">
                      <span className="highlight-label">⚽ Top Scorers:</span>
                      <span className="highlight-value">
                        {quarterlyInsights.q4.topScorers.map((s) => `${s.name} (${s.goals})`).join(", ")}
                      </span>
                    </div>
                  )}
                  {quarterlyInsights.q4.mostAttended &&
                    Array.isArray(quarterlyInsights.q4.mostAttended) &&
                    quarterlyInsights.q4.mostAttended.length > 0 && (
                      <div className="highlight-item">
                        <span className="highlight-label">📅 Most Attended:</span>
                        <span className="highlight-value">
                          {quarterlyInsights.q4.mostAttended
                            .map((p) => `${p.name} (${p.games} games)`)
                            .join(", ")}
                        </span>
                      </div>
                    )}
                </div>
              )}
              {quarterlyInsights.q4.cleanSheets && quarterlyInsights.q4.cleanSheets.length > 0 && (
                <div className="insights-clean-sheets">
                  <h3 className="clean-sheets-heading">🧤 Clean Sheets</h3>
                  <div className="clean-sheets-list">
                    {quarterlyInsights.q4.cleanSheets.map((player) => (
                      <div key={player.name} className="clean-sheet-item">
                        <span className="clean-sheet-name">{player.name}</span>
                        <span className="clean-sheet-count">{player.cleanSheets}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
};

