import { useEffect } from "react";

const statRows = [
  { key: "matches", label: "Matches Played" },
  { key: "wins", label: "Wins" },
  { key: "draws", label: "Draws" },
  { key: "losses", label: "Losses" },
  { key: "winPct", label: "Win %", format: (v) => `${(v ?? 0).toFixed(0)}%` },
  { key: "lossPct", label: "Loss %", format: (v) => `${(v ?? 0).toFixed(0)}%` },
  { key: "cleanSheets", label: "Clean Sheets" },
  { key: "goals", label: "Goals" },
  { key: "hatTricks", label: "Hat Tricks" },
];

export const ComparePanel = ({ players = [], onClose }) => {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  // Guard against missing players (after hooks)
  if (!players || players.length < 2) return null;

  const getSafeValue = (player, key) => player?.[key] ?? 0;

  // Find the winner(s) for a given stat key
  const getWinnerIndices = (key) => {
    const values = players.map((p) => getSafeValue(p, key));
    const lowerIsBetter = key === "losses" || key === "lossPct";
    
    const bestValue = lowerIsBetter 
      ? Math.min(...values) 
      : Math.max(...values);
    
    // Return indices of all players with the best value
    return values
      .map((val, idx) => (val === bestValue ? idx : -1))
      .filter((idx) => idx !== -1);
  };

  const handleOverlayClick = (e) => {
    // Close only if clicking the overlay itself, not the panel
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="compare-overlay" onClick={handleOverlayClick}>
      <div className="compare-panel" style={{ maxWidth: `${Math.min(600, 200 + players.length * 120)}px` }}>
        <div className="compare-header">
          <h3>Player Comparison</h3>
          <button className="compare-close" onClick={onClose}>✕</button>
        </div>

        <div className="compare-players">
          {players.map((player, idx) => (
            <div key={player.id} className="compare-player-wrapper">
              {idx > 0 && <div className="compare-vs">VS</div>}
              <div className="compare-player">
                <span className={`position-badge position-${(player.position ?? "N/A").toLowerCase()}`}>
                  {player.position ?? "N/A"}
                </span>
                <span className="compare-player-name">{player.name ?? "Unknown"}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="compare-stats">
          {/* Header row with player names */}
          <div className="compare-stat-row compare-stat-header">
            <div className="compare-label">Stat</div>
            <div className="compare-values">
              {players.map((player) => (
                <div key={player.id} className="compare-value compare-player-header">
                  {player.name?.split(" ")[0] ?? "Player"}
                </div>
              ))}
            </div>
          </div>

          {statRows.map(({ key, label, format }) => {
            const winnerIndices = getWinnerIndices(key);
            const allTied = winnerIndices.length === players.length;

            return (
              <div key={key} className="compare-stat-row">
                <div className="compare-label">{label}</div>
                <div className="compare-values">
                  {players.map((player, idx) => {
                    const rawVal = getSafeValue(player, key);
                    const displayVal = format ? format(rawVal) : rawVal;
                    const isWinner = !allTied && winnerIndices.includes(idx);

                    return (
                      <div 
                        key={player.id} 
                        className={`compare-value ${isWinner ? "compare-winner" : ""}`}
                      >
                        {displayVal}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

