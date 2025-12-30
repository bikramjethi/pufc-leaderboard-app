import React, { useMemo } from "react";
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

  // Group players by category - must be called before early return
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
    return groups;
  }, [data]);

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

  // Category order
  const categoryOrder = ["ALL", "WEEKEND", "MIDWEEK", "Others"];

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
        <h2>Attendance Summary {summary.season} - Total {summary.totalGames} Games Played</h2>
      </div>

      {/* Table Container */}
      <div className="attendance-leaderboard-table-container">
        <table className="attendance-leaderboard-table">
          <thead>
            <tr>
              <th className="category-col">Category</th>
              <th className="sno-col">S.no</th>
              <th className="name-col">Names</th>
              <th className="stat-col">
                MIDWEEK - {summary.midweekGames} Games Played
              </th>
              <th className="stat-col">
                WEEKEND - {summary.weekendGames} Games Played
              </th>
              <th className="stat-col">
                Total Games Played - {summary.totalGames}
              </th>
              <th className="stat-col">% of MIDWEEK Games Played</th>
              <th className="stat-col">% of WEEKEND Games Played</th>
              <th className="stat-col">% of Total Games Played</th>
              <th className="stat-col">Games Played in 2024</th>
              <th className="stat-col">Difference</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              let globalRowIndex = 0;
              return categoryOrder.map((category) => {
                const categoryPlayers = groupedPlayers[category] || [];
                if (categoryPlayers.length === 0) return null;

                return (
                  <React.Fragment key={category}>
                    {categoryPlayers.map((player, idx) => {
                      const isEven = globalRowIndex % 2 === 0;
                      globalRowIndex++;
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
                          <td className="sno-col">{player.sno}</td>
                          <td className="name-col">{player.name}</td>
                          <td className="stat-col">{player.midweekGames}</td>
                          <td className="stat-col">{player.weekendGames}</td>
                          <td className="stat-col">{player.totalGames}</td>
                          <td
                            className={`stat-col pct-col ${getPercentageClass(
                              player.midweekPercentage
                            )}`}
                          >
                            {player.midweekPercentage}%
                          </td>
                          <td
                            className={`stat-col pct-col ${getPercentageClass(
                              player.weekendPercentage
                            )}`}
                          >
                            {player.weekendPercentage}%
                          </td>
                          <td
                            className={`stat-col pct-col ${getPercentageClass(
                              player.totalPercentage
                            )}`}
                          >
                            {player.totalPercentage}%
                          </td>
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
            })()}
          </tbody>
        </table>
      </div>
    </div>
  );
};

