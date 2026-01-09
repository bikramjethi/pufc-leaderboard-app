import { useState, useMemo } from "react";
import { config } from "./leaderboard-config.js";
import matchData2026 from "./data/attendance-data/2026.json";
import matchData2025 from "./data/attendance-data/2025.json";

const matchDataByYear = {
  2026: matchData2026,
  2025: matchData2025,
};

const availableSeasons = config.SCORING_TRENDS?.seasons || ["2026"];

// Helper function to get ISO week number
const getWeekNumber = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
};

// Helper to parse DD/MM/YYYY date string
const parseDate = (dateStr) => {
  const [day, month, year] = dateStr.split("/").map(Number);
  return new Date(year, month - 1, day);
};

// Helper function to get all scorers from attendance object
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

export const ScoringTrends = () => {
  const defaultSeason = config.SCORING_TRENDS?.defaultSeason || "2026";
  const [selectedSeason, setSelectedSeason] = useState(defaultSeason);
  const [activeSubTab, setActiveSubTab] = useState("scoring-trends");

  // Process match data for the graph
  const graphData = useMemo(() => {
    const data = matchDataByYear[selectedSeason];
    if (!data || !data.matches) return { weekday: [], weekend: [], maxGoals: 0 };

    const playedMatches = data.matches
      .filter((m) => m.matchPlayed && !m.matchCancelled)
      .sort((a, b) => {
        const dateA = parseDate(a.date);
        const dateB = parseDate(b.date);
        return dateA - dateB;
      });

    const weekdayMatches = [];
    const weekendMatches = [];
    let maxGoals = 0;

    playedMatches.forEach((match) => {
      const goals = match.totalGoals || 0;
      maxGoals = Math.max(maxGoals, goals);

      if (match.day === "Midweek") {
        weekdayMatches.push({
          date: match.date,
          goals: goals,
          matchIndex: weekdayMatches.length + 1,
          scoreline: match.scoreline,
        });
      } else if (match.day === "Weekend") {
        weekendMatches.push({
          date: match.date,
          goals: goals,
          matchIndex: weekendMatches.length + 1,
          scoreline: match.scoreline,
        });
      }
    });

    return {
      weekday: weekdayMatches,
      weekend: weekendMatches,
      maxGoals: Math.max(maxGoals, 5),
    };
  }, [selectedSeason]);

  // Calculate weekly top scorers
  const weeklyScorers = useMemo(() => {
    const data = matchDataByYear[selectedSeason];
    if (!data || !data.matches) return [];

    const playedMatches = data.matches
      .filter((m) => m.matchPlayed && !m.matchCancelled)
      .sort((a, b) => parseDate(a.date) - parseDate(b.date));

    // Group matches by week
    const weeklyData = new Map();

    playedMatches.forEach((match) => {
      const matchDate = parseDate(match.date);
      const weekNum = getWeekNumber(matchDate);
      const year = matchDate.getFullYear();
      const weekKey = `${year}-W${weekNum}`;

      if (!weeklyData.has(weekKey)) {
        weeklyData.set(weekKey, {
          weekNum,
          year,
          weekKey,
          weekdayMatches: [],
          weekendMatches: [],
        });
      }

      const week = weeklyData.get(weekKey);
      if (match.day === "Midweek") {
        week.weekdayMatches.push(match);
      } else if (match.day === "Weekend") {
        week.weekendMatches.push(match);
      }
    });

    // Helper function to get all top scorers (handles ties)
    const getTopScorers = (scorersMap) => {
      if (scorersMap.size === 0) return null;
      
      const sortedScorers = Array.from(scorersMap.entries())
        .sort((a, b) => b[1] - a[1]);
      
      const maxGoals = sortedScorers[0][1];
      
      // Get all players with the max goals (handles ties)
      const topScorers = sortedScorers
        .filter(([, goals]) => goals === maxGoals)
        .map(([name, goals]) => ({ name, goals }));
      
      return topScorers;
    };

    // Calculate top scorers for each week
    const results = [];

    weeklyData.forEach((week) => {
      // Calculate weekday top scorers - get scorers from attendance object
      const weekdayScorers = new Map();
      week.weekdayMatches.forEach((match) => {
        const scorers = getScorersFromAttendance(match.attendance);
        scorers.forEach((scorer) => {
          const current = weekdayScorers.get(scorer.name) || 0;
          weekdayScorers.set(scorer.name, current + (scorer.goals || 0));
        });
      });
      const weekdayTopScorers = getTopScorers(weekdayScorers);

      // Calculate weekend top scorers - get scorers from attendance object
      const weekendScorers = new Map();
      week.weekendMatches.forEach((match) => {
        const scorers = getScorersFromAttendance(match.attendance);
        scorers.forEach((scorer) => {
          const current = weekendScorers.get(scorer.name) || 0;
          weekendScorers.set(scorer.name, current + (scorer.goals || 0));
        });
      });
      const weekendTopScorers = getTopScorers(weekendScorers);

      // Calculate overall top scorers for the week
      const overallScorers = new Map();
      [...week.weekdayMatches, ...week.weekendMatches].forEach((match) => {
        const scorers = getScorersFromAttendance(match.attendance);
        scorers.forEach((scorer) => {
          const current = overallScorers.get(scorer.name) || 0;
          overallScorers.set(scorer.name, current + (scorer.goals || 0));
        });
      });
      const overallTopScorers = getTopScorers(overallScorers);

      results.push({
        weekNum: week.weekNum,
        year: week.year,
        weekKey: week.weekKey,
        weekdayTopScorers: weekdayTopScorers,
        weekendTopScorers: weekendTopScorers,
        overallTopScorers: overallTopScorers,
        hasWeekdayMatch: week.weekdayMatches.length > 0,
        hasWeekendMatch: week.weekendMatches.length > 0,
      });
    });

    // Sort by week number
    return results.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.weekNum - b.weekNum;
    });
  }, [selectedSeason]);

  // Calculate stats
  const stats = useMemo(() => {
    const weekdayTotal = graphData.weekday.reduce((sum, m) => sum + m.goals, 0);
    const weekendTotal = graphData.weekend.reduce((sum, m) => sum + m.goals, 0);
    const weekdayAvg = graphData.weekday.length > 0 ? (weekdayTotal / graphData.weekday.length).toFixed(1) : 0;
    const weekendAvg = graphData.weekend.length > 0 ? (weekendTotal / graphData.weekend.length).toFixed(1) : 0;

    return {
      weekdayTotal,
      weekendTotal,
      weekdayAvg,
      weekendAvg,
      weekdayMatches: graphData.weekday.length,
      weekendMatches: graphData.weekend.length,
    };
  }, [graphData]);

  // SVG dimensions
  const svgWidth = 800;
  const svgHeight = 400;
  const padding = { top: 40, right: 40, bottom: 60, left: 60 };
  const chartWidth = svgWidth - padding.left - padding.right;
  const chartHeight = svgHeight - padding.top - padding.bottom;

  // Scale functions
  const maxMatches = Math.max(graphData.weekday.length, graphData.weekend.length, 1);
  // Use 0-based index internally so first point is at left edge
  const xScale = (index) => {
    // If only 1 match, place at left edge; otherwise distribute evenly
    if (maxMatches === 1) return padding.left;
    return padding.left + ((index - 1) / (maxMatches - 1)) * chartWidth;
  };
  const yScale = (goals) => padding.top + chartHeight - (goals / graphData.maxGoals) * chartHeight;

  // Generate path data
  const generatePath = (matches) => {
    if (matches.length === 0) return "";
    const points = matches.map((m, i) => `${xScale(i + 1)},${yScale(m.goals)}`);
    return `M ${points.join(" L ")}`;
  };

  // Generate grid lines
  const yGridLines = [];
  for (let i = 0; i <= graphData.maxGoals; i += Math.ceil(graphData.maxGoals / 5)) {
    yGridLines.push(i);
  }

  return (
    <div className="scoring-trends">
      {/* Header with Season Selector */}
      <div className="scoring-trends-header">
        <h2 className="scoring-trends-title">⚽ Trends</h2>
        <div className="scoring-trends-year-selector">
          <label htmlFor="scoring-trends-year-select">Season</label>
          <div className="select-wrapper">
            <select
              id="scoring-trends-year-select"
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

      {/* Sub-Navigation */}
      <div className="trends-sub-nav">
        <button
          className={`trends-sub-tab ${activeSubTab === "scoring-trends" ? "active" : ""}`}
          onClick={() => setActiveSubTab("scoring-trends")}
        >
          📈 Scoring Trends
        </button>
        <button
          className={`trends-sub-tab ${activeSubTab === "scorers-trend" ? "active" : ""}`}
          onClick={() => setActiveSubTab("scorers-trend")}
        >
          🏆 Scorers Trend
        </button>
      </div>

      {/* Scoring Trends View */}
      {activeSubTab === "scoring-trends" && (
        <>
          {/* Stats Summary */}
          <div className="scoring-trends-stats">
            <div className="scoring-stat-card weekday">
              <div className="stat-indicator weekday-indicator"></div>
              <div className="stat-details">
                <span className="stat-label">Weekday Games</span>
                <span className="stat-value">{stats.weekdayMatches} matches</span>
                <span className="stat-secondary">{stats.weekdayTotal} goals ({stats.weekdayAvg} avg)</span>
              </div>
            </div>
            <div className="scoring-stat-card weekend">
              <div className="stat-indicator weekend-indicator"></div>
              <div className="stat-details">
                <span className="stat-label">Weekend Games</span>
                <span className="stat-value">{stats.weekendMatches} matches</span>
                <span className="stat-secondary">{stats.weekendTotal} goals ({stats.weekendAvg} avg)</span>
              </div>
            </div>
          </div>

          {/* Graph Container */}
          <div className="scoring-trends-graph-container">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="scoring-trends-svg"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Background */}
              <rect
                x={padding.left}
                y={padding.top}
                width={chartWidth}
                height={chartHeight}
                fill="var(--bg-secondary)"
                rx="8"
              />

              {/* Grid Lines */}
              {yGridLines.map((value) => (
                <g key={value}>
                  <line
                    x1={padding.left}
                    y1={yScale(value)}
                    x2={svgWidth - padding.right}
                    y2={yScale(value)}
                    stroke="var(--border-color)"
                    strokeDasharray="4,4"
                    opacity="0.5"
                  />
                  <text
                    x={padding.left - 10}
                    y={yScale(value)}
                    textAnchor="end"
                    dominantBaseline="middle"
                    fill="var(--text-muted)"
                    fontSize="12"
                    fontFamily="Outfit, sans-serif"
                  >
                    {value}
                  </text>
                </g>
              ))}

              {/* X-axis labels */}
              {Array.from({ length: maxMatches }, (_, i) => {
                const matchNum = i + 1;
                // Show all labels if <= 10 matches, otherwise show every nth label
                if (maxMatches > 10 && matchNum % Math.ceil(maxMatches / 10) !== 0 && matchNum !== 1 && matchNum !== maxMatches) {
                  return null;
                }
                return (
                  <text
                    key={i}
                    x={xScale(matchNum)}
                    y={svgHeight - padding.bottom + 20}
                    textAnchor="middle"
                    fill="var(--text-muted)"
                    fontSize="12"
                    fontFamily="Outfit, sans-serif"
                  >
                    M{matchNum}
                  </text>
                );
              })}

              {/* Axis Labels */}
              <text
                x={svgWidth / 2}
                y={svgHeight - 10}
                textAnchor="middle"
                fill="var(--text-secondary)"
                fontSize="14"
                fontWeight="600"
                fontFamily="Outfit, sans-serif"
              >
                Match Day
              </text>
              <text
                x={20}
                y={svgHeight / 2}
                textAnchor="middle"
                fill="var(--text-secondary)"
                fontSize="14"
                fontWeight="600"
                fontFamily="Outfit, sans-serif"
                transform={`rotate(-90, 20, ${svgHeight / 2})`}
              >
                Goals
              </text>

              {/* Weekend Line */}
              {graphData.weekend.length > 0 && (
                <>
                  <path
                    d={generatePath(graphData.weekend)}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="trend-line weekend-line"
                  />
                  {/* Weekend Points */}
                  {graphData.weekend.map((match, i) => (
                    <g key={`weekend-${i}`} className="data-point-group">
                      <circle
                        cx={xScale(i + 1)}
                        cy={yScale(match.goals)}
                        r="6"
                        fill="#f59e0b"
                        stroke="var(--bg-card)"
                        strokeWidth="2"
                        className="data-point weekend-point"
                      />
                      <title>{`${match.date}: ${match.goals} goals`}</title>
                    </g>
                  ))}
                </>
              )}

              {/* Weekday Line */}
              {graphData.weekday.length > 0 && (
                <>
                  <path
                    d={generatePath(graphData.weekday)}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="trend-line weekday-line"
                  />
                  {/* Weekday Points */}
                  {graphData.weekday.map((match, i) => (
                    <g key={`weekday-${i}`} className="data-point-group">
                      <circle
                        cx={xScale(i + 1)}
                        cy={yScale(match.goals)}
                        r="6"
                        fill="#3b82f6"
                        stroke="var(--bg-card)"
                        strokeWidth="2"
                        className="data-point weekday-point"
                      />
                      <title>{`${match.date}: ${match.goals} goals`}</title>
                    </g>
                  ))}
                </>
              )}
            </svg>
          </div>

          {/* Legend */}
          <div className="scoring-trends-legend">
            <div className="legend-item">
              <span className="legend-color weekday-color"></span>
              <span className="legend-text">Weekday Matches</span>
            </div>
            <div className="legend-item">
              <span className="legend-color weekend-color"></span>
              <span className="legend-text">Weekend Matches</span>
            </div>
          </div>

          {/* Match Details Table */}
          <div className="scoring-trends-tables">
            <div className="match-table-section">
              <h3 className="table-heading weekday-heading">📅 Weekday Matches</h3>
              <div className="match-table-container">
                <table className="match-details-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Date</th>
                      <th>Goals</th>
                    </tr>
                  </thead>
                  <tbody>
                    {graphData.weekday.map((match, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td>{match.date}</td>
                        <td className="goals-cell">{match.goals}</td>
                      </tr>
                    ))}
                    {graphData.weekday.length === 0 && (
                      <tr>
                        <td colSpan={3} className="no-data">No weekday matches yet</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="match-table-section">
              <h3 className="table-heading weekend-heading">🌅 Weekend Matches</h3>
              <div className="match-table-container">
                <table className="match-details-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Date</th>
                      <th>Goals</th>
                    </tr>
                  </thead>
                  <tbody>
                    {graphData.weekend.map((match, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td>{match.date}</td>
                        <td className="goals-cell">{match.goals}</td>
                      </tr>
                    ))}
                    {graphData.weekend.length === 0 && (
                      <tr>
                        <td colSpan={3} className="no-data">No weekend matches yet</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Scorers Trend View */}
      {activeSubTab === "scorers-trend" && (
        <div className="scorers-trend-section">
          <div className="scorers-trend-table-container">
            <table className="scorers-trend-table">
              <thead>
                <tr>
                  <th>Week</th>
                  <th>
                    <span className="th-icon weekday-icon">📅</span>
                    Weekday Top Scorer
                  </th>
                  <th>
                    <span className="th-icon weekend-icon">🌅</span>
                    Weekend Top Scorer
                  </th>
                  <th>
                    <span className="th-icon overall-icon">🏆</span>
                    Overall Top Scorer
                  </th>
                </tr>
              </thead>
              <tbody>
                {weeklyScorers.map((week, i) => (
                  <tr key={week.weekKey} className={i % 2 === 0 ? "even" : "odd"}>
                    <td className="week-cell">
                      <span className="week-number">W{week.weekNum}</span>
                    </td>
                    <td className={`scorer-cell ${week.hasWeekdayMatch ? "has-match" : "no-match"}`}>
                      {week.weekdayTopScorers ? (
                        <div className="scorers-list">
                          {week.weekdayTopScorers.map((scorer, idx) => (
                            <div key={idx} className="scorer-info">
                              <span className="scorer-name">{scorer.name}</span>
                              <span className="scorer-goals weekday-goals">{scorer.goals}⚽</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="no-match-text">—</span>
                      )}
                    </td>
                    <td className={`scorer-cell ${week.hasWeekendMatch ? "has-match" : "no-match"}`}>
                      {week.weekendTopScorers ? (
                        <div className="scorers-list">
                          {week.weekendTopScorers.map((scorer, idx) => (
                            <div key={idx} className="scorer-info">
                              <span className="scorer-name">{scorer.name}</span>
                              <span className="scorer-goals weekend-goals">{scorer.goals}⚽</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="no-match-text">—</span>
                      )}
                    </td>
                    <td className="scorer-cell overall-cell">
                      {week.overallTopScorers ? (
                        <div className="scorers-list">
                          {week.overallTopScorers.map((scorer, idx) => (
                            <div key={idx} className="scorer-info overall">
                              <span className="scorer-name">{scorer.name}</span>
                              <span className="scorer-goals overall-goals">{scorer.goals}⚽</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="no-match-text">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {weeklyScorers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="no-data">No match data available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Legend for Scorers Trend */}
          <div className="scorers-trend-legend">
            <div className="legend-note">
              <span className="legend-icon">ℹ️</span>
              <span>Weeks run Monday to Sunday. Some weeks may only have weekday or weekend matches.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
