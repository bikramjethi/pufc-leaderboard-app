import { useState, useMemo, useRef, useEffect } from "react";
import { config } from "../../leaderboard-config.js";
import matchData2026 from "../../data/attendance-data/2026.json";
import matchData2025 from "../../data/attendance-data/2025.json";
import matchData2024 from "../../data/attendance-data/2024.json";

const matchDataByYear = {
  2026: matchData2026,
  2025: matchData2025,
  2024: matchData2024,
};


const availableSeasons = config.SCORING_TRENDS?.seasons || ["2026"];

// Helper function to get ISO week number and ISO week year
// Returns { weekNum, isoYear } to handle year boundary issues
const getISOWeekData = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  // Set to nearest Thursday (to get correct ISO week year)
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const isoYear = d.getFullYear();
  const yearStart = new Date(isoYear, 0, 1);
  const weekNum = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return { weekNum, isoYear };
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
  
  // Get sub-tab flags from config
  const enableScoringTrends = config.SCORING_TRENDS?.enableScoringTrends !== false;
  const enableScorersTrend = config.SCORING_TRENDS?.enableScorersTrend !== false;
  const enableScoringDiffs = config.SCORING_TRENDS?.enableScoringDiffs !== false;
  
  // Determine default active sub-tab (first enabled one)
  const getDefaultSubTab = () => {
    if (enableScoringTrends) return "scoring-trends";
    if (enableScorersTrend) return "scorers-trend";
    if (enableScoringDiffs) return "scoring-diffs";
    return "scoring-trends"; // fallback
  };
  
  const [activeSubTab, setActiveSubTab] = useState(getDefaultSubTab());
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: null });
  const [diffTooltip, setDiffTooltip] = useState({ visible: false, x: 0, y: 0, content: null });
  const svgRef = useRef(null);
  const diffSvgRef = useRef(null);

  // Ensure activeSubTab is always one of the enabled tabs
  useEffect(() => {
    const isActiveTabEnabled = 
      (activeSubTab === "scoring-trends" && enableScoringTrends) ||
      (activeSubTab === "scorers-trend" && enableScorersTrend) ||
      (activeSubTab === "scoring-diffs" && enableScoringDiffs);
    
    if (!isActiveTabEnabled) {
      // Find first enabled tab
      if (enableScoringTrends) {
        setActiveSubTab("scoring-trends");
      } else if (enableScorersTrend) {
        setActiveSubTab("scorers-trend");
      } else if (enableScoringDiffs) {
        setActiveSubTab("scoring-diffs");
      }
    }
  }, [enableScoringTrends, enableScorersTrend, enableScoringDiffs, activeSubTab]);

  // Process match data for the graph (including cancelled matches, excluding future)
  const graphData = useMemo(() => {
    const data = matchDataByYear[selectedSeason];
    if (!data || !data.matches) return { weekday: [], weekend: [], maxGoals: 0, playedWeekday: 0, playedWeekend: 0 };

    const today = new Date();
    today.setHours(23, 59, 59, 999); // Include matches from today

    // Include only past/current matches (played or cancelled), sorted by date
    // For 2024, only include matches with isBackfilled: true
    const allMatches = [...data.matches]
      .filter((m) => {
        const matchDate = parseDate(m.date);
        // Only include if match date is today or in the past
        if (matchDate > today) return false;
        // For 2024, only include backfilled matches
        if (selectedSeason === "2024" && m.matchPlayed && !m.matchCancelled && !m.isBackfilled) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        const dateA = parseDate(a.date);
        const dateB = parseDate(b.date);
        return dateA - dateB;
      });

    const weekdayMatches = [];
    const weekendMatches = [];
    let maxGoals = 0;
    let playedWeekday = 0;
    let playedWeekend = 0;

    allMatches.forEach((match) => {
      const isCancelled = match.matchCancelled || !match.matchPlayed;
      const goals = isCancelled ? 0 : (match.totalGoals || 0);
      
      if (!isCancelled) {
        maxGoals = Math.max(maxGoals, goals);
      }

      if (match.day === "Midweek") {
        if (!isCancelled) playedWeekday++;
        weekdayMatches.push({
          date: match.date,
          goals: goals,
          matchIndex: weekdayMatches.length + 1,
          scoreline: match.scoreline,
          isCancelled: isCancelled,
        });
      } else if (match.day === "Weekend") {
        if (!isCancelled) playedWeekend++;
        weekendMatches.push({
          date: match.date,
          goals: goals,
          matchIndex: weekendMatches.length + 1,
          scoreline: match.scoreline,
          isCancelled: isCancelled,
        });
      }
    });

    return {
      weekday: weekdayMatches,
      weekend: weekendMatches,
      maxGoals: Math.max(maxGoals, 5),
      playedWeekday,
      playedWeekend,
    };
  }, [selectedSeason]);

  // Calculate weekly top scorers
  const weeklyScorers = useMemo(() => {
    const data = matchDataByYear[selectedSeason];
    if (!data || !data.matches) return [];

    const playedMatches = data.matches
      .filter((m) => {
        if (!m.matchPlayed || m.matchCancelled) return false;
        // For 2024, only include backfilled matches
        if (selectedSeason === "2024" && !m.isBackfilled) return false;
        return true;
      })
      .sort((a, b) => parseDate(a.date) - parseDate(b.date));

    // Group matches by week
    const weeklyData = new Map();

    const selectedYear = parseInt(selectedSeason);
    
    playedMatches.forEach((match) => {
      const matchDate = parseDate(match.date);
      const calendarYear = matchDate.getFullYear();
      const { weekNum, isoYear } = getISOWeekData(matchDate);
      
      // Handle year spillover: if match is in selected year but ISO week year is next year,
      // show it as week 53 (or the last week of the selected year) for sanity
      let displayWeekNum = weekNum;
      let displayYear = isoYear;
      
      if (calendarYear === selectedYear && isoYear > selectedYear) {
        // This is a late December date that spills into next year's week 1
        // Show it as week 53 of the current year
        displayWeekNum = 53;
        displayYear = selectedYear;
      }
      
      const weekKey = `${displayYear}-W${displayWeekNum}`;

      if (!weeklyData.has(weekKey)) {
        weeklyData.set(weekKey, {
          weekNum: displayWeekNum,
          year: displayYear,
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

  // Calculate stats (only count played matches for averages)
  const stats = useMemo(() => {
    const playedWeekday = graphData.weekday.filter(m => !m.isCancelled);
    const playedWeekend = graphData.weekend.filter(m => !m.isCancelled);
    const weekdayTotal = playedWeekday.reduce((sum, m) => sum + m.goals, 0);
    const weekendTotal = playedWeekend.reduce((sum, m) => sum + m.goals, 0);
    const weekdayAvg = playedWeekday.length > 0 ? (weekdayTotal / playedWeekday.length).toFixed(1) : 0;
    const weekendAvg = playedWeekend.length > 0 ? (weekendTotal / playedWeekend.length).toFixed(1) : 0;
    const cancelledWeekday = graphData.weekday.filter(m => m.isCancelled).length;
    const cancelledWeekend = graphData.weekend.filter(m => m.isCancelled).length;

    return {
      weekdayTotal,
      weekendTotal,
      weekdayAvg,
      weekendAvg,
      weekdayMatches: playedWeekday.length,
      weekendMatches: playedWeekend.length,
      cancelledWeekday,
      cancelledWeekend,
      totalWeekday: graphData.weekday.length,
      totalWeekend: graphData.weekend.length,
    };
  }, [graphData]);

  // Calculate weekly goal differences (including cancelled matches, excluding future)
  const weeklyDiffs = useMemo(() => {
    const data = matchDataByYear[selectedSeason];
    if (!data || !data.matches) return { data: [], weekdayData: [], weekendData: [] };

    const today = new Date();
    today.setHours(23, 59, 59, 999); // Include matches from today

    // Include only past/current matches, sorted by date
    // For 2024, only include matches with isBackfilled: true
    const allMatches = [...data.matches]
      .filter((m) => {
        const matchDate = parseDate(m.date);
        // Only include if match date is today or in the past
        if (matchDate > today) return false;
        // For 2024, only include backfilled matches
        if (selectedSeason === "2024" && m.matchPlayed && !m.matchCancelled && !m.isBackfilled) {
          return false;
        }
        return true;
      })
      .sort((a, b) => parseDate(a.date) - parseDate(b.date));

    const selectedYear = parseInt(selectedSeason);
    const weeklyData = new Map();

    allMatches.forEach((match) => {
      const matchDate = parseDate(match.date);
      const calendarYear = matchDate.getFullYear();
      const { weekNum, isoYear } = getISOWeekData(matchDate);
      
      let displayWeekNum = weekNum;
      let displayYear = isoYear;
      
      if (calendarYear === selectedYear && isoYear > selectedYear) {
        displayWeekNum = 53;
        displayYear = selectedYear;
      }
      
      const weekKey = `${displayYear}-W${displayWeekNum}`;

      if (!weeklyData.has(weekKey)) {
        weeklyData.set(weekKey, {
          weekNum: displayWeekNum,
          year: displayYear,
          weekKey,
          weekdayMatches: [],
          weekendMatches: [],
        });
      }

      const week = weeklyData.get(weekKey);
      const isCancelled = match.matchCancelled || !match.matchPlayed;
      
      // Calculate goal difference for this match (0 for cancelled)
      let diff = 0;
      if (!isCancelled && match.scoreline) {
        const scores = Object.values(match.scoreline);
        diff = scores.length >= 2 ? Math.abs(scores[0] - scores[1]) : 0;
      }
      const matchWithDiff = { ...match, goalDiff: diff, isCancelled };
      
      if (match.day === "Midweek") {
        week.weekdayMatches.push(matchWithDiff);
      } else if (match.day === "Weekend") {
        week.weekendMatches.push(matchWithDiff);
      }
    });

    const results = [];
    weeklyData.forEach((week) => {
      const weekdayMatch = week.weekdayMatches[0] || null;
      const weekendMatch = week.weekendMatches[0] || null;
      const weekdayDiff = weekdayMatch ? weekdayMatch.goalDiff : null;
      const weekendDiff = weekendMatch ? weekendMatch.goalDiff : null;
      
      results.push({
        weekNum: week.weekNum,
        year: week.year,
        weekKey: week.weekKey,
        weekdayMatch,
        weekendMatch,
        weekdayDiff,
        weekendDiff,
        weekdayCancelled: weekdayMatch?.isCancelled || false,
        weekendCancelled: weekendMatch?.isCancelled || false,
      });
    });

    const sortedResults = results.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.weekNum - b.weekNum;
    });

    // Prepare flat arrays for graph plotting
    const weekdayData = sortedResults
      .filter(w => w.weekdayMatch)
      .map((w, i) => ({
        date: w.weekdayMatch.date,
        diff: w.weekdayDiff,
        scoreline: w.weekdayMatch.scoreline,
        weekNum: w.weekNum,
        isCancelled: w.weekdayCancelled,
        index: i + 1,
      }));

    const weekendData = sortedResults
      .filter(w => w.weekendMatch)
      .map((w, i) => ({
        date: w.weekendMatch.date,
        diff: w.weekendDiff,
        scoreline: w.weekendMatch.scoreline,
        weekNum: w.weekNum,
        isCancelled: w.weekendCancelled,
        index: i + 1,
      }));

    return { data: sortedResults, weekdayData, weekendData };
  }, [selectedSeason]);

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

  // Generate path data (only connect non-cancelled matches with lines)
  const generatePath = (matches) => {
    if (matches.length === 0) return "";
    // Filter out cancelled matches for the line path
    const playedMatches = matches
      .map((m, i) => ({ ...m, originalIndex: i + 1 }))
      .filter(m => !m.isCancelled);
    if (playedMatches.length === 0) return "";
    const points = playedMatches.map((m) => `${xScale(m.originalIndex)},${yScale(m.goals)}`);
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
        {enableScoringTrends && (
          <button
            className={`trends-sub-tab ${activeSubTab === "scoring-trends" ? "active" : ""}`}
            onClick={() => setActiveSubTab("scoring-trends")}
          >
            📈 Scoring Trends
          </button>
        )}
        {enableScorersTrend && (
          <button
            className={`trends-sub-tab ${activeSubTab === "scorers-trend" ? "active" : ""}`}
            onClick={() => setActiveSubTab("scorers-trend")}
          >
            🏆 Scorers Trend
          </button>
        )}
        {enableScoringDiffs && (
          <button
            className={`trends-sub-tab ${activeSubTab === "scoring-diffs" ? "active" : ""}`}
            onClick={() => setActiveSubTab("scoring-diffs")}
          >
            ⚖️ Scoring Diffs
          </button>
        )}
      </div>

      {/* Scoring Trends View */}
      {enableScoringTrends && activeSubTab === "scoring-trends" && (
        <>
          {/* Stats Summary */}
          <div className="scoring-trends-stats">
            <div className="scoring-stat-card weekday">
              <div className="stat-indicator weekday-indicator"></div>
              <div className="stat-details">
                <span className="stat-label">Weekday Games</span>
                <span className="stat-value">
                  {stats.weekdayMatches} played
                  {stats.cancelledWeekday > 0 && (
                    <span className="cancelled-count"> · {stats.cancelledWeekday} cancelled</span>
                  )}
                </span>
                <span className="stat-secondary">{stats.weekdayTotal} goals ({stats.weekdayAvg} avg)</span>
              </div>
            </div>
            <div className="scoring-stat-card weekend">
              <div className="stat-indicator weekend-indicator"></div>
              <div className="stat-details">
                <span className="stat-label">Weekend Games</span>
                <span className="stat-value">
                  {stats.weekendMatches} played
                  {stats.cancelledWeekend > 0 && (
                    <span className="cancelled-count"> · {stats.cancelledWeekend} cancelled</span>
                  )}
                </span>
                <span className="stat-secondary">{stats.weekendTotal} goals ({stats.weekendAvg} avg)</span>
              </div>
            </div>
          </div>

          {/* Graph Container */}
          <div className="scoring-trends-graph-container" ref={svgRef}>
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="scoring-trends-svg"
              preserveAspectRatio="xMidYMid meet"
              onMouseLeave={() => setTooltip({ visible: false, x: 0, y: 0, content: null })}
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
                  {graphData.weekend.map((match, i) => {
                    const cx = xScale(i + 1);
                    const cy = yScale(match.goals);
                    const isCancelled = match.isCancelled;
                    return (
                      <g key={`weekend-${i}`} className={`data-point-group ${isCancelled ? 'cancelled' : ''}`}>
                        {isCancelled ? (
                          // Cancelled match: X marker at bottom
                          <>
                            <line
                              x1={cx - 6}
                              y1={yScale(0) - 6}
                              x2={cx + 6}
                              y2={yScale(0) + 6}
                              stroke="#ef4444"
                              strokeWidth="3"
                              strokeLinecap="round"
                              className="cancelled-marker"
                            />
                            <line
                              x1={cx + 6}
                              y1={yScale(0) - 6}
                              x2={cx - 6}
                              y2={yScale(0) + 6}
                              stroke="#ef4444"
                              strokeWidth="3"
                              strokeLinecap="round"
                              className="cancelled-marker"
                            />
                            {/* Invisible hitbox for tooltip */}
                            <circle
                              cx={cx}
                              cy={yScale(0)}
                              r="12"
                              fill="transparent"
                              style={{ cursor: 'pointer' }}
                              onMouseEnter={() => {
                                const rect = svgRef.current?.getBoundingClientRect();
                                if (rect) {
                                  const svgX = (cx / svgWidth) * rect.width;
                                  const svgY = (yScale(0) / svgHeight) * rect.height;
                                  setTooltip({
                                    visible: true,
                                    x: svgX,
                                    y: svgY - 10,
                                    position: 'above',
                                    content: {
                                      date: match.date,
                                      isCancelled: true,
                                      type: 'weekend'
                                    }
                                  });
                                }
                              }}
                              onMouseLeave={() => setTooltip({ visible: false, x: 0, y: 0, content: null })}
                            />
                          </>
                        ) : (
                          <circle
                            cx={cx}
                            cy={cy}
                            r="7"
                            fill="#f59e0b"
                            stroke="var(--bg-card)"
                            strokeWidth="2"
                            className="data-point weekend-point"
                            style={{ cursor: 'pointer' }}
                            onMouseEnter={() => {
                              const rect = svgRef.current?.getBoundingClientRect();
                              if (rect) {
                                const svgX = (cx / svgWidth) * rect.width;
                                const svgY = (cy / svgHeight) * rect.height;
                                // If point is in upper 30% of graph, show tooltip below
                                const isNearTop = svgY < rect.height * 0.3;
                                setTooltip({
                                  visible: true,
                                  x: svgX,
                                  y: isNearTop ? svgY + 20 : svgY - 10,
                                  position: isNearTop ? 'below' : 'above',
                                  content: {
                                    date: match.date,
                                    scoreline: match.scoreline,
                                    goals: match.goals,
                                    type: 'weekend'
                                  }
                                });
                              }
                            }}
                            onMouseLeave={() => setTooltip({ visible: false, x: 0, y: 0, content: null })}
                          />
                        )}
                      </g>
                    );
                  })}
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
                  {graphData.weekday.map((match, i) => {
                    const cx = xScale(i + 1);
                    const cy = yScale(match.goals);
                    const isCancelled = match.isCancelled;
                    return (
                      <g key={`weekday-${i}`} className={`data-point-group ${isCancelled ? 'cancelled' : ''}`}>
                        {isCancelled ? (
                          // Cancelled match: X marker at bottom
                          <>
                            <line
                              x1={cx - 6}
                              y1={yScale(0) - 6}
                              x2={cx + 6}
                              y2={yScale(0) + 6}
                              stroke="#ef4444"
                              strokeWidth="3"
                              strokeLinecap="round"
                              className="cancelled-marker"
                            />
                            <line
                              x1={cx + 6}
                              y1={yScale(0) - 6}
                              x2={cx - 6}
                              y2={yScale(0) + 6}
                              stroke="#ef4444"
                              strokeWidth="3"
                              strokeLinecap="round"
                              className="cancelled-marker"
                            />
                            {/* Invisible hitbox for tooltip */}
                            <circle
                              cx={cx}
                              cy={yScale(0)}
                              r="12"
                              fill="transparent"
                              style={{ cursor: 'pointer' }}
                              onMouseEnter={() => {
                                const rect = svgRef.current?.getBoundingClientRect();
                                if (rect) {
                                  const svgX = (cx / svgWidth) * rect.width;
                                  const svgY = (yScale(0) / svgHeight) * rect.height;
                                  setTooltip({
                                    visible: true,
                                    x: svgX,
                                    y: svgY - 10,
                                    position: 'above',
                                    content: {
                                      date: match.date,
                                      isCancelled: true,
                                      type: 'weekday'
                                    }
                                  });
                                }
                              }}
                              onMouseLeave={() => setTooltip({ visible: false, x: 0, y: 0, content: null })}
                            />
                          </>
                        ) : (
                          <circle
                            cx={cx}
                            cy={cy}
                            r="7"
                            fill="#3b82f6"
                            stroke="var(--bg-card)"
                            strokeWidth="2"
                            className="data-point weekday-point"
                            style={{ cursor: 'pointer' }}
                            onMouseEnter={() => {
                              const rect = svgRef.current?.getBoundingClientRect();
                              if (rect) {
                                const svgX = (cx / svgWidth) * rect.width;
                                const svgY = (cy / svgHeight) * rect.height;
                                // If point is in upper 30% of graph, show tooltip below
                                const isNearTop = svgY < rect.height * 0.3;
                                setTooltip({
                                  visible: true,
                                  x: svgX,
                                  y: isNearTop ? svgY + 20 : svgY - 10,
                                  position: isNearTop ? 'below' : 'above',
                                  content: {
                                    date: match.date,
                                    scoreline: match.scoreline,
                                    goals: match.goals,
                                    type: 'weekday'
                                  }
                                });
                              }
                            }}
                            onMouseLeave={() => setTooltip({ visible: false, x: 0, y: 0, content: null })}
                          />
                        )}
                      </g>
                    );
                  })}
                </>
              )}
            </svg>
            
            {/* Custom Tooltip */}
            {tooltip.visible && tooltip.content && (
              <div 
                className={`graph-tooltip ${tooltip.content.isCancelled ? 'cancelled' : ''}`}
                style={{
                  left: tooltip.x,
                  top: tooltip.y,
                  transform: tooltip.position === 'below' ? 'translate(-50%, 0)' : 'translate(-50%, -100%)'
                }}
              >
                <div className="tooltip-date">{tooltip.content.date}</div>
                {tooltip.content.isCancelled ? (
                  <div className="tooltip-cancelled">❌ Cancelled</div>
                ) : (
                  <>
                    {tooltip.content.scoreline && Object.keys(tooltip.content.scoreline).length > 0 && (
                      <div className="tooltip-scoreline">
                        {Object.entries(tooltip.content.scoreline).map(([team, score], idx, arr) => (
                          <span key={team}>
                            <span className={`tooltip-team team-${team.toLowerCase()}`}>{score}</span>
                            {idx < arr.length - 1 && <span className="tooltip-separator">-</span>}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className={`tooltip-total ${tooltip.content.type}`}>
                      {tooltip.content.goals} goals
                    </div>
                  </>
                )}
              </div>
            )}
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
            {(stats.cancelledWeekday > 0 || stats.cancelledWeekend > 0) && (
              <div className="legend-item">
                <span className="legend-marker cancelled-legend">✕</span>
                <span className="legend-text">Cancelled</span>
              </div>
            )}
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
                      <th>Scoreline</th>
                    </tr>
                  </thead>
                  <tbody>
                    {graphData.weekday.map((match, i) => (
                      <tr key={i} className={match.isCancelled ? 'cancelled-row' : ''}>
                        <td>{i + 1}</td>
                        <td>{match.date}</td>
                        <td className="scoreline-cell">
                          {match.isCancelled ? (
                            <span className="cancelled-badge">Cancelled</span>
                          ) : match.scoreline && Object.keys(match.scoreline).length > 0 ? (
                            <div className="scoreline-display">
                              {Object.entries(match.scoreline).map(([team, score], idx, arr) => (
                                <span key={team} className="trends-score-wrapper">
                                  <span className={`team-score team-${team.toLowerCase()} ${idx === 0 ? 'team-1-score' : 'team-2-score'}`} title={team}>
                                    {score}
                                  </span>
                                  {idx < arr.length - 1 && <span className="score-separator">-</span>}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="no-score">-</span>
                          )}
                        </td>
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
                      <th>Scoreline</th>
                    </tr>
                  </thead>
                  <tbody>
                    {graphData.weekend.map((match, i) => (
                      <tr key={i} className={match.isCancelled ? 'cancelled-row' : ''}>
                        <td>{i + 1}</td>
                        <td>{match.date}</td>
                        <td className="scoreline-cell">
                          {match.isCancelled ? (
                            <span className="cancelled-badge">Cancelled</span>
                          ) : match.scoreline && Object.keys(match.scoreline).length > 0 ? (
                            <div className="scoreline-display">
                              {Object.entries(match.scoreline).map(([team, score], idx, arr) => (
                                <span key={team}>
                                  <span className={`team-score team-${team.toLowerCase()}`} title={team}>
                                    {score}
                                  </span>
                                  {idx < arr.length - 1 && <span className="score-separator">-</span>}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="no-score">-</span>
                          )}
                        </td>
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
      {enableScorersTrend && activeSubTab === "scorers-trend" && (
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

      {/* Scoring Diffs View */}
      {enableScoringDiffs && activeSubTab === "scoring-diffs" && (() => {
        // Use pre-computed data from weeklyDiffs
        const weekdayDiffsData = weeklyDiffs.weekdayData;
        const weekendDiffsData = weeklyDiffs.weekendData;
        const maxDiffMatches = Math.max(weekdayDiffsData.length, weekendDiffsData.length, 1);
        const maxDiff = Math.max(
          ...weekdayDiffsData.filter(d => !d.isCancelled).map(d => d.diff || 0),
          ...weekendDiffsData.filter(d => !d.isCancelled).map(d => d.diff || 0),
          5
        );
        
        const diffXScale = (index) => {
          if (maxDiffMatches === 1) return padding.left;
          return padding.left + ((index - 1) / (maxDiffMatches - 1)) * chartWidth;
        };
        const diffYScale = (diff) => padding.top + chartHeight - (diff / maxDiff) * chartHeight;
        
        const generateDiffPath = (matches) => {
          if (matches.length === 0) return "";
          // Only connect non-cancelled matches with lines
          const playedMatches = matches.filter(m => !m.isCancelled);
          if (playedMatches.length === 0) return "";
          const points = playedMatches.map((m) => `${diffXScale(m.index)},${diffYScale(m.diff)}`);
          return `M ${points.join(" L ")}`;
        };
        
        const diffYGridLines = [];
        for (let i = 0; i <= maxDiff; i++) {
          diffYGridLines.push(i);
        }
        
        return (
        <div className="scoring-diffs-section">
          <div className="scoring-diffs-summary">
            <div className="diff-stat-card">
              <span className="diff-stat-label">Avg Weekday Diff</span>
              <span className="diff-stat-value weekday">
                {(() => {
                  const played = weekdayDiffsData.filter(d => !d.isCancelled);
                  return played.length > 0
                    ? (played.reduce((sum, d) => sum + d.diff, 0) / played.length).toFixed(1)
                    : 0;
                })()}
              </span>
            </div>
            <div className="diff-stat-card">
              <span className="diff-stat-label">Avg Weekend Diff</span>
              <span className="diff-stat-value weekend">
                {(() => {
                  const played = weekendDiffsData.filter(d => !d.isCancelled);
                  return played.length > 0
                    ? (played.reduce((sum, d) => sum + d.diff, 0) / played.length).toFixed(1)
                    : 0;
                })()}
              </span>
            </div>
          </div>

          {/* Diffs Graph */}
          <div className="scoring-diffs-graph-container" ref={diffSvgRef}>
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="scoring-diffs-svg"
              preserveAspectRatio="xMidYMid meet"
              onMouseLeave={() => setDiffTooltip({ visible: false, x: 0, y: 0, content: null })}
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
              {diffYGridLines.map((value) => (
                <g key={value}>
                  <line
                    x1={padding.left}
                    y1={diffYScale(value)}
                    x2={svgWidth - padding.right}
                    y2={diffYScale(value)}
                    stroke="var(--border-color)"
                    strokeDasharray="4,4"
                    opacity="0.5"
                  />
                  <text
                    x={padding.left - 10}
                    y={diffYScale(value)}
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
              {Array.from({ length: maxDiffMatches }, (_, i) => {
                const matchNum = i + 1;
                if (maxDiffMatches > 10 && matchNum % Math.ceil(maxDiffMatches / 10) !== 0 && matchNum !== 1 && matchNum !== maxDiffMatches) {
                  return null;
                }
                return (
                  <text
                    key={i}
                    x={diffXScale(matchNum)}
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
                x={15}
                y={svgHeight / 2}
                textAnchor="middle"
                fill="var(--text-secondary)"
                fontSize="14"
                fontWeight="600"
                fontFamily="Outfit, sans-serif"
                transform={`rotate(-90, 15, ${svgHeight / 2})`}
              >
                Goal Difference
              </text>

              {/* Weekend Line */}
              {weekendDiffsData.length > 0 && (
                <>
                  <path
                    d={generateDiffPath(weekendDiffsData)}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="trend-line weekend-line"
                  />
                  {weekendDiffsData.map((match, i) => {
                    const cx = diffXScale(match.index);
                    const cy = diffYScale(match.diff);
                    const isCancelled = match.isCancelled;
                    return (
                      <g key={`diff-weekend-${i}`} className={`data-point-group ${isCancelled ? 'cancelled' : ''}`}>
                        {isCancelled ? (
                          // Cancelled match: X marker at bottom
                          <>
                            <line
                              x1={cx - 6}
                              y1={diffYScale(0) - 6}
                              x2={cx + 6}
                              y2={diffYScale(0) + 6}
                              stroke="#ef4444"
                              strokeWidth="3"
                              strokeLinecap="round"
                              className="cancelled-marker"
                            />
                            <line
                              x1={cx + 6}
                              y1={diffYScale(0) - 6}
                              x2={cx - 6}
                              y2={diffYScale(0) + 6}
                              stroke="#ef4444"
                              strokeWidth="3"
                              strokeLinecap="round"
                              className="cancelled-marker"
                            />
                            <circle
                              cx={cx}
                              cy={diffYScale(0)}
                              r="12"
                              fill="transparent"
                              style={{ cursor: 'pointer' }}
                              onMouseEnter={() => {
                                const rect = diffSvgRef.current?.getBoundingClientRect();
                                if (rect) {
                                  const svgX = (cx / svgWidth) * rect.width;
                                  const svgY = (diffYScale(0) / svgHeight) * rect.height;
                                  setDiffTooltip({
                                    visible: true,
                                    x: svgX,
                                    y: svgY - 10,
                                    position: 'above',
                                    content: { date: match.date, isCancelled: true, type: 'weekend' }
                                  });
                                }
                              }}
                              onMouseLeave={() => setDiffTooltip({ visible: false, x: 0, y: 0, content: null })}
                            />
                          </>
                        ) : (
                          <circle
                            cx={cx}
                            cy={cy}
                            r="7"
                            fill="#f59e0b"
                            stroke="var(--bg-card)"
                            strokeWidth="2"
                            className="data-point weekend-point"
                            style={{ cursor: 'pointer' }}
                            onMouseEnter={() => {
                              const rect = diffSvgRef.current?.getBoundingClientRect();
                              if (rect) {
                                const svgX = (cx / svgWidth) * rect.width;
                                const svgY = (cy / svgHeight) * rect.height;
                                // If point is in upper 30% of graph, show tooltip below
                                const isNearTop = svgY < rect.height * 0.3;
                                setDiffTooltip({
                                  visible: true,
                                  x: svgX,
                                  y: isNearTop ? svgY + 20 : svgY - 10,
                                  position: isNearTop ? 'below' : 'above',
                                  content: {
                                    date: match.date,
                                    scoreline: match.scoreline,
                                    diff: match.diff,
                                    type: 'weekend'
                                  }
                                });
                              }
                            }}
                            onMouseLeave={() => setDiffTooltip({ visible: false, x: 0, y: 0, content: null })}
                          />
                        )}
                      </g>
                    );
                  })}
                </>
              )}

              {/* Weekday Line */}
              {weekdayDiffsData.length > 0 && (
                <>
                  <path
                    d={generateDiffPath(weekdayDiffsData)}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="trend-line weekday-line"
                  />
                  {weekdayDiffsData.map((match, i) => {
                    const cx = diffXScale(match.index);
                    const cy = diffYScale(match.diff);
                    const isCancelled = match.isCancelled;
                    return (
                      <g key={`diff-weekday-${i}`} className={`data-point-group ${isCancelled ? 'cancelled' : ''}`}>
                        {isCancelled ? (
                          // Cancelled match: X marker at bottom
                          <>
                            <line
                              x1={cx - 6}
                              y1={diffYScale(0) - 6}
                              x2={cx + 6}
                              y2={diffYScale(0) + 6}
                              stroke="#ef4444"
                              strokeWidth="3"
                              strokeLinecap="round"
                              className="cancelled-marker"
                            />
                            <line
                              x1={cx + 6}
                              y1={diffYScale(0) - 6}
                              x2={cx - 6}
                              y2={diffYScale(0) + 6}
                              stroke="#ef4444"
                              strokeWidth="3"
                              strokeLinecap="round"
                              className="cancelled-marker"
                            />
                            <circle
                              cx={cx}
                              cy={diffYScale(0)}
                              r="12"
                              fill="transparent"
                              style={{ cursor: 'pointer' }}
                              onMouseEnter={() => {
                                const rect = diffSvgRef.current?.getBoundingClientRect();
                                if (rect) {
                                  const svgX = (cx / svgWidth) * rect.width;
                                  const svgY = (diffYScale(0) / svgHeight) * rect.height;
                                  setDiffTooltip({
                                    visible: true,
                                    x: svgX,
                                    y: svgY - 10,
                                    position: 'above',
                                    content: { date: match.date, isCancelled: true, type: 'weekday' }
                                  });
                                }
                              }}
                              onMouseLeave={() => setDiffTooltip({ visible: false, x: 0, y: 0, content: null })}
                            />
                          </>
                        ) : (
                          <circle
                            cx={cx}
                            cy={cy}
                            r="7"
                            fill="#3b82f6"
                            stroke="var(--bg-card)"
                            strokeWidth="2"
                            className="data-point weekday-point"
                            style={{ cursor: 'pointer' }}
                            onMouseEnter={() => {
                              const rect = diffSvgRef.current?.getBoundingClientRect();
                              if (rect) {
                                const svgX = (cx / svgWidth) * rect.width;
                                const svgY = (cy / svgHeight) * rect.height;
                                // If point is in upper 30% of graph, show tooltip below
                                const isNearTop = svgY < rect.height * 0.3;
                                setDiffTooltip({
                                  visible: true,
                                  x: svgX,
                                  y: isNearTop ? svgY + 20 : svgY - 10,
                                  position: isNearTop ? 'below' : 'above',
                                  content: {
                                    date: match.date,
                                    scoreline: match.scoreline,
                                    diff: match.diff,
                                    type: 'weekday'
                                  }
                                });
                              }
                            }}
                            onMouseLeave={() => setDiffTooltip({ visible: false, x: 0, y: 0, content: null })}
                          />
                        )}
                      </g>
                    );
                  })}
                </>
              )}
            </svg>
            
            {/* Custom Tooltip for Diffs */}
            {diffTooltip.visible && diffTooltip.content && (
              <div 
                className={`graph-tooltip ${diffTooltip.content.isCancelled ? 'cancelled' : ''}`}
                style={{
                  left: diffTooltip.x,
                  top: diffTooltip.y,
                  transform: diffTooltip.position === 'below' ? 'translate(-50%, 0)' : 'translate(-50%, -100%)'
                }}
              >
                <div className="tooltip-date">{diffTooltip.content.date}</div>
                {diffTooltip.content.isCancelled ? (
                  <div className="tooltip-cancelled">❌ Cancelled</div>
                ) : (
                  <>
                    {diffTooltip.content.scoreline && Object.keys(diffTooltip.content.scoreline).length > 0 && (
                      <div className="tooltip-scoreline">
                        {Object.entries(diffTooltip.content.scoreline).map(([team, score], idx, arr) => (
                          <span key={team}>
                            <span className={`tooltip-team team-${team.toLowerCase()}`}>{score}</span>
                            {idx < arr.length - 1 && <span className="tooltip-separator">-</span>}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className={`tooltip-total ${diffTooltip.content.type}`}>
                      Diff: {diffTooltip.content.diff}
                    </div>
                  </>
                )}
              </div>
            )}
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

          <div className="scoring-diffs-table-container">
            <table className="scoring-diffs-table">
              <thead>
                <tr>
                  <th>Week</th>
                  <th>
                    <span className="th-icon weekday-icon">📅</span>
                    Weekday
                  </th>
                  <th>
                    <span className="th-icon weekday-icon">📅</span>
                    Scoreline
                  </th>
                  <th>
                    <span className="th-icon weekday-icon">📅</span>
                    Diff
                  </th>
                  <th>
                    <span className="th-icon weekend-icon">🌅</span>
                    Weekend
                  </th>
                  <th>
                    <span className="th-icon weekend-icon">🌅</span>
                    Scoreline
                  </th>
                  <th>
                    <span className="th-icon weekend-icon">🌅</span>
                    Diff
                  </th>
                </tr>
              </thead>
              <tbody>
                {weeklyDiffs.data.map((week, i) => (
                  <tr key={week.weekKey} className={`${i % 2 === 0 ? "even" : "odd"} ${week.weekdayCancelled ? "weekday-cancelled" : ""} ${week.weekendCancelled ? "weekend-cancelled" : ""}`}>
                    <td className="week-cell">
                      <span className="week-number">W{week.weekNum}</span>
                    </td>
                    {/* Weekday */}
                    <td className={`date-cell ${week.weekdayCancelled ? 'cancelled-cell' : ''}`}>
                      {week.weekdayMatch ? week.weekdayMatch.date : "—"}
                    </td>
                    <td className={`scoreline-cell ${week.weekdayCancelled ? 'cancelled-cell' : ''}`}>
                      {week.weekdayCancelled ? (
                        <span className="cancelled-badge">Cancelled</span>
                      ) : week.weekdayMatch?.scoreline ? (
                        <div className="scoreline-display">
                          {Object.entries(week.weekdayMatch.scoreline).map(([team, score], idx, arr) => (
                            <span key={team}>
                              <span className={`team-score team-${team.toLowerCase()}`} title={team}>
                                {score}
                              </span>
                              {idx < arr.length - 1 && <span className="score-separator">-</span>}
                            </span>
                          ))}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className={`diff-cell ${week.weekdayCancelled ? 'cancelled-cell' : week.weekdayDiff !== null ? (week.weekdayDiff === 0 ? "draw" : week.weekdayDiff >= 3 ? "high" : "") : ""}`}>
                      {week.weekdayCancelled ? (
                        "—"
                      ) : week.weekdayDiff !== null ? (
                        <span className="diff-value">{week.weekdayDiff}</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    {/* Weekend */}
                    <td className={`date-cell ${week.weekendCancelled ? 'cancelled-cell' : ''}`}>
                      {week.weekendMatch ? week.weekendMatch.date : "—"}
                    </td>
                    <td className={`scoreline-cell ${week.weekendCancelled ? 'cancelled-cell' : ''}`}>
                      {week.weekendCancelled ? (
                        <span className="cancelled-badge">Cancelled</span>
                      ) : week.weekendMatch?.scoreline ? (
                        <div className="scoreline-display">
                          {Object.entries(week.weekendMatch.scoreline).map(([team, score], idx, arr) => (
                            <span key={team}>
                              <span className={`team-score team-${team.toLowerCase()}`} title={team}>
                                {score}
                              </span>
                              {idx < arr.length - 1 && <span className="score-separator">-</span>}
                            </span>
                          ))}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className={`diff-cell ${week.weekendCancelled ? 'cancelled-cell' : week.weekendDiff !== null ? (week.weekendDiff === 0 ? "draw" : week.weekendDiff >= 3 ? "high" : "") : ""}`}>
                      {week.weekendCancelled ? (
                        "—"
                      ) : week.weekendDiff !== null ? (
                        <span className="diff-value">{week.weekendDiff}</span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
                {weeklyDiffs.data.length === 0 && (
                  <tr>
                    <td colSpan={7} className="no-data">No match data available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Legend for Scoring Diffs */}
          <div className="scoring-diffs-legend">
            <div className="legend-item">
              <span className="legend-color draw"></span>
              <span>Draw (0 diff)</span>
            </div>
            <div className="legend-item">
              <span className="legend-color high-diff"></span>
              <span>High diff (3+)</span>
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
};
