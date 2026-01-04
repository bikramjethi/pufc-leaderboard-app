import { useState, useMemo } from "react";
import { leaderboardData } from "./utils/get-data.js";
import { config } from "./leaderboard-config.js";
import matchData2026 from "./data/attendance-data/2026.json";
import attendanceLeaderboard2025 from "./data/attendance-data/leaderboard/2025.json";
import attendanceLeaderboard2026 from "./data/attendance-data/leaderboard/2026.json";
import { trivia2024 } from "./data/insights/2024.js";
import { trivia2025 } from "./data/insights/2025.js";
import { trivia2026 } from "./data/insights/2026.js";

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

// Helper function to get quarter from date
const getQuarter = (dateStr) => {
  const [, month] = dateStr.split("/");
  const monthNum = parseInt(month, 10);
  if (monthNum >= 1 && monthNum <= 3) return 1;
  if (monthNum >= 4 && monthNum <= 6) return 2;
  if (monthNum >= 7 && monthNum <= 9) return 3;
  return 4;
};

// Calculate overall season insights
const calculateOverallInsights = (leaderboardData, attendanceData) => {
  if (!leaderboardData || leaderboardData.length === 0) return null;

  const insights = {
    totalPlayers: leaderboardData.length,
    totalGoals: leaderboardData.reduce((sum, p) => sum + (p.goals || 0), 0),
    totalHatTricks: leaderboardData.reduce((sum, p) => sum + (p.hatTricks || 0), 0),
    topScorer: null,
    bestWinRate: null,
    lowestWinRate: null,
    highestLossPct: null,
    lowestLossPct: null,
    highestHatTricks: null,
    cleanSheets: [],
  };

  // Find top scorer
  const topScorer = leaderboardData
    .filter((p) => p.name !== "Others")
    .reduce((max, p) => (p.goals > (max?.goals || 0) ? p : max), null);
  insights.topScorer = topScorer;

  // Find best win rate (minimum 10 matches)
  const bestWinRate = leaderboardData
    .filter((p) => p.name !== "Others" && p.matches >= 10)
    .reduce((max, p) => {
      const winRate = p.matches > 0 ? (p.wins / p.matches) * 100 : 0;
      const maxWinRate = max?.matches > 0 ? (max.wins / max.matches) * 100 : 0;
      return winRate > maxWinRate ? p : max;
    }, null);
  insights.bestWinRate = bestWinRate;

  // Find lowest win rate (minimum 10 matches)
  const lowestWinRate = leaderboardData
    .filter((p) => p.name !== "Others" && p.matches >= 10)
    .reduce((min, p) => {
      const winRate = p.matches > 0 ? (p.wins / p.matches) * 100 : 0;
      const minWinRate = min?.matches > 0 ? (min.wins / min.matches) * 100 : 100;
      return winRate < minWinRate ? p : min;
    }, null);
  insights.lowestWinRate = lowestWinRate;

  // Find highest loss percentage (minimum 10 matches)
  const highestLossPct = leaderboardData
    .filter((p) => p.name !== "Others" && p.matches >= 10)
    .reduce((max, p) => {
      const lossPct = p.matches > 0 ? (p.losses / p.matches) * 100 : 0;
      const maxLossPct = max?.matches > 0 ? (max.losses / max.matches) * 100 : 0;
      return lossPct > maxLossPct ? p : max;
    }, null);
  insights.highestLossPct = highestLossPct;

  // Find lowest loss percentage (minimum 10 matches)
  const lowestLossPct = leaderboardData
    .filter((p) => p.name !== "Others" && p.matches >= 10)
    .reduce((min, p) => {
      const lossPct = p.matches > 0 ? (p.losses / p.matches) * 100 : 0;
      const minLossPct = min?.matches > 0 ? (min.losses / min.matches) * 100 : 100;
      return lossPct < minLossPct ? p : min;
    }, null);
  insights.lowestLossPct = lowestLossPct;

  // Find highest hat tricks
  const highestHatTricks = leaderboardData
    .filter((p) => p.name !== "Others")
    .reduce((max, p) => (p.hatTricks > (max?.hatTricks || 0) ? p : max), null);
  insights.highestHatTricks = highestHatTricks;

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
    insights.mostAttended = attendanceData.players
      ?.filter((p) => p.name !== "Others")
      .reduce((max, p) => (p.totalGames > (max?.totalGames || 0) ? p : max), null);
  } else {
    // If no attendance data, calculate most attended from leaderboard data (matches played)
    const mostAttendedFromLeaderboard = leaderboardData
      .filter((p) => p.name !== "Others")
      .reduce((max, p) => (p.matches > (max?.matches || 0) ? p : max), null);
    
    if (mostAttendedFromLeaderboard) {
      insights.mostAttended = {
        name: mostAttendedFromLeaderboard.name,
        totalGames: mostAttendedFromLeaderboard.matches,
      };
    }
  }

  return insights;
};

