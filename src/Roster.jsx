import { useMemo } from "react";
import playerProfiles from "./data/player-profiles.json";

const positionOrder = { GK: 0, DEF: 1, MID: 2, FWD: 3, ALL: 4 };

// Map specific positions to their categories
const getPositionCategory = (pos) => {
  const upperPos = pos.toUpperCase();
  if (upperPos === 'GK') return 'GK';
  if (['DEF', 'CB', 'LB', 'RB'].includes(upperPos)) return 'DEF';
  if (['MID', 'LM', 'RM', 'CAM', 'CDM'].includes(upperPos)) return 'MID';
  if (['FWD', 'LW', 'RW', 'CF', 'ST'].includes(upperPos)) return 'FWD';
  if (upperPos === 'ALL') return 'ALL';
  return 'DEF'; // Default fallback
};

const getFilteredPlayers = (filterType) => {
    switch (filterType) {
        case "midweek":
            return playerProfiles.filter(
                (p) => p.groupAvailibility === "MIDWEEK" || p.groupAvailibility === "ALLGAMES"
            );
        case "weekend":
            return playerProfiles.filter(
                (p) => p.groupAvailibility === "WEEKEND" || p.groupAvailibility === "ALLGAMES"
            );
        case "inactive":
            return playerProfiles.filter((p) => p.groupAvailibility === "N/A");
        default:
            return [];
    }
};

export const Roster = ({ type }) => {
    const filteredPlayers = useMemo(() => {
        const players = getFilteredPlayers(type);
        return players.sort((a, b) => {
            // Sort by first position first, then by name
            const aPos = Array.isArray(a.position) && a.position.length > 0 
              ? getPositionCategory(a.position[0]) 
              : 'DEF';
            const bPos = Array.isArray(b.position) && b.position.length > 0 
              ? getPositionCategory(b.position[0]) 
              : 'DEF';
            const posDiff = (positionOrder[aPos] || 99) - (positionOrder[bPos] || 99);
            if (posDiff !== 0) return posDiff;
            return a.name.localeCompare(b.name);
        });
    }, [type]);

    const getTitle = () => {
        switch (type) {
            case "midweek":
                return "Midweek Roster";
            case "weekend":
                return "Weekend Roster";
            case "inactive":
                return "Inactive Players";
            default:
                return "Roster";
        }
    };

    const getPositionCounts = () => {
        const counts = { GK: 0, DEF: 0, MID: 0, FWD: 0, ALL: 0 };
        filteredPlayers.forEach((player) => {
            // Count each position in the array
            if (Array.isArray(player.position) && player.position.length > 0) {
                player.position.forEach(pos => {
                    const category = getPositionCategory(pos);
                    counts[category] = (counts[category] || 0) + 1;
                });
            } else {
                // Fallback for invalid data
                counts.DEF = (counts.DEF || 0) + 1;
            }
        });
        return counts;
    };

    const positionCounts = getPositionCounts();
    const totalPlayers = filteredPlayers.length;

    return (
        <div className="roster">
            {/* Summary */}
            <div className="roster-summary">
                <span>👥 {totalPlayers} {totalPlayers === 1 ? "player" : "players"}</span>
                {positionCounts.GK > 0 && <span>🧤 {positionCounts.GK} GK</span>}
                {positionCounts.DEF > 0 && <span>🛡️ {positionCounts.DEF} DEF</span>}
                {positionCounts.MID > 0 && <span>⚙️ {positionCounts.MID} MID</span>}
                {positionCounts.FWD > 0 && <span>⚽ {positionCounts.FWD} FWD</span>}
                {positionCounts.ALL > 0 && <span>🌟 {positionCounts.ALL} ALL</span>}
            </div>

            {/* Player Table */}
            <div className="roster-table-container">
                {filteredPlayers.length === 0 ? (
                    <div className="roster-empty">
                        <p>No players found</p>
                    </div>
                ) : (
                    <table className="roster-table">
                        <thead>
                            <tr>
                                <th className="roster-rank-col">#</th>
                                <th className="roster-player-col">Player</th>
                                <th className="roster-position-col">Position</th>
                                <th className="roster-availability-col">Availability</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPlayers.map((player, index) => (
                                <tr key={player.name} className="roster-row">
                                    <td className="roster-rank-col">{index + 1}</td>
                                    <td className="roster-player-col">{player.name}</td>
                                    <td className="roster-position-col">
                                        {Array.isArray(player.position) && player.position.length > 0 ? (
                                            <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                                                {player.position.map((pos, idx) => (
                                                    <span key={idx} className={`position-badge position-${pos.toLowerCase()}`}>
                                                        {pos}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="position-badge position-n/a">N/A</span>
                                        )}
                                    </td>
                                    <td className="roster-availability-col">
                                        {player.groupAvailibility === "ALLGAMES" ? (
                                            <span className="availability-all">All Days</span>
                                        ) : player.groupAvailibility === "MIDWEEK" ? (
                                            <span className="availability-midweek">Midweek</span>
                                        ) : player.groupAvailibility === "WEEKEND" ? (
                                            <span className="availability-weekend">Weekend</span>
                                        ) : (
                                            <span className="availability-inactive">Inactive</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

