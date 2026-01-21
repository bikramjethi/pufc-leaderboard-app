import { useMemo } from "react";
import { config } from "../../leaderboard-config.js";
import { getPlayerImage } from "../../utils/playerImages.js";
import hallOfFameData from "./hall-of-fame.json";
import "./HallOfFame.css";

export const HallOfFame = () => {
  if (!config.HALL_OF_FAME?.enabled) {
    return null;
  }

  // Sort by induction year (newest first), then by name
  const sortedPlayers = useMemo(() => {
    return [...hallOfFameData].sort((a, b) => {
      if (b.inductionYear !== a.inductionYear) {
        return b.inductionYear - a.inductionYear;
      }
      return a.name.localeCompare(b.name);
    });
  }, []);

  return (
    <div className="hall-of-fame">
      <div className="hof-header">
        <div className="hof-title">
          <h2>🏆 Hall of Fame</h2>
          <p className="hof-subtitle">Club Legends and Distinguished Players</p>
        </div>
      </div>

      {sortedPlayers.length === 0 ? (
        <div className="hof-empty">
          <p>No Hall of Fame members yet.</p>
        </div>
      ) : (
        <div className="hof-grid">
          {sortedPlayers.map((player, index) => (
            <div key={`${player.name}-${player.inductionYear}`} className="hof-card">
              {/* Card Header with Image */}
              <div className="hof-card-header">
                <div className="hof-card-image-container">
                  <img
                    src={getPlayerImage(player.name)}
                    alt={player.name}
                    className="hof-card-image"
                  />
                  <div className="hof-card-image-overlay"></div>
                </div>
                <div className="hof-card-badge">
                  <span className="hof-badge-icon">⭐</span>
                  <span className="hof-badge-year">{player.inductionYear}</span>
                </div>
              </div>

              {/* Card Content */}
              <div className="hof-card-content">
                <h3 className="hof-card-name">{player.name}</h3>
                
                {player.position && (
                  <div className="hof-card-position">
                    <span className="hof-position-label">Position:</span>
                    <span className="hof-position-value">{player.position}</span>
                  </div>
                )}

                {player.achievements && player.achievements.length > 0 && (
                  <div className="hof-card-achievements">
                    <h4 className="hof-achievements-title">Achievements</h4>
                    <ul className="hof-achievements-list">
                      {player.achievements.map((achievement, idx) => (
                        <li key={idx} className="hof-achievement-item">
                          <span className="hof-achievement-icon">✓</span>
                          <span>{achievement}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {player.description && (
                  <div className="hof-card-description">
                    <p>{player.description}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

