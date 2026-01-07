import { useEffect } from "react";
import { getPlayerImage } from "./utils/playerImages";

export const PlayerModal = ({ player, allSeasonData, isAllTime = false, onClose }) => {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  if (!player) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Calculate derived stats
  const totalMatches = player.matches || 0;
  const goalsPerMatch = totalMatches > 0 ? (player.goals / totalMatches).toFixed(2) : "0.00";
  const winRate = totalMatches > 0 ? ((player.wins / totalMatches) * 100).toFixed(0) : 0;
  const lossRate = totalMatches > 0 ? ((player.losses / totalMatches) * 100).toFixed(0) : 0;

  // Get player history across seasons
  const getPlayerHistory = () => {
    if (!allSeasonData) return [];
    
    return Object.entries(allSeasonData)
      .map(([year, players]) => {
        const playerData = players.find((p) => p.name === player.name);
        if (!playerData) return null;
        return { year, ...playerData };
      })
      .filter(Boolean)
      .sort((a, b) => b.year - a.year);
  };

  const history = getPlayerHistory();

  // Calculate career totals
  const careerTotals = history.reduce(
    (acc, season) => ({
      matches: acc.matches + (season.matches || 0),
      wins: acc.wins + (season.wins || 0),
      goals: acc.goals + (season.goals || 0),
      cleanSheets: acc.cleanSheets + (season.cleanSheets || 0),
      hatTricks: acc.hatTricks + (season.hatTricks || 0),
    }),
    { matches: 0, wins: 0, goals: 0, cleanSheets: 0, hatTricks: 0 }
  );

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="player-modal">
        {/* Trading Card Style Header */}
        <div className="modal-card-header">
          {/* Geometric Border Pattern */}
          <div className="card-border-pattern">
            <div className="border-stripe stripe-1"></div>
            <div className="border-stripe stripe-2"></div>
            <div className="border-stripe stripe-3"></div>
          </div>
          
          {/* Player Image Container */}
          <div className="card-image-container">
            <img 
              src={getPlayerImage(player.name)} 
              alt={player.name}
              className="card-player-image"
            />
            {/* Gradient Overlay for text readability */}
            <div className="card-image-gradient"></div>
          </div>
          
          {/* Player Info Overlay */}
          <div className="card-player-info">
            <div className="card-info-content">
              <h2 className="card-player-name">{player.name}</h2>
              {player.position && Array.isArray(player.position) && player.position.length > 0 && (
                <div className="card-position-row">
                  <span className="card-position-label">Position:</span>
                  <span className="card-position-value">{player.position.join(' / ')}</span>
                </div>
              )}
            </div>
            <div className="card-football-icon">⚽</div>
          </div>
          
          {/* Close Button */}
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Key Stats */}
        <div className="modal-key-stats">
          <div className="key-stat">
            <span className="key-stat-value">{player.matches}</span>
            <span className="key-stat-label">Matches</span>
          </div>
          <div className="key-stat">
            <span className="key-stat-value">{player.wins}</span>
            <span className="key-stat-label">Wins</span>
          </div>
          <div className="key-stat highlight">
            <span className="key-stat-value">{winRate}%</span>
            <span className="key-stat-label">Win Rate</span>
          </div>
        </div>

        {/* Detailed Stats */}
        <div className="modal-section">
          <h3 className="modal-section-title">{isAllTime ? "Career Stats" : "Season Stats"}</h3>
          <div className="modal-stats-grid">
            <div className="modal-stat">
              <span className="modal-stat-icon">⚽</span>
              <span className="modal-stat-value">{player.goals}</span>
              <span className="modal-stat-label">Goals</span>
            </div>
            <div className="modal-stat">
              <span className="modal-stat-icon">🎩</span>
              <span className="modal-stat-value">{player.hatTricks}</span>
              <span className="modal-stat-label">Hat Tricks</span>
            </div>
            <div className="modal-stat">
              <span className="modal-stat-icon">🧤</span>
              <span className="modal-stat-value">{player.cleanSheets}</span>
              <span className="modal-stat-label">Clean Sheets</span>
            </div>
            <div className="modal-stat">
              <span className="modal-stat-icon">🤝</span>
              <span className="modal-stat-value">{player.draws}</span>
              <span className="modal-stat-label">Draws</span>
            </div>
            <div className="modal-stat">
              <span className="modal-stat-icon">❌</span>
              <span className="modal-stat-value">{player.losses}</span>
              <span className="modal-stat-label">Losses</span>
            </div>
            <div className="modal-stat">
              <span className="modal-stat-icon">📊</span>
              <span className="modal-stat-value">{goalsPerMatch}</span>
              <span className="modal-stat-label">Goals/Match</span>
            </div>
          </div>
        </div>

        {/* Season History */}
        {history.length > 1 && (
          <div className="modal-section">
            <h3 className="modal-section-title">Season History</h3>
            <div className="modal-history">
              {history.map((season) => (
                <div key={season.year} className="history-row">
                  <span className="history-year">{season.year}</span>
                  <span className="history-stats">
                    {season.matches} MP • {season.wins}W • {season.goals}G
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Career Totals (if multiple seasons and not already in All-Time view) */}
        {!isAllTime && history.length > 1 && (
          <div className="modal-section">
            <h3 className="modal-section-title">Career Totals</h3>
            <div className="career-totals">
              <span>{careerTotals.matches} Matches</span>
              <span>{careerTotals.wins} Wins</span>
              <span>{careerTotals.goals} Goals</span>
              <span>{careerTotals.hatTricks} Hat Tricks</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

