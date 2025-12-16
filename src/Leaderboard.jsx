import { useState, useMemo } from "react";
import { Row } from "./Row.jsx";

const columns = [
  { key: "name", label: "Player", className: "player-col", sortable: true },
  { key: "position", label: "Pos", className: "position-col", sortable: true },
  { key: "matches", label: "MP", className: "stat-col", sortable: true },
  { key: "wins", label: "W", className: "stat-col", sortable: true },
  { key: "draws", label: "D", className: "stat-col", sortable: true },
  { key: "losses", label: "L", className: "stat-col", sortable: true },
  { key: "winPct", label: "W%", className: "stat-col", sortable: true },
  { key: "lossPct", label: "L%", className: "stat-col", sortable: true },
  { key: "cleanSheets", label: "CS", className: "stat-col", sortable: true },
  { key: "goals", label: "G", className: "stat-col", sortable: true },
  { key: "hatTricks", label: "HT", className: "stat-col", sortable: true },
];

// Helper to calculate percentages
const calcPercentages = (player) => {
  const total = player.wins + player.draws + player.losses;
  return {
    ...player,
    winPct: total > 0 ? (player.wins / total) * 100 : 0,
    lossPct: total > 0 ? (player.losses / total) * 100 : 0,
  };
};

export const Leaderboard = ({ players }) => {
  const [sortKey, setSortKey] = useState("matches");
  const [sortDirection, setSortDirection] = useState("desc");

  const handleSort = (key) => {
    if (sortKey === key) {
      // Toggle direction if same column
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // New column: default to desc for numeric, asc for text
      setSortKey(key);
      setSortDirection(key === "name" ? "asc" : "desc");
    }
  };

  // Add calculated percentages to players
  const playersWithPct = useMemo(() => {
    return players.map(calcPercentages);
  }, [players]);

  const sortedPlayers = useMemo(() => {
    return [...playersWithPct].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      // Handle string comparison (name, position)
      if (typeof aVal === "string") {
        const comparison = aVal.localeCompare(bVal);
        return sortDirection === "asc" ? comparison : -comparison;
      }

      // Handle numeric comparison
      return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
    });
  }, [playersWithPct, sortKey, sortDirection]);

  // Calculate max values for each stat column
  const maxValues = useMemo(() => {
    const statKeys = ["matches", "wins", "draws", "losses", "winPct", "lossPct", "cleanSheets", "goals", "hatTricks"];
    const maxes = {};
    statKeys.forEach((key) => {
      maxes[key] = Math.max(...playersWithPct.map((p) => p[key]));
    });
    return maxes;
  }, [playersWithPct]);

  const getSortIndicator = (key) => {
    if (sortKey !== key) return <span className="sort-indicator">⇅</span>;
    return (
      <span className="sort-indicator active">
        {sortDirection === "asc" ? "↑" : "↓"}
      </span>
    );
  };

  return (
    <div className="leaderboard">
      <div className="table-container">
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th className="rank-col">#</th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`${col.className} ${col.sortable ? "sortable" : ""} ${sortKey === col.key ? "sorted" : ""}`}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <span className="th-content">
                    {col.label}
                    {col.sortable && getSortIndicator(col.key)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedPlayers.map((player, index) => (
              <Row key={player.id} player={player} rank={index + 1} maxValues={maxValues} />
            ))}
          </tbody>
        </table>
      </div>

      <div className="legend">
        <span><strong>MP</strong> Matches Played</span>
        <span><strong>W</strong> Wins</span>
        <span><strong>D</strong> Draws</span>
        <span><strong>L</strong> Losses</span>
        <span><strong>W%</strong> Win Rate</span>
        <span><strong>L%</strong> Loss Rate</span>
        <span><strong>CS</strong> Clean Sheets</span>
        <span><strong>G</strong> Goals</span>
        <span><strong>HT</strong> Hat Tricks</span>
        <span className="legend-divider"></span>
        <span className="legend-highlight"><strong className="highlight-sample">123</strong> Max</span>
      </div>
    </div>
  );
};
