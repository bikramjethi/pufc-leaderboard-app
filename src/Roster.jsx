import { useMemo } from "react";
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
    const filteredPlayers = useMemo(() => {
        const players = getFilteredPlayers(type);
        return players.sort((a, b) => {
            // Sort by position first, then by name
            const posDiff = (positionOrder[a.position] || 99) - (positionOrder[b.position] || 99);
            if (posDiff !== 0) return posDiff;
            return a.name.localeCompare(b.name);
        });
    }, [type]);

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
                                        <span className={`position-badge position-${player.position.toLowerCase()}`}>
                                            {player.position}
                                        </span>
                                    </td>
                                    <td className="roster-availability-col">
                                        {player.groupAvailibility === "ALL" ? (
                                            <span className="availability-all">All Days</span>
                                        ) : player.groupAvailibility === "TUESDAY" ? (
                                            <span className="availability-tuesday">Tuesday</span>
                                        ) : player.groupAvailibility === "SATURDAY" ? (
                                            <span className="availability-saturday">Saturday</span>
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

