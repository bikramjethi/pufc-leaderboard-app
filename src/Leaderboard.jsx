import { useState, useMemo } from "react";
import { Row } from "./Row.jsx";

const columns = [
  { key: "name", label: "Player", className: "player-col", sortable: true },
  { key: "position", label: "Pos", className: "position-col", sortable: true },
  { key: "wins", label: "W", className: "stat-col", sortable: true },
  { key: "draws", label: "D", className: "stat-col", sortable: true },
  { key: "losses", label: "L", className: "stat-col", sortable: true },
  { key: "cleanSheets", label: "CS", className: "stat-col", sortable: true },
  { key: "goals", label: "G", className: "stat-col", sortable: true },
  { key: "hatTricks", label: "HT", className: "stat-col", sortable: true },
];

export const Leaderboard = ({ players }) => {
  const [sortKey, setSortKey] = useState("wins");
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

  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
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
  }, [players, sortKey, sortDirection]);

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
              <Row key={player.id} player={player} rank={index + 1} />
            ))}
          </tbody>
        </table>
      </div>

      <div className="legend">
        <span><strong>W</strong> Wins</span>
        <span><strong>D</strong> Draws</span>
        <span><strong>L</strong> Losses</span>
        <span><strong>CS</strong> Clean Sheets</span>
        <span><strong>G</strong> Goals</span>
        <span><strong>HT</strong> Hat Tricks</span>
      </div>
    </div>
  );
};
