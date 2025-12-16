import { useState, useMemo, useEffect } from "react";
import { Row } from "./Row.jsx";
import { ComparePanel } from "./ComparePanel.jsx";
import { config } from "./leaderboard-config.js";

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
  const [sortKey, setSortKey] = useState(config.DEFAULT_SORT_KEY);
  const [sortDirection, setSortDirection] = useState(config.DEFAULT_SORT_DIR);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPlayers, setSelectedPlayers] = useState([]);

  const handlePlayerSelect = (player) => {
    if (!config.ENABLE_COMPARISON) return;
    
    setSelectedPlayers((prev) => {
      const isSelected = prev.some((p) => p.id === player.id);
      if (isSelected) {
        return prev.filter((p) => p.id !== player.id);
      }
      if (prev.length >= config.MAX_COMPARE_PLAYERS) {
        return [prev[1], player]; // Replace oldest selection
      }
      return [...prev, player];
    });
  };

  const clearComparison = () => setSelectedPlayers([]);

  // Clear selection when players data changes (season switch)
  useEffect(() => {
    setSelectedPlayers([]);
  }, [players]);

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

  // Filter players by search term
  const filteredPlayers = useMemo(() => {
    if (!searchTerm.trim()) return playersWithPct;
    const term = searchTerm.toLowerCase();
    return playersWithPct.filter(
      (player) =>
        player.name.toLowerCase().includes(term) ||
        player.position.toLowerCase().includes(term)
    );
  }, [playersWithPct, searchTerm]);

  const sortedPlayers = useMemo(() => {
    return [...filteredPlayers].sort((a, b) => {
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
  }, [filteredPlayers, sortKey, sortDirection]);

  // Calculate max values for each stat column
  const maxValues = useMemo(() => {
    const statKeys = ["matches", "wins", "draws", "losses", "winPct", "lossPct", "cleanSheets", "goals", "hatTricks"];
    const maxes = {};
    statKeys.forEach((key) => {
      const values = playersWithPct.map((p) => p[key] ?? 0);
      maxes[key] = values.length > 0 ? Math.max(...values) : 0;
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
      {config.ENABLE_SEARCH && (
        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="Search players..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="search-clear" onClick={() => setSearchTerm("")}>
              ✕
            </button>
          )}
        </div>
      )}
      <div className="table-container">
        <table className="leaderboard-table">
          <thead>
            <tr>
              {config.ENABLE_COMPARISON && <th className="select-col"></th>}
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
              <Row
                key={player.id}
                player={player}
                rank={index + 1}
                maxValues={maxValues}
                showHighlight={config.ENABLE_MAX_HIGHLIGHT}
                showCheckbox={config.ENABLE_COMPARISON}
                isSelected={selectedPlayers.some((p) => p.id === player.id)}
                onSelect={() => handlePlayerSelect(player)}
              />
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

      {config.ENABLE_COMPARISON && selectedPlayers.length === config.MAX_COMPARE_PLAYERS && (
        <ComparePanel
          player1={selectedPlayers[0]}
          player2={selectedPlayers[1]}
          onClose={clearComparison}
        />
      )}
    </div>
  );
};
