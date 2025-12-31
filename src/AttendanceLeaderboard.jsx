import React, { useMemo, useState } from "react";
import attendanceLeaderboardData2025 from "./data/attendance-data/leaderboard/2025.json";
import attendanceLeaderboardData2026 from "./data/attendance-data/leaderboard/2026.json";

const attendanceLeaderboardDataByYear = {
  2025: attendanceLeaderboardData2025,
  // Only include 2026 if it has valid data structure
  ...(attendanceLeaderboardData2026 && 
      attendanceLeaderboardData2026.summary && 
      attendanceLeaderboardData2026.players && 
      { 2026: attendanceLeaderboardData2026 }),
};

export const AttendanceLeaderboard = ({ year = "2025" }) => {
  const yearKey = String(year);
  const data = attendanceLeaderboardDataByYear[yearKey];
  
  // Sorting state
  const [sortKey, setSortKey] = useState("totalGames");
  const [sortDirection, setSortDirection] = useState("desc");

  // Calculate percentages dynamically - must be defined before useMemo
  const calculatePercentages = (player, summary) => {
    const midweekPercentage = summary.midweekGames > 0
      ? Math.round((player.midweekGames / summary.midweekGames) * 100)
      : 0;
    
    const weekendPercentage = summary.weekendGames > 0
      ? Math.round((player.weekendGames / summary.weekendGames) * 100)
      : 0;
    
    const totalPercentage = summary.totalGames > 0
      ? Math.round((player.totalGames / summary.totalGames) * 100)
      : 0;
    
    return { midweekPercentage, weekendPercentage, totalPercentage };
  };

  // Check if user has applied a custom sort (not the default)
  const isDefaultSort = sortKey === "totalGames" && sortDirection === "desc";

  // Sort all players together (not by category) - must be called before early return
  const sortedPlayers = useMemo(() => {
    if (!data || !data.players || data.players.length === 0 || !data.summary) {
      return [];
    }

    const { summary } = data;

    // Create a copy of all players with calculated percentages
    const playersWithCalculations = data.players.map((player) => {
      const percentages = calculatePercentages(player, summary);
      return {
        ...player,
        calculatedMidweekPercentage: percentages.midweekPercentage,
        calculatedWeekendPercentage: percentages.weekendPercentage,
        calculatedTotalPercentage: percentages.totalPercentage,
      };
    });

    // Sort all players together
    return [...playersWithCalculations].sort((a, b) => {
      // Always put player with name "Others" at the bottom
      if (a.name === "Others" && b.name !== "Others") return 1;
      if (b.name === "Others" && a.name !== "Others") return -1;
      if (a.name === "Others" && b.name === "Others") return 0;

      let aVal, bVal;

      // Handle different sort keys
      switch (sortKey) {
        case "name":
          aVal = a.name;
          bVal = b.name;
          break;
        case "category":
          aVal = a.category;
          bVal = b.category;
          break;
        case "midweekGames":
          aVal = a.midweekGames;
          bVal = b.midweekGames;
          break;
        case "weekendGames":
          aVal = a.weekendGames;
          bVal = b.weekendGames;
          break;
        case "totalGames":
          aVal = a.totalGames;
          bVal = b.totalGames;
          break;
        case "midweekPercentage":
          aVal = a.calculatedMidweekPercentage;
          bVal = b.calculatedMidweekPercentage;
          break;
        case "weekendPercentage":
          aVal = a.calculatedWeekendPercentage;
          bVal = b.calculatedWeekendPercentage;
          break;
        case "totalPercentage":
          aVal = a.calculatedTotalPercentage;
          bVal = b.calculatedTotalPercentage;
          break;
        case "games2024":
          // Handle null values - put them at the end
          if (a.games2024 === null && b.games2024 === null) return 0;
          if (a.games2024 === null) return 1;
          if (b.games2024 === null) return -1;
          aVal = a.games2024;
          bVal = b.games2024;
          break;
        case "difference":
          // Handle null values - put them at the end
          if (a.difference === null && b.difference === null) return 0;
          if (a.difference === null) return 1;
          if (b.difference === null) return -1;
          aVal = a.difference;
          bVal = b.difference;
          break;
        default:
          aVal = a[sortKey];
          bVal = b[sortKey];
      }

      // Handle string comparison
      if (typeof aVal === "string") {
        const comparison = aVal.localeCompare(bVal);
        return sortDirection === "asc" ? comparison : -comparison;
      }

      // Handle numeric comparison
      return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
    });
  }, [data, sortKey, sortDirection]);

  // Group players by category for default categorical view
  // Sort players within each category, putting "Others" name at bottom
  const groupedPlayers = useMemo(() => {
    if (!data || !data.players || data.players.length === 0) {
      return {};
    }
    const groups = {};
    data.players.forEach((player) => {
      if (!groups[player.category]) {
        groups[player.category] = [];
      }
      groups[player.category].push(player);
    });
    
    // Sort players within each category, putting player named "Others" at bottom
    Object.keys(groups).forEach((category) => {
      groups[category].sort((a, b) => {
        if (a.name === "Others" && b.name !== "Others") return 1;
        if (b.name === "Others" && a.name !== "Others") return -1;
        return 0; // Keep original order for other players
      });
    });
    
    return groups;
  }, [data]);

  // Calculate top 3 values for totalGames column only
  // Exclude player named "Others" from top 3 calculations
  const topValues = useMemo(() => {
    if (!sortedPlayers || sortedPlayers.length === 0 || !data?.summary) {
      return {};
    }

    // Filter out player named "Others" from calculations
    const playersForTopValues = sortedPlayers.filter((p) => p.name !== "Others");

    // Only calculate top 3 for totalGames
    const values = playersForTopValues.map((player) => player.totalGames ?? 0);
    
    // Filter out invalid values and get unique sorted values
    const validValues = values.filter(v => v !== null && v !== undefined && (typeof v === "number" && !isNaN(v)));
    
    if (validValues.length === 0) {
      return { totalGames: { first: null, second: null, third: null } };
    }

    // Get unique values and sort (higher is better)
    const uniqueSorted = [...new Set(validValues)].sort((a, b) => b - a);
    const top3 = uniqueSorted.slice(0, 3);
    
    return {
      totalGames: {
        first: top3[0] ?? null,
        second: top3[1] ?? null,
        third: top3[2] ?? null
      }
    };
  }, [sortedPlayers, data]);

  // Get trophy emoji for totalGames value only
  // Exclude player named "Others" from medals
  const getTrophyEmoji = (value, playerName) => {
    if (!topValues.totalGames || playerName === "Others") return null;
    
    const { first, second, third } = topValues.totalGames;
    
    // Exact match for totalGames
    if (first !== null && value === first) return "🥇";
    if (second !== null && value === second) return "🥈";
    if (third !== null && value === third) return "🥉";
    
    return null;
  };

  // Category order for default view - handle both "ALL" and "ALLGAMES"
  const categoryOrder = ["ALL", "ALLGAMES", "WEEKEND", "MIDWEEK", "Others"];

  if (!data || !data.summary || !data.players || data.players.length === 0) {
    return (
      <div className="attendance-leaderboard">
        <div className="attendance-no-data">
          <p>No data available for {year}</p>
        </div>
      </div>
    );
  }

  const { summary } = data;

  // Handle sorting
  const handleSort = (key) => {
    if (sortKey === key) {
      // Toggle direction if same column
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // New column: default to desc for numeric, asc for text
      setSortKey(key);
      setSortDirection(key === "name" || key === "category" ? "asc" : "desc");
    }
  };

  // Get sort indicator
  const getSortIndicator = (key) => {
    if (sortKey !== key) return <span className="sort-indicator">⇅</span>;
    return (
      <span className="sort-indicator active">
        {sortDirection === "asc" ? "↑" : "↓"}
      </span>
    );
  };

  // Format difference value
  const formatDifference = (player) => {
    if (player.difference === null) {
      return player.notes || "—";
    }
    if (player.difference > 0) {
      return `+${player.difference}`;
    }
    return player.difference.toString();
  };

  // Get difference class for styling
  const getDifferenceClass = (player) => {
    if (player.difference === null) return "";
    if (player.difference > 0) return "diff-positive";
    if (player.difference < 0) return "diff-negative";
    return "diff-neutral";
  };

  // Get percentage class for styling
  const getPercentageClass = (percentage) => {
    if (percentage >= 80) return "pct-high";
    if (percentage >= 50) return "pct-medium";
    return "pct-low";
  };

  return (
    <div className="attendance-leaderboard">
      {/* Summary Header */}
      <div className="attendance-leaderboard-header">
        <h2>Attendance Summary {summary.season}</h2>
        <div className="attendance-leaderboard-stats">
          <span>Total: {summary.totalGames} games</span>
          <span>Midweek: {summary.midweekGames}</span>
          <span>Weekend: {summary.weekendGames}</span>
        </div>
      </div>

      {/* Table Container */}
      <div className="attendance-leaderboard-table-container">
        <table className="attendance-leaderboard-table">
          <thead>
            <tr>
              <th 
                className={`category-col sortable ${sortKey === "category" ? "sorted" : ""}`}
                title="Category"
                onClick={() => handleSort("category")}
              >
                <span className="th-content">
                  Category
                  {getSortIndicator("category")}
                </span>
              </th>
              <th className="sno-col">#</th>
              <th 
                className={`name-col sortable ${sortKey === "name" ? "sorted" : ""}`}
                title="Player Name"
                onClick={() => handleSort("name")}
              >
                <span className="th-content">
                  Player
                  {getSortIndicator("name")}
                </span>
              </th>
              <th 
                className={`stat-col sortable ${sortKey === "midweekGames" ? "sorted" : ""}`}
                title="Midweek Games"
                onClick={() => handleSort("midweekGames")}
              >
                <span className="th-content">
                  MW
                  {getSortIndicator("midweekGames")}
                </span>
              </th>
              <th 
                className={`stat-col sortable ${sortKey === "weekendGames" ? "sorted" : ""}`}
                title="Weekend Games"
                onClick={() => handleSort("weekendGames")}
              >
                <span className="th-content">
                  WE
                  {getSortIndicator("weekendGames")}
                </span>
              </th>
              <th 
                className={`stat-col sortable ${sortKey === "totalGames" ? "sorted" : ""}`}
                title="Total Games"
                onClick={() => handleSort("totalGames")}
              >
                <span className="th-content">
                  Total
                  {getSortIndicator("totalGames")}
                </span>
              </th>
              <th 
                className={`stat-col sortable ${sortKey === "midweekPercentage" ? "sorted" : ""}`}
                title="% of Midweek Games"
                onClick={() => handleSort("midweekPercentage")}
              >
                <span className="th-content">
                  %MW
                  {getSortIndicator("midweekPercentage")}
                </span>
              </th>
              <th 
                className={`stat-col sortable ${sortKey === "weekendPercentage" ? "sorted" : ""}`}
                title="% of Weekend Games"
                onClick={() => handleSort("weekendPercentage")}
              >
                <span className="th-content">
                  %WE
                  {getSortIndicator("weekendPercentage")}
                </span>
              </th>
              <th 
                className={`stat-col sortable ${sortKey === "totalPercentage" ? "sorted" : ""}`}
                title="% of Total Games"
                onClick={() => handleSort("totalPercentage")}
              >
                <span className="th-content">
                  %Total
                  {getSortIndicator("totalPercentage")}
                </span>
              </th>
              <th 
                className={`stat-col sortable ${sortKey === "games2024" ? "sorted" : ""}`}
                title="Games Played in 2024"
                onClick={() => handleSort("games2024")}
              >
                <span className="th-content">
                  2024
                  {getSortIndicator("games2024")}
                </span>
              </th>
              <th 
                className={`stat-col sortable ${sortKey === "difference" ? "sorted" : ""}`}
                title="Difference from 2024"
                onClick={() => handleSort("difference")}
              >
                <span className="th-content">
                  Diff
                  {getSortIndicator("difference")}
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {isDefaultSort ? (
              // Default categorical view
              (() => {
                let globalRowIndex = 0;
                return categoryOrder.map((category) => {
                  const categoryPlayers = groupedPlayers[category] || [];
                  if (categoryPlayers.length === 0) return null;

                  return (
                    <React.Fragment key={category}>
                      {categoryPlayers.map((player, idx) => {
                        globalRowIndex++;
                        const isEven = (globalRowIndex - 1) % 2 === 0;
                        return (
                          <tr
                            key={player.sno}
                            className={`player-row ${isEven ? "even" : "odd"}`}
                          >
                            {idx === 0 && (
                              <td
                                className="category-col"
                                rowSpan={categoryPlayers.length}
                              >
                                {category}
                              </td>
                            )}
                            <td className="sno-col">{globalRowIndex}</td>
                            <td className="name-col">{player.name}</td>
                            <td className="stat-col">{player.midweekGames}</td>
                            <td className="stat-col">{player.weekendGames}</td>
                            <td className="stat-col">
                              {player.totalGames}
                              {getTrophyEmoji(player.totalGames, player.name) && (
                                <span className="trophy-emoji">
                                  {getTrophyEmoji(player.totalGames, player.name)}
                                </span>
                              )}
                            </td>
                            {(() => {
                              const percentages = calculatePercentages(player, summary);
                              return (
                                <>
                                  <td
                                    className={`stat-col pct-col ${getPercentageClass(
                                      percentages.midweekPercentage
                                    )}`}
                                  >
                                    {percentages.midweekPercentage}%
                                  </td>
                                  <td
                                    className={`stat-col pct-col ${getPercentageClass(
                                      percentages.weekendPercentage
                                    )}`}
                                  >
                                    {percentages.weekendPercentage}%
                                  </td>
                                  <td
                                    className={`stat-col pct-col ${getPercentageClass(
                                      percentages.totalPercentage
                                    )}`}
                                  >
                                    {percentages.totalPercentage}%
                                  </td>
                                </>
                              );
                            })()}
                            <td className="stat-col games2024-col">
                              {player.games2024 === null ? (
                                player.notes && player.notes.toLowerCase().includes("injured") ? (
                                  <span className="injured-player-emoji" title={player.notes || "Injured"}>
                                    {"🏥"}
                                  </span>
                                ) : (
                                  <span className="new-player-emoji" title={player.notes || "New Player"}>
                                    {"🆕"}
                                  </span>
                                )
                              ) : (
                                player.games2024
                              )}
                            </td>
                            <td
                              className={`stat-col diff-col ${getDifferenceClass(
                                player
                              )}`}
                            >
                              {formatDifference(player)}
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                });
              })()
            ) : (
              // Sorted flat view
              sortedPlayers.map((player, index) => {
                const isEven = index % 2 === 0;
                return (
                  <tr
                    key={player.sno}
                    className={`player-row ${isEven ? "even" : "odd"}`}
                  >
                    <td className="category-col">{player.category}</td>
                    <td className="sno-col">{index + 1}</td>
                    <td className="name-col">{player.name}</td>
                    <td className="stat-col">{player.midweekGames}</td>
                    <td className="stat-col">{player.weekendGames}</td>
                    <td className="stat-col">
                      {player.totalGames}
                      {getTrophyEmoji(player.totalGames, player.name) && (
                        <span className="trophy-emoji">
                          {getTrophyEmoji(player.totalGames, player.name)}
                        </span>
                      )}
                    </td>
                    {(() => {
                      const percentages = calculatePercentages(player, summary);
                      return (
                        <>
                          <td
                            className={`stat-col pct-col ${getPercentageClass(
                              percentages.midweekPercentage
                            )}`}
                          >
                            {percentages.midweekPercentage}%
                          </td>
                          <td
                            className={`stat-col pct-col ${getPercentageClass(
                              percentages.weekendPercentage
                            )}`}
                          >
                            {percentages.weekendPercentage}%
                          </td>
                          <td
                            className={`stat-col pct-col ${getPercentageClass(
                              percentages.totalPercentage
                            )}`}
                          >
                            {percentages.totalPercentage}%
                          </td>
                        </>
                      );
                    })()}
                    <td className="stat-col games2024-col">
                      {player.games2024 === null ? (
                        player.notes && player.notes.toLowerCase().includes("injured") ? (
                          <span className="injured-player-emoji" title={player.notes || "Injured"}>
                            {"🏥"}
                          </span>
                        ) : (
                          <span className="new-player-emoji" title={player.notes || "New Player"}>
                            {"🆕"}
                          </span>
                        )
                      ) : (
                        player.games2024
                      )}
                    </td>
                    <td
                      className={`stat-col diff-col ${getDifferenceClass(
                        player
                      )}`}
                    >
                      {formatDifference(player)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

