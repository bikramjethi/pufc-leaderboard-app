import { seasonData } from "./get-season-data";

// Aggregate all seasons into "All-Time" stats
export const aggregateAllTimeStats = () => {
    const playerMap = new Map();

    Object.values(seasonData).forEach((seasonPlayers) => {
        seasonPlayers.forEach((player) => {
            const key = player.name; // Use name as unique identifier across seasons

            if (playerMap.has(key)) {
                const existing = playerMap.get(key);
                playerMap.set(key, {
                    ...existing,
                    matches: (existing.matches || 0) + (player.matches || 0),
                    wins: (existing.wins || 0) + (player.wins || 0),
                    draws: (existing.draws || 0) + (player.draws || 0),
                    losses: (existing.losses || 0) + (player.losses || 0),
                    goals: (existing.goals || 0) + (player.goals || 0),
                    cleanSheets: (existing.cleanSheets || 0) + (player.cleanSheets || 0),
                    hatTricks: (existing.hatTricks || 0) + (player.hatTricks || 0),
                    seasonsPlayed: existing.seasonsPlayed + 1,
                });
            } else {
                playerMap.set(key, {
                    id: `alltime-${key.replace(/\s+/g, "-").toLowerCase()}`, // Unique ID based on name
                    name: player.name,
                    position: player.position,
                    matches: player.matches || 0,
                    wins: player.wins || 0,
                    draws: player.draws || 0,
                    losses: player.losses || 0,
                    goals: player.goals || 0,
                    cleanSheets: player.cleanSheets || 0,
                    hatTricks: player.hatTricks || 0,
                    seasonsPlayed: 1,
                });
            }
        });
    });

    return Array.from(playerMap.values());
};