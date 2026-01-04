import { useState, useMemo, useEffect } from "react";
import { Row } from "./Row.jsx";
import { ComparePanel } from "./ComparePanel.jsx";
import { PlayerModal } from "./PlayerModal.jsx";
import { config } from "./leaderboard-config.js";
import { tickerMessages } from "./ticker-messages.js";

const columns = [
  { key: "name", label: "Player", className: "player-col", sortable: true, tooltip: "Player Name" },
  { key: "position", label: "Pos", className: "position-col", sortable: true, tooltip: "Playing Position" },
  { key: "matches", label: "MP", className: "stat-col", sortable: true, tooltip: "Matches Played" },
  { key: "wins", label: "W", className: "stat-col", sortable: true, tooltip: "Total Wins" },
  { key: "draws", label: "D", className: "stat-col", sortable: true, tooltip: "Total Draws" },
  { key: "losses", label: "L", className: "stat-col", sortable: true, tooltip: "Total Losses" },
  { key: "winPct", label: "W%", className: "stat-col", sortable: true, tooltip: "Win Percentage" },
  { key: "lossPct", label: "L%", className: "stat-col", sortable: true, tooltip: "Loss Percentage" },
  { key: "cleanSheets", label: "CS", className: "stat-col", sortable: true, tooltip: "Clean Sheets" },
  { key: "goals", label: "G", className: "stat-col", sortable: true, tooltip: "Goals Scored" },
  { key: "hatTricks", label: "HT", className: "stat-col", sortable: true, tooltip: "Hat Tricks" },
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

export const Leaderboard = ({ players, allSeasonData, isAllTime = false, selectedYear = null }) => {
  const [sortKey, setSortKey] = useState(config.DEFAULT_SORT_KEY);
  const [sortDirection, setSortDirection] = useState(config.DEFAULT_SORT_DIR);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [modalPlayer, setModalPlayer] = useState(null);

  const handlePlayerClick = (player) => {
    if (config.ENABLE_PLAYER_MODAL) {
      setModalPlayer(player);
    }
  };

  const closeModal = () => setModalPlayer(null);

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
      // Always put "Others" at the bottom
      if (a.name === "Others" && b.name !== "Others") return 1;
      if (b.name === "Others" && a.name !== "Others") return -1;
      if (a.name === "Others" && b.name === "Others") return 0;

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

  // Calculate top 3 values per column (capped at 3 highlights max)
  // Exclude "Others" from top 3 calculations
  const topValues = useMemo(() => {
    // Filter out "Others" player from calculations
    const playersForTopValues = playersWithPct.filter((p) => p.name !== "Others");
    
    // Higher is better for these stats
    const higherIsBetter = ["matches", "wins", "draws", "winPct", "cleanSheets", "goals", "hatTricks"];
    // Lower is better for these stats
    const lowerIsBetter = ["losses", "lossPct"];
    
    const tops = {};
    
    // Process "higher is better" stats
    higherIsBetter.forEach((key) => {
      const values = playersForTopValues.map((p) => p[key] ?? 0);
      const uniqueSorted = [...new Set(values)].sort((a, b) => b - a); // descending
      const top3Values = uniqueSorted.slice(0, 3);
      
      let count = 0;
      tops[key] = { first: null, second: null, third: null };
      
      for (let i = 0; i < top3Values.length && count < 3; i++) {
        const val = top3Values[i];
        if (val <= 0) continue;
        
        const playersWithVal = values.filter(v => 
          (key === "winPct") ? Math.round(v) === Math.round(val) : v === val
        ).length;
        
        if (i === 0) {
          tops[key].first = val;
          count += playersWithVal;
        } else if (i === 1 && count < 3) {
          tops[key].second = val;
          count += playersWithVal;
        } else if (i === 2 && count < 3) {
          tops[key].third = val;
          count += playersWithVal;
        }
        
        if (count > 3 && i > 0) {
          if (i === 1) tops[key].second = null;
          if (i === 2) tops[key].third = null;
          break;
        }
      }
    });
    
    // Process "lower is better" stats (losses, lossPct)
    lowerIsBetter.forEach((key) => {
      const defaultVal = key === "lossPct" ? 100 : 999;
      const values = playersForTopValues.map((p) => p[key] ?? defaultVal);
      const uniqueSorted = [...new Set(values)].sort((a, b) => a - b); // ascending (lower is better)
      const top3Values = uniqueSorted.slice(0, 3);
      
      let count = 0;
      tops[key] = { first: null, second: null, third: null };
      
      for (let i = 0; i < top3Values.length && count < 3; i++) {
        const val = top3Values[i];
        
        const playersWithVal = values.filter(v => 
          (key === "lossPct") ? Math.round(v) === Math.round(val) : v === val
        ).length;
        
        if (i === 0) {
          tops[key].first = val;
          count += playersWithVal;
        } else if (i === 1 && count < 3) {
          tops[key].second = val;
          count += playersWithVal;
        } else if (i === 2 && count < 3) {
          tops[key].third = val;
          count += playersWithVal;
        }
        
        if (count > 3 && i > 0) {
          if (i === 1) tops[key].second = null;
          if (i === 2) tops[key].third = null;
          break;
        }
      }
    });
    
    return tops;
  }, [playersWithPct]);

  const getSortIndicator = (key) => {
    if (sortKey !== key) return <span className="sort-indicator">⇅</span>;
    return (
      <span className="sort-indicator active">
        {sortDirection === "asc" ? "↑" : "↓"}
      </span>
    );
  };

  // Shuffle ticker messages randomly (once on mount)
  const shuffledMessages = useMemo(() => {
    const shuffled = [...tickerMessages];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, []);

  return (
    <div className="leaderboard">
      {/* News Ticker */}
      {config.ENABLE_TICKER && shuffledMessages.length > 0 && (
        <div className="news-ticker">
          <div className="ticker-label">
            <span className="ticker-label-text">EXTRA TIME</span>
          </div>
          <div className="ticker-wrapper">
            <div className="ticker-content">
              {/* First set of messages */}
              {shuffledMessages.map((msg, idx) => (
                <span key={`a-${idx}`} className="ticker-item">
                  <span className="ticker-bullet">▸</span>
                  <span className="ticker-text">{msg}</span>
                </span>
              ))}
              {/* Duplicate for seamless loop */}
              {shuffledMessages.map((msg, idx) => (
                <span key={`b-${idx}`} className="ticker-item">
                  <span className="ticker-bullet">▸</span>
                  <span className="ticker-text">{msg}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

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
                  className={`${col.className} ${col.sortable ? "sortable" : ""} ${sortKey === col.key ? "sorted" : ""} ${col.tooltip ? "has-tooltip" : ""}`}
                  onClick={() => col.sortable && handleSort(col.key)}
                  data-tooltip={col.tooltip}
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
                topValues={topValues}
                showHighlight={config.ENABLE_MAX_HIGHLIGHT}
                showCheckbox={config.ENABLE_COMPARISON}
                showPlayerModal={config.ENABLE_PLAYER_MODAL}
                isSelected={selectedPlayers.some((p) => p.id === player.id)}
                onSelect={() => handlePlayerSelect(player)}
                onPlayerClick={() => handlePlayerClick(player)}
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
        <span className="legend-highlight">
          <strong className="highlight-gold">1st</strong>
          <strong className="highlight-silver">2nd</strong>
          <strong className="highlight-bronze">3rd</strong>
        </span>
        <span className="legend-divider"></span>
        <button
          className="download-csv-btn-compact"
          onClick={() => {
            // Convert leaderboard data to CSV
            const csvRows = [];
            
            // CSV Headers
            csvRows.push([
              "Rank",
              "Player",
              "Position",
              "Matches Played",
              "Wins",
              "Draws",
              "Losses",
              "Win %",
              "Loss %",
              "Clean Sheets",
              "Goals",
              "Hat Tricks"
            ].join(","));

            // Add each player as a row
            sortedPlayers.forEach((player, index) => {
              const winPct = player.matches > 0 
                ? ((player.wins / player.matches) * 100).toFixed(1)
                : "0.0";
              const lossPct = player.matches > 0
                ? ((player.losses / player.matches) * 100).toFixed(1)
                : "0.0";

              csvRows.push([
                index + 1,
                player.name,
                player.position,
                player.matches || 0,
                player.wins || 0,
                player.draws || 0,
                player.losses || 0,
                winPct,
                lossPct,
                player.cleanSheets || 0,
                player.goals || 0,
                player.hatTricks || 0
              ].join(","));
            });

            // Create CSV content
            const csvContent = csvRows.join("\n");
            
            // Create blob and download
            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            const fileName = isAllTime 
              ? "leaderboard-all-time.csv"
              : selectedYear 
                ? `leaderboard-${selectedYear}.csv`
                : `leaderboard-${new Date().getFullYear()}.csv`;
            link.setAttribute("href", url);
            link.setAttribute("download", fileName);
            link.style.visibility = "hidden";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }}
          title="Download CSV"
        >
          📥 Download CSV
        </button>
      </div>

      {config.ENABLE_COMPARISON && selectedPlayers.length === config.MAX_COMPARE_PLAYERS && (
        <ComparePanel
          players={selectedPlayers}
          onClose={clearComparison}
        />
      )}

      {config.ENABLE_PLAYER_MODAL && modalPlayer && (
        <PlayerModal
          player={modalPlayer}
          allSeasonData={allSeasonData}
          isAllTime={isAllTime}
          onClose={closeModal}
        />
      )}
    </div>
  );
};
