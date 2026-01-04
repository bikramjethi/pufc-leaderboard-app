import { useState, useMemo } from "react";
import { leaderboardData } from "./utils/get-data.js";
import matchData2026 from "./data/attendance-data/2026.json";
import attendanceLeaderboard2025 from "./data/attendance-data/leaderboard/2025.json";
import attendanceLeaderboard2026 from "./data/attendance-data/leaderboard/2026.json";

const matchDataByYear = {
  2026: matchData2026,
};

const attendanceLeaderboardByYear = {
  2025: attendanceLeaderboard2025,
  2026: attendanceLeaderboard2026,
};

const availableSeasons = ["2024", "2025", "2026"];

// Helper function to get quarter from date
const getQuarter = (dateStr) => {
  const [day, month] = dateStr.split("/");
  const monthNum = parseInt(month, 10);
  if (monthNum >= 1 && monthNum <= 3) return 1;
  if (monthNum >= 4 && monthNum <= 6) return 2;
  if (monthNum >= 7 && monthNum <= 9) return 3;
  return 4;
};

// Calculate overall season insights
const calculateOverallInsights = (leaderboardData, attendanceData, year) => {
  if (!leaderboardData || leaderboardData.length === 0) return null;

  const insights = {
    totalPlayers: leaderboardData.length,
    totalMatches: leaderboardData.reduce((sum, p) => sum + (p.matches || 0), 0),
    totalGoals: leaderboardData.reduce((sum, p) => sum + (p.goals || 0), 0),
    totalWins: leaderboardData.reduce((sum, p) => sum + (p.wins || 0), 0),
    totalLosses: leaderboardData.reduce((sum, p) => sum + (p.losses || 0), 0),
    totalDraws: leaderboardData.reduce((sum, p) => sum + (p.draws || 0), 0),
    totalHatTricks: leaderboardData.reduce((sum, p) => sum + (p.hatTricks || 0), 0),
    topScorer: null,
    mostMatches: null,
    bestWinRate: null,
  };

  // Find top scorer
  const topScorer = leaderboardData
    .filter((p) => p.name !== "Others")
    .reduce((max, p) => (p.goals > (max?.goals || 0) ? p : max), null);
  insights.topScorer = topScorer;

  // Find most matches
  const mostMatches = leaderboardData
    .filter((p) => p.name !== "Others")
    .reduce((max, p) => (p.matches > (max?.matches || 0) ? p : max), null);
  insights.mostMatches = mostMatches;

  // Find best win rate (minimum 10 matches)
  const bestWinRate = leaderboardData
    .filter((p) => p.name !== "Others" && p.matches >= 10)
    .reduce((max, p) => {
      const winRate = p.matches > 0 ? (p.wins / p.matches) * 100 : 0;
      const maxWinRate = max?.matches > 0 ? (max.wins / max.matches) * 100 : 0;
      return winRate > maxWinRate ? p : max;
    }, null);
  insights.bestWinRate = bestWinRate;

  // Add attendance insights if available
  if (attendanceData) {
    insights.totalGames = attendanceData.summary?.totalGames || 0;
    insights.midweekGames = attendanceData.summary?.midweekGames || 0;
    insights.weekendGames = attendanceData.summary?.weekendGames || 0;
    insights.mostAttended = attendanceData.players
      ?.filter((p) => p.name !== "Others")
      .reduce((max, p) => (p.totalGames > (max?.totalGames || 0) ? p : max), null);
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

  return insights;
};

export const Insights = () => {
  const [selectedSeason, setSelectedSeason] = useState("2026");

  // Load data based on season
  const leaderboardDataForSeason = leaderboardData[selectedSeason] || [];
  
  // Load attendance leaderboard data
  // Note: 2025 attendance data is incomplete, so we'll only use it for basic stats
  const attendanceDataForSeason = attendanceLeaderboardByYear[selectedSeason] || null;
  
  const trackerDataForSeason =
    selectedSeason === "2026" ? matchDataByYear[2026] : null;

  // Calculate overall insights
  const overallInsights = useMemo(() => {
    return calculateOverallInsights(
      leaderboardDataForSeason,
      attendanceDataForSeason,
      selectedSeason
    );
  }, [leaderboardDataForSeason, attendanceDataForSeason, selectedSeason]);

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
            <div className="insight-label">Total Matches</div>
            <div className="insight-value">{overallInsights.totalMatches}</div>
          </div>
          <div className="insight-card">
            <div className="insight-label">Total Goals</div>
            <div className="insight-value">{overallInsights.totalGoals}</div>
          </div>
          <div className="insight-card">
            <div className="insight-label">Total Wins</div>
            <div className="insight-value">{overallInsights.totalWins}</div>
          </div>
          <div className="insight-card">
            <div className="insight-label">Total Losses</div>
            <div className="insight-value">{overallInsights.totalLosses}</div>
          </div>
          <div className="insight-card">
            <div className="insight-label">Total Draws</div>
            <div className="insight-value">{overallInsights.totalDraws}</div>
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
          {overallInsights.mostMatches && (
            <div className="highlight-item">
              <span className="highlight-label">📊 Most Matches:</span>
              <span className="highlight-value">
                {overallInsights.mostMatches.name} ({overallInsights.mostMatches.matches} matches)
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
          {overallInsights.mostAttended && (
            <div className="highlight-item">
              <span className="highlight-label">📅 Most Attended:</span>
              <span className="highlight-value">
                {overallInsights.mostAttended.name} ({overallInsights.mostAttended.totalGames} games)
              </span>
            </div>
          )}
        </div>
      </section>

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
            </section>
          )}
        </>
      )}
    </div>
  );
};

