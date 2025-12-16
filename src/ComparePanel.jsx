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

export const ComparePanel = ({ player1, player2, onClose }) => {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  // Guard against missing players (after hooks)
  if (!player1 || !player2) return null;

  const getSafeValue = (player, key) => player?.[key] ?? 0;

  const getWinner = (key) => {
    const val1 = getSafeValue(player1, key);
    const val2 = getSafeValue(player2, key);
    
    // For loss % and losses, lower is better
    const lowerIsBetter = key === "losses" || key === "lossPct";
    if (val1 === val2) return "tie";
    if (lowerIsBetter) {
      return val1 < val2 ? "p1" : "p2";
    }
    return val1 > val2 ? "p1" : "p2";
  };

  const handleOverlayClick = (e) => {
    // Close only if clicking the overlay itself, not the panel
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="compare-overlay" onClick={handleOverlayClick}>
      <div className="compare-panel">
        <div className="compare-header">
          <h3>Player Comparison</h3>
          <button className="compare-close" onClick={onClose}>✕</button>
        </div>

        <div className="compare-players">
          <div className="compare-player">
            <span className={`position-badge position-${(player1.position ?? "N/A").toLowerCase()}`}>
              {player1.position ?? "N/A"}
            </span>
            <span className="compare-player-name">{player1.name ?? "Unknown"}</span>
          </div>
          <div className="compare-vs">VS</div>
          <div className="compare-player">
            <span className={`position-badge position-${(player2.position ?? "N/A").toLowerCase()}`}>
              {player2.position ?? "N/A"}
            </span>
            <span className="compare-player-name">{player2.name ?? "Unknown"}</span>
          </div>
        </div>

        <div className="compare-stats">
          {statRows.map(({ key, label, format }) => {
            const winner = getWinner(key);
            const rawVal1 = getSafeValue(player1, key);
            const rawVal2 = getSafeValue(player2, key);
            const val1 = format ? format(rawVal1) : rawVal1;
            const val2 = format ? format(rawVal2) : rawVal2;

            return (
              <div key={key} className="compare-stat-row">
                <div className={`compare-value ${winner === "p1" ? "compare-winner" : ""}`}>
                  {val1}
                </div>
                <div className="compare-label">{label}</div>
                <div className={`compare-value ${winner === "p2" ? "compare-winner" : ""}`}>
                  {val2}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

