import { useState, useMemo } from "react";
import playerProfiles from "./data/player-profiles.json";

const positionOrder = { GK: 0, DEF: 1, MID: 2, FWD: 3, ALL: 4 };

const getFilteredPlayers = (filterType) => {
  switch (filterType) {
    case "tuesday":
      return playerProfiles.filter(
        (p) => p.groupAvailibility === "TUESDAY" || p.groupAvailibility === "ALL"
      );
    case "saturday":
      return playerProfiles.filter(
        (p) => p.groupAvailibility === "SATURDAY" || p.groupAvailibility === "ALL"
      );
    case "inactive":
      return playerProfiles.filter((p) => p.groupAvailibility === "N/A");
    default:
      return [];
  }
};

export const Roster = ({ type }) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredPlayers = useMemo(() => {
    const players = getFilteredPlayers(type);
    
    if (!searchTerm.trim()) {
      return players.sort((a, b) => {
        // Sort by position first, then by name
        const posDiff = (positionOrder[a.position] || 99) - (positionOrder[b.position] || 99);
        if (posDiff !== 0) return posDiff;
        return a.name.localeCompare(b.name);
      });
    }

    const term = searchTerm.toLowerCase();
    return players
      .filter((player) => player.name.toLowerCase().includes(term))
      .sort((a, b) => {
        const posDiff = (positionOrder[a.position] || 99) - (positionOrder[b.position] || 99);
        if (posDiff !== 0) return posDiff;
        return a.name.localeCompare(b.name);
      });
  }, [type, searchTerm]);

  const getTitle = () => {
    switch (type) {
      case "tuesday":
        return "Tuesday Roster";
      case "saturday":
        return "Saturday Roster";
      case "inactive":
        return "Inactive Players";
      default:
        return "Roster";
    }
  };

  const getPositionCounts = () => {
    const counts = { GK: 0, DEF: 0, MID: 0, FWD: 0, ALL: 0 };
    filteredPlayers.forEach((player) => {
      counts[player.position] = (counts[player.position] || 0) + 1;
    });
    return counts;
  };

  const positionCounts = getPositionCounts();
  const totalPlayers = filteredPlayers.length;

  return (
    <div className="roster">
      {/* Search */}
      <div className="search-container">
        <input
          type="text"
          className="search-input"
          placeholder={`Search ${getTitle().toLowerCase()}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button className="search-clear" onClick={() => setSearchTerm("")}>
            ✕
          </button>
        )}
      </div>

      {/* Summary */}
      <div className="roster-summary">
        <span>👥 {totalPlayers} {totalPlayers === 1 ? "player" : "players"}</span>
        {positionCounts.GK > 0 && <span>🧤 {positionCounts.GK} GK</span>}
        {positionCounts.DEF > 0 && <span>🛡️ {positionCounts.DEF} DEF</span>}
        {positionCounts.MID > 0 && <span>⚙️ {positionCounts.MID} MID</span>}
        {positionCounts.FWD > 0 && <span>⚽ {positionCounts.FWD} FWD</span>}
        {positionCounts.ALL > 0 && <span>🌟 {positionCounts.ALL} ALL</span>}
      </div>

      {/* Player List */}
      <div className="roster-list">
        {filteredPlayers.length === 0 ? (
          <div className="roster-empty">
            <p>No players found</p>
          </div>
        ) : (
          <div className="roster-grid">
            {filteredPlayers.map((player) => (
              <div key={player.name} className="roster-player-card">
                <div className="roster-player-name">{player.name}</div>
                <div className="roster-player-position">{player.position}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

