import { useState, useMemo, useEffect } from "react";
import { Row } from "./Row.jsx";
import { ComparePanel } from "./ComparePanel.jsx";
import { PlayerModal } from "../player-modal";
import { config } from "../../leaderboard-config.js";
import { tickerMessages } from "../../ticker-messages.js";
import {
  getVisibleStatsLeaderboardTableColumns,
  mergeStatsLeaderboardColumnConfig,
  resolveVisibleSortKey,
} from "../../utils/stats-leaderboard-columns.js";

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
  const [statsView, setStatsView] = useState("overall"); // "overall", "weekday", "weekend"

  // Check if any player has weekend/weekday stats (for 2026+)
  const hasDetailedStats = useMemo(() => {
    return players.some(player => player.weekendStats && player.weekdayStats);
  }, [players]);

  // Check if any player has the ownGoals key to conditionally show OG column
  const hasOwnGoals = useMemo(() => {
    return players.some(player => player.ownGoals !== undefined);
  }, [players]);

  const columnVisibility = useMemo(
    () => mergeStatsLeaderboardColumnConfig(config.STATS_LEADERBOARD),
    []
  );

  const columns = useMemo(
    () => getVisibleStatsLeaderboardTableColumns(columnVisibility, hasOwnGoals),
    [columnVisibility, hasOwnGoals]
  );

  // Reset statsView when year changes
  useEffect(() => {
    setStatsView("overall");
  }, [selectedYear]);

  useEffect(() => {
    const validKeys = new Set(columns.map((c) => c.key));
    if (!validKeys.has(sortKey)) {
      const next = resolveVisibleSortKey(config.DEFAULT_SORT_KEY, columns, "matches");
      setSortKey(next);
      setSortDirection(next === "name" ? "asc" : "desc");
    }
  }, [columns, sortKey]);

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

  // Transform players based on selected statsView (overall, weekday, weekend)
  const transformedPlayers = useMemo(() => {
    if (statsView === "overall" || !hasDetailedStats) {
      return players;
    }
    
    // For weekday/weekend views, extract the relevant stats
    return players.map(player => {
      const periodStats = statsView === "weekday" ? player.weekdayStats : player.weekendStats;
      if (!periodStats) return player;
      
      return {
        ...player,
        matches: periodStats.matches || 0,
        wins: periodStats.wins || 0,
        losses: periodStats.losses || 0,
        draws: periodStats.draws || 0,
        cleanSheets: periodStats.cleanSheets || 0,
        goals: periodStats.goals || 0,
        hatTricks: periodStats.hatTricks || 0,
        ownGoals: periodStats.ownGoals || 0,
      };
    });
  }, [players, statsView, hasDetailedStats]);

  // Add calculated percentages to players
  const playersWithPct = useMemo(() => {
    return transformedPlayers.map(calcPercentages);
  }, [transformedPlayers]);

  // Filter players by search term
  const filteredPlayers = useMemo(() => {
    if (!searchTerm.trim()) return playersWithPct;
    const term = searchTerm.toLowerCase();
    return playersWithPct.filter((player) => {
      // Check name
      if (player.name.toLowerCase().includes(term)) return true;
      
      // Check position (always an array)
      const positions = player.position && Array.isArray(player.position) 
        ? player.position 
        : [];
      return positions.some(pos => pos?.toLowerCase().includes(term));
    });
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

  const visibleStatKeys = useMemo(() => {
    return new Set(columns.map((c) => c.key));
  }, [columns]);

  // Calculate top 3 values per column (capped at 3 highlights max)
  // Exclude "Others" from top 3 calculations
  const topValues = useMemo(() => {
    // Filter out "Others" player from calculations
    const playersForTopValues = playersWithPct.filter((p) => p.name !== "Others");
    
    // Higher is better for these stats
    const higherIsBetter = ["matches", "wins", "draws", "winPct", "cleanSheets", "goals", "hatTricks", "ownGoals"].filter(
      (k) => visibleStatKeys.has(k)
    );
    // Lower is better for these stats
    const lowerIsBetter = ["losses", "lossPct"].filter((k) => visibleStatKeys.has(k));
    
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
  }, [playersWithPct, visibleStatKeys]);

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

      <div className="leaderboard-actions">
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
        <button
          className="download-csv-btn-compact"
          onClick={() => {
            const csvRows = [];
            const headers = ["Rank", ...columns.map((c) => c.csvHeader)];
            csvRows.push(headers.join(","));

            sortedPlayers.forEach((player, index) => {
              const positionStr =
                player.position && Array.isArray(player.position)
                  ? player.position.join("/")
                  : "N/A";
              const winPct =
                player.matches > 0
                  ? ((player.wins / player.matches) * 100).toFixed(1)
                  : "0.0";
              const lossPct =
                player.matches > 0
                  ? ((player.losses / player.matches) * 100).toFixed(1)
                  : "0.0";

              const cells = columns.map((col) => {
                switch (col.key) {
                  case "name":
                    return player.name;
                  case "position":
                    return positionStr;
                  case "winPct":
                    return winPct;
                  case "lossPct":
                    return lossPct;
                  default:
                    return player[col.key] ?? 0;
                }
              });

              csvRows.push([index + 1, ...cells].join(","));
            });

            // Create CSV content
            const csvContent = csvRows.join("\n");
            
            // Create blob and download
            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            const viewSuffix = statsView !== "overall" && hasDetailedStats ? `-${statsView}` : "";
            const fileName = isAllTime 
              ? "leaderboard-all-time.csv"
              : selectedYear 
                ? `leaderboard-${selectedYear}${viewSuffix}.csv`
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

      {/* Stats View Sub-tabs - only show for specific years with detailed stats */}
      {selectedYear && !isAllTime && hasDetailedStats && (
        <div className="stats-view-tabs">
          <button
            className={`stats-view-tab ${statsView === "overall" ? "active" : ""}`}
            onClick={() => setStatsView("overall")}
          >
            📊 Overall
          </button>
          <button
            className={`stats-view-tab ${statsView === "weekday" ? "active" : ""}`}
            onClick={() => setStatsView("weekday")}
          >
            🌙 Weekday
          </button>
          <button
            className={`stats-view-tab ${statsView === "weekend" ? "active" : ""}`}
            onClick={() => setStatsView("weekend")}
          >
            ☀️ Weekend
          </button>
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
                columns={columns}
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
        {columns
          .filter((c) => c.legend)
          .map((c) => (
            <span key={c.key}>
              <strong>{c.legend.abbr}</strong> {c.legend.text}
            </span>
          ))}
        <span className="legend-divider"></span>
        <span className="legend-highlight">
          <strong className="highlight-gold">1st</strong>
          <strong className="highlight-silver">2nd</strong>
          <strong className="highlight-bronze">3rd</strong>
        </span>
      </div>

      {config.ENABLE_COMPARISON && selectedPlayers.length === config.MAX_COMPARE_PLAYERS && (
        <ComparePanel
          players={selectedPlayers}
          columnVisibility={columnVisibility}
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