// Calculate quarterly insights for 2026
const calculateQuarterlyInsights = (trackerData, leaderboardData, quarter) => {
  if (!trackerData || !trackerData.matches) return null;

  // Filter matches for the quarter
  const quarterMatches = trackerData.matches.filter((match) => {
    if (!match.matchPlayed || match.matchCancelled) return false;
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
    mostAttended: null,
    cleanSheets: [],
  };

  // Calculate top scorers for the quarter
  const scorerMap = new Map();
  quarterMatches.forEach((match) => {
    match.scorers?.forEach((scorer) => {
      const current = scorerMap.get(scorer.name) || 0;
      scorerMap.set(scorer.name, current + (scorer.goals || 0));
    });
  });

  const topScorers = Array.from(scorerMap.entries())
    .map(([name, goals]) => ({ name, goals }))
    .sort((a, b) => b.goals - a.goals)
    .slice(0, 3);
  insights.topScorers = topScorers;

  // Calculate most attended
  const attendanceMap = new Map();
  quarterMatches.forEach((match) => {
    match.attendance?.forEach((player) => {
      const current = attendanceMap.get(player) || 0;
      attendanceMap.set(player, current + 1);
    });
  });

  const mostAttended = Array.from(attendanceMap.entries())
    .map(([name, games]) => ({ name, games }))
    .sort((a, b) => b.games - a.games)[0];
  insights.mostAttended = mostAttended;

  // Calculate clean sheets for the quarter
  const cleanSheetsMap = new Map();
  quarterMatches.forEach((match) => {
    match.cleanSheets?.forEach((player) => {
      const current = cleanSheetsMap.get(player) || 0;
      cleanSheetsMap.set(player, current + 1);
    });
  });

  const cleanSheets = Array.from(cleanSheetsMap.entries())
    .map(([name, count]) => ({ name, cleanSheets: count }))
    .sort((a, b) => b.cleanSheets - a.cleanSheets);
  insights.cleanSheets = cleanSheets;

  return insights;
};

export const Insights = () => {
  // Default to configured defaultSeason or most recent available season
  const defaultSeason = config.INSIGHTS?.defaultSeason || 
    (availableSeasons.length > 0 ? availableSeasons[availableSeasons.length - 1] : "2026");
  const [selectedSeason, setSelectedSeason] = useState(defaultSeason);

  // Load data based on season
  const leaderboardDataForSeason = useMemo(() => {
    return leaderboardData[selectedSeason] || [];
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
      attendanceDataForSeason
    );
  }, [leaderboardDataForSeason, attendanceDataForSeason]);

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
            </>
          )}
        </div>

        {/* Top Performers */}
        <div className="insights-highlights">
          {overallInsights.topScorer && (
            <div className="highlight-item">
              <span className="highlight-label">🏆 Top Scorer:</span>
              <span className="highlight-value">
                {overallInsights.topScorer.name} ({overallInsights.topScorer.goals} goals)
              </span>
            </div>
          )}
          {overallInsights.highestHatTricks && overallInsights.highestHatTricks.hatTricks > 0 && (
            <div className="highlight-item">
              <span className="highlight-label">🎩 Most Hat Tricks:</span>
              <span className="highlight-value">
                {overallInsights.highestHatTricks.name} ({overallInsights.highestHatTricks.hatTricks} hat tricks)
              </span>
            </div>
          )}
          {overallInsights.bestWinRate && (
            <div className="highlight-item">
              <span className="highlight-label">✅ Best Win Rate:</span>
              <span className="highlight-value">
                {overallInsights.bestWinRate.name} (
                {overallInsights.bestWinRate.matches > 0
                  ? Math.round((overallInsights.bestWinRate.wins / overallInsights.bestWinRate.matches) * 100)
                  : 0}
                %)
              </span>
            </div>
          )}
          {overallInsights.lowestWinRate && (
            <div className="highlight-item">
              <span className="highlight-label">📉 Lowest Win Rate:</span>
              <span className="highlight-value">
                {overallInsights.lowestWinRate.name} (
                {overallInsights.lowestWinRate.matches > 0
                  ? Math.round((overallInsights.lowestWinRate.wins / overallInsights.lowestWinRate.matches) * 100)
                  : 0}
                %)
              </span>
            </div>
          )}
          {overallInsights.highestLossPct && (
            <div className="highlight-item">
              <span className="highlight-label">📈 Highest Loss %:</span>
              <span className="highlight-value">
                {overallInsights.highestLossPct.name} (
                {overallInsights.highestLossPct.matches > 0
                  ? Math.round((overallInsights.highestLossPct.losses / overallInsights.highestLossPct.matches) * 100)
                  : 0}
                %)
              </span>
            </div>
          )}
          {overallInsights.lowestLossPct && (
            <div className="highlight-item">
              <span className="highlight-label">📉 Lowest Loss %:</span>
              <span className="highlight-value">
                {overallInsights.lowestLossPct.name} (
                {overallInsights.lowestLossPct.matches > 0
                  ? Math.round((overallInsights.lowestLossPct.losses / overallInsights.lowestLossPct.matches) * 100)
                  : 0}
                %)
              </span>
            </div>
          )}
          {overallInsights.mostAttended && (
            <div className="highlight-item">
              <span className="highlight-label">📅 Most Attended:</span>
              <span className="highlight-value">
                {overallInsights.mostAttended.name} ({overallInsights.mostAttended.totalGames} games)
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
              </div>
              {quarterlyInsights.q1.topScorers.length > 0 && (
                <div className="insights-highlights">
                  <div className="highlight-item">
                    <span className="highlight-label">⚽ Top Scorers:</span>
                    <span className="highlight-value">
                      {quarterlyInsights.q1.topScorers
                        .map((s) => `${s.name} (${s.goals})`)
                        .join(", ")}
                    </span>
                  </div>
                  {quarterlyInsights.q1.mostAttended && (
                    <div className="highlight-item">
                      <span className="highlight-label">📅 Most Attended:</span>
                      <span className="highlight-value">
                        {quarterlyInsights.q1.mostAttended.name} ({quarterlyInsights.q1.mostAttended.games} games)
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
              </div>
              {quarterlyInsights.q2.topScorers.length > 0 && (
                <div className="insights-highlights">
                  <div className="highlight-item">
                    <span className="highlight-label">⚽ Top Scorers:</span>
                    <span className="highlight-value">
                      {quarterlyInsights.q2.topScorers
                        .map((s) => `${s.name} (${s.goals})`)
                        .join(", ")}
                    </span>
                  </div>
                  {quarterlyInsights.q2.mostAttended && (
                    <div className="highlight-item">
                      <span className="highlight-label">📅 Most Attended:</span>
                      <span className="highlight-value">
                        {quarterlyInsights.q2.mostAttended.name} ({quarterlyInsights.q2.mostAttended.games} games)
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
              </div>
              {quarterlyInsights.q3.topScorers.length > 0 && (
                <div className="insights-highlights">
                  <div className="highlight-item">
                    <span className="highlight-label">⚽ Top Scorers:</span>
                    <span className="highlight-value">
                      {quarterlyInsights.q3.topScorers
                        .map((s) => `${s.name} (${s.goals})`)
                        .join(", ")}
                    </span>
                  </div>
                  {quarterlyInsights.q3.mostAttended && (
                    <div className="highlight-item">
                      <span className="highlight-label">📅 Most Attended:</span>
                      <span className="highlight-value">
                        {quarterlyInsights.q3.mostAttended.name} ({quarterlyInsights.q3.mostAttended.games} games)
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
              </div>
              {quarterlyInsights.q4.topScorers.length > 0 && (
                <div className="insights-highlights">
                  <div className="highlight-item">
                    <span className="highlight-label">⚽ Top Scorers:</span>
                    <span className="highlight-value">
                      {quarterlyInsights.q4.topScorers
                        .map((s) => `${s.name} (${s.goals})`)
                        .join(", ")}
                    </span>
                  </div>
                  {quarterlyInsights.q4.mostAttended && (
                    <div className="highlight-item">
                      <span className="highlight-label">📅 Most Attended:</span>
                      <span className="highlight-value">
                        {quarterlyInsights.q4.mostAttended.name} ({quarterlyInsights.q4.mostAttended.games} games)
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

