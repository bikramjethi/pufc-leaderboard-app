import { useState, useMemo } from "react";
import { config } from "./leaderboard-config.js";
import matchData2026 from "./data/attendance-data/2026.json";

const matchDataByYear = {
  2026: matchData2026,
};

const availableSeasons = config.SCORING_TRENDS?.seasons || ["2026"];

export const ScoringTrends = () => {
  const defaultSeason = config.SCORING_TRENDS?.defaultSeason || "2026";
  const [selectedSeason, setSelectedSeason] = useState(defaultSeason);

  // Process match data for the graph
  const graphData = useMemo(() => {
    const data = matchDataByYear[selectedSeason];
    if (!data || !data.matches) return { weekday: [], weekend: [], maxGoals: 0 };

    const playedMatches = data.matches
      .filter((m) => m.matchPlayed && !m.matchCancelled)
      .sort((a, b) => {
        // Parse dates in DD/MM/YYYY format
        const [dayA, monthA, yearA] = a.date.split("/").map(Number);
        const [dayB, monthB, yearB] = b.date.split("/").map(Number);
        const dateA = new Date(yearA, monthA - 1, dayA);
        const dateB = new Date(yearB, monthB - 1, dayB);
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
      maxGoals: Math.max(maxGoals, 5), // Minimum of 5 for better visualization
    };
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
  const xScale = (index) => padding.left + (index / maxMatches) * chartWidth;
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
      {/* Season Selector */}
      <div className="scoring-trends-header">
        <h2 className="scoring-trends-title">⚽ Scoring Trends</h2>
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
          {Array.from({ length: Math.min(maxMatches, 10) }, (_, i) => {
            const matchNum = Math.ceil((i + 1) * (maxMatches / 10));
            if (matchNum > maxMatches) return null;
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
    </div>
  );
};

